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
page.setDefaultTimeout(90000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const send = async (text) => {
  await page.getByRole('button', { name: '导购逛店', exact: true }).click();
  const response = page.waitForResponse((item) => item.url().endsWith('/api/assistant'));
  await page.locator('#chat-input').fill(text);
  await page.getByRole('button', { name: '发送消息', exact: true }).click();
  const result = await (await response).json();
  await page.waitForFunction(() => !document.querySelector('.thinking'));
  return result;
};
const clickPantryOption = async (name) => {
  const option = page.locator('.pantry-option').filter({ hasText: name });
  const response = page.waitForResponse((item) => item.url().endsWith('/api/assistant'));
  await option.click();
  const result = await (await response).json();
  await page.waitForFunction(() => !document.querySelector('.thinking'));
  return { result, option };
};
const capture = async (name) => {
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager';
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
    await document.fonts.ready;
    document.activeElement?.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.screenshot({ path: `.impeccable/review/${name}.png`, fullPage: true });
};

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  const status = await page.evaluate(async () => (await (await fetch('/api/status')).json()).ai);
  assert.equal(status, true, 'live Gemini credentials must be loaded for this end-to-end check');

  const initial = await send(
    '请做一周两个人的正常家常三餐，预算不限，早餐有主食和蛋白质，午餐晚餐都包含主食、一道蛋白和一道蔬菜；炒菜用食用油并列用量，家里有葱姜。',
  );
  const plan = initial.mealPlan;
  assert.equal(initial.engine, 'model');
  assert.equal(plan.preferences.days, 7);
  assert.equal(plan.preferences.people, 2);
  assert.equal(plan.preferences.mealsPerDay, 3);
  const slots = new Map();
  for (const recipe of plan.recipes) {
    const key = `${recipe.day}-${recipe.meal}`;
    slots.set(key, [...(slots.get(key) || []), recipe]);
    assert.ok(recipe.ingredientAmounts?.length, `missing amounts: ${recipe.title}`);
    assert.ok(recipe.steps.length > 0, `missing method: ${recipe.title}`);
  }
  assert.equal(slots.size, 21, 'a complete week has all 21 meal slots');
  for (let day = 1; day <= 7; day++) {
    assert.ok((slots.get(`${day}-早餐`) || []).length >= 2);
    for (const meal of ['午餐', '晚餐']) {
      const dishes = slots.get(`${day}-${meal}`) || [];
      assert.ok(dishes.length >= 3, `${meal} must include multiple dishes`);
      const kinds = new Set(dishes.map((dish) => dish.kind));
      assert.ok(kinds.has('staple') && kinds.has('protein') && kinds.has('vegetable'));
    }
  }
  const nonStaple = plan.recipes
    .filter((recipe) => recipe.kind !== 'staple')
    .map((recipe) => recipe.title);
  assert.ok(new Set(nonStaple).size >= 11, 'menu should vary across the week');
  assert.ok(
    plan.recipes.some((recipe) => recipe.ingredientAmounts.some((item) => /油/.test(item.name))),
  );
  assert.ok(plan.preferences.homePantry.includes('oil'));
  assert.ok(
    !plan.items.some((item) => item.product.id === 'oil'),
    'default household oil must not be purchased',
  );
  assert.ok(plan.items.every((item) => item.quantity > 0));
  assert.equal(plan.budgetComplete, plan.unresolved.length === 0);
  if (!plan.budgetComplete) {
    assert.equal(plan.remaining, null);
    assert.match(initial.text, /还有 \d+ 项未计价/);
  }

  await page.locator('.meal-panel').waitFor();
  await page.locator('.household-pantry > summary').click();
  const { result: withoutOil, option: oilOption } = await clickPantryOption('食用油');
  assert.equal(await oilOption.getAttribute('aria-pressed'), 'false');
  assert.equal(withoutOil.mealPlan.preferences.days, 7);
  assert.deepEqual(
    withoutOil.mealPlan.recipes.map((recipe) => recipe.title),
    plan.recipes.map((recipe) => recipe.title),
    'changing household inventory should reuse the validated menu',
  );
  assert.ok(!withoutOil.mealPlan.preferences.homePantry.includes('oil'));
  const weeklyOil = withoutOil.mealPlan.items.find((item) => item.product.id === 'oil');
  assert.ok(weeklyOil, 'explicitly missing oil should become a purchase');
  assert.match(weeklyOil.recipeAmount, /^\d+(?:\.\d+)?mL$/);
  assert.equal(
    weeklyOil.quantity,
    Math.ceil(Number(weeklyOil.recipeAmount.replace('mL', '')) / 1800),
  );
  assert.equal(weeklyOil.quantity, 1, 'all weekly oil needs fit in one 1.8L bottle');
  assert.equal(weeklyOil.cost, 39.9);
  assert.ok(
    JSON.parse(await page.evaluate(() => localStorage.getItem('qinghe-home-pantry'))).every(
      (key) => key !== 'oil',
    ),
  );

  const { result: withOilAgain, option: restoredOilOption } = await clickPantryOption('食用油');
  assert.equal(await restoredOilOption.getAttribute('aria-pressed'), 'true');
  assert.ok(withOilAgain.mealPlan.preferences.homePantry.includes('oil'));
  assert.ok(!withOilAgain.mealPlan.items.some((item) => item.product.id === 'oil'));

  const confirmed = await send('确认清单');
  if (withOilAgain.mealPlan.canApply) assert.equal(confirmed.action?.type, 'apply_plan');
  else {
    assert.equal(confirmed.action, undefined);
    assert.equal(withOilAgain.mealPlan.budgetComplete, false);
  }
  await capture('meal-week-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('meal-week-mobile');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      result: 'PASS',
      liveModel: 'configured real model',
      mealSlots: slots.size,
      dishes: plan.recipes.length,
      unpricedItems: plan.unresolved.length,
      weeklyOil: weeklyOil.recipeAmount,
      oilPackages: weeklyOil.quantity,
      pantryTogglePersisted: true,
    }),
  );
} finally {
  await browser.close();
}
