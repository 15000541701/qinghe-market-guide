import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeSeedProducts } from '../shared/catalog';
import {
  parseMealPreferences,
  mealPreferencesSchema,
  shoppingAgent,
  createMealGenerationSchema,
  mealPlanningMessages,
} from '../server/shopping-agent';
import { completion } from '../server/ai';
import { availableForSale } from '../shared/catalog-status';
import { mealIngredientExcluded, mealProductExcluded } from '../shared/meal-catalog';
import { restoreExcludedIngredients } from '../shared/recipes';
import { canonicalMealIngredient, matchesMealIngredient } from '../shared/meal-catalog';
import { buildMealPlan } from '../shared/meal-planner';
import {
  mealCatalogForPreferences,
  productMealKinds,
  englishProductName,
  productIngredientKeys,
} from '../shared/meal-catalog';
import type { Product, StoreCategory, SamsClubCatalogRecord } from '../shared/types';

// These tests never contact a model, even if the developer's .env has credentials.
const variables = [
  'AI_PROVIDER',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_BASE_URL',
  'GEMINI_API_KEY',
  'GEMINI_BASE_URL',
];
const saved = variables.map((key) => process.env[key]);
process.env.AI_PROVIDER = 'deepseek';
process.env.DEEPSEEK_API_KEY = 'offline-only';
process.env.GEMINI_API_KEY = 'offline-only';
process.env.DEEPSEEK_BASE_URL = 'https://offline.invalid';
process.env.GEMINI_BASE_URL = 'https://offline.invalid';
const realFetch = globalThis.fetch;
let calls = 0;
const blockedFetch: typeof fetch = async () => {
  calls++;
  throw new Error('No live model API in regression tests');
};
globalThis.fetch = blockedFetch;
test.after(() => {
  globalThis.fetch = realFetch;
  variables.forEach((key, i) => {
    if (saved[i] === undefined) delete process.env[key];
    else process.env[key] = saved[i];
  });
});
test.beforeEach(() => {
  calls = 0;
  globalThis.fetch = blockedFetch;
});

const base = makeSeedProducts()[0];
const records: SamsClubCatalogRecord[] = JSON.parse(
  readFileSync('shared/samsclub-catalog.json', 'utf8'),
);
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
  displayGroup: record.displayGroup,
  sourceRetailer: 'Sam’s Club US',
}));
const categories: StoreCategory[] = [];

for (const [message, expected] of [
  ['-1人晚餐', { people: -1 }],
  ['1.5人晚餐', { people: 1.5 }],
  ['9人晚餐', { people: 9 }],
  ['0人晚餐', { people: 0 }],
  ['两个人晚餐预算-10美元', { budget: -10 }],
  ['两个人晚餐预算10001美元', { budget: 10001 }],
  ['两个人吃15天', { days: 15 }],
  ['两个人吃0天', { days: 0 }],
  ['两个人每天5餐', { mealsPerDay: 5 }],
  ['两个人每天0餐', { mealsPerDay: 0 }],
] as const)
  test(`非法数量不改写也不调用模型：${message}`, async () => {
    const preferences = parseMealPreferences(message);
    for (const [key, value] of Object.entries(expected))
      assert.equal((preferences as unknown as Record<string, unknown>)[key], value);
    assert.equal(mealPreferencesSchema.safeParse(preferences).success, false);
    const result = await shoppingAgent(message, products, { cart: [] }, undefined, categories);
    assert.equal(result.mealPlan, undefined);
    assert.equal(result.action, undefined);
    assert.equal(calls, 0);
  });

for (const message of [
  '两个人的晚餐，预算USD 50',
  '两个人的晚餐，预算五十美元',
  '两个人的晚餐，预算 $50',
])
  test(`预算表达解析：${message}`, () => assert.equal(parseMealPreferences(message).budget, 50));

