import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'test-results', `api-${Date.now()}`);
await mkdir(dataDir, { recursive: true });
let failModel = false;
let failWeekGenerator = false;
let useNonFoodWeekIngredient = false;
let nonFoodProductId = '';
let sawImage = false;
let marketCalls = 0;
const marketDate = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
const mock = http.createServer(async (req, res) => {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (req.url === '/getPriceData.html') {
    marketCalls++;
    assert.equal(
      req.headers.authorization,
      undefined,
      'AI credentials must not go to the market source',
    );
    const query = new URLSearchParams(raw).get('prodName');
    if (query === '网络故障') {
      res.writeHead(503);
      res.end('unavailable');
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        count: query === '无此商品' ? 0 : 2,
        list:
          query === '无此商品'
            ? []
            : [
                {
                  id: 1,
                  prodName: '菠菜',
                  prodCat: '蔬菜',
                  place: '河北',
                  specInfo: '',
                  lowPrice: '3.5',
                  avgPrice: '3.75',
                  highPrice: '4',
                  unitInfo: '斤',
                  pubDate: marketDate,
                },
                {
                  id: 2,
                  prodName: '菠菜',
                  prodCat: '蔬菜',
                  place: '内蒙古',
                  specInfo: '水菜',
                  lowPrice: '5.5',
                  avgPrice: '5.75',
                  highPrice: '6',
                  unitInfo: '斤',
                  pubDate: marketDate,
                },
              ],
      }),
    );
    return;
  }
  const body = JSON.parse(raw);
  assert.equal(req.url, '/v1/chat/completions');
  assert.equal(req.headers.authorization, 'Bearer test-only-key');
  if (failModel) {
    res.writeHead(401);
    res.end('{}');
    return;
  }
  const image = Array.isArray(body.messages[1].content);
  if (image) {
    assert.ok(body.messages[1].content[1].image_url.url.startsWith('data:image/jpeg;base64,'));
    sawImage = true;
  }
  const mealRequest = body.messages[0].content.includes('采购需求解析器');
  const weekGenerator = body.messages[0].content.includes('你先规划正常饭菜');
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify(
              image
                ? { candidates: [{ name: '新鲜菠菜', category: 'vegetables', score: 0.92 }] }
                : body.messages[1].content.includes('浴室拖鞋')
                  ? {
                      categories: ['home'],
                      min: null,
                      max: null,
                      productIds: [],
                      leafy: false,
                      fish: false,
                      sort: 'default',
                      relevant: true,
                    }
                  : weekGenerator
                    ? failWeekGenerator
                      ? { meals: [] }
                      : {
                          meals: Array.from({ length: 21 }, (_, index) => {
                            const day = Math.floor(index / 3) + 1;
                            const meal = ['早餐', '午餐', '晚餐'][index % 3];
                            const breakfast = meal === '早餐';
                            const dishes = breakfast
                              ? [
                                  {
                                    title: `全麦吐司第${day}天`,
                                    kind: 'staple',
                                    minutes: 5,
                                    steps: ['加热吐司。'],
                                    ingredients: [{ ingredient: '全麦面包', grams: 120 }],
                                  },
                                  {
                                    title: `水煮蛋第${day}天`,
                                    kind: 'protein',
                                    minutes: 10,
                                    steps: ['鸡蛋煮熟。'],
                                    ingredients: [
                                      { ingredient: '鸡蛋', pieces: 2 },
                                      ...([1, 2].includes(day)
                                        ? [{ ingredient: '食用油', milliliters: 8 }]
                                        : []),
                                    ],
                                  },
                                ]
                              : [
                                  {
                                    title: '米饭',
                                    kind: 'staple',
                                    minutes: 35,
                                    steps: ['蒸熟米饭。'],
                                    ingredients: [{ ingredient: '大米', grams: 180 }],
                                  },
                                  {
                                    title: `鸡胸肉第${day}天${meal}`,
                                    kind: 'protein',
                                    minutes: 20,
                                    steps: ['鸡肉完全炒熟。'],
                                    ingredients: [
                                      {
                                        ingredient: useNonFoodWeekIngredient ? '浴室拖鞋' : '鸡胸肉',
                                        grams: 200,
                                      },
                                      { ingredient: '食用油', milliliters: 8 },
                                      { ingredient: '食盐', grams: 2 },
                                    ],
                                  },
                                  {
                                    title: `清炒西兰花第${day}天${meal}`,
                                    kind: 'vegetable',
                                    minutes: 10,
                                    steps: ['西兰花炒熟。'],
                                    ingredients: [{ ingredient: '西兰花', grams: 150 }],
                                  },
                                ];
                            return { day, meal, dishes };
                          }),
                        }
                    : mealRequest
                      ? { people: 2, budget: 50, wants: ['fish', 'greens'], dishIds: [] }
                      : {
                          categories: ['vegetables'],
                          min: null,
                          max: 5,
                          productIds: [],
                          leafy: true,
                          sort: 'price',
                          relevant: true,
                        },
            ),
          },
        },
      ],
    }),
  );
});
await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
const modelPort = mock.address().port;
const env = {
  ...process.env,
  PORT: '3197',
  HOST: '127.0.0.1',
  DATA_DIR: dataDir,
  AI_BASE_URL: `http://127.0.0.1:${modelPort}/v1`,
  AI_API_KEY: 'test-only-key',
  AI_MODEL: 'test-vision',
  XINFADI_BASE_URL: `http://127.0.0.1:${modelPort}`,
};
const launch = () =>
  spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
