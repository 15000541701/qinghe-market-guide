import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Express, Request, Response } from 'express';
import {
  isOfficialOpenFoodFactsImage,
  productImageVariantUrl,
  type ProductImageSize,
} from '../shared/product-image';

const cacheDirectory = path.resolve(process.cwd(), '.cache', 'product-images');
const maxImageBytes = 2 * 1024 * 1024;
const maxCacheAgeMs = 30 * 24 * 60 * 60 * 1000;
const maxCacheBytes = 256 * 1024 * 1024;
const maxCacheFiles = 2000;
const maxActiveFetches = 4;
const maxQueuedFetches = 24;
const negativeCacheMs = 30_000;
const cacheControl = 'public, max-age=604800, stale-while-revalidate=86400';
const sizes = new Set<ProductImageSize>(['card', 'list', 'map', 'admin']);
const inFlight = new Map<string, Promise<{ body: Buffer; contentType: string }>>();
const recentlyFailed = new Map<string, number>();
const fetchQueue: Array<() => void> = [];
let activeFetches = 0;

const mimeByExtension: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

class ImageFetchError extends Error {
  constructor(
    message: string,
    readonly statusCode = 502,
  ) {
    super(message);
  }
}

function cachePaths(url: string) {
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  if (!mimeByExtension[extension]) throw new ImageFetchError('Unsupported image format.', 400);
  const hash = createHash('sha256').update(url).digest('hex');
  return {
    body: path.join(cacheDirectory, `${hash}${extension}`),
    temporary: path.join(cacheDirectory, `${hash}.${randomUUID()}.tmp`),
    contentType: mimeByExtension[extension],
  };
}

async function readFreshCache(url: string) {
  const paths = cachePaths(url);
  try {
    const details = await stat(paths.body);
    if (Date.now() - details.mtimeMs > maxCacheAgeMs) return undefined;
    const body = await readFile(paths.body);
    if (!body.length || body.length > maxImageBytes) return undefined;
    return { body, contentType: paths.contentType };
  } catch {
    return undefined;
  }
}

async function pruneDiskCache(incomingBytes: number, targetBodyPath: string) {
  const names = await readdir(cacheDirectory, { withFileTypes: true });
  const files: { path: string; size: number; modifiedAt: number }[] = [];
  for (const entry of names) {
    if (!entry.isFile() || !mimeByExtension[path.extname(entry.name).toLowerCase()]) continue;
    const filePath = path.join(cacheDirectory, entry.name);
    try {
      const details = await stat(filePath);
      files.push({ path: filePath, size: details.size, modifiedAt: details.mtimeMs });
    } catch {
      // A concurrent cache write or eviction removed this entry.
    }
  }

  const candidates = files.filter((file) => file.path !== targetBodyPath);
  let totalBytes = candidates.reduce((sum, file) => sum + file.size, 0);
  let fileCount = candidates.length;
  const now = Date.now();
  candidates.sort((a, b) => a.modifiedAt - b.modifiedAt);
  for (const file of candidates) {
    const expired = now - file.modifiedAt > maxCacheAgeMs;
    if (!expired && totalBytes + incomingBytes <= maxCacheBytes && fileCount + 1 <= maxCacheFiles)
      continue;
    try {
      await unlink(file.path);
      totalBytes -= file.size;
      fileCount--;
    } catch {
      // The cache is best-effort; a failed eviction does not block an image response.
    }
  }
}

async function acquireFetchSlot() {
  if (activeFetches < maxActiveFetches && fetchQueue.length === 0) {
    activeFetches++;
    return;
  }
  if (fetchQueue.length >= maxQueuedFetches)
    throw new ImageFetchError('Image cache is busy.', 503);
  await new Promise<void>((resolve) => fetchQueue.push(resolve));
}

function releaseFetchSlot() {
  const next = fetchQueue.shift();
  if (next) next();
  else activeFetches--;
}