test('两周、明确早餐晚餐及续问共享同一餐次定义', () => {
  const p = parseMealPreferences('两个人吃两周，每天早餐和晚餐');
  assert.equal(p.days, 14);
  assert.equal(p.mealsPerDay, 2);
  assert.deepEqual(p.mealSlots, ['早餐', '晚餐']);
  const next = parseMealPreferences('预算改为300美元', p);
  assert.deepEqual(next.mealSlots, ['早餐', '晚餐']);
  const payload = JSON.parse(mealPlanningMessages('继续', next, products, categories)[1].content);
  assert.deepEqual(payload.mealSlots, ['早餐', '晚餐']);
  const plan = buildMealPlan(next, products, []);
  assert.deepEqual([...new Set(plan.recipes.map((r) => r.meal))], ['早餐', '晚餐']);
  const snack = parseMealPreferences('早餐和加餐');
  assert.equal(snack.mealsPerDay, 2);
  assert.deepEqual(snack.mealSlots, ['早餐', '加餐']);
});

test('解除单项忌口和全部忌口不会残留旧限制', () => {
  const p = parseMealPreferences('两个人的晚餐，不吃虾和猪肉');
  const next = parseMealPreferences('现在可以吃虾了，换成虾仁晚餐', p);
  assert.ok(!next.excluded.includes('shrimp'));
  assert.ok(next.excluded.includes('pork'));
  assert.deepEqual(parseMealPreferences('取消所有忌口', next).excluded, []);
});

test('未知或原型属性食材键不会让词典查询崩溃', () => {
  for (const key of ['__proto__', 'constructor', 'toString', 'unknown-food']) {
    assert.doesNotThrow(() => mealIngredientExcluded('salmon', [key]));
    assert.doesNotThrow(() => restoreExcludedIngredients([key], ['salmon']));
    assert.equal(matchesMealIngredient(products[0], key), false);
    assert.doesNotThrow(() =>
      matchesMealIngredient({ ...products[0], name: key, aliases: [key] }, key),
    );
  }
});

test('只解除虾或三文鱼时，其他海鲜限制仍保留', () => {
  const original = parseMealPreferences('不吃海鲜');
  const shrimp = parseMealPreferences('现在可以吃虾了', original);
  assert.equal(mealIngredientExcluded('shrimp', shrimp.excluded), false);
  for (const key of ['salmon', 'cod', 'crab', 'lobster'])
    assert.equal(mealIngredientExcluded(key, shrimp.excluded), true, key);
  const salmon = parseMealPreferences('现在可以吃三文鱼了', original);
  assert.equal(mealIngredientExcluded('salmon', salmon.excluded), false);
  for (const key of ['shrimp', 'cod', 'crab', 'lobster'])
    assert.equal(mealIngredientExcluded(key, salmon.excluded), true, key);
  assert.deepEqual(restoreExcludedIngredients(['seafood', 'salmon', 'shrimp'], ['seafood']), []);
  const bass = products.find((p) => /sea bass/i.test(englishProductName(p)));
  if (bass) assert.equal(mealProductExcluded(bass, ['seafood']), true);
});

test('鸡肉饺子仍是复合食品，不能按家中普通鸡肉抵扣', () => {
  const dumplings = products.find((product) =>
    /chicken dumplings/i.test(englishProductName(product)),
  )!;
  assert.ok(dumplings);
  assert.equal(canonicalMealIngredient(dumplings), undefined);
  assert.equal(matchesMealIngredient(dumplings, 'chicken'), false);
  const plain = products.find((product) => product.id === 'samsclub-990334655')!;
  assert.equal(matchesMealIngredient(plain, 'chicken'), true);
});

