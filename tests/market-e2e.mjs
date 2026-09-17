import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
await mkdir('.impeccable/review', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1040 },
  reducedMotion: 'reduce',
});
page.setDefaultTimeout(20000);
const errors = [];
let requests = 0;
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  if (request.url().endsWith('/api/market-prices')) requests++;
});
const capture = async (name) => {
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager';
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
    await document.fonts.ready;
    document.activeElement?.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  if (await page.locator('.toast button').count()) await page.locator('.toast button').click();
  await page.screenshot({ path: `.impeccable/review/${name}.png`, fullPage: true });
};
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '超市端', exact: true }).click();
  await page
    .locator('.inventory tbody tr')
    .first()
    .getByRole('button', { name: '编辑', exact: true })
    .click();
  await page.locator('.price-advice strong').waitFor();
  assert.equal(requests, 0, 'opening the form does not query Xinfadi');
  assert.equal(
    await page.getByRole('textbox', { name: '行情商品名', exact: true }).inputValue(),
    '菠菜',
  );
  const currentPrice = await page.locator('#final-price').inputValue();
  const response = page.waitForResponse((response) =>
    response.url().endsWith('/api/market-prices'),
  );
  await page.getByRole('button', { name: '查询新发地行情', exact: true }).click();
  const upstream = await (await response).json();
  assert.ok(upstream.quotes.length > 0, 'live Xinfadi has spinach quotes');
  await page.locator('.market-quote input:not(:disabled)').first().check();
  const adviceResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/pricing') &&
      response.request().postDataJSON().reference?.kind === 'wholesale',
  );
  await page.getByRole('button', { name: '用所选报价计算建议', exact: true }).click();
  const advice = await (await adviceResponse).json();
  assert.equal(advice.marketKind, 'wholesale');
  assert.equal(advice.marketPrice, Math.round(upstream.quotes[0].average * 1.3 * 100) / 100);
  await page.locator('.market-applied').waitFor();
  assert.equal(
    await page.locator('#final-price').inputValue(),
    currentPrice,
    'lookup does not overwrite the actual selling price',
  );
  await capture('market-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('market-mobile');
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'no mobile overflow',
  );
  const unit = page.getByRole('textbox', { name: '计价单位', exact: true });
  await unit.fill('6枚');
  assert.equal(
    await page.locator('.market-applied').count(),
    0,
    'changing units invalidates the selected quote',
  );
  assert.equal(requests, 1, 'unit changes must not fetch automatically');
  await page.getByRole('button', { name: '查询新发地行情', exact: true }).click();
  await page.locator('.market-quote input').first().waitFor();
  assert.equal(
    await page.locator('.market-quote input:not(:disabled)').count(),
    0,
    'weight quotes cannot become a price per six eggs',
  );
  const empty = {
    query: '无此商品',
    source: upstream.source,
    sourceUrl: upstream.sourceUrl,
    fetchedAt: new Date().toISOString(),
    quotes: [],
    latestDate: null,
    notice: '没有找到该名称的报价，试试通用品名。',
  };
  await page.route('**/api/market-prices', (route) => route.fulfill({ json: empty }));
  await page.getByRole('textbox', { name: '行情商品名', exact: true }).fill('无此商品');
  await page.getByRole('button', { name: '查询新发地行情', exact: true }).click();
  await page.getByText('暂未找到报价', { exact: true }).waitFor();
  await page.unroute('**/api/market-prices');
  await page.route('**/api/market-prices', (route) =>
    route.fulfill({ status: 504, json: { error: '暂时无法连接新发地，请稍后重试。' } }),
  );
  await page.getByRole('button', { name: '查询新发地行情', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: '暂时无法连接新发地' }).waitFor();
  assert.equal(
    await page.locator('.market-quote').count(),
    0,
    'failed refresh must not present old data as new',
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: live market lookup and pricing, query-only networking, source selection, unit invalidation, no silent price overwrite, desktop/mobile layout, empty/error states.',
  );
} finally {
  await browser.close();
}