async function withFetchSlot<T>(work: () => Promise<T>): Promise<T> {
  await acquireFetchSlot();
  try {
    return await work();
  } finally {
    releaseFetchSlot();
  }
}

async function fetchOfficialImage(url: string) {
  const expectedType = cachePaths(url).contentType;
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
    headers: { accept: 'image/jpeg,image/png,image/webp' },
  });
  if (response.status >= 300 && response.status < 400)
    throw new ImageFetchError('Open Food Facts image redirect was rejected.');
  if (response.status !== 200)
    throw new ImageFetchError(`Open Food Facts image returned HTTP ${response.status}.`);

  const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (!contentType || !Object.values(mimeByExtension).includes(contentType) || contentType !== expectedType)
    throw new ImageFetchError('Open Food Facts returned a non-image response.');
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxImageBytes)
    throw new ImageFetchError('Open Food Facts image is too large.', 413);
  if (!response.body) throw new ImageFetchError('Open Food Facts image response is empty.');

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxImageBytes) {
      await reader.cancel();
      throw new ImageFetchError('Open Food Facts image is too large.', 413);
    }
    chunks.push(Buffer.from(value));
  }
  if (!total) throw new ImageFetchError('Open Food Facts image response is empty.');

  const body = Buffer.concat(chunks, total);
  const paths = cachePaths(url);
  await mkdir(cacheDirectory, { recursive: true });
  await pruneDiskCache(body.length, paths.body);
  await writeFile(paths.temporary, body, { flag: 'wx' });
  await rename(paths.temporary, paths.body);
  return { body, contentType };
}

async function getCachedImage(url: string) {
  const cached = await readFreshCache(url);
  if (cached) return { ...cached, cacheStatus: 'HIT' };
  const failedUntil = recentlyFailed.get(url) || 0;
  if (failedUntil > Date.now()) throw new ImageFetchError('Image source recently failed.');
  if (failedUntil) recentlyFailed.delete(url);

  const shared = inFlight.get(url);
  const pending = shared || withFetchSlot(() => fetchOfficialImage(url));
  if (!shared) inFlight.set(url, pending);
  try {
    return { ...(await pending), cacheStatus: shared ? 'SHARED' : 'MISS' };
  } catch (error) {
    if (!(error instanceof ImageFetchError && error.statusCode === 503))
      recentlyFailed.set(url, Date.now() + negativeCacheMs);
    throw error;
  } finally {
    if (!shared) inFlight.delete(url);
  }
}

function sendError(res: Response, error: unknown) {
  const statusCode = error instanceof ImageFetchError ? error.statusCode : 502;
  if (statusCode === 503) res.setHeader('Retry-After', '5');
  res.setHeader('Cache-Control', 'no-store');
  res.status(statusCode).type('text/plain').send('Product image temporarily unavailable.');
}

export function registerProductImageCacheRoute(app: Express) {
  app.get('/api/product-image', async (req: Request, res: Response) => {
    const source = req.query.src;
    const size = req.query.size;
    if (
      typeof source !== 'string' ||
      source.length > 2048 ||
      typeof size !== 'string' ||
      !sizes.has(size as ProductImageSize) ||
      !isOfficialOpenFoodFactsImage(source)
    ) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(400).type('text/plain').send('Invalid product image URL.');
      return;
    }

    const target = productImageVariantUrl(source, size as ProductImageSize);
    const candidates = [...new Set([target, source])];
    let image: Awaited<ReturnType<typeof getCachedImage>> | undefined;
    let lastError: unknown;
    for (const candidate of candidates) {
      try {
        image = await getCachedImage(candidate);
        break;
      } catch (error) {
        lastError = error;
        if (error instanceof ImageFetchError && error.statusCode === 503) break;
      }
    }
    if (!image) {
      sendError(res, lastError);
      return;
    }
    res.setHeader('Content-Type', image.contentType);
    res.setHeader('Content-Length', image.body.length);
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('X-Image-Cache', image.cacheStatus);
    res.status(200).send(image.body);
  });
}