test('素食与新蔬菜忌口是可持续保存的结构化条件', () => {
  const vegan = parseMealPreferences('两个人的纯素晚餐，不吃蘑菇和黄瓜');
  for (const key of [
    'fish',
    'chicken',
    'pork',
    'egg',
    'milk',
    'cheese',
    'butter',
    'honey',
    'mushroom',
    'cucumber',
  ])
    assert.ok(vegan.excluded.includes(key), key);
  assert.ok(
    mealCatalogForPreferences(vegan, products, categories).every(
      (p) =>
        !/\b(?:chicken|beef|pork|ham|bacon|shrimp|salmon|eggs?|milk|cheese|butter|honey|mushrooms?|cucumbers?)\b/i.test(
          englishProductName(p),
        ),
    ),
  );
  assert.ok(
    mealCatalogForPreferences(vegan, products, categories).every(
      (p) => !['meat', 'meat-poultry', 'seafood'].includes(p.category),
    ),
  );
});

test('热狗面包即使来源错归肉类，也不能充当蛋白质', () => {
  const bun = products.find((product) => /hot dog buns/i.test(englishProductName(product)))!;
  assert.ok(bun);
  assert.ok(!productMealKinds(bun).includes('protein'));
  assert.ok(productMealKinds(bun).includes('staple'));
});

test('真实模型回复中的英式松饼被识别为主食', () => {
  const raw = JSON.parse(readFileSync('tests/fixtures/western-model-english-muffin.json', 'utf8'));
  const preferences = parseMealPreferences('一个人的鸡蛋三明治早餐，预算20美元');
  assert.equal(
    createMealGenerationSchema(preferences, products, categories).safeParse(raw).success,
    true,
  );
  const muffin = products.find((product) => product.id === 'samsclub-122813')!;
  assert.ok(productMealKinds(muffin).includes('staple'));
});

test('不要主食时模型名录不夹带主食，后续修改餐数可清除旧餐次长度', () => {
  const p = parseMealPreferences('两个人的晚餐，不要主食');
  assert.ok(
    mealCatalogForPreferences(p, products, categories).every(
      (product) => !productMealKinds(product).includes('staple'),
    ),
  );
  const changed = parseMealPreferences('每天三餐', { ...p, mealSlots: ['晚餐'] });
  assert.equal(changed.mealSlots, undefined);
});

for (const [name, items, cart] of [
  ['空目录', [], []],
  ['失效清单', products, [{ productId: 'not-a-sku', quantity: 1, checked: false }]],
  [
    '整包装小数数量',
    products,
    [{ productId: 'samsclub-990013040', quantity: 0.5, checked: false }],
  ],
] as const)
  test(`${name}在调用模型前拦截`, async () => {
    const r = await shoppingAgent(
      '两个人的西式晚餐，预算50美元',
      [...items],
      { cart: cart.map((i) => ({ ...i })) },
      undefined,
      categories,
    );
    assert.equal(r.mealPlan, undefined);
    assert.equal(r.action, undefined);
    assert.equal(calls, 0);
  });

test('缺过敏原资料时不生成保证安全的采购动作', async () => {
  const r = await shoppingAgent(
    '对花生严重过敏，请保证餐食安全',
    products,
    { cart: [] },
    undefined,
    categories,
  );
  assert.match(r.text, /完整配料|过敏原/);
  assert.equal(r.mealPlan, undefined);
  assert.equal(calls, 0);
});

test('异常价格和库存不能进入售卖与餐食名录', () => {
  const p = products[0];
  for (const price of [NaN, Infinity, -1, 0])
    assert.equal(availableForSale({ ...p, price }), false);
  for (const stock of [NaN, Infinity, -1, 0])
    assert.equal(availableForSale({ ...p, stock, inventoryMode: 'tracked' }), false);
  assert.equal(availableForSale({ ...p, inventoryMode: 'untracked', stock: NaN }), true);
});

