import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const apiBase = (process.env.QINGHE_API_BASE || 'http://127.0.0.1:3001').replace(/\/$/, '');
const cacheDirectory = path.resolve(process.cwd(), '.cache', 'product-images');
const manifestPath = path.join(cacheDirectory, 'precache-manifest.json');
const concurrency = 3;
const maxAttempts = 3;
const cacheMaxAgeMs = 30 * 24 * 60 * 60 * 1000;
const progressEvery = 100;
const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
let stopReason = '';
let cursor = 0;
let completed = 0;
let success = 0;
let failed = 0;
let hits = 0;
let misses = 0;
let skipped = 0;
let writeQueue = Promise.resolve();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canonicalSmallUrl(source) {
  const url = new URL(source);
  url.pathname = url.pathname.replace(/\.400\.(jpe?g|png|webp)$/i, '.200.$1');
  return url.toString();
}

function cacheKey(url) {
  return createHash('sha256').update(url).digest('hex');
}

function imageExtension(url) {
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return extensions.has(extension) ? extension : '';
}

function imageUrlMatchesBarcode(source, barcode) {
  try {
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.hostname !== 'images.openfoodfacts.org') return false;
    const pathMatch = url.pathname.match(/^\/images\/products\/(\d+)\/(\d+)\/(\d+)\/(\d+)\//);
    return !!pathMatch && pathMatch.slice(1).join('') === String(barcode || '');
  } catch {
    return false;
  }
}

function freshCachePath(canonicalUrl) {
  const extension = imageExtension(canonicalUrl);
  if (!extension) return '';
  return path.join(cacheDirectory, `${cacheKey(canonicalUrl)}${extension}`);
}

async function isCached(canonicalUrl) {
  const file = freshCachePath(canonicalUrl);
  if (!file) return false;
  try {
    const details = await stat(file);
    return details.size > 0 && details.size <= 2 * 1024 * 1024 && Date.now() - details.mtimeMs <= cacheMaxAgeMs;
  } catch {
    return false;
  }
}

async function saveManifest(manifest) {
  manifest.updatedAt = new Date().toISOString();
  writeQueue = writeQueue.then(async () => {
    const temporary = `${manifestPath}.tmp`;
    await writeFile(temporary, JSON.stringify(manifest, null, 2));
    await rename(temporary, manifestPath);
  });
  return writeQueue;
}

function retryDelay(response, attempt) {
  const value = response?.headers.get('retry-after');
  if (value) {
    const seconds = Number(value);
    const dateDelay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
    if (Number.isFinite(dateDelay) && dateDelay > 0) return Math.min(dateDelay, 120_000);
  }
  return Math.min(30_000, 1000 * 2 ** (attempt - 1));
}

async function loadCatalog() {
  const response = await fetch(`${apiBase}/api/products`, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`商品 API 返回 HTTP ${response.status}。`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('商品 API 没有返回商品数组。');
  const byCanonicalUrl = new Map();
  let invalidImageCount = 0;
  for (const product of rows) {
    if (product.catalogOrigin !== 'open-prices' || product.currency !== 'USD') continue;
    const source = [product.image, product.sourceImageUrl].find(
      (url) => typeof url === 'string' && imageUrlMatchesBarcode(url, product.barcode),
    );
    if (!source) {
      invalidImageCount++;
      continue;
    }
    const canonicalUrl = canonicalSmallUrl(source);
    const entry = byCanonicalUrl.get(canonicalUrl) || {
      source,
      canonicalUrl,
      barcodes: [],
      names: [],
    };
    if (product.barcode) entry.barcodes.push(String(product.barcode));
    if (product.name) entry.names.push(String(product.name));
    byCanonicalUrl.set(canonicalUrl, entry);
  }
  return { entries: [...byCanonicalUrl.values()], invalidImageCount };
}

async function warmOne(entry) {
  const url = `${apiBase}/api/product-image?src=${encodeURIComponent(entry.source)}&size=map`;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(45_000) });
    } catch (error) {
      if (attempt < maxAttempts) {
        await delay(Math.max(30_000, 1000 * 2 ** (attempt - 1)));
        continue;
      }
      return { ok: false, status: 0, message: error instanceof Error ? error.message : '网络请求失败' };
    }

    if (response.status === 403) {
      stopReason = `遇到403，按要求停止：${entry.barcodes[0] || entry.source}`;
      await response.body?.cancel();
      return { ok: false, status: 403, message: '上游拒绝访问，停止后续请求' };
    }
    if (response.status === 429 || response.status === 503) {
      if (attempt < maxAttempts) {
        const waitMs = retryDelay(response, attempt);
        await response.body?.cancel();
        await delay(waitMs);
        continue;
      }
      const message = `HTTP ${response.status}，重试次数已用完`;
      await response.body?.cancel();
      return { ok: false, status: response.status, message };
    }
    if (response.status === 404) {
      await response.body?.cancel();
      return { ok: false, status: 404, message: '官方图与原图均不可用' };
    }
    if (response.status >= 500 && attempt < maxAttempts) {
      const waitMs = retryDelay(response, attempt);
      await response.body?.cancel();
      await delay(waitMs);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      return { ok: false, status: response.status, message: `HTTP ${response.status}` };
    }

    const mime = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime || '')) {
      await response.body?.cancel();
      return { ok: false, status: response.status, message: `错误的图片类型：${mime || 'unknown'}` };
    }
    const body = await response.arrayBuffer();
    if (!body.byteLength || body.byteLength > 2 * 1024 * 1024) {
      return { ok: false, status: response.status, message: `图片字节数超限或为空：${body.byteLength}` };
    }
    if (!(await isCached(entry.canonicalUrl))) {
      return { ok: false, status: response.status, message: '代理返回图片，但canonical缓存文件未落盘' };
    }
    return {
      ok: true,
      status: response.status,
      bytes: body.byteLength,
      cache: response.headers.get('x-image-cache') || 'unknown',
      cacheKey: cacheKey(entry.canonicalUrl),
      message: '',
    };
  }
  return { ok: false, status: 0, message: '超过重试次数' };
}

