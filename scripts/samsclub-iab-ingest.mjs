#!/usr/bin/env node
// Ingest complete public product-page DOM snapshots saved by samsclub-iab-source.mjs.
// Images come only from each product's explicit imageInfo.allImages gallery.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  appendCatalogRecord,
  ensureCard,
  loadCatalog,
  saveGalleryImage,
  toCatalogRecord,
} from './samsclub-bulk.mjs';
import { detailProduct, nextData } from './samsclub-poc.mjs';

const ROOT = path.resolve('.');
const CATALOG_FILE = path.join(ROOT, 'shared/samsclub-catalog.json');
const DEFAULT_DIRECTORY = path.join(ROOT, '.cache/samsclub-bulk/verified-pages');
const DEFAULT_PROGRESS = path.join(ROOT, '.cache/samsclub-bulk/ingest-progress.json');
const MAX_RETRYABLE_PRODUCT_ATTEMPTS = 3;

function parseArgs(args) {
  const value = (name, fallback) =>
    args.find((arg) => arg.startsWith(name + '='))?.slice(name.length + 1) ?? fallback;
  const limit = Number(value('--limit', '1000'));
  if (!Number.isInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer.');
  return {
    directory: path.resolve(value('--dir', DEFAULT_DIRECTORY)),
    progressFile: path.resolve(value('--progress', DEFAULT_PROGRESS)),
    limit,
    reclassifyGenerated: args.includes('--reclassify-generated'),
  };
}

async function exists(file) {
  return fs.access(file).then(
    () => true,
    () => false,
  );
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = file + '.tmp-' + process.pid;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2) + '\n');
  await fs.rename(temporary, file);
}

export async function reclassifyGeneratedRecords(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const progress = JSON.parse(await fs.readFile(options.progressFile, 'utf8'));
  const generated = (progress.ingested || []).filter((item) => item.status === 'added' && item.url);
  const metadataFiles = (await fs.readdir(options.directory))
    .filter((name) => name.endsWith('.html.meta.json'))
    .sort();
  const metadataByUrl = new Map();
  for (const name of metadataFiles) {
    const file = path.join(options.directory, name);
    const metadata = JSON.parse(await fs.readFile(file, 'utf8'));
    if (metadata.kind === 'product' && metadata.url) metadataByUrl.set(metadata.url, { file, metadata });
  }
  const current = await loadCatalog();
  const report = {
    started_at: new Date().toISOString(),
    scope: 'Only Item # records listed as newly added by this IAB ingestion progress file.',
    updated: [],
    skipped: [],
  };
  for (const entry of generated) {
    const page = metadataByUrl.get(entry.url);
    const record = current.find((item) => String(item.itemId) === String(entry.item_id));
    if (!page || !record || record.sourceUrl !== entry.url) {
      report.skipped.push({ url: entry.url, item_id: entry.item_id, reason: 'source record or metadata did not match' });
      continue;
    }
    const metadata = page.metadata;
    const htmlFile = metadata.html_file
      ? path.resolve(ROOT, metadata.html_file)
      : page.file.slice(0, -'.meta.json'.length);
    const html = await fs.readFile(htmlFile, 'utf8');
    const candidate = {
      product_url: metadata.url,
      page_id: String(metadata.page_id || new URL(metadata.url).pathname.split('/').at(-1)),
      name: '',
      listing_price: metadata.listing_price || null,
      listing_unit_price: metadata.listing_unit_price || null,
    };
    const rawData = nextData(html)?.initialData?.data;
    const parsed = detailProduct(html, candidate, metadata.captured_at);
    if (String(parsed.product.item_id) !== String(record.itemId)) {
      report.skipped.push({ url: entry.url, item_id: entry.item_id, reason: 'verified Item # mismatch' });
      continue;
    }
    const node = {
      categoryId: metadata.category_id || 'samsclub-unclassified',
      label: metadata.category_name || 'Sam’s Club category',
      url: metadata.source_category_url || metadata.url,
    };
    const refreshed = toCatalogRecord(parsed, candidate, node, metadata.captured_at, rawData);
    const before = {
      category: record.category,
      categoryName: record.categoryName,
      unit: record.unit,
      packageSize: record.packageSize,
      finalCostByWeight: record.finalCostByWeight,
      sourcePageId: record.sourcePageId,
      storageCondition: record.storageCondition,
      displayGroup: record.displayGroup,
    };
    const after = {
      category: refreshed.category,
      categoryName: refreshed.categoryName,
      unit: refreshed.unit,
      packageSize: refreshed.packageSize,
      finalCostByWeight: refreshed.finalCostByWeight,
      sourcePageId: refreshed.sourcePageId,
      storageCondition: refreshed.storageCondition,
      displayGroup: refreshed.displayGroup,
    };
    Object.assign(record, after);
    report.updated.push({
      item_id: record.itemId,
      name: record.name,
      before,
      after,
      source_category_path: (rawData?.product?.category?.path || []).map((part) => part?.name).filter(Boolean).join(' > '),
      storage_specifications: refreshed.specifications.filter((spec) => /refrigerat|frozen|freeze|store/i.test(spec)),
    });
  }
  const temporary = CATALOG_FILE + '.reclass-' + process.pid + '.tmp';
  await fs.writeFile(temporary, JSON.stringify(current, null, 2) + '\n');
  await fs.rename(temporary, CATALOG_FILE);
  report.completed_at = new Date().toISOString();
  report.updated_count = report.updated.length;
  report.skipped_count = report.skipped.length;
  await writeJson(path.join(ROOT, '.cache/samsclub-bulk/reclassification-report.json'), report);
  console.log(JSON.stringify({
    updated: report.updated_count,
    skipped: report.skipped_count,
    displayGroups: Object.fromEntries(
      [...new Set(report.updated.map((item) => item.after.displayGroup))].map((group) => [
        group,
        report.updated.filter((item) => item.after.displayGroup === group).length,
      ]),
    ),
  }, null, 2));
  return report;
}