test('菜名、数量与真实商品一致，少量配料不能伪装完整餐食', () => {
  const raw = JSON.parse(readFileSync('tests/fixtures/western-model-dinner.json', 'utf8'));
  const prefs = parseMealPreferences('两个人的三文鱼晚餐');
  const wrong = structuredClone(raw);
  wrong.meals[0].dishes[0].title = '虾仁配蔬菜和土豆';
  assert.equal(
    createMealGenerationSchema(prefs, products, categories).safeParse(wrong).success,
    false,
  );
  const tiny = structuredClone(raw);
  for (const i of tiny.meals[0].dishes[0].ingredients)
    if (i.productId) {
      if (i.grams !== undefined) i.grams = 0.1;
      if (i.milliliters !== undefined) i.milliliters = 0.1;
      if (i.pieces !== undefined) i.pieces = 0.1;
    }
  assert.equal(
    createMealGenerationSchema(prefs, products, categories).safeParse(tiny).success,
    false,
  );
});

for (const status of [401, 402, 429, 503])
  test(`模型HTTP ${status}明确失败`, async () => {
    globalThis.fetch = async () => new Response('{}', { status });
    await assert.rejects(completion([{ role: 'user', content: 'JSON' }]));
  });
for (const [name, body] of [
  ['截断输出', { choices: [{ finish_reason: 'length', message: { content: '{"meals":[]}' } }] }],
  ['空结果', { choices: [] }],
  ['格式损坏', { choices: [{ message: { content: 'not-json' } }] }],
] as const)
  test(`模型${name}不能标成成功`, async () => {
    globalThis.fetch = async () => new Response(JSON.stringify(body), { status: 200 });
    await assert.rejects(completion([{ role: 'user', content: 'JSON' }]));
  });

function batchResponse(request: { messages: { content: string }[] }) {
  const payload = JSON.parse(request.messages[1].content);
  const start = Number(payload.request.match(/第(\d+)至/)?.[1] || 1);
  const catalog = payload.catalog as {
    id: string;
    name: string;
    mealRoles: string[];
    contents: { unit: string };
  }[];
  const staple = catalog.find((p) => p.mealRoles.includes('staple') && p.contents.unit === 'g')!;
  const vegetable = catalog.find(
    (p) =>
      p.mealRoles.includes('vegetable') &&
      !p.mealRoles.includes('staple') &&
      p.contents.unit === 'g',
  )!;
  const egg = catalog.find((p) => /\beggs?\b/i.test(p.name) && p.contents.unit === 'piece')!;
  return {
    meals: Array.from({ length: payload.days }, (_, index) =>
      payload.mealSlots.map((meal: string) => ({
        day: index + 1,
        meal,
        dishes: [
          {
            title: `第${start + index}天${meal}鸡蛋蔬菜拼盘`,
            kind: 'mixed',
            minutes: 20,
            steps: ['按包装说明处理食材并煮熟，按用料表分配。'],
            ingredients: [
              { productId: staple.id, grams: 160 },
              { productId: vegetable.id, grams: 160 },
              { productId: egg.id, pieces: 4 },
            ],
          },
        ],
      })),
    ).flat(),
  };
}

test('56餐分批后日期、餐次、ID完整且整周期采购只聚合一次', async () => {
  let active = 0,
    peak = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const value = batchResponse(JSON.parse(String(init?.body)));
    active--;
    return new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }),
      { status: 200 },
    );
  };
  const r = await shoppingAgent(
    '两个人吃14天，每天4餐，预算600美元，西式餐食',
    products,
    { cart: [] },
    undefined,
    categories,
  );
  assert.equal(r.engine, 'model', r.fallback);
  assert.equal(r.mealPlan?.canApply, true, r.text);
  assert.equal(
    new Set(r.mealPlan?.recipes.map((recipe) => `${recipe.day}-${recipe.meal}`)).size,
    56,
  );
  assert.equal(new Set(r.mealPlan?.preferences.generatedMeals?.map((meal) => meal.id)).size, 56);
  assert.ok(peak <= 2 && peak > 1);
  assert.equal(active, 0);
  assert.ok(calls > 1, 'a long cycle is validated in multiple batches');
  assert.ok(
    r.mealPlan!.items.every(
      (item, index, items) =>
        items.findIndex((other) => other.product.id === item.product.id) === index,
    ),
  );
});

