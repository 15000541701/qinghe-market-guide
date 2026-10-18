// Browser-session source driver for the already verified Sam’s Club IAB tab.
// It only navigates to queued public pages and saves their rendered DOM.
// It never solves challenges or calls private APIs.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_PENDING = path.join(PROJECT_ROOT, '.cache/samsclub-bulk/pending-pages.json');
const DEFAULT_OUTPUT = path.join(PROJECT_ROOT, '.cache/samsclub-bulk/verified-pages');
const CHALLENGE =
  /(?:are-you-human|access denied|verify (?:that )?you are human|robot check|security challenge|unusual traffic|human verification|captcha challenge)/i;

async function exists(file) {
  return fs.access(file).then(
    () => true,
    () => false,
  );
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = file + '.tmp-' + Date.now();
  await fs.writeFile(temporary, JSON.stringify(value, null, 2) + '\n');
  await fs.rename(temporary, file);
}

function checkedPublicUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'www.samsclub.com')
    throw new Error('Only public www.samsclub.com HTTPS pages may be collected.');
  if (url.pathname.includes('/are-you-human'))
    throw new Error('Verification routes are never collection targets.');
  if (!/^\/(?:browse|cp)\/(?:[^/]+\/)*\d+\/?$/.test(url.pathname) &&
      !/^\/ip\/.+\/\d+\/?$/.test(url.pathname))
    throw new Error('The queued URL is not a recognized public category or product page.');
  return url;
}

function safeKey(task) {
  const id = String(task.pageId || task.categoryId || task.id || '')
    .replace(/[^A-Za-z0-9_-]/g, '-')
    .slice(0, 100);
  const type = task.kind === 'product' ? 'product' : 'category';
  const page = Number.isInteger(Number(task.page)) && Number(task.page) > 1
    ? '-page-' + Number(task.page)
    : '';
  return type + '-' + (id || 'page') + page;
}

function challengeReason(info) {
  const url = String(info.url || '');
  const title = String(info.title || '');
  if (url.includes('/are-you-human')) return 'Sam’s Club redirected this page to /are-you-human.';
  if (CHALLENGE.test(title) || CHALLENGE.test(String(info.text || '').slice(0, 4000)))
    return 'Sam’s Club returned a human-verification or access-challenge page.';
  return null;
}

function samePagePath(requested, actual) {
  try {
    const a = new URL(requested);
    const b = new URL(actual);
    if (a.origin !== b.origin) return false;
    if (a.pathname === b.pathname) return true;
    const category = /^\/(?:browse|cp)\/(?:[^/]+\/)*(\d+)\/?$/;
    const product = /^\/ip\/.+\/(\d+)\/?$/;
    const aCategory = a.pathname.match(category), bCategory = b.pathname.match(category);
    if (aCategory && bCategory) return aCategory[1] === bCategory[1];
    const aProduct = a.pathname.match(product), bProduct = b.pathname.match(product);
    return !!aProduct && !!bProduct && aProduct[1] === bProduct[1];
  } catch {
    return false;
  }
}

/**
 * Collect at most ten pending public pages in one call.
 *
 * tab is the root task's existing CUA IAB tab. pendingFile is a JSON array of
 * { url, kind, categoryId, page, categoryName } records. The function saves
 * one complete HTML snapshot and metadata sidecar per successful URL, removes
 * only completed URLs from the queue, and stops immediately on a challenge
 * or unexpected redirect.
 */
