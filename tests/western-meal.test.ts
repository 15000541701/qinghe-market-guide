import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeSeedProducts } from '../shared/catalog';
import { buildMealPlan, createMealPreferences, describeMealPlan } from '../shared/meal-planner';
import {
  parseMealPreferences,
  shoppingAgent,
  mealPlanningMessages,
  createMealGenerationSchema,
} from '../server/shopping-agent';
import {
  englishProductName,
  findMealProduct,
  mealCatalog,
  mealMeasureReliable,
  matchesMealIngredient,
} from '../shared/meal-catalog';
import { respondToQuery } from '../shared/guide';
import type { GeneratedMeal, Product, SamsClubCatalogRecord } from '../shared/types';

const records: SamsClubCatalogRecord[] = JSON.parse(
  readFileSync('shared/samsclub-catalog.json', 'utf8'),
);
const base = makeSeedProducts()[0];
const products: Product[] = records.map((record) => ({
  ...base,
  id: `samsclub-${record.itemId}`,
  name: record.name,
  aliases: [record.originalName],
  category: record.category,
  price: record.price,
  unit: record.unit,
  packageSize: record.packageSize || undefined,
  stock: 100,
  status: 'active',
  saleMode: 'pack',
  currency: 'USD',
  sourceRetailer: 'Sam’s Club US',
}));
const prefs = { ...createMealPreferences(), mealsPerDay: 1 };
const menu = () => ({
  meals: [
    {
      day: 1,
      meal: '晚餐',
      dishes: [
        {
          title: '鸡蛋菠菜三明治',
          kind: 'mixed',
          minutes: 15,
          steps: ['煮熟鸡蛋，洗净菠菜，夹入加热后的面包。'],
          ingredients: [
            { ingredient: 'bread', productId: 'samsclub-598443', grams: 160 },
            { ingredient: 'egg', productId: 'samsclub-990013040', pieces: 4 },
            { ingredient: 'spinach', productId: 'samsclub-148798', grams: 160 },
          ],
        },
      ],
    },
  ],
});

// No test in this file is allowed to access a model endpoint.
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  throw new Error('Tests must not access the network or model API');
};
test.after(() => {
  globalThis.fetch = originalFetch;
});

test('中文输入转英文匹配，菠菜不会匹配蘸酱或馅料，中文名称不参与目录检索', () => {
  const result = respondToQuery('帮我找菠菜', products);
  assert.ok(result.products.some((p) => p.id === 'samsclub-148798'));
  assert.ok(
    result.products.every(
      (p) =>
        /spinach/i.test(englishProductName(p)) &&
        !/dip|ravioli|bites|frittata/i.test(englishProductName(p)),
    ),
  );
  assert.equal(findMealProduct('菠菜', [{ ...base, name: '菠菜', aliases: [] }]), undefined);
  const fish = findMealProduct('三文鱼', products);
  assert.ok(fish && /salmon/i.test(englishProductName(fish)));
  assert.ok(!/smoked|marinated|stuffed/i.test(englishProductName(fish!)));
  assert.equal(
    matchesMealIngredient(fish!, 'cod'),
    false,
    'a specific English fish name must not expand to all fish',
  );
});

test('使用当前山姆名录可组成单日和21餐西式备用方案', () => {
  for (const days of [1, 7]) {
    const preferences = { ...createMealPreferences(), days, mealsPerDay: days === 7 ? 3 : 2 };
    const plan = buildMealPlan(preferences, products, []);
    assert.equal(plan.canApply, true, plan.missing.join(';'));
    assert.equal(plan.budgetComplete, true);
    assert.equal(
      new Set(plan.recipes.map((recipe) => `${recipe.day}-${recipe.meal}`)).size,
      days * preferences.mealsPerDay,
    );
    assert.ok(plan.items.length > 0);
    assert.ok(
      plan.recipes.every((recipe) => !/清蒸|清炒|红烧|焖草鱼|米饭|叉烧/.test(recipe.title)),
    );
    assert.ok(plan.items.every((item) => englishProductName(item.product)));
  }
});

test('发送完整可用英文食品名录，包含熟食，不受西式备用菜谱限制', () => {
  const catalog = mealCatalog(products);
  const messages = mealPlanningMessages('两个人，想要西式晚餐', prefs, products);
  const payload = JSON.parse(messages[1].content);
  assert.ok(catalog.length > 200);
  assert.deepEqual(
    payload.catalog.map((row: { id: string }) => row.id),
    catalog.map((p) => p.id),
  );
  assert.ok(payload.catalog.some((row: { id: string }) => row.id === 'samsclub-990005673'));
  assert.ok(
    payload.catalog.every(
      (row: { name: string }) => /[a-z]/i.test(row.name) && !/[\u3400-\u9fff]/.test(row.name),
    ),
  );
  assert.match(messages[0].content, /暂不提供中式菜谱/);
  assert.match(messages[0].content, /2人份/);
});