test('大计划某一批失败会等待在途请求结束，不继续创建新批或伪称部分成功', async () => {
  let active = 0;
  globalThis.fetch = async (_url, init) => {
    const index = calls++;
    active++;
    try {
      await new Promise((resolve) => setTimeout(resolve, index === 0 ? 1 : 5));
      if (index === 0) return new Response('{}', { status: 503 });
      return new Response(
        JSON.stringify({
          choices: [
            { message: { content: JSON.stringify(batchResponse(JSON.parse(String(init?.body)))) } },
          ],
        }),
        { status: 200 },
      );
    } finally {
      active--;
    }
  };
  const r = await shoppingAgent(
    '两个人吃14天，每天4餐，预算600美元，西式餐食',
    products,
    { cart: [] },
    undefined,
    categories,
  );
  assert.equal(r.engine, 'rules');
  assert.ok(r.fallback);
  assert.equal(active, 0);
  assert.equal(calls, 2);
  assert.equal(
    new Set(r.mealPlan?.recipes.map((recipe) => `${recipe.day}-${recipe.meal}`)).size,
    56,
  );
});

test('偶发损坏JSON会有限重试，再返回完整已校验结果', async () => {
  globalThis.fetch = async (_url, init) => {
    calls++;
    if (calls === 1)
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"meals": [' } }] }), {
        status: 200,
      });
    return new Response(
      JSON.stringify({
        choices: [
          { message: { content: JSON.stringify(batchResponse(JSON.parse(String(init?.body)))) } },
        ],
      }),
      { status: 200 },
    );
  };
  const result = await shoppingAgent(
    '两个人的西式晚餐，预算100美元',
    products,
    { cart: [] },
    undefined,
    categories,
  );
  assert.equal(result.engine, 'model', result.fallback);
  assert.equal(result.mealPlan?.canApply, true, result.text);
  assert.equal(calls, 2);
});

test('拒绝新餐食条件会要求客户端清除旧方案，不影响原清单', async () => {
  const context = { cart: [], meal: parseMealPreferences('两个人的晚餐，预算50美元') };
  const r = await shoppingAgent('改成0个人的晚餐', products, context, undefined, categories);
  assert.equal(r.clearMealPlan, true);
  assert.equal(r.mealPlan, undefined);
  assert.equal(r.action, undefined);
  assert.deepEqual(context.cart, []);
  assert.equal(calls, 0);
});

test('鱼餐配沙拉在模型不可用时仍保留沙拉，按完整包装核算50美元', async () => {
  const keys = ['AI_API_KEY', 'GEMINI_API_KEY', 'DEEPSEEK_API_KEY'];
  const credentials = keys.map((key) => process.env[key]);
  keys.forEach((key) => delete process.env[key]);
  try {
    const result = await shoppingAgent(
      '两个人吃，预算50 USD，想搭配西式鱼餐和沙拉',
      products,
      { cart: [] },
      undefined,
      categories,
    );
    assert.equal(result.engine, 'rules');
    assert.ok(result.fallback);
    assert.equal(result.mealPlan?.canApply, true, result.text);
    assert.ok(result.mealPlan!.total <= 50);
    assert.ok(result.mealPlan!.recipes.some((recipe) => recipe.title.includes('沙拉')));
    assert.ok(
      result.mealPlan!.items.some((item) => productIngredientKeys(item.product).includes('fish')),
    );
    assert.equal(calls, 0);
  } finally {
    keys.forEach((key, index) => {
      if (credentials[index] === undefined) delete process.env[key];
      else process.env[key] = credentials[index];
    });
  }
});

