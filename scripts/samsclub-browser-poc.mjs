#!/usr/bin/env node
// Optional browser fallback. Human verification is completed by the operator in Chrome.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { chromium } from 'playwright';
import { main, canonicalProductUrl, detailDataProduct } from './samsclub-poc.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('node scripts/samsclub-browser-poc.mjs --out=.cache/samsclub-poc/RUN');
  console.log(
    'Run the ordinary HTTP PoC first. This fallback uses its selected.json, opens regular Chrome, and asks the operator to complete any human verification.',
  );
  process.exit(0);
}
const directory = path.resolve(
  args.find((argument) => argument.startsWith('--out='))?.slice(6) ||
    `.cache/samsclub-poc/${new Date().toISOString().slice(0, 10)}`,
);
const candidates = JSON.parse(await fs.readFile(path.join(directory, 'selected.json'), 'utf8'));
if (!Array.isArray(candidates) || !candidates.length || candidates.length > 20)
  throw new Error('Expected 1–20 selected products from the HTTP PoC.');
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const context = await browser.newContext();
const page = await context.newPage();
const terminal = createInterface({ input: stdin, output: stdout });
const exists = (file) =>
  fs.access(file).then(
    () => true,
    () => false,
  );
try {
  for (const candidate of candidates) {
    canonicalProductUrl(candidate.product_url);
    if (!/^\d+$/.test(candidate.page_id)) throw new Error('Invalid page ID.');
    const html = path.join(directory, 'html', `${candidate.page_id}.html`);
    const destination = path.join(directory, 'html', `${candidate.page_id}.browser.json`);
    if ((await exists(html)) || (await exists(destination))) continue;
    await page.goto(candidate.product_url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    for (let attempt = 0; attempt < 2; attempt++) {
      const ready = await page.locator('script#__NEXT_DATA__').count();
      if (ready && !page.url().includes('/are-you-human')) break;
      if (attempt === 1)
        throw new Error('Verification is incomplete; saved earlier products and stopped.');
      await terminal.question('请在 Chrome 中手动完成 Sam’s Club 人机验证，再按回车继续。');
    }
    const snapshot = await page.evaluate(() => {
      const root = JSON.parse(document.querySelector('script#__NEXT_DATA__').textContent).props
        .pageProps.initialData.data;
      const p = root.product;
      const price = (value) =>
        value && {
          currentPrice: value.currentPrice,
          unitPrice: value.unitPrice,
          priceDisplayCodes: {
            pricePerUnitUom: value.priceDisplayCodes?.pricePerUnitUom,
            finalCostByWeight: value.priceDisplayCodes?.finalCostByWeight,
          },
        };
      return {
        url: location.origin + location.pathname,
        captured_at: new Date().toISOString(),
        transport: 'browser DOM after manual verification',
        visible_item_id: document.body.innerText.match(/Item\s*#\s*(\d+)/i)?.[1],
        data: {
          product: {
            name: p.name,
            usItemId: p.usItemId,
            upc: p.upc,
            brand: p.brand,
            shortDescription: p.shortDescription,
            imageInfo: { allImages: p.imageInfo.allImages.map((image) => ({ url: image.url })) },
            priceInfo: price(p.priceInfo),
            channelLevelPriceInfo: p.channelLevelPriceInfo.map((channel) => ({
              type: channel.type,
              itemNumber: channel.itemNumber,
              storeFrontType: channel.storeFrontType,
              channelPriceInfo: price(channel.channelPriceInfo),
            })),
            location: {
              city: p.location?.city,
              stateOrProvinceCode: p.location?.stateOrProvinceCode,
              postalCode: p.location?.postalCode,
              pickupLocation: { storeId: p.location?.pickupLocation?.storeId },
            },
            fulfillmentOptions: p.fulfillmentOptions.map((option) => ({
              type: option.type,
              selected: option.selected,
              locationText: option.locationText,
              storeName: option.storeName,
            })),
            fulfillmentSummary: p.fulfillmentSummary.map((entry) => ({
              fulfillment: entry.fulfillment,
              storeId: entry.storeId,
            })),
          },
          idml: { specifications: root.idml?.specifications || [] },
        },
      };
    });
    if (snapshot.url !== candidate.product_url)
      throw new Error('Browser navigated to an unexpected product URL.');
    const parsed = detailDataProduct(
      snapshot.data,
      candidate,
      snapshot.captured_at,
      snapshot.visible_item_id,
    );
    await fs.writeFile(destination, JSON.stringify(snapshot, null, 2) + '\n');
    console.log(
      `Saved Item # ${parsed.product.item_id}: ${parsed.images.length} main-product images`,
    );
  }
} finally {
  terminal.close();
  await browser.close();
}
await main([`--out=${directory}`, `--limit=${candidates.length}`]);
