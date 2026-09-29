import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
await mkdir('.impeccable/review', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1040 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
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
await page.goto(base, { waitUntil: 'networkidle' });
await page.locator('.product-card').first().waitFor();
const catalogCount = await page.evaluate(async () => (await (await fetch('/api/products')).json()).length);
assert.equal(await page.locator('.product-card').count(), catalogCount);
await capture('desktop');
await page.getByRole('button', { name: '推荐 10 元以内的绿叶蔬菜', exact: true }).click();
await page.waitForFunction(() => document.querySelectorAll('.chat-product').length === 3);
assert.equal(await page.locator('.product-card').count(), 3);
await page.locator('#chat-input').fill('只要五元以下的');
await page.setViewportSize({ width: 390, height: 844 });
await page.locator('.product-card').first().getByRole('button', { name: '带我去' }).click();
assert.equal(await page.locator('.map-page:visible').count(), 1);
await page.getByRole('button', { name: '导购逛店', exact: true }).click();
assert.equal(await page.locator('#chat-input').inputValue(), '只要五元以下的');
assert.equal(await page.locator('.chat-product').count(), 3);
await page.setViewportSize({ width: 1440, height: 1040 });
await page.locator('#chat-input').fill('只要五元以下的');
await page.getByRole('button', { name: '发送消息', exact: true }).click();
await page.waitForFunction(() => document.querySelectorAll('.product-card').length === 2);
await page
  .locator('.product-card')
  .first()
  .getByRole('button', { name: /加入购物清单/ })
  .click();
await page.locator('.product-card').first().getByRole('button', { name: '带我去' }).click();
await page.locator('.route-details').waitFor();
const beforeZoom = await page.locator('.floorplan .map-zone').first().boundingBox();
await page.getByRole('button', { name: '放大地图', exact: true }).click();
const afterZoom = await page.locator('.floorplan .map-zone').first().boundingBox();
assert.ok(afterZoom.width > beforeZoom.width * 1.15, 'map zoom increases the actual geometry');
await page.getByRole('button', { name: '重置地图缩放', exact: true }).click();
await capture('route');
await page
  .getByRole('button', { name: /购物清单/ })
  .first()
  .click();
assert.equal(await page.locator('.shopping-item').count(), 1);
await page.reload({ waitUntil: 'networkidle' });
await page
  .getByRole('button', { name: /购物清单/ })
  .first()
  .click();
assert.equal(await page.locator('.shopping-item').count(), 1);
await capture('list');
await page.getByRole('button', { name: '规划采购路线', exact: true }).click();
await page.getByRole('button', { name: '模拟到达', exact: true }).click();
assert.equal(await page.locator('#current-position').inputValue(), 'vegetables');
await page.getByRole('button', { name: '超市端', exact: true }).click();
await page
  .locator('.inventory tbody tr')
  .first()
  .getByRole('button', { name: '编辑', exact: true })
  .click();
await page.waitForFunction(() =>
  document.querySelector('.price-advice')?.textContent.includes('4.89'),
);
await capture('admin');
// No production database edits: the isolated API test verifies persistence separately.
await page.getByRole('button', { name: '采纳建议', exact: true }).click();
assert.equal(await page.locator('#final-price').inputValue(), '4.89');
await page.getByRole('button', { name: '顾客端', exact: true }).click();
await page.getByRole('button', { name: '导购逛店', exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await capture('mobile');
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  true,
  'mobile overflow',
);
await page.getByRole('button', { name: '超市端', exact: true }).click();
await capture('admin-mobile');
const mobileEdit = await page
  .locator('.inventory tbody tr')
  .first()
  .getByRole('button', { name: '编辑', exact: true })
  .boundingBox();
assert.ok(
  mobileEdit.x >= 0 && mobileEdit.x + mobileEdit.width <= 390,
  'mobile edit action is horizontally visible',
);
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  true,
  'admin mobile overflow',
);
assert.deepEqual(errors, []);
console.log(
  'PASS: desktop/mobile rendering, price query, follow-up, list persistence, route, simulated arrival, price advice, no page errors or overflow.',
);
await browser.close();