function fishMenu(payload: ReturnType<typeof JSON.parse>, fishKey: string, grams: number) {
  const entries = payload.catalog as {
    id: string;
    name: string;
    mealRoles: string[];
    contents: { unit: string };
  }[];
  const fish = entries.find((entry) => {
    const product = products.find((product) => product.id === entry.id)!;
    return (
      entry.mealRoles.includes('protein') &&
      entry.contents.unit === 'g' &&
      productIngredientKeys(product).includes(fishKey)
    );
  })!;
  const staple = entries.find(
    (entry) => entry.mealRoles.includes('staple') && entry.contents.unit === 'g',
  )!;
  const vegetable = entries.find(
    (entry) => /spinach|lettuce|romaine/i.test(entry.name) && entry.contents.unit === 'g',
  )!;
  assert.ok(fish && staple && vegetable, 'the offered catalogue must support the requested menu');
  return {
    meals: payload.mealSlots.map((meal: string) => ({
      day: 1,
      meal,
      dishes: [
        {
          title: `${meal}西式鱼餐配沙拉`,
          kind: 'mixed',
          minutes: 20,
          steps: ['鱼和主食按包装说明处理，蔬菜洗净沥干拌成沙拉。'],
          ingredients: [
            { productId: fish.id, grams },
            { productId: staple.id, grams: 160 },
            { productId: vegetable.id, grams: 160 },
          ],
        },
      ],
    })),
  };
}

test('单日鱼餐超预算后用可负担食材篮子修正，保留鱼和沙拉且确认不重生成', async () => {
  let initialSize = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const request = JSON.parse(String(init?.body));
    const payload = JSON.parse(request.messages[1].content);
    if (calls === 1) initialSize = payload.catalog.length;
    else {
      assert.ok(payload.catalog.length < initialSize);
      assert.ok(
        request.messages.some((message: { content: string }) =>
          message.content.includes('整包装核算'),
        ),
      );
    }
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify(fishMenu(payload, 'salmon', calls === 1 ? 2000 : 300)),
            },
          },
        ],
      }),
      { status: 200 },
    );
  };
  const result = await shoppingAgent(
    '两个人吃，预算50 USD，想搭配西式鱼餐和沙拉',
    products,
    { cart: [] },
    undefined,
    categories,
  );
  assert.equal(result.engine, 'model', result.fallback);
  assert.equal(result.mealPlan?.canApply, true, result.text);
  assert.ok(result.mealPlan!.total <= 50);
  assert.equal(result.mealPlan!.preferences.generatedMeals?.length, 2);
  assert.equal(calls, 2);
  const confirmed = await shoppingAgent(
    '确认清单',
    products,
    {
      cart: [],
      meal: result.mealPlan!.preferences,
      recipeIds: result.mealPlan!.recipes.map((recipe) => recipe.id),
    },
    undefined,
    categories,
  );
  assert.equal(confirmed.action?.type, 'apply_plan');
  assert.equal(calls, 2);
});

test('预算参考不包含指定鳕鱼时保持完整目录，不用三文鱼替换来缩小预算', async () => {
  let initialSize = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const request = JSON.parse(String(init?.body));
    const payload = JSON.parse(request.messages[1].content);
    if (calls === 1) initialSize = payload.catalog.length;
    assert.equal(payload.catalog.length, initialSize);
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify(fishMenu(payload, 'cod', 2000)),
            },
          },
        ],
      }),
      { status: 200 },
    );
  };
  const result = await shoppingAgent(
    '两个人吃，预算50美元，想吃鳕鱼配沙拉',
    products,
    { cart: [] },
    undefined,
    categories,
  );
  assert.equal(result.engine, 'model', result.fallback);
  assert.equal(result.mealPlan?.canApply, false);
  assert.equal(calls, 4, 'budget repair remains bounded');
  assert.ok(
    result.mealPlan!.items.some((item) => productIngredientKeys(item.product).includes('cod')),
  );
});
