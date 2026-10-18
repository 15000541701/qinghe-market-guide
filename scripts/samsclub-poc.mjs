#!/usr/bin/env node
// Read public HTML only. This PoC never imports into the application's market.sqlite.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const exec = promisify(execFile);
export const DEFAULT_CATEGORY =
  'https://www.samsclub.com/browse/members-mark-fresh-foods-bakery/17080222?rootDimension=p_retail_sort';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const numberOrNull = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export function canonicalProductUrl(value) {
  const url = new URL(value, 'https://www.samsclub.com');
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'www.samsclub.com' ||
    !/^\/ip\/.+\/\d+\/?$/.test(url.pathname)
  )
    throw new Error(`Unexpected product URL: ${value}`);
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function imageRequestUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    !/^i\d+\.samsclubimages\.com$/.test(url.hostname) ||
    !url.pathname.startsWith('/asr/')
  )
    throw new Error(`Unexpected gallery image URL: ${value}`);
  url.search = '';
  url.hash = '';
  url.searchParams.set('odnHeight', '2000');
  url.searchParams.set('odnWidth', '2000');
  url.searchParams.set('odnBg', 'FFFFFF');
  return url.toString();
}

export function nextData(html) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const script = scripts.find((match) => /\bid=["']__NEXT_DATA__["']/.test(match[1]));
  if (!script)
    throw new Error(
      'Public HTML contains no __NEXT_DATA__; inspect the saved page before changing the parser.',
    );
  return JSON.parse(script[2]).props?.pageProps;
}

export function categoryProducts(html) {
  const search = nextData(html)?.initialData?.searchResult;
  if (!search?.itemStacks) throw new Error('Category HTML has no searchResult.itemStacks.');
  const result = new Map();
  for (const stack of search.itemStacks) {
    for (const product of stack.items || []) {
      if (!product.name || !product.canonicalUrl || !product.usItemId) continue;
      const url = canonicalProductUrl(product.canonicalUrl);
      if (!result.has(url))
        result.set(url, {
          product_url: url,
          page_id: String(product.usItemId),
          name: product.name,
          listing_price:
            product.priceInfo?.linePriceDisplay || product.priceInfo?.linePrice || null,
          listing_unit_price: product.priceInfo?.unitPrice || null,
        });
    }
  }
  if (!result.size) throw new Error('No product links found in the category snapshot.');
  return [...result.values()];
}

export function detailProduct(html, candidate, capturedAt) {
  if (accessChallenge(0, '', html)) {
    const error = new Error('Saved product HTML is an access challenge.');
    error.blocked = true;
    throw error;
  }
  try {
    const data = nextData(html)?.initialData?.data;
    const visible = html
      .slice(
        0,
        html.indexOf('<script id="__NEXT_DATA__"') < 0
          ? html.length
          : html.indexOf('<script id="__NEXT_DATA__"'),
      )
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ');
    const visibleItem = visible.match(/Item\s*#\s*(\d+)/i)?.[1];
    return detailDataProduct(data, candidate, capturedAt, visibleItem);
  } catch (error) {
    if (error && typeof error === 'object' && !error.blocked) error.sourceReview = true;
    throw error;
  }
}

export function detailDataProduct(data, candidate, capturedAt, visibleItem) {
  const product = data?.product;
  if (!product?.name || String(product.usItemId) !== candidate.page_id)
    throw new Error('Detail product identity does not match the requested page ID.');
  const channels = product.channelLevelPriceInfo || [];
  const itemNumbers = [
    ...new Set(
      channels
        .map((channel) => channel.itemNumber)
        .filter(Boolean)
        .map(String),
    ),
  ];
  if (visibleItem && !itemNumbers.includes(String(visibleItem)))
    throw new Error('Conflicting Item # values; refusing to merge different products.');
  if (!visibleItem && itemNumbers.length > 1)
    throw new Error('Conflicting Item # values; refusing to merge different products.');
  const itemId = visibleItem ? String(visibleItem) : itemNumbers[0];
  if (!/^\d+$/.test(itemId || ''))
    throw new Error('Missing verified Item #; page ID is not used as a substitute.');
  const productChannels = channels.filter((channel) => String(channel.itemNumber || '') === itemId);
  const gallery = product.imageInfo?.allImages;
  if (!Array.isArray(gallery) || !gallery.length)
    throw new Error('No explicit main-product gallery found.');
  const urls = new Map();
  for (const image of gallery) {
    if (!image.url) throw new Error('Gallery entry has no URL.');
    const request = imageRequestUrl(image.url);
    if (!urls.has(request)) urls.set(request, image.url);
  }
  const location = product.location || {};
  const selected = (product.fulfillmentOptions || []).find((option) => option.selected);
  const selectedItemNumber =
    selected?.itemNumber || selected?.usItemId || selected?.item?.itemNumber || null;
  const selectedAppliesToMain = selectedItemNumber
    ? String(selectedItemNumber) === itemId
    : itemNumbers.length === 1;
  const rawClub = location.pickupLocation?.storeId || null;
  const clubId = rawClub == null ? null : String(rawClub);
  const summaryClub = (type) => {
    if (itemNumbers.length > 1) return null;
    const ids = [
      ...new Set(
        (product.fulfillmentSummary || [])
          .filter((entry) => entry.fulfillment === type && entry.storeId != null)
          .map((entry) => String(entry.storeId)),
      ),
    ];
    return clubId && ids.includes(clubId) ? clubId : ids.length === 1 ? ids[0] : null;
  };
  const context = {
    city: location.city || null,
    state: location.stateOrProvinceCode || null,
    postal_code: location.postalCode || null,
    club_name: selectedAppliesToMain ? selected?.storeName || selected?.locationText || null : null,
  };
  const prices = [];
  for (const channel of productChannels) {
    const info = channel.channelPriceInfo;
    const amount = numberOrNull(info?.currentPrice?.price);
    if (amount === null) continue;
    prices.push({
      item_id: itemId,
      club_id: channel.storeFrontType === 'PHYSICAL' ? summaryClub(channel.type) : null,
      channel: channel.type,
      storefront_type: channel.storeFrontType,
      price: amount,
      currency: info.currentPrice.currencyUnit || null,
      unit_price: numberOrNull(info.unitPrice?.price),
      unit_price_text: info.unitPrice?.priceString || null,
      unit_price_uom: info.priceDisplayCodes?.pricePerUnitUom || null,
      final_cost_by_weight: info.priceDisplayCodes?.finalCostByWeight === true,
      selected_channel: selectedAppliesToMain && selected?.type === channel.type,
      captured_at: capturedAt,
      product_url: candidate.product_url,
      ...context,
      price_note:
        'Public page observation; prices may vary in club and online. captured_at is retrieval time, not price-update time.',
    });
  }
  // A displayed price is retained even when the public page has no channel prices.
  if (
    !prices.length &&
    itemNumbers.length === 1 &&
    itemNumbers[0] === itemId &&
    numberOrNull(product.priceInfo?.currentPrice?.price) !== null
  ) {
    prices.push({
      item_id: itemId,
      club_id: null,
      channel: 'DISPLAYED_CONTEXT_UNRESOLVED',
      storefront_type: null,
      price: product.priceInfo.currentPrice.price,
      currency: product.priceInfo.currentPrice.currencyUnit || null,
      unit_price: numberOrNull(product.priceInfo.unitPrice?.price),
      unit_price_text: product.priceInfo.unitPrice?.priceString || null,
      unit_price_uom: product.priceInfo.priceDisplayCodes?.pricePerUnitUom || null,
      final_cost_by_weight: product.priceInfo.priceDisplayCodes?.finalCostByWeight === true,
      selected_channel: false,
      captured_at: capturedAt,
      product_url: candidate.product_url,
      ...context,
      price_note: 'Displayed price only; no verified channel-to-club association.',
    });
  }
  const images = [...urls].map(([url, source], index) => ({
    item_id: itemId,
    image_index: index,
    source_image_url: source,
    image_url: url,
    requested_width: 2000,
    requested_height: 2000,
    status: 'pending',
  }));
  return {
    product: {
      item_id: itemId,
      page_id: candidate.page_id,
      product_name: product.name,
      brand: product.brand || null,
      barcode: product.upc || null,
      product_url: candidate.product_url,
      captured_at: capturedAt,
      gallery_count: images.length,
      short_description_html: product.shortDescription || null,
      specifications: data.idml?.specifications || [],
      listing_price_text: candidate.listing_price,
      listing_unit_price_text: candidate.listing_unit_price,
    },
    images,
    prices,
  };
}

export function csv(rows, columns) {
  const cell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return (
    '\uFEFF' +
    [
      columns.map(cell).join(','),
      ...rows.map((row) => columns.map((key) => cell(row[key])).join(',')),
    ].join('\r\n') +
    '\r\n'
  );
}

async function writeJson(file, value) {
  await fs.writeFile(`${file}.tmp`, JSON.stringify(value, null, 2) + '\n');
  await fs.rename(`${file}.tmp`, file);
}

async function exists(file) {
  return fs.access(file).then(
    () => true,
    () => false,
  );
}

export function accessChallenge(status, headers, html = '') {
  return (
    [403, 429, 412].includes(status) ||
    /^location:\s*[^\r\n]*(?:are-you-human|captcha|challenge)/im.test(headers) ||
    /<title>\s*(?:Access Denied|Robot|Just a moment|Security|Let us know)/i.test(html)
  );
}

// curl is used as the ordinary HTTP transport. No cookies, credentials, proxy rotation or private APIs.
async function download(url, file, maxBytes, kind) {
  const temporary = `${file}.part`;
  const headerFile = `${file}.headers`;
  const startedAt = new Date().toISOString();
  try {
    const { stdout } = await exec(
      'curl',
      [
        '--silent',
        '--show-error',
        '--proto',
        '=https',
        '--connect-timeout',
        '10',
        '--max-time',
        '40',
        '--max-filesize',
        String(maxBytes),
        '--user-agent',
        'QingheCatalogPoC/1.0 (public-page research)',
        '--dump-header',
        headerFile,
        '--output',
        temporary,
        '--write-out',
        '%{http_code}',
        url,
      ],
      { maxBuffer: 1024 * 1024, timeout: 45000 },
    );
    const status = Number(stdout.trim());
    const headers = await fs.readFile(headerFile, 'utf8');
    const audit = {
      url,
      status,
      captured_at: startedAt,
      completed_at: new Date().toISOString(),
      headers,
    };
    await writeJson(`${file}.http.json`, audit);
    if (status !== 200) {
      const error = new Error(`HTTP ${status} for ${url}`);
      error.blocked = accessChallenge(status, headers);
      throw error;
    }
    const stats = await fs.stat(temporary);
    if (!stats.size || stats.size > maxBytes)
      throw new Error(`Invalid ${kind} body size: ${stats.size}`);
    if (kind === 'html') {
      const head = (await fs.readFile(temporary, 'utf8')).slice(0, 20000);
      if (accessChallenge(status, headers, head)) {
        const error = new Error(
          'Access challenge received; stopped without retrying or bypassing it.',
        );
        error.blocked = true;
        throw error;
      }
    } else if (!/^content-type:\s*image\//im.test(headers)) {
      throw new Error('CDN response is not image/*; refusing to save it as an image.');
    }
    await fs.rename(temporary, file);
    return audit;
  } finally {
    await fs.rm(temporary, { force: true });
    await fs.rm(headerFile, { force: true });
  }
}

async function htmlSnapshot(url, file, options) {
  if (!options.refresh && (await exists(file))) {
    const audit = await fs.readFile(`${file}.http.json`, 'utf8').then(JSON.parse);
    if (audit.url !== url || audit.status !== 200)
      throw new Error('Cached page provenance does not match URL.');
    return { html: await fs.readFile(file, 'utf8'), audit };
  }
  if (options.offline) {
    const audit = await fs
      .readFile(`${file}.http.json`, 'utf8')
      .then(JSON.parse)
      .catch(() => null);
    const error = new Error(
      `Missing offline snapshot${audit ? `; last HTTP status ${audit.status}` : ''}: ${file}`,
    );
    error.blocked = audit && accessChallenge(audit.status, audit.headers || '');
    throw error;
  }
  await sleep(600);
  const audit = await download(url, file, 12 * 1024 * 1024, 'html');
  return { html: await fs.readFile(file, 'utf8'), audit };
}

async function inspectImage(file) {
  const bytes = await fs.readFile(file);
  const image = sharp(bytes, { limitInputPixels: 40_000_000 });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp'].includes(metadata.format))
    throw new Error('Downloaded file is not a supported decodable image.');
  await image.clone().resize({ width: 16, height: 16, fit: 'inside' }).raw().toBuffer();
  return { bytes, metadata };
}

async function saveImage(row, directory, options) {
  const relative = `images/${row.item_id}/${String(row.image_index).padStart(2, '0')}.jpg`;
  const file = path.join(directory, relative);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const raw = `${file}.download`;
  let audit;
  if (await exists(file)) {
    audit = await fs.readFile(`${file}.http.json`, 'utf8').then(JSON.parse);
    if (audit.url !== row.image_url || audit.status !== 200)
      throw new Error('Cached image provenance mismatch.');
  } else {
    if (options.offline) throw new Error(`Missing offline image: ${relative}`);
    audit = await download(row.image_url, raw, 20 * 1024 * 1024, 'image');
    try {
      const { bytes, metadata } = await inspectImage(raw);
      if (metadata.format === 'jpeg') await fs.rename(raw, file);
      else {
        await sharp(bytes).jpeg({ quality: 95 }).toFile(`${file}.part`);
        await fs.rename(`${file}.part`, file);
      }
      audit.download_format = metadata.format;
      audit.converted_to_jpeg = metadata.format !== 'jpeg';
      await writeJson(`${file}.http.json`, audit);
    } finally {
      await fs.rm(raw, { force: true });
      await fs.rm(`${raw}.http.json`, { force: true });
    }
  }
  const { bytes, metadata } = await inspectImage(file);
  Object.assign(row, {
    status: 'ok',
    local_file: relative,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    byte_size: bytes.length,
    image_captured_at: audit.captured_at,
    source_format: audit.download_format,
    converted_to_jpeg: audit.converted_to_jpeg,
    meets_2000_both_axes: metadata.width >= 2000 && metadata.height >= 2000,
  });
}

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

async function exportResults(directory, products, images, prices, summary) {
  await writeJson(path.join(directory, 'products.json'), products);
  await writeJson(path.join(directory, 'product_images.json'), images);
  await writeJson(path.join(directory, 'prices.json'), prices);
  await writeJson(path.join(directory, 'summary.json'), summary);
  const maxImages = Math.max(6, ...products.map((product) => product.gallery_count));
  const columns = [
    'item_id',
    'product_name',
    'price',
    'currency',
    'unit_price',
    'club_id',
    'price_channel',
    'captured_at',
    'product_url',
    'gallery_count',
    'downloaded_images',
    ...Array.from({ length: maxImages }, (_, i) => `image_${i}`),
  ];
  const rows = products.map((product) => {
    const observations = prices.filter((price) => price.item_id === product.item_id);
    const price = observations.find((value) => value.selected_channel) || observations[0];
    const gallery = images.filter((image) => image.item_id === product.item_id);
    return {
      ...product,
      price: price?.price,
      currency: price?.currency,
      unit_price: price?.unit_price_text,
      club_id: price?.club_id,
      price_channel: price?.channel,
      downloaded_images: gallery.filter((image) => image.status === 'ok').length,
      ...Object.fromEntries(
        gallery.map((image) => [
          `image_${image.image_index}`,
          image.status === 'ok' ? image.local_file : '',
        ]),
      ),
    };
  });
  await fs.writeFile(path.join(directory, 'products.csv'), csv(rows, columns));
  await fs.writeFile(
    path.join(directory, 'product_images.csv'),
    csv(images, [
      'item_id',
      'image_index',
      'source_image_url',
      'image_url',
      'local_file',
      'status',
      'width',
      'height',
      'byte_size',
      'meets_2000_both_axes',
      'error',
    ]),
  );
  await fs.writeFile(
    path.join(directory, 'prices.csv'),
    csv(prices, [
      'item_id',
      'club_id',
      'channel',
      'selected_channel',
      'price',
      'currency',
      'unit_price',
      'unit_price_text',
      'unit_price_uom',
      'final_cost_by_weight',
      'city',
      'state',
      'postal_code',
      'club_name',
      'captured_at',
      'product_url',
      'price_note',
    ]),
  );
  const cards = products
    .map((product) => {
      const gallery = images.filter((image) => image.item_id === product.item_id);
      const observed = prices.filter((price) => price.item_id === product.item_id);
      const price = observed.find((value) => value.selected_channel) || observed[0];
      return `<article><h2>${escapeHtml(product.product_name)}</h2><p>Item # ${product.item_id} · ${escapeHtml(price?.currency)} ${escapeHtml(price?.price)} · club ${escapeHtml(price?.club_id)} · ${escapeHtml(price?.channel)}</p><p><a href="${escapeHtml(product.product_url)}">商品来源</a> · ${escapeHtml(product.captured_at)}</p><div class="gallery">${gallery.map((image) => (image.status === 'ok' ? `<figure><a href="${escapeHtml(image.local_file)}"><img loading="lazy" src="${escapeHtml(image.local_file)}" alt="${escapeHtml(product.product_name)} image ${image.image_index}"></a><figcaption>${image.image_index}: ${image.width} × ${image.height}</figcaption></figure>` : `<p>图片 ${image.image_index}: ${escapeHtml(image.error || image.status)}</p>`)).join('')}</div></article>`;
    })
    .join('\n');
  await fs.writeFile(
    path.join(directory, 'gallery.html'),
    `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sam’s Club 图片采集 PoC</title><style>body{font:16px system-ui;max-width:1200px;margin:32px auto;padding:0 20px;background:#f5f6f8;color:#172632}h1{font-size:28px}h2{font-size:19px}article{background:white;padding:20px;margin:20px 0;border-radius:12px}p{font-size:14px;overflow-wrap:anywhere}.gallery{display:flex;gap:12px;overflow-x:auto;padding-bottom:12px}figure{flex:0 0 240px;margin:0}img{width:240px;height:240px;object-fit:contain;background:white}figcaption{font-size:13px;color:#596775}a{color:#005bb5}</style><h1>Sam’s Club 商品图片 PoC</h1><p>${products.length}/${summary.requested_products} 个商品 · ${images.filter((image) => image.status === 'ok').length}/${images.length} 张图片。请求 2000 × 2000；下方显示文件实测尺寸，未放大原图。</p><p>价格是公开页面在相应门店/渠道上下文中的采集记录，不是统一全国价。此批资料没有写入青禾商品库。</p>${cards}</html>`,
  );
}

export async function main(args = process.argv.slice(2)) {
  const value = (prefix, fallback) =>
    args.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? fallback;
  if (args.includes('--help')) {
    console.log(
      'node scripts/samsclub-poc.mjs [--limit=20] [--out=.cache/samsclub-poc/RUN] [--category=URL] [--refresh] [--offline]',
    );
    console.log(
      'Public HTML → verified Item # → all main-product gallery images → request 2000px and measure actual dimensions.',
    );
    console.log(
      'Outputs products.csv, normalized JSON/CSV, original-size JPEGs, HTML gallery and audit snapshots. Existing app data is untouched.',
    );
    return;
  }
  const limit = Number(value('--limit=', '20'));
  if (!Number.isInteger(limit) || limit < 1 || limit > 20)
    throw new Error('--limit must be an integer from 1 to 20.');
  const categoryUrl = new URL(value('--category=', DEFAULT_CATEGORY));
  if (
    categoryUrl.protocol !== 'https:' ||
    categoryUrl.hostname !== 'www.samsclub.com' ||
    !categoryUrl.pathname.startsWith('/browse/')
  )
    throw new Error('Category must be a public https://www.samsclub.com/browse/ URL.');
  const directory = path.resolve(
    value('--out=', `.cache/samsclub-poc/${new Date().toISOString().slice(0, 10)}`),
  );
  const options = { offline: args.includes('--offline'), refresh: args.includes('--refresh') };
  if (options.offline && options.refresh)
    throw new Error('--offline and --refresh cannot be combined.');
  await fs.mkdir(path.join(directory, 'html'), { recursive: true });
  const summary = {
    started_at: new Date().toISOString(),
    category_url: categoryUrl.toString(),
    requested_products: limit,
    transport:
      'public HTML __NEXT_DATA__; HTTP snapshots and optional browser DOM snapshots; no internal API calls',
    http_products: 0,
    browser_products: 0,
    output_directory: directory,
    failures: [],
  };
  const products = [],
    images = [],
    prices = [];
  try {
    const category = await htmlSnapshot(
      categoryUrl.toString(),
      path.join(directory, 'html', 'category.html'),
      options,
    );
    const candidates = categoryProducts(category.html);
    summary.category_captured_at = category.audit.captured_at;
    summary.category_candidates = candidates.length;
    await writeJson(path.join(directory, 'candidates.json'), candidates);
    const selected = candidates.slice(0, limit);
    await writeJson(path.join(directory, 'selected.json'), selected);
    for (const [index, candidate] of selected.entries()) {
      try {
        const browserFile = path.join(directory, 'html', `${candidate.page_id}.browser.json`);
        let parsed;
        if (!options.refresh && (await exists(browserFile))) {
          const snapshot = JSON.parse(await fs.readFile(browserFile, 'utf8'));
          if (
            snapshot.url !== candidate.product_url ||
            snapshot.transport !== 'browser DOM after manual verification'
          )
            throw new Error('Browser snapshot provenance mismatch.');
          parsed = detailDataProduct(
            snapshot.data,
            candidate,
            snapshot.captured_at,
            snapshot.visible_item_id,
          );
          summary.browser_products++;
        } else {
          const detail = await htmlSnapshot(
            candidate.product_url,
            path.join(directory, 'html', `${candidate.page_id}.html`),
            options,
          );
          parsed = detailProduct(detail.html, candidate, detail.audit.captured_at);
          summary.http_products++;
        }
        if (products.some((product) => product.item_id === parsed.product.item_id))
          throw new Error('Duplicate Item # across selected URLs.');
        products.push(parsed.product);
        images.push(...parsed.images);
        prices.push(...parsed.prices);
        console.log(
          `[${index + 1}/${limit}] Item # ${parsed.product.item_id}: ${parsed.images.length} gallery images — ${parsed.product.product_name}`,
        );
      } catch (error) {
        summary.failures.push({
          stage: 'detail',
          product_url: candidate.product_url,
          error: error.message,
        });
        console.error(`[${index + 1}/${limit}] ${error.message}`);
        if (error.blocked) {
          summary.stop_reason = error.message;
          break;
        }
      }
    }
    await exportResults(directory, products, images, prices, summary);
    let cursor = 0,
      completed = 0,
      stop = false;
    const worker = async () => {
      while (!stop && cursor < images.length) {
        const image = images[cursor++];
        try {
          await saveImage(image, directory, options);
        } catch (error) {
          Object.assign(image, { status: 'failed', error: error.message });
          summary.failures.push({
            stage: 'image',
            item_id: image.item_id,
            image_index: image.image_index,
            error: error.message,
          });
          if (error.blocked) {
            stop = true;
            summary.stop_reason = error.message;
          }
        }
        completed++;
        if (completed % 10 === 0 || completed === images.length)
          console.log(
            `Images ${completed}/${images.length}; saved ${images.filter((entry) => entry.status === 'ok').length}`,
          );
        if (!options.offline) await sleep(250);
      }
    };
    await Promise.all([worker(), worker()]);
  } catch (error) {
    summary.stop_reason = error.message;
    console.error(`Stopped: ${error.message}`);
  }
  const ok = images.filter((image) => image.status === 'ok');
  const dimensions = {};
  for (const image of ok) {
    const key = `${image.width}x${image.height}`;
    dimensions[key] = (dimensions[key] || 0) + 1;
  }
  Object.assign(summary, {
    completed_at: new Date().toISOString(),
    extracted_products: products.length,
    unique_item_ids: new Set(products.map((product) => product.item_id)).size,
    price_observations: prices.length,
    gallery_images: images.length,
    downloaded_images: ok.length,
    failed_images: images.filter((image) => image.status === 'failed').length,
    pending_images: images.filter((image) => image.status === 'pending').length,
    actual_dimensions: dimensions,
    meets_2000_both_axes: ok.filter((image) => image.meets_2000_both_axes).length,
    total_image_bytes: ok.reduce((sum, image) => sum + image.byte_size, 0),
    complete:
      products.length === limit &&
      images.length > 0 &&
      ok.length === images.length &&
      !summary.stop_reason,
    note: '2000px URL parameters do not guarantee 2000px source resolution. Saved images are never upscaled. No app database changes.',
  });
  await exportResults(directory, products, images, prices, summary);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.complete) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