async function main() {
  await mkdir(cacheDirectory, { recursive: true });
  let previous = {};
  try {
    previous = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    // A missing or invalid progress file is rebuilt from the live API and cache.
  }
  const { entries, invalidImageCount } = await loadCatalog();
  const manifest = {
    version: 1,
    apiBase,
    updatedAt: new Date().toISOString(),
    targetProducts: 1000,
    targetUniqueImages: entries.length,
    invalidImageCount,
    status: 'running',
    items: previous.items && typeof previous.items === 'object' ? previous.items : {},
  };
  const pending = [];
  for (const entry of entries) {
    if (await isCached(entry.canonicalUrl)) {
      skipped++;
      manifest.items[cacheKey(entry.canonicalUrl)] = {
        canonicalUrl: entry.canonicalUrl,
        barcodes: entry.barcodes,
        names: entry.names,
        status: 'cached',
        cache: 'preexisting',
        updatedAt: new Date().toISOString(),
      };
    } else pending.push(entry);
  }
  await saveManifest(manifest);
  console.log(
    `预缓存开始：1000个USD真实商品，${entries.length}个唯一条码图片；已有canonical缓存${skipped}张，待取${pending.length}张，错误源${invalidImageCount}条，并发${concurrency}。`,
  );

  async function worker() {
    while (cursor < pending.length && !stopReason) {
      const entry = pending[cursor++];
      const result = await warmOne(entry);
      const key = cacheKey(entry.canonicalUrl);
      manifest.items[key] = {
        canonicalUrl: entry.canonicalUrl,
        barcodes: entry.barcodes,
        names: entry.names,
        status: result.ok ? 'cached' : 'failed',
        cache: result.cache || '',
        bytes: result.bytes || 0,
        httpStatus: result.status,
        error: result.message || '',
        updatedAt: new Date().toISOString(),
      };
      completed++;
      if (result.ok) {
        success++;
        if (result.cache === 'HIT' || result.cache === 'SHARED') hits++;
        else misses++;
      } else failed++;
      if (completed % progressEvery === 0 || completed === pending.length || stopReason) {
        await saveManifest(manifest);
        console.log(
          `进度：已处理${skipped + completed}/${entries.length}，成功${skipped + success}，新命中${hits}，新取${misses}，失败${failed}，剩余${Math.max(0, pending.length - completed)}。`,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker));
  manifest.status = stopReason ? 'stopped' : 'complete';
  manifest.stopReason = stopReason;
  manifest.finishedAt = new Date().toISOString();
  await saveManifest(manifest);
  console.log(
    `预缓存${manifest.status}：唯一图${entries.length}，本地已有/成功${skipped + success}，新缓存命中${hits}，新下载${misses}，失败${failed}，剩余${Math.max(0, entries.length - skipped - completed)}。${stopReason}`,
  );
}

main().catch((error) => {
  console.error(`预缓存失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
