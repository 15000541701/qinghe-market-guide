#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { imageRequestUrl } from './samsclub-poc.mjs';
import { ensureCard, saveGalleryImage } from './samsclub-bulk.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('node scripts/restore-samsclub-images.mjs [--download] [--limit=20]');
  console.log('Default: report missing local images without network access. --download restores them from recorded public CDN URLs.');
  process.exit(0);
}
if (args.some((arg) => arg !== '--download' && !/^--limit=\d+$/.test(arg)))
  throw new Error('Unknown option. Use --help.');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : Infinity;
if (limit !== Infinity && (!Number.isSafeInteger(limit) || limit < 1))
  throw new Error('--limit must be a positive integer.');
const catalog = JSON.parse(await fs.readFile('shared/samsclub-catalog.json', 'utf8'));
const exists = (file) => fs.access(file).then(() => true, () => false);
const pending = [];
let galleryImages = 0;
let missingFiles = 0;
for (const product of catalog.slice(0, limit)) {
  if (!/^\d+$/.test(product.itemId) || !product.gallery?.length)
    throw new Error('Invalid Item # or empty gallery in catalog.');
  const folder = path.join('public/images/samsclub', product.itemId);
  const images = product.gallery.map((image, index) => {
    const stem = String(index).padStart(2, '0');
    if (image.url !== `/images/samsclub/${product.itemId}/${stem}.jpg`)
      throw new Error('Unexpected gallery path for Item # ' + product.itemId);
    return {
      image_index: index,
      source_image_url: image.sourceUrl,
      image_url: imageRequestUrl(image.sourceUrl),
      stem,
    };
  });
  galleryImages += images.length;
  const expected = ['card.jpg', ...images.flatMap(({ stem }) => [stem + '.jpg', 'thumb-' + stem + '.jpg'])];
  const missing = (await Promise.all(expected.map(async (file) =>
    await exists(path.join(folder, file)) ? null : file,
  ))).filter(Boolean);
  missingFiles += missing.length;
  if (missing.length) pending.push({ product, images });
}
console.log(JSON.stringify({ products: Math.min(catalog.length, limit), galleryImages, productsToRestore: pending.length, missingFiles, download: args.includes('--download') }, null, 2));
if (args.includes('--download')) {
  for (const { product, images } of pending) {
    // Complete the current small batch before reporting a failure; never continue
    // to another product after an access challenge or download error.
    for (let offset = 0; offset < images.length; offset += 3) {
      const results = await Promise.allSettled(images.slice(offset, offset + 3).map((image) =>
        saveGalleryImage(product.itemId, image, { offline: false, refresh: false }),
      ));
      const failure = results.find((result) => result.status === 'rejected');
      if (failure) throw failure.reason;
    }
    await ensureCard(product.itemId);
    console.log('Restored Item # ' + product.itemId + ' · ' + images.length + ' images');
  }
}