test('一道西式三明治可覆盖三种餐食角色；四人用量只放大一次', () => {
  const schema = createMealGenerationSchema(prefs, products);
  assert.equal(schema.safeParse(menu()).success, true);
  const generated: GeneratedMeal[] = menu().meals.map((meal) => ({
    ...meal,
    id: 'meal',
    dishes: meal.dishes.map((dish) => ({ ...dish, kind: 'mixed', id: 'sandwich' })),
  }));
  const plan = buildMealPlan({ ...prefs, people: 4, generatedMeals: generated }, products, []);
  assert.equal(plan.canApply, true, plan.missing.join(';'));
  assert.equal(
    plan.items.find((item) => item.product.id === 'samsclub-990013040')?.recipeAmount,
    '8个',
  );
  assert.equal(
    plan.items.find((item) => item.product.id === 'samsclub-598443')?.recipeAmount,
    '320g',
  );
});

test('模型结果必须引用有效商品、英文食材和相容计量单位，忌口也限制商品ID', () => {
  const schema = createMealGenerationSchema(prefs, products);
  for (const mutation of [
    (item: Record<string, unknown>) => {
      item.productId = 'invented';
    },
    (item: Record<string, unknown>) => {
      item.productId = 'samsclub-990013040';
    },
    (item: Record<string, unknown>) => {
      item.ingredient = '面包';
    },
    (item: Record<string, unknown>) => {
      delete item.productId;
    },
  ]) {
    const value = menu();
    mutation(value.meals[0].dishes[0].ingredients[0]);
    assert.equal(schema.safeParse(value).success, false);
  }
  assert.equal(
    createMealGenerationSchema({ ...prefs, excluded: ['spinach'] }, products).safeParse(menu())
      .success,
    false,
  );
  const partial = menu();
  partial.meals[0].dishes[0].ingredients.pop();
  assert.equal(
    schema.safeParse(partial).success,
    false,
    'mixed does not automatically count as a complete meal',
  );
});

test('食品名录排除非食品、缺货、未知称重规格与错误多包装净含量', () => {
  const catalog = mealCatalog(products);
  assert.ok(
    catalog.every(
      (product) => !['pet', 'home', 'baby', 'cleaning', 'paper-goods'].includes(product.category),
    ),
  );
  assert.ok(!catalog.some((product) => product.id === 'samsclub-66846'));
  assert.equal(
    mealMeasureReliable(products.find((product) => product.id === 'samsclub-990422756')!),
    false,
  );
  assert.equal(mealCatalog(products.map((p) => ({ ...p, stock: 0 }))).length, 0);
  assert.equal(buildMealPlan(prefs, [], []).canApply, false);
});

test('旧会话不会恢复中式规划，中文提出中式菜谱时明确说明当前范围', async () => {
  const old = {
    ...prefs,
    planningVersion: undefined,
    dishIds: ['steamed-bass'],
    generatedMeals: [
      {
        id: 'old',
        day: 1,
        meal: '晚餐',
        dishes: [
          {
            id: 'old',
            title: '葱姜清蒸鲈鱼',
            kind: 'protein' as const,
            minutes: 20,
            steps: ['蒸鱼'],
            ingredients: [{ ingredient: '鲈鱼', grams: 500 }],
          },
        ],
      },
    ],
  };
  const plan = buildMealPlan(old, products, []);
  assert.ok(!plan.recipes.some((recipe) => /清蒸/.test(recipe.title)));
  const answer = await shoppingAgent('两个人做番茄炒蛋', products, { cart: [] });
  assert.equal(answer.mealPlan, undefined);
  assert.match(answer.text, /目前只规划.*西式/);
});

test('未配置模型时仍返回完整本地西式周期，确认清单可重复执行', async () => {
  const variables = ['AI_API_KEY', 'GEMINI_API_KEY', 'DEEPSEEK_API_KEY'];
  const saved = variables.map((key) => process.env[key]);
  variables.forEach((key) => {
    process.env[key] = '';
  });
  try {
    const answer = await shoppingAgent('两个人一周三餐，西式餐食', products, { cart: [] });
    assert.equal(answer.mealPlan?.preferences.days, 7);
    assert.equal(answer.mealPlan?.canApply, true, answer.text);
    assert.match(answer.fallback || '', /西式模板/);
    assert.ok(
      !answer.text.includes(answer.fallback!),
      'fallback is displayed once as a separate notice',
    );
    const confirmed = await shoppingAgent('确认清单', products, {
      cart: [],
      meal: answer.mealPlan!.preferences,
      recipeIds: answer.mealPlan!.recipes.map((r) => r.id),
    });
    assert.equal(confirmed.action?.type, 'apply_plan');
    assert.equal(parseMealPreferences('家里有菠菜').owned.includes('spinach'), true);
  } finally {
    variables.forEach((key, index) => {
      if (saved[index] === undefined) delete process.env[key];
      else process.env[key] = saved[index];
    });
  }
});

