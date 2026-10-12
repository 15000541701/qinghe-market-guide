#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const cacheDirectory = path.join(projectRoot, '.cache', 'openprices');
const outputFile = path.join(projectRoot, 'shared', 'open-prices-usd-catalog.ts');
const args = process.argv.slice(2);

function option(prefix, fallback) {
  const value = args.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

if (args.includes('--help')) {
  console.log('Use cached Open Prices JSON pages to rebuild the USD catalog.');
  console.log('Optional: --fetch-pages=START-END downloads missing pages, one at a time.');
  console.log('Optional: --input-dir=PATH reads an existing local page cache; --limit=1000 sets output size.');
  console.log('No network requests are made unless --fetch-pages is specified.');
  process.exit(0);
}

const inputDirectory = option('--input-dir=', cacheDirectory);
const limit = Number(option('--limit=', '1000'));
if (!Number.isInteger(limit) || limit < 1 || limit > 10000) throw new Error('--limit must be an integer from 1 to 10000.');
fs.mkdirSync(inputDirectory, { recursive: true });

const fetchPages = option('--fetch-pages=', '');
if (fetchPages) {
  const range = fetchPages.match(/^(\d+)-(\d+)$/);
  if (!range) throw new Error('--fetch-pages must be a range such as 30-40.');
  const first = Number(range[1]);
  const last = Number(range[2]);
  if (first < 1 || last < first || last - first > 99) throw new Error('Page range must contain at most 100 pages.');
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let lastRequestAt = 0;
  for (let page = first; page <= last; page++) {
    const cacheFile = path.join(inputDirectory, `page-${page}.json`);
    if (fs.existsSync(cacheFile)) {
      console.log(`page ${page}: using cache`);
      continue;
    }
    const wait = Math.max(0, 6500 - (Date.now() - lastRequestAt));
    if (wait) await sleep(wait);
    const url = `https://prices.openfoodfacts.org/api/v1/prices?currency=USD&page=${page}&size=100`;
    let response;
    for (let attempt = 0; attempt < 2; attempt++) {
      lastRequestAt = Date.now();
      try {
        response = await fetch(url, {
          headers: {
            accept: 'application/json',
            'user-agent': 'QingheMarketGuide/1.0 (Open Prices read-only catalog import)',
          },
        });
      } catch (error) {
        if (attempt === 0) {
          console.warn(`page ${page}: transient network error; one 15s backoff retry`);
          await sleep(15000);
          continue;
        }
        throw error;
      }
      if (response.status === 429 || response.status === 403) {
        const retryAfter = response.headers.get('retry-after');
        throw new Error(`Open Prices returned HTTP ${response.status}; stopped without retry. Retry-After=${retryAfter || 'not supplied'}`);
      }
      if (response.ok) break;
      if (response.status >= 500 && attempt === 0) {
        console.warn(`page ${page}: HTTP ${response.status}; one 15s backoff retry`);
        await sleep(15000);
        continue;
      }
      throw new Error(`Open Prices page ${page} returned HTTP ${response.status}; stopped.`);
    }
    const body = await response.text();
    const parsed = JSON.parse(body);
    if (!Array.isArray(parsed.items)) throw new Error(`Page ${page} has no items array.`);
    fs.writeFileSync(cacheFile, body);
    console.log(`page ${page}: cached ${parsed.items.length} price records`);
  }
}

const imagePattern = /^https:\/\/images\.openfoodfacts\.org\/images\/products\/([0-9]+)\/([0-9]+)\/([0-9]+)\/([0-9]+)\//i;
const byBarcode = new Map();
let sourcePages = 0;
let qualifiedRows = 0;
for (const file of fs.readdirSync(inputDirectory).filter((name) => /^page-\d+\.json$/.test(name))) {
  sourcePages++;
  const page = JSON.parse(fs.readFileSync(path.join(inputDirectory, file), 'utf8'));
  for (const row of page.items || []) {
    const product = row.product || {};
    const barcode = String(row.product_code || '').trim();
    const imageUrl = String(product.image_url || '');
    const imageMatch = imageUrl.match(imagePattern);
    const quantity = Number(product.product_quantity);
    const quantityUnit = String(product.product_quantity_unit || '').toLowerCase();
    if (
      row.type !== 'PRODUCT' || row.currency !== 'USD' || !(Number(row.price) > 0) || !row.date ||
      !barcode || String(product.code || '') !== barcode || product.source !== 'off' ||
      !product.product_name?.trim() || !product.brands?.trim() || !(quantity > 0) ||
      !['g', 'ml'].includes(quantityUnit) || (row.price_per && row.price_per !== 'UNIT') ||
      !imageMatch || imageMatch.slice(1).join('') !== barcode
    ) continue;
    qualifiedRows++;
    const record = {
      priceId: Number(row.id), barcode, name: product.product_name.trim(), brand: product.brands.trim(),
      quantity, quantityUnit, imageUrl,
      categoriesTags: Array.isArray(product.categories_tags) ? product.categories_tags : [],
      price: Number(row.price), currency: 'USD', date: String(row.date), pricePer: row.price_per || null,
      discounted: Boolean(row.price_is_discounted),
      priceWithoutDiscount: row.price_without_discount == null ? null : Number(row.price_without_discount),
      locationId: row.location_id == null ? null : Number(row.location_id),
      locationOsmId: row.location_osm_id == null ? null : Number(row.location_osm_id),
      locationOsmType: row.location_osm_type || null,
      locationName: row.location?.osm_name || null,
      locationDisplayName: row.location?.osm_display_name || null,
      locationCity: row.location?.osm_address_city || null,
      locationCountry: row.location?.osm_address_country || null,
      proofId: row.proof_id == null ? null : Number(row.proof_id),
    };
    const previous = byBarcode.get(barcode);
    const better = !previous || record.date > previous.date ||
      (record.date === previous.date && record.pricePer === 'UNIT' && previous.pricePer !== 'UNIT') ||
      (record.date === previous.date && record.pricePer === previous.pricePer && record.priceId > previous.priceId);
    if (better) byBarcode.set(barcode, record);
  }
}

const records = [...byBarcode.values()]
  .sort((a, b) => b.date.localeCompare(a.date) || Number(b.pricePer === 'UNIT') - Number(a.pricePer === 'UNIT') || b.priceId - a.priceId)
  .slice(0, limit);
if (!records.length) throw new Error(`No qualified USD products found in ${inputDirectory}.`);
const date = new Date().toISOString().slice(0, 10);
const source = `export type OpenPricesUsdRecord = {\n  priceId: number;\n  barcode: string;\n  name: string;\n  brand: string;\n  quantity: number;\n  quantityUnit: 'g' | 'ml';\n  imageUrl: string;\n  categoriesTags: string[];\n  price: number;\n  currency: 'USD';\n  date: string;\n  pricePer: string | null;\n  discounted: boolean;\n  priceWithoutDiscount: number | null;\n  locationId: number | null;\n  locationOsmId: number | null;\n  locationOsmType: string | null;\n  locationName: string | null;\n  locationDisplayName: string | null;\n  locationCity: string | null;\n  locationCountry: string | null;\n  proofId: number | null;\n};\n\n// Curated from cached official Open Prices USD pages on ${date}. One record per\n// barcode, matched to the embedded OFF product and its barcode-specific image.\nexport const openPricesUsdCatalog: OpenPricesUsdRecord[] = ${JSON.stringify(records, null, 2)};\n`;
fs.writeFileSync(outputFile, source);
console.log(`Wrote ${records.length} unique products from ${sourcePages} cached pages (${qualifiedRows} qualified price rows).`);
