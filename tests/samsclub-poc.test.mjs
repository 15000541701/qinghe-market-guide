import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categoryProducts,
  detailProduct,
  imageRequestUrl,
  canonicalProductUrl,
  csv,
  accessChallenge,
} from '../scripts/samsclub-poc.mjs';

const candidate = {
  page_id: '123456',
  product_url: 'https://www.samsclub.com/ip/Test-product/123456',
};
const image = 'https://i5.samsclubimages.com/asr/test.jpeg';
const html = (data, visible = '') =>
  `${visible}<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { initialData: data } } })}</script>`;
const product = () => ({
  usItemId: '123456',
  name: 'Parser test product',
  imageInfo: { allImages: [{ url: image }, { url: `${image}?odnWidth=117` }] },
  location: { city: 'Dallas', pickupLocation: { storeId: '6372' } },
  fulfillmentOptions: [{ type: 'PICKUP', selected: true, locationText: "Dallas Sam's Club" }],
  fulfillmentSummary: [{ fulfillment: 'PICKUP', storeId: '6372' }],
  channelLevelPriceInfo: [
    {
      type: 'PICKUP',
      itemNumber: '990000001',
      storeFrontType: 'PHYSICAL',
      channelPriceInfo: {
        currentPrice: { price: 6.44, currencyUnit: 'USD' },
        unitPrice: { price: 0.64, priceString: '$0.64/oz' },
      },
    },
  ],
});

test('category deduplicates canonical product URLs and excludes non-product modules', () => {
  const link = {
    name: 'A',
    usItemId: '123456',
    canonicalUrl: '/ip/Test-product/123456?classType=REGULAR',
  };
  const rows = categoryProducts(
    html({
      searchResult: {
        itemStacks: [
          { items: [link, {}, { ...link, canonicalUrl: '/ip/Test-product/123456?ad=2' }] },
        ],
      },
    }),
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].product_url, candidate.product_url);
});

test('detail uses Item # rather than page ID, limits images to main gallery, and retains club/channel prices', () => {
  const data = {
    product: product(),
    recommendations: { imageInfo: { allImages: [{ url: 'https://other.example/wrong.jpeg' }] } },
  };
  const parsed = detailProduct(
    html({ data }, '<span>Item #<!-- -->990000001</span>'),
    candidate,
    '2026-10-16T06:00:00.000Z',
  );
  assert.equal(parsed.product.item_id, '990000001');
  assert.equal(parsed.product.page_id, '123456');
  assert.equal(parsed.images.length, 1);
  assert.equal(parsed.prices[0].club_id, '6372');
  assert.equal(parsed.prices[0].channel, 'PICKUP');
  assert.equal(parsed.prices[0].price, 6.44);
  assert.equal(parsed.prices[0].captured_at, '2026-10-16T06:00:00.000Z');
});

test('missing or conflicting Item # and wrong page identity fail rather than guessing', () => {
  const missing = product();
  missing.channelLevelPriceInfo = [];
  assert.throws(
    () => detailProduct(html({ data: { product: missing } }), candidate, 'now'),
    /Missing verified Item/,
  );
  assert.throws(
    () =>
      detailProduct(
        html({ data: { product: product() } }, '<span>Item #990999999</span>'),
        candidate,
        'now',
      ),
    /Conflicting Item/,
  );
  assert.throws(
    () =>
      detailProduct(
        html({ data: { product: { ...product(), usItemId: 'other' } } }),
        candidate,
        'now',
      ),
    /identity/,
  );
});

test('unresolved displayed price does not invent a club association', () => {
  const p = product();
  p.channelLevelPriceInfo = [{ itemNumber: '990000001' }];
  p.priceInfo = { currentPrice: { price: 2.5, currencyUnit: 'USD' } };
  const parsed = detailProduct(html({ data: { product: p } }), candidate, 'now');
  assert.equal(parsed.prices[0].club_id, null);
  assert.equal(parsed.prices[0].channel, 'DISPLAYED_CONTEXT_UNRESOLVED');
});

test('image URL requests 2000px while rejecting unrelated image hosts and paths', () => {
  const url = new URL(imageRequestUrl(`${image}?odnWidth=117&odnHeight=117`));
  assert.equal(url.searchParams.get('odnWidth'), '2000');
  assert.equal(url.searchParams.get('odnHeight'), '2000');
  assert.throws(
    () => imageRequestUrl('https://i5.samsclubimages.com.evil.example/asr/a.jpeg'),
    /Unexpected/,
  );
  assert.throws(() => imageRequestUrl('https://i5.samsclubimages.com/logo.jpeg'), /Unexpected/);
  assert.throws(() => canonicalProductUrl('https://other.example/ip/test/123'), /Unexpected/);
});

test('CSV preserves Unicode, quotes, commas and embedded newlines', () => {
  assert.equal(
    csv([{ name: '中文, "quoted"\nline' }], ['name']),
    '\uFEFF"name"\r\n"中文, ""quoted""\nline"\r\n',
  );
});

test('HTTP 307 redirect to human verification stops the batch; ordinary canonical redirect is distinct', () => {
  assert.equal(accessChallenge(307, 'location: /are-you-human?url=abc\r\n'), true);
  assert.equal(accessChallenge(200, '', '<title>Let us know you are human</title>'), true);
  assert.equal(accessChallenge(429, ''), true);
  assert.equal(accessChallenge(307, 'location: /ip/Product/123\r\n'), false);
});