export async function collectNext(tab, options = {}) {
  const startedAt = Date.now();
  const pendingFile = path.resolve(options.pendingFile || DEFAULT_PENDING);
  const outputDirectory = path.resolve(options.outputDirectory || DEFAULT_OUTPUT);
  const maxPages = Math.min(10, Math.max(1, Number(options.maxPages) || 10));
  const maxDurationMs = Math.min(40000, Math.max(5000, Number(options.maxDurationMs) || 40000));
  const progressFile = path.join(outputDirectory, 'progress.json');
  await fs.mkdir(outputDirectory, { recursive: true });

  let pending = JSON.parse(await fs.readFile(pendingFile, 'utf8'));
  if (!Array.isArray(pending)) throw new Error('pending-pages.json must contain an array.');
  const progress = (await exists(progressFile))
    ? JSON.parse(await fs.readFile(progressFile, 'utf8'))
    : { started_at: new Date().toISOString(), completed: [], failures: [] };
  progress.completed ||= [];
  progress.failures ||= [];

  const completedUrls = new Set(progress.completed.map((item) => item.url));
  const todo = pending.filter((task) => !completedUrls.has(task.url));
  const processed = [];
  let stopReason = null;

  for (const task of todo) {
    if (processed.length >= maxPages || Date.now() - startedAt >= maxDurationMs) break;
    let requested;
    try {
      requested = checkedPublicUrl(task.url);
    } catch (error) {
      stopReason = error.message;
      progress.failures.push({
        url: task.url,
        category_id: task.categoryId || null,
        at: new Date().toISOString(),
        error: error.message,
      });
      break;
    }

    try {
      const currentUrl = await tab.url();
      if (currentUrl !== requested.toString()) await tab.goto(requested.toString());
      await tab.playwright.waitForLoadState({
        state: 'domcontentloaded',
        timeoutMs: Math.min(15000, Math.max(4000, maxDurationMs - (Date.now() - startedAt))),
      });
      const requiresNextData =
        task.kind === 'product' || requested.pathname.startsWith('/browse/');
      let hasNextData = false;
      let nextDataWaitError = null;
      if (requiresNextData) {
        try {
          await tab.playwright.locator('script#__NEXT_DATA__').waitFor({
            state: 'attached',
            timeoutMs: Math.min(12000, Math.max(5000, maxDurationMs - (Date.now() - startedAt))),
          });
          hasNextData = true;
        } catch (error) {
          nextDataWaitError = error.message;
        }
      } else {
        await tab.playwright.locator('body').waitFor({
          state: 'visible',
          timeoutMs: Math.min(10000, Math.max(4000, maxDurationMs - (Date.now() - startedAt))),
        });
      }
      const info = await tab.playwright.evaluate(() => {
        const html = document.documentElement?.outerHTML || '';
        return {
          url: location.href,
          title: document.title || '',
          text: (document.body?.innerText || '').slice(0, 12000),
          html_parts: html.match(/[\s\S]{1,100000}/g) || [],
        };
      }, null, { timeoutMs: 20000 });
      const html = (info.html_parts || []).join('');
      const challenge = challengeReason({ ...info, html });
      if (challenge) {
        stopReason = challenge;
        progress.blocked_at = {
          requested_url: requested.toString(),
          actual_url: info.url,
          at: new Date().toISOString(),
          reason: challenge,
        };
        break;
      }
      if (requiresNextData && !hasNextData && String(info.text || '').trim().length < 80) {
        stopReason = 'The page remained a thin shell without __NEXT_DATA__ or visible product/category content.';
        progress.failures.push({
          url: requested.toString(),
          category_id: task.categoryId || null,
          at: new Date().toISOString(),
          error: stopReason,
          next_data_wait_error: nextDataWaitError,
        });
        break;
      }
      if (!samePagePath(requested.toString(), info.url)) {
        stopReason = 'Unexpected redirect; the requested category or product identity changed.';
        progress.blocked_at = {
          requested_url: requested.toString(),
          actual_url: info.url,
          at: new Date().toISOString(),
          reason: stopReason,
        };
        break;
      }
      if (!html.includes('<html')) throw new Error('The public page DOM was empty.');

      const capturedAt = new Date().toISOString();
      const key = safeKey(task);
      const htmlFile = path.join(outputDirectory, key + '.html');
      const metadataFile = htmlFile + '.meta.json';
      const metadata = {
        requested_url: requested.toString(),
        url: info.url,
        kind: task.kind === 'product' ? 'product' : 'category',
        category_id: task.categoryId || null,
        category_name: task.categoryName || null,
        source_category_url: task.sourceCategoryUrl || null,
        page_id: task.pageId || requested.pathname.match(/\/(\d+)\/?$/)?.[1] || null,
        listing_price: task.listingPrice || null,
        listing_unit_price: task.listingUnitPrice || null,
        page: task.page || 1,
        has_next_data: hasNextData,
        next_data_wait_error: nextDataWaitError,
        captured_at: capturedAt,
        transport: 'verified-iab-dom',
        title: info.title || null,
        html_file: path.relative(PROJECT_ROOT, htmlFile),
      };
      await fs.writeFile(htmlFile, html);
      await writeJson(metadataFile, metadata);
      const record = {
        url: requested.toString(),
        html_file: metadata.html_file,
        captured_at: capturedAt,
        kind: metadata.kind,
        page_id: metadata.page_id,
        category_id: metadata.category_id,
        category_name: metadata.category_name,
        source_category_url: metadata.source_category_url,
      };
      progress.completed.push(record);
      processed.push(record);
      pending = pending.filter((item) => item.url !== task.url);
      await writeJson(pendingFile, pending);
      progress.updated_at = new Date().toISOString();
      progress.last_saved = record;
      progress.remaining = pending.length;
      await writeJson(progressFile, progress);
    } catch (error) {
      stopReason = error.message;
      progress.failures.push({
        url: requested.toString(),
        category_id: task.categoryId || null,
        at: new Date().toISOString(),
        error: error.message,
      });
      progress.updated_at = new Date().toISOString();
      progress.remaining = pending.length;
      await writeJson(progressFile, progress);
      break;
    }
  }

  progress.updated_at = new Date().toISOString();
  progress.last_batch = {
    started_at: new Date(startedAt).toISOString(),
    completed_at: new Date().toISOString(),
    pages_saved: processed.length,
    remaining: pending.length,
    stop_reason: stopReason,
  };
  progress.remaining = pending.length;
  await writeJson(progressFile, progress);
  return progress.last_batch;
}