export async function ingestCompletedProductPages(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const progress = (await exists(options.progressFile))
    ? JSON.parse(await fs.readFile(options.progressFile, 'utf8'))
    : {
        started_at: new Date().toISOString(),
        ingested: [],
        failures: [],
        products_added: 0,
        gallery_images_downloaded: 0,
        price_observations_added: 0,
        duplicate_item_ids: 0,
        duplicate_source_urls: 0,
      };
  progress.ingested ||= [];
  progress.failures ||= [];
  const completed = new Set(progress.ingested.map((item) => item.url));
  const metadataFiles = (await fs.readdir(options.directory))
    .filter((name) => name.endsWith('.html.meta.json'))
    .sort();
  const catalog = await loadCatalog();
  const knownItemIds = new Set(catalog.map((item) => String(item.itemId)));
  const knownUrls = new Set(catalog.map((item) => item.sourceUrl));
  const candidates = [];
  for (const name of metadataFiles) {
    const metadataFile = path.join(options.directory, name);
    const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
    if (metadata.kind !== 'product' || !metadata.url || completed.has(metadata.url)) continue;
    candidates.push({ name, metadata, metadataFile });
  }

  let processed = 0;
  let blocked = false;
  for (const entry of candidates.slice(0, options.limit)) {
    const metadata = entry.metadata;
    const htmlFile = metadata.html_file
      ? path.resolve(ROOT, metadata.html_file)
      : entry.metadataFile.slice(0, -'.meta.json'.length);
    const sourcePageId = String(metadata.page_id || new URL(metadata.url).pathname.split('/').at(-1));
    try {
      const html = await fs.readFile(htmlFile, 'utf8');
      const candidate = {
        product_url: metadata.url,
        page_id: sourcePageId,
        name: '',
        listing_price: metadata.listing_price || null,
        listing_unit_price: metadata.listing_unit_price || null,
      };
      const props = nextData(html);
      const rawData = props?.initialData?.data;
      const parsed = detailProduct(html, candidate, metadata.captured_at);
      const itemId = String(parsed.product.item_id);
      if (knownItemIds.has(itemId)) {
        progress.duplicate_item_ids++;
        progress.ingested.push({
          url: metadata.url,
          item_id: itemId,
          category_id: metadata.category_id || null,
          status: 'duplicate-item-id',
          captured_at: metadata.captured_at,
        });
        processed++;
        await writeJson(options.progressFile, progress);
        continue;
      }
      if (knownUrls.has(metadata.url)) {
        progress.duplicate_source_urls++;
        progress.ingested.push({
          url: metadata.url,
          item_id: itemId,
          category_id: metadata.category_id || null,
          status: 'duplicate-source-url',
          captured_at: metadata.captured_at,
        });
        processed++;
        await writeJson(options.progressFile, progress);
        continue;
      }

      const node = {
        categoryId: metadata.category_id || 'samsclub-unclassified',
        label: metadata.category_name || 'Sam’s Club category',
        url: metadata.source_category_url || metadata.url,
      };
      let record;
      try {
        record = toCatalogRecord(parsed, candidate, node, metadata.captured_at, rawData);
      } catch (error) {
        if (error && typeof error === 'object' && !error.blocked) error.sourceReview = true;
        throw error;
      }
      const currentCatalog = await loadCatalog();
      if (currentCatalog.filter((item) => item.category === record.category).length >= 100) {
        progress.ingested.push({ url: metadata.url, item_id: itemId, category_id: metadata.category_id, status: 'category-cap-100' });
        await writeJson(options.progressFile, progress);
        continue;
      }
      const gallery = new Array(parsed.images.length);
      let imageCursor = 0;
      let imageFailure;
      const downloadImages = async () => {
        while (!imageFailure && imageCursor < parsed.images.length) {
          const index = imageCursor++;
          try {
            gallery[index] = await saveGalleryImage(itemId, parsed.images[index], { offline: false, refresh: false });
            progress.gallery_images_downloaded++;
            progress.updated_at = new Date().toISOString();
            progress.last_image = { item_id: itemId, image_index: index, status: 'saved' };
          } catch (error) { imageFailure = error; }
        }
      };
      await Promise.all(Array.from({ length: Math.min(3, parsed.images.length) }, downloadImages));
      if (imageFailure) throw imageFailure;
      if (!gallery.length || gallery.length !== parsed.images.length)
        throw new Error('Could not save every image from product.imageInfo.allImages.');
      record.gallery = gallery;
      await ensureCard(itemId);
      const inserted = await appendCatalogRecord(record);
      if (!inserted.added) {
        if (inserted.reason === 'item-id-already-present') progress.duplicate_item_ids++;
        else progress.duplicate_source_urls++;
        progress.ingested.push({
          url: metadata.url,
          item_id: itemId,
          category_id: metadata.category_id || null,
          status: inserted.reason,
          captured_at: metadata.captured_at,
        });
        processed++;
        await writeJson(options.progressFile, progress);
        continue;
      }

      knownItemIds.add(itemId);
      knownUrls.add(metadata.url);
      progress.products_added++;
      progress.price_observations_added += record.prices.length;
      progress.ingested.push({
        url: metadata.url,
        item_id: itemId,
        category_id: metadata.category_id || null,
        category_name: metadata.category_name || null,
        name: record.name,
        images: record.gallery.length,
        price_observations: record.prices.length,
        captured_at: metadata.captured_at,
        status: 'added',
      });
      processed++;
      progress.updated_at = new Date().toISOString();
      await writeJson(options.progressFile, progress);
      console.log(
        'Added Item # ' + itemId + ' · ' + record.name + ' · ' + record.gallery.length + ' images',
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const sourceReview = error?.sourceReview === true;
      const blockedPage = error?.blocked === true;
      const retryableAttempts = progress.failures.filter(
        (failure) =>
          failure.url === metadata.url && failure.failure_type === 'retryable-download',
      ).length;
      const attempt = retryableAttempts + 1;
      const failureType = sourceReview
        ? 'source-data-review'
        : blockedPage
          ? 'access-challenge'
          : 'retryable-download';
      progress.failures.push({
        url: metadata.url,
        category_id: metadata.category_id || null,
        at: new Date().toISOString(),
        failure_type: failureType,
        retryable: !sourceReview && !blockedPage,
        ...(failureType === 'retryable-download' ? { attempt } : {}),
        error: errorMessage,
      });
      progress.updated_at = new Date().toISOString();
      if (sourceReview) {
        progress.ingested.push({
          url: metadata.url,
          page_id: sourcePageId,
          category_id: metadata.category_id || null,
          category_name: metadata.category_name || null,
          status: 'needs-review-source-data',
          failure_type: failureType,
          captured_at: metadata.captured_at,
          error: errorMessage,
        });
        processed++;
      } else if (!blockedPage && attempt >= MAX_RETRYABLE_PRODUCT_ATTEMPTS) {
        progress.ingested.push({
          url: metadata.url,
          page_id: sourcePageId,
          category_id: metadata.category_id || null,
          category_name: metadata.category_name || null,
          status: 'needs-review-download-retries-exhausted',
          failure_type: failureType,
          attempts: attempt,
          captured_at: metadata.captured_at,
          error: errorMessage,
        });
        processed++;
      }
      if (blockedPage) {
        blocked = true;
        progress.blocked_at = metadata.url;
        progress.stop_reason = errorMessage;
      }
      await writeJson(options.progressFile, progress);
      if (blockedPage) {
        console.error('Stopped after an image access challenge; no bypass or retry was attempted.');
        break;
      }
    }
  }
  progress.completed_at = new Date().toISOString();
  progress.last_batch = {
    detail_snapshots_available: candidates.length,
    processed,
    products_added: progress.products_added,
    gallery_images_downloaded: progress.gallery_images_downloaded,
    price_observations_added: progress.price_observations_added,
    blocked,
  };
  await writeJson(options.progressFile, progress);
  console.log(JSON.stringify(progress.last_batch, null, 2));
  return progress.last_batch;
}

async function run() {
  if (process.argv.includes('--reclassify-generated')) return reclassifyGeneratedRecords();
  do {
    const result = await ingestCompletedProductPages();
    if (result.blocked || !process.argv.includes('--watch')) break;
    if (await exists(path.join(ROOT, '.cache/samsclub-bulk/STOP'))) break;
    await new Promise((resolve) => setTimeout(resolve, 10000));
  } while (true);
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url)
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