let server;
const base = 'http://127.0.0.1:3197';
const waitReady = async () => {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`${base}/api/status`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw Error('test API failed to start');
};
const request = async (url, body, method = 'POST') =>
  fetch(`${base}/api${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const stop = async (child) => {
  if (!child || child.exitCode !== null) return;
  const closed = new Promise((resolve) => child.once('exit', resolve));
  child.kill();
  await closed;
};
try {
  server = launch();
  await waitReady();
  const initialProducts = await (await fetch(`${base}/api/products`)).json();
  assert.equal(initialProducts.length, 45);
  assert.deepEqual(initialProducts.find((product) => product.id === 'oil').packageSize, {
    quantity: 1800,
    unit: 'ml',
  });
  assert.deepEqual(initialProducts.find((product) => product.id === 'egg').packageSize, {
    quantity: 6,
    unit: 'piece',
  });
  const initialCategories = await (await fetch(`${base}/api/categories`)).json();
  assert.ok(
    initialCategories.some((category) => category.id === 'home' && category.kind === 'non_food'),
  );
  const customCategory = await request('/categories', {
    id: 'api-home',
    name: '测试家居',
    sectionId: 'pantry',
    kind: 'non_food',
  });
  assert.equal(customCategory.status, 201);
  assert.equal(
    (
      await request(
        '/categories/api-home',
        { name: '自定义家居', sectionId: 'pantry', active: true, kind: 'non_food' },
        'PATCH',
      )
    ).status,
    200,
  );
  assert.ok(
    (await (await fetch(`${base}/api/categories`)).json()).some(
      (category) => category.name === '自定义家居',
    ),
  );
  assert.equal(
    (
      await request(
        '/categories/api-home',
        { name: '自定义家居', sectionId: 'pantry', active: false, kind: 'non_food' },
        'PATCH',
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request('/products', {
        name: '停用分类商品',
        category: 'api-home',
        price: 1,
        unit: '1件',
        stock: 1,
        shelf: 'G-01',
        source: 'manual',
      })
    ).status,
    400,
  );
  const customSection = {
    id: 'api-section',
    name: 'API 位置测试区',
    code: 'T1',
    color: '#536488',
    tint: '#e4e8f1',
    location: { x: 28, y: 21 },
    rect: { x: 29, y: 20, w: 2, h: 2 },
  };
  assert.equal((await request('/sections', customSection)).status, 201);
  assert.equal(
    (
      await request(
        '/sections/api-section',
        { name: 'API 更新分区', active: true, location: { x: 27, y: 21 } },
        'PATCH',
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request('/shelves', {
        id: 'api-shelf-01',
        sectionId: 'api-section',
        name: 'T1-01',
        position: { x: 27, y: 21 },
        reachable: true,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await request(
        '/shelves/api-shelf-01',
        { sectionId: 'api-section', name: 'T1-02', position: { x: 26, y: 21 }, reachable: false },
        'PATCH',
      )
    ).status,
    200,
  );
  await request('/pricing', { productId: 'spinach' });
  assert.equal(marketCalls, 0, 'opening pricing must not fetch external market data');
  const marketResponse = await request('/market-prices', { query: '菠菜' });
  assert.equal(marketResponse.status, 200);
  assert.equal(marketResponse.headers.get('cache-control'), 'no-store');
  const market = await marketResponse.json();
  assert.equal(market.quotes.length, 2);
  await request('/market-prices', { query: '菠菜' });
  assert.equal(marketCalls, 2, 'each explicit query fetches again');
  assert.equal((await request('/market-prices', { query: '' })).status, 400);
  assert.equal(
    (await (await request('/market-prices', { query: '无此商品' })).json()).quotes.length,
    0,
  );
  assert.equal((await request('/market-prices', { query: '网络故障' })).status, 502);
  const reference = {
    price: 3.75,
    source: market.source,
    date: marketDate,
    unit: '500g',
    kind: 'wholesale',
    markupPercent: 30,
    quote: market.quotes[0],
    sourceUrl: market.sourceUrl,
    fetchedAt: market.fetchedAt,
  };
  const advice = await (await request('/pricing', { reference })).json();
  assert.equal(advice.marketPrice, 4.88);
  assert.equal(advice.wholesalePrice, 3.75);
  assert.equal((await request('/pricing', { reference: { ...reference, price: 1 } })).status, 400);
  assert.equal(
    (await request('/pricing', { reference: { ...reference, kind: 'retail' } })).status,
    400,
  );
  const response = await request('/chat', { message: '五元以内的绿叶蔬菜' });
  const guide = await response.json();
  assert.equal(guide.engine, 'model');
  assert.deepEqual(
    guide.products.map((p) => p.id),
    ['bokchoy', 'spinach'],
  );
  const meal = await (
    await request('/assistant', {
      message: '两个人吃，预算50元，想吃鱼和绿叶菜，家里有葱姜',
      context: { cart: [] },
    })
  ).json();
  assert.equal(meal.engine, 'model');
  assert.ok(meal.mealPlan.total > 50);
  assert.equal(meal.mealPlan.preferences.homePantry.includes('oil'), true);
  assert.equal(meal.action, undefined);
  const confirmation = await (
    await request('/assistant', {
      message: '预算改为300元，油盐也有，确认清单',
      context: {
        cart: [],
        meal: meal.mealPlan.preferences,
        recipeIds: meal.mealPlan.recipes.map((recipe) => recipe.id),
      },
    })
  ).json();
  assert.equal(confirmation.action.type, 'apply_plan');
  assert.equal(confirmation.mealPlan.canApply, true);
  const weekPlan = await (
    await request('/assistant', { message: '我想做一周两个人的减脂餐', context: { cart: [] } })
  ).json();
  assert.equal(weekPlan.engine, 'model');
  assert.equal(weekPlan.mealPlan.preferences.people, 2);
  assert.equal(weekPlan.mealPlan.preferences.days, 7);
  assert.equal(weekPlan.mealPlan.preferences.mealsPerDay, 3);
  assert.equal(new Set(weekPlan.mealPlan.recipes.map((recipe) => `${recipe.day}-${recipe.meal}`)).size, 21);
  assert.ok(weekPlan.mealPlan.recipes.length > 21);
  assert.ok(weekPlan.mealPlan.items.find((item) => item.product.id === 'chicken').recipeGrams > 0);
  assert.ok(!weekPlan.mealPlan.items.some((item) => item.product.id === 'oil'));
  const missingOilWeek = await (
    await request('/assistant', {
      message: '家里没有油',
      context: {
        cart: [],
        meal: weekPlan.mealPlan.preferences,
        recipeIds: weekPlan.mealPlan.recipes.map((recipe) => recipe.id),
      },
    })
  ).json();
  assert.equal(missingOilWeek.mealPlan.preferences.days, 7);
  assert.deepEqual(
    missingOilWeek.mealPlan.recipes.map((recipe) => recipe.title),
    weekPlan.mealPlan.recipes.map((recipe) => recipe.title),
  );
  assert.equal(missingOilWeek.mealPlan.items.find((item) => item.product.id === 'oil').recipeAmount, '128mL');
  assert.equal(missingOilWeek.mealPlan.items.find((item) => item.product.id === 'oil').quantity, 1);
  const restoredOilWeek = await (
    await request('/assistant', {
      message: '油也有',
      context: {
        cart: [],
        meal: missingOilWeek.mealPlan.preferences,
        recipeIds: missingOilWeek.mealPlan.recipes.map((recipe) => recipe.id),
      },
    })
  ).json();
  assert.ok(restoredOilWeek.mealPlan.preferences.homePantry.includes('oil'));
  assert.ok(!restoredOilWeek.mealPlan.items.some((item) => item.product.id === 'oil'));
  assert.deepEqual(
    restoredOilWeek.mealPlan.recipes.map((recipe) => recipe.title),
    weekPlan.mealPlan.recipes.map((recipe) => recipe.title),
  );
  const weekConfirmation = await (
    await request('/assistant', {
      message: '确认清单',
      context: {
        cart: [],
        meal: missingOilWeek.mealPlan.preferences,
        recipeIds: missingOilWeek.mealPlan.recipes.map((recipe) => recipe.id),
      },
    })
  ).json();
  assert.equal(
    weekConfirmation.action?.type,
    'apply_plan',
    JSON.stringify({ text: weekConfirmation.text, missing: weekConfirmation.mealPlan?.missing, unresolved: weekConfirmation.mealPlan?.unresolved }),
  );
  assert.equal(weekConfirmation.mealPlan.total, missingOilWeek.mealPlan.total);
  failWeekGenerator = true;
  const generationFallback = await (
    await request('/assistant', { message: '我想做一周两个人的减脂餐', context: { cart: [] } })
  ).json();
  failWeekGenerator = false;
  assert.equal(generationFallback.mealPlan.preferences.days, 1);
  assert.match(generationFallback.text, /不是完整周计划/);
  assert.equal(
    (
      await request('/assistant', {
        message: '确认清单',
        context: { cart: [{ productId: 'spinach', quantity: -1, checked: false }] },
      })
    ).status,
    400,
  );
  const form = new FormData();
  form.append(
    'image',
    new Blob([await readFile('public/images/spinach.jpg')], { type: 'image/jpeg' }),
    'vegetable.jpg',
  );
  const vision = await (await fetch(`${base}/api/vision`, { method: 'POST', body: form })).json();
  assert.equal(vision.candidates[0].category, 'vegetables');
  assert.equal(vision.candidates[0].productId, 'spinach');
  assert.ok(sawImage);
  assert.ok((await fetch(`${base}${vision.image}`)).ok);
  const invalid = new FormData();
  invalid.append('image', new Blob(['not an image'], { type: 'image/jpeg' }), 'bad.jpg');
  assert.equal((await fetch(`${base}/api/vision`, { method: 'POST', body: invalid })).status, 400);
  failModel = true;
  const mealFallback = await (
    await request('/assistant', {
      message: '两个人吃，预算50元，想吃鱼和绿叶菜',
      context: { cart: [] },
    })
  ).json();
  assert.equal(mealFallback.engine, 'rules');
  assert.ok(mealFallback.mealPlan);
  assert.ok(mealFallback.fallback);
  const weekFallback = await (
    await request('/assistant', { message: '我想做一周一个人的减脂餐', context: { cart: [] } })
  ).json();
  assert.equal(weekFallback.mealPlan.preferences.days, 1);
  assert.match(weekFallback.text, /不是完整周计划/);
  const fallback = await (await request('/chat', { message: '五元以内的绿叶蔬菜' })).json();
  assert.equal(fallback.engine, 'rules');
  assert.ok(fallback.fallback);
  const denied = await fetch(`${base}/api/vision`, { method: 'POST', body: form });
  assert.equal(denied.status, 502);
  assert.ok((await denied.json()).error.includes('密钥'));
  const newProduct = {
    name: 'API 测试菠菜',
    category: 'vegetables',
    price: 5.2,
    unit: '500g',
    stock: 20,
    shelf: 'A-01',
    source: 'manual',
    image: vision.image,
    reference,
  };
  const created = await request('/products', newProduct);
  assert.equal(created.status, 201);
  const product = await created.json();
  const updated = await request(`/products/${product.id}`, { ...newProduct, price: 6.2 }, 'PATCH');
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).history.length, 2);
  assert.equal((await request('/products', { ...newProduct, price: -1 })).status, 400);
  assert.equal(
    (await request('/products', { ...newProduct, unit: '1件', saleMode: 'weight' })).status,
    400,
  );
  assert.equal(
    (await request('/products', { ...newProduct, shelf: 'C-01', shelfId: 'does-not-exist' }))
      .status,
    400,
  );
  const nonFood = await request('/products', {
    ...newProduct,
    name: '浴室拖鞋',
    category: 'home',
    unit: '1双',
    shelf: 'G-01',
    shelfId: 'pantry-shelf-01',
    image: undefined,
    reference: undefined,
  });
  assert.equal(nonFood.status, 201);
  const nonFoodProduct = await nonFood.json();
  nonFoodProductId = nonFoodProduct.id;
  assert.equal(nonFoodProduct.category, 'home');
  failModel = false;
  useNonFoodWeekIngredient = true;
  const rejectedNonFoodMenu = await (
    await request('/assistant', {
      message: '我想做一周一个人的减脂餐',
      context: { cart: [] },
    })
  ).json();
  useNonFoodWeekIngredient = false;
  assert.equal(rejectedNonFoodMenu.mealPlan.preferences.days, 7);
  assert.equal(rejectedNonFoodMenu.mealPlan.budgetComplete, false);
  assert.ok(rejectedNonFoodMenu.mealPlan.unresolved.some((item) => item.status === 'not_in_store'));
  failModel = false;
  const homeQuery = await (await request('/chat', { message: '帮我找浴室拖鞋' })).json();
  assert.ok(homeQuery.products.some((candidate) => candidate.id === nonFoodProduct.id));
  assert.equal(homeQuery.engine, 'model');
  const shelfNavigation = await (
    await request('/assistant', { message: '带我去浴室拖鞋货架', context: { cart: [] } })
  ).json();
  assert.equal(shelfNavigation.action.productId, nonFoodProduct.id);
  const seedOil = initialProducts.find((item) => item.id === 'oil');
  assert.equal(
    (
      await request('/products/oil', { ...seedOil, price: 45, source: 'manual' }, 'PATCH')
    ).status,
    200,
  );
  failModel = true;
  await stop(server);
  server = launch();
  await waitReady();
  const products = await (await fetch(`${base}/api/products`)).json();
  assert.equal(products.find((p) => p.id === 'oil').price, 45);
  assert.deepEqual(products.find((p) => p.id === 'oil').packageSize, { quantity: 1800, unit: 'ml' });
  assert.equal(products.find((p) => p.id === product.id).price, 6.2);
  assert.ok(products.find((p) => p.id === nonFoodProduct.id));
  assert.ok(
    (await (await fetch(`${base}/api/categories`)).json()).some(
      (category) =>
        category.id === 'api-home' && category.name === '自定义家居' && !category.active,
    ),
  );
  assert.ok(
    (await (await fetch(`${base}/api/sections`)).json()).some(
      (section) => section.id === 'api-section' && section.name === 'API 更新分区',
    ),
  );
  assert.ok(
    (await (await fetch(`${base}/api/shelves`)).json()).some(
      (shelf) => shelf.id === 'api-shelf-01' && shelf.name === 'T1-02' && !shelf.reachable,
    ),
  );
  const saved = products.find((p) => p.id === product.id);
  assert.equal(saved.marketReference.quote.origin, '河北');
  assert.equal(saved.marketReference.kind, 'wholesale');
  assert.equal(saved.marketReference.markupPercent, 30);
  assert.equal(
    (await (await request('/pricing', { productId: product.id })).json()).marketPrice,
    4.88,
  );
  assert.equal(
    (await request(`/products/${product.id}`, { ...newProduct, unit: '1kg' }, 'PATCH')).status,
    400,
  );
  console.log(
    'PASS: on-demand market requests, unit validation, wholesale pricing, reference persistence, dynamic categories, non-food catalog query, model chat/vision, errors, CRUD and restart persistence.',
  );
} finally {
  await stop(server);
  await new Promise((resolve) => mock.close(resolve));
}
