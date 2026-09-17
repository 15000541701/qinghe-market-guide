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
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const send = async (text) => {
  await page.getByRole('button', { name: '导购逛店', exact: true }).click();
  const response = page.waitForResponse((response) => response.url().endsWith('/api/assistant'));
  await page.locator('#chat-input').fill(text);
  await page.getByRole('button', { name: '发送消息', exact: true }).click();
  const result = await (await response).json();
  await page.waitForFunction(() => !document.querySelector('.thinking'));
  return result;
};
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
  const initial = await send('两个人吃，预算50元，想吃鱼和绿叶菜，家里有葱姜');
  assert.equal(initial.mealPlan.total, 39);
  assert.equal(initial.mealPlan.canApply, false);
  assert.ok(initial.mealPlan.pendingPantry.includes('salt'));
  await page.locator('.meal-panel').waitFor();
  await capture('meal-desktop');
  const cheap = await send('换便宜一点，保持人数和份量');
  assert.equal(cheap.mealPlan.total, 22.7);
  assert.equal(cheap.mealPlan.preferences.people, 2);
  assert.ok(
    cheap.mealPlan.items.some((item) => item.product.id === 'carp' && item.quantity === 1.5),
  );
  const confirmed = await send('油盐也有，确认清单');
  assert.equal(confirmed.action.type, 'apply_plan');
  await page
    .getByRole('button', { name: /购物清单/ })
    .first()
    .click();
  assert.equal(await page.locator('.shopping-item').count(), 2);
  assert.ok((await page.locator('.list-total').textContent()).includes('22.70'));
  await capture('meal-list');
  await send('把菠菜加入清单');
  await page
    .getByRole('button', { name: /购物清单/ })
    .first()
    .click();
  assert.equal(await page.locator('.shopping-item').count(), 3);
  assert.ok((await page.locator('.list-total').textContent()).includes('27.50'));
  await send('撤销上一步');
  await page
    .getByRole('button', { name: /购物清单/ })
    .first()
    .click();
  assert.equal(await page.locator('.shopping-item').count(), 2);
  await send('按清单规划采购路线');
  assert.equal(await page.locator('.map-page:visible').count(), 1);
  assert.equal(await page.locator('.route-details').count(), 1);
  await send('去下一站');
  assert.ok((await page.locator('#current-position').inputValue()) !== 'entrance');
  await page.getByRole('button', { name: '导购逛店', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('meal-mobile');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await send('预算改为10元');
  assert.equal(await page.locator('.meal-budget.over-budget').count(), 1);
  assert.ok(await page.getByRole('button', { name: '补齐购物清单', exact: true }).isDisabled());
  await page.reload({ waitUntil: 'networkidle' });
  await page
    .getByRole('button', { name: /购物清单/ })
    .first()
    .click();
  assert.ok((await page.locator('.shopping-items').textContent()).includes('750g'));
  assert.deepEqual(errors, []);
  console.log(
    'PASS: live meal planning, full budget, cheaper equal portions, pantry confirmation, cart totals, add/undo, navigation/next, mobile layout, fractional quantity persistence and over-budget block.',
  );
} finally {
  await browser.close();
}