test('官方英文商品名中的弯引号可回传；海鲜忌口覆盖英文鱼种且不受家中已有影响', () => {
  const custom = products.find((p) => p.id === 'samsclub-598443')!;
  const official = { ...custom, aliases: ['Member’s Mark French Baguette, 2 ct.'] };
  const value = menu();
  value.meals[0].dishes[0].ingredients[0].ingredient = official.aliases[0];
  assert.equal(
    createMealGenerationSchema(
      prefs,
      products.map((p) => (p.id === official.id ? official : p)),
    ).safeParse(value).success,
    true,
  );
  const excluded = parseMealPreferences('不吃海鲜，家里有三文鱼');
  assert.ok(excluded.excluded.includes('seafood'));
  assert.ok(
    mealCatalog(products, [], excluded.excluded).every(
      (p) => !/\b(salmon|pollock|tilapia|shrimp|lobster|cod)\b/i.test(englishProductName(p)),
    ),
  );
  const plan = buildMealPlan({ ...prefs, excluded: ['fish'], owned: ['salmon'] }, products, []);
  assert.ok(plan.recipes.every((recipe) => !/三文鱼/.test(recipe.title)));
});

test('单独询问早餐得到早餐，明确不需要主食时不强制采购淀粉类', () => {
  const breakfast = buildMealPlan(parseMealPreferences('两个人的西式早餐'), products, []);
  assert.ok(breakfast.recipes.length > 0);
  assert.ok(breakfast.recipes.every((recipe) => recipe.meal === '早餐'));
  assert.equal(breakfast.canApply, true);
  const noStarch = buildMealPlan(parseMealPreferences('两个人每天一餐，不要主食'), products, []);
  assert.ok(noStarch.recipes.every((recipe) => recipe.kind !== 'staple'));
  assert.equal(noStarch.canApply, true);
});

test('截图中的“规划2人份的晚餐”只规划一顿晚餐，午餐和早餐也按名称处理', () => {
  for (const meal of ['早餐', '午餐', '晚餐'] as const) {
    const preferences = parseMealPreferences(`规划2人份的${meal}`);
    assert.equal(preferences.people, 2);
    assert.equal(preferences.mealsPerDay, 1);
    assert.equal(preferences.singleMeal, meal);
    const plan = buildMealPlan(preferences, products, []);
    assert.equal(plan.canApply, true, plan.missing.join(';'));
    assert.ok(plan.recipes.length > 0);
    assert.ok(plan.recipes.every((recipe) => recipe.meal === meal));
    assert.ok(!plan.recipes.some((recipe) => /草鱼|鲈鱼|米饭/.test(recipe.title)));
    const payload = JSON.parse(
      mealPlanningMessages(`规划2人份的${meal}`, preferences, products)[1].content,
    );
    assert.deepEqual(payload.mealSlots, [meal]);
  }
  assert.equal(parseMealPreferences('规划2人每天三餐，包括晚餐').mealsPerDay, 3);
});

test('实际模型返回的简写商品名通过商品ID解析，菜名直接显示在回复中', () => {
  const raw = JSON.parse(readFileSync('tests/fixtures/western-model-dinner.json', 'utf8'));
  const result = createMealGenerationSchema(prefs, products).parse(raw);
  const ingredients = result.meals[0].dishes[0].ingredients;
  assert.equal(
    ingredients[0].ingredient,
    englishProductName(products.find((p) => p.id === 'samsclub-980181678')!),
  );
  const generated: GeneratedMeal[] = result.meals.map((meal, index) => ({
    ...meal,
    id: `meal-${index}`,
    dishes: meal.dishes.map((dish, i) => ({ ...dish, id: `dish-${i}` })),
  }));
  const plan = buildMealPlan({ ...prefs, generatedMeals: generated }, products, []);
  assert.equal(plan.canApply, true, plan.missing.join(';'));
  assert.equal(plan.recipes.length, 1);
  assert.match(describeMealPlan(plan), /香煎三文鱼配蒜香西兰花与烤土豆/);
  assert.ok(plan.owned.includes('食用油'));
  assert.ok(!plan.items.some((item) => /olive oil/i.test(englishProductName(item.product))));
  const idsOnly = structuredClone(raw);
  for (const item of idsOnly.meals[0].dishes[0].ingredients)
    if (item.productId) delete item.ingredient;
  assert.equal(createMealGenerationSchema(prefs, products).safeParse(idsOnly).success, true);
  const incorrect = structuredClone(raw);
  incorrect.meals[0].dishes[0].ingredients[0].ingredient = 'pork';
  assert.equal(createMealGenerationSchema(prefs, products).safeParse(incorrect).success, false);
});
