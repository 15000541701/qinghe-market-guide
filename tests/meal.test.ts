import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSeedProducts } from '../shared/catalog';
import { buildMealPlan, describeMealPlan } from '../shared/meal-planner';
import { defaultHomePantry, ingredientEnglishTerms, ingredientKey } from '../shared/recipes';
import { parseMealPreferences, shoppingAgent } from '../server/shopping-agent';
import {
  cartTotal,
  mutateShoppingList,
  quantityForGrams,
  quantityForMeasure,
} from '../shared/shopping';
import type { GeneratedMeal, MealPreferences } from '../shared/types';

// Retain the price/quantity fixture, with explicit English catalog names.
const products = makeSeedProducts().map((product) => ({
  ...product,
  aliases: [...(ingredientEnglishTerms[product.id] || []), ...product.aliases],
}));
const request = '两个人吃，预算50元，想搭配西式鱼餐和沙拉';

function generatedWeek(): GeneratedMeal[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const day = offset + 1;
    return ['早餐', '午餐', '晚餐'].map((meal) => {
      const isBreakfast = meal === '早餐';
      const dishes: GeneratedMeal['dishes'] = isBreakfast
        ? [
            {
              id: `bread-${day}`,
              title: `全麦吐司第${day}天`,
              kind: 'staple',
              minutes: 5,
              steps: ['加热吐司。'],
              ingredients: [{ ingredient: '全麦面包', grams: 120 }],
            },
            {
              id: `egg-${day}`,
              title: `水煮蛋第${day}天`,
              kind: 'protein',
              minutes: 10,
              steps: ['鸡蛋煮熟。'],
              ingredients: [
                { ingredient: '鸡蛋', pieces: 2 },
                ...(day <= 2 ? [{ ingredient: '食用油', milliliters: 8 }] : []),
              ],
            },
          ]
        : [
            {
              id: `rice-${day}-${meal}`,
              title: '烤面包',
              kind: 'staple',
              minutes: 35,
              steps: ['面包加热。'],
              ingredients: [{ ingredient: 'bread', grams: 180 }],
            },
            {
              id: `chicken-${day}-${meal}`,
              title: `烤鸡胸肉第${day}天${meal}`,
              kind: 'protein',
              minutes: 20,
              steps: ['鸡肉完全炒熟。'],
              ingredients: [
                { ingredient: '鸡胸肉', grams: 200 },
                { ingredient: '食用油', milliliters: 8 },
                { ingredient: '食盐', grams: 2 },
              ],
            },
            {
              id: `spinach-${day}-${meal}`,
              title: `菠菜沙拉第${day}天${meal}`,
              kind: 'vegetable',
              minutes: 10,
              steps: ['菠菜炒熟。'],
              ingredients: [{ ingredient: '菠菜', grams: 160 }],
            },
          ];
      return { id: `generated-${day}-${meal}`, day, meal, dishes };
    });
  })
    .flat()
    .map((meal) => ({
      ...meal,
      dishes: meal.dishes.map((dish) => ({
        ...dish,
        ingredients: dish.ingredients.map((item) => {
          const key = ingredientKey(item.ingredient || '') || item.ingredient || '';
          return { ...item, ingredient: ingredientEnglishTerms[key]?.[0] || key, productId: key };
        }),
      })),
    }));
}

function oneMeal(
  ingredients: GeneratedMeal['dishes'][number]['ingredients'],
  people = 2,
): MealPreferences {
  return {
    ...parseMealPreferences(`${people}人每天一餐`),
    days: 1,
    mealsPerDay: 1,
    generatedMeals: [
      {
        id: 'generated-1-晚餐',
        day: 1,
        meal: '晚餐',
        dishes: [
          {
            id: 'test-dish',
            title: '测试家常菜',
            kind: 'mixed',
            minutes: 20,
            steps: ['按份量准备并充分加热。'],
            ingredients,
          },
        ],
      },
    ],
  };
}

test('正餐不是单菜：静态周计划覆盖21餐，午晚餐均含主食、蛋白质和蔬菜', () => {
  const prefs = parseMealPreferences('我想做一周一个人的减脂餐');
  assert.equal(prefs.people, 1);
  assert.equal(prefs.days, 7);
  assert.equal(prefs.mealsPerDay, 3);
  const plan = buildMealPlan(prefs, products, []);
  const slots = new Map<string, typeof plan.recipes>();
  for (const recipe of plan.recipes) {
    const key = `${recipe.day}-${recipe.meal}`;
    slots.set(key, [...(slots.get(key) || []), recipe]);
    assert.ok(recipe.ingredientAmounts?.length);
  }
  assert.equal(slots.size, 21);
  for (let day = 1; day <= 7; day++) {
    assert.ok(slots.get(`${day}-早餐`)?.length);
    for (const meal of ['午餐', '晚餐']) {
      const dishes = slots.get(`${day}-${meal}`) || [];
      assert.ok(dishes.length >= 3);
      assert.deepEqual(
        new Set(dishes.map((dish) => dish.kind)),
        new Set(['staple', 'protein', 'vegetable']),
      );
    }
  }
  assert.ok(plan.items.some((item) => (item.recipeGrams || 0) > 0));
  assert.ok(plan.budgetComplete);
});

test('常备调味默认免购但仍显示用量；一周油用量聚合后只买一瓶', async () => {
  const preferences = {
    ...parseMealPreferences('一周两个人每天三餐'),
    generatedMeals: generatedWeek(),
  };
  assert.deepEqual(preferences.homePantry, defaultHomePantry);
  const defaultPlan = buildMealPlan(preferences, products, []);
  assert.equal(
    new Set(defaultPlan.recipes.map((recipe) => `${recipe.day}-${recipe.meal}`)).size,
    21,
  );
  assert.ok(
    defaultPlan.recipes.some((recipe) =>
      recipe.ingredientAmounts?.some((item) => item.name === '食用油' && item.amount === '8mL'),
    ),
  );
  assert.ok(!defaultPlan.items.some((item) => item.product.id === 'oil'));

  const withoutOil = parseMealPreferences('家里没有油', preferences);
  const plan = buildMealPlan(withoutOil, products, []);
  const oil = plan.items.find((item) => item.product.id === 'oil');
  assert.equal(oil?.recipeAmount, '128mL');
  assert.equal(oil?.quantity, 1);
  assert.equal(oil?.cost, 39.9);
  assert.equal(
    quantityForMeasure(
      products.find((item) => item.id === 'oil')!,
      128,
      'ml',
    ),
    1,
  );

  const confirmedAgain = parseMealPreferences('油也有', withoutOil);
  assert.ok(confirmedAgain.homePantry.includes('oil'));
  assert.ok(!confirmedAgain.buyPantry.includes('oil'));
  assert.ok(
    !buildMealPlan(confirmedAgain, products, []).items.some((item) => item.product.id === 'oil'),
  );
  const bareConfirmation = parseMealPreferences('有油', withoutOil);
  assert.ok(bareConfirmation.homePantry.includes('oil'));
  assert.ok(!bareConfirmation.buyPantry.includes('oil'));
  const followup = await shoppingAgent('有油', products, { cart: [], meal: withoutOil });
  assert.ok(followup.mealPlan);
  assert.ok(followup.mealPlan!.preferences.homePantry.includes('oil'));
  assert.ok(!followup.mealPlan!.items.some((item) => item.product.id === 'oil'));
});

test('家庭常备与临时自备可区分；明确缺油才计入整包装，特色调料默认采购', () => {
  const base = oneMeal([
    { ingredient: '鸡胸肉', grams: 200 },
    { ingredient: '食用油', milliliters: 12 },
    { ingredient: '食盐', grams: 2 },
    { ingredient: 'black pepper', grams: 15 },
  ]);
  const defaultPlan = buildMealPlan(base, products, []);
  assert.ok(!defaultPlan.items.some((item) => ['oil', 'salt'].includes(item.product.id)));
  assert.ok(defaultPlan.items.some((item) => item.product.id === 'black-pepper'));

  const noOil = parseMealPreferences('家里没有油盐', base);
  const plan = buildMealPlan(noOil, products, []);
  const oil = plan.items.find((item) => item.product.id === 'oil');
  assert.equal(oil?.recipeAmount, '12mL');
  assert.equal(oil?.quantity, 1);
  assert.ok(plan.items.some((item) => item.product.id === 'salt'));
});

test('库存清单先去重，确认重复不再加入，已购量从需求中扣除', () => {
  const prefs = parseMealPreferences('家里没有油', {
    ...oneMeal([{ ingredient: '食用油', milliliters: 128 }]),
  });
  const cart = [
    { productId: 'oil', quantity: 1, checked: false },
    { productId: 'banana', quantity: 1, checked: false },
  ];
  const plan = buildMealPlan(prefs, products, cart);
  const oil = plan.items.find((item) => item.product.id === 'oil')!;
  assert.equal(oil.quantity, 1);
  assert.equal(oil.additionalQuantity, 0);
  assert.equal(oil.cost, 0);
  assert.equal(plan.existingCost, cartTotal(cart, products));
  assert.equal(plan.newlyAddedCost, 0);
  const action = {
    type: 'apply_plan' as const,
    items: plan.items
      .filter((item) => item.quantity > 0)
      .map((item) => ({ productId: item.product.id, quantity: item.quantity })),
    budget: null,
  };
  const applied = mutateShoppingList(cart, products, action);
  assert.equal(applied.list.filter((item) => item.productId === 'oil').length, 1);
  assert.equal(mutateShoppingList(applied.list, products, action).changed, false);

  const bought = buildMealPlan(prefs, products, [{ productId: 'oil', quantity: 1, checked: true }]);
  assert.equal(bought.items.find((item) => item.product.id === 'oil')?.quantity, 0);
  assert.ok(!bought.canApply || bought.budgetComplete);
});

test('本店缺货、无匹配商品和不可换算单位分别标示，并将预算标为不完整', () => {
  const missing = buildMealPlan(
    oneMeal(
      [
        { ingredient: '猪肉', grams: 200 },
        { ingredient: '迷迭香', grams: 5 },
      ],
      2,
    ),
    products,
    [],
  );
  assert.equal(missing.unresolved?.[0].status, 'not_in_store');
  assert.equal(missing.budgetComplete, false);
  assert.equal(missing.remaining, null);
  assert.equal(missing.canApply, false);
  assert.match(describeMealPlan(missing), /本店可购部分/);
  assert.match(describeMealPlan(missing), /未计价/);

  const mismatch = buildMealPlan(oneMeal([{ ingredient: '牛奶', grams: 250 }]), products, []);
  assert.ok(mismatch.unresolved?.some((item) => item.status === 'unit_mismatch'));
  assert.equal(mismatch.budgetComplete, false);

  const outOfStock = buildMealPlan(
    oneMeal([{ ingredient: '鸡胸肉', grams: 200 }]),
    products.map((item) => (item.id === 'chicken' ? { ...item, stock: 0 } : item)),
    [],
  );
  assert.ok(outOfStock.unresolved?.some((item) => item.status === 'out_of_stock'));
  assert.equal(outOfStock.canApply, false);
  assert.equal(
    outOfStock.total,
    0,
    'an unavailable SKU is not counted in the purchasable subtotal',
  );

  const nonFoodOnly = buildMealPlan(oneMeal([{ ingredient: '卷纸', pieces: 1 }]), products, []);
  assert.ok(nonFoodOnly.unresolved?.some((item) => item.status === 'not_in_store'));
});

test('缺少菠菜不自动替换生菜，忌口在自备食材之前检查', () => {
  const withoutSpinach = products.filter((item) => item.id !== 'spinach');
  const replaced = buildMealPlan(oneMeal([{ ingredient: '菠菜', grams: 200 }]), withoutSpinach, []);
  assert.equal(replaced.items.length, 0);
  assert.ok(replaced.unresolved?.some((item) => item.status === 'not_in_store'));
  const excluded = {
    ...oneMeal([{ ingredient: '菠菜', grams: 200 }]),
    excluded: ['spinach'],
    owned: ['spinach'],
  };
  const rejected = buildMealPlan(excluded, products, []);
  assert.equal(rejected.canApply, false);
  assert.ok(rejected.missing.some((item) => item.includes('排除')));

  const noChili = parseMealPreferences('不吃辣椒', oneMeal([{ ingredient: '辣椒', grams: 20 }]));
  assert.ok(noChili.excluded.includes('chili'));
  const chiliRejected = buildMealPlan(noChili, products, []);
  assert.equal(chiliRejected.canApply, false);
  assert.ok(!chiliRejected.items.some((item) => item.product.id === 'chili'));
});

test('便宜替换保持人数和份量，并包含原清单其他商品的预算', () => {
  // Leave room for variety first, so the explicit cheaper request has work to do.
  const prefs = { ...parseMealPreferences(request), budget: 200 };
  const plan = buildMealPlan(prefs, products, []);
  const cheap = buildMealPlan(
    parseMealPreferences('换便宜一点，保持人数和份量', prefs),
    products,
    [],
  );
  assert.equal(cheap.preferences.people, 2);
  assert.ok(cheap.total < plan.total);
  assert.equal(cheap.items.find((item) => item.product.id === 'salmon')?.recipeAmount, '700g');
  const withExisting = buildMealPlan(prefs, products, [
    { productId: 'banana', quantity: 1, checked: false },
  ]);
  assert.ok(withExisting.total > plan.total);
  assert.equal(
    Math.round((withExisting.existingCost + withExisting.newlyAddedCost!) * 100),
    Math.round(withExisting.total * 100),
  );
});

test('本地备用餐单超预算时复用食材整包，保持正常份量且不改已选菜单', () => {
  const preferences = parseMealPreferences(request);
  const economical = buildMealPlan({ ...preferences, cheaper: true }, products, []);
  const automatic = buildMealPlan(preferences, products, []);
  assert.equal(automatic.total, economical.total);
  assert.equal(automatic.preferences.people, preferences.people);
  assert.equal(automatic.items.find((item) => item.product.id === 'salmon')?.recipeAmount, '700g');
  const fixedIds = automatic.recipes.map((recipe) => recipe.id);
  const confirmed = buildMealPlan({ ...preferences, budget: 0 }, products, [], fixedIds);
  assert.equal(confirmed.total, automatic.total);
  assert.equal(confirmed.canApply, false, '确认不得换菜单来掩盖超预算');
});

test('整周采购金额按完整包装向上取整并保持重复确认幂等', () => {
  const preferences = {
    ...parseMealPreferences('一周两个人每天三餐'),
    generatedMeals: generatedWeek(),
  };
  const plan = buildMealPlan(preferences, products, []);
  assert.equal(new Set(plan.recipes.map((recipe) => `${recipe.day}-${recipe.meal}`)).size, 21);
  const action = {
    type: 'apply_plan' as const,
    items: plan.items
      .filter((item) => item.quantity > 0)
      .map((item) => ({ productId: item.product.id, quantity: item.quantity })),
    budget: null,
  };
  const applied = mutateShoppingList([], products, action);
  assert.equal(mutateShoppingList(applied.list, products, action).changed, false);
  const revised = buildMealPlan(preferences, products, applied.list);
  assert.equal(Math.round(revised.total * 100), Math.round(plan.total * 100));
});

test('称重商品按50g步进，包装商品按净含量换算', () => {
  assert.equal(
    quantityForGrams(
      products.find((product) => product.id === 'salmon')!,
      250,
    ),
    2,
  );
  assert.equal(
    quantityForGrams(
      products.find((product) => product.id === 'spinach')!,
      250,
    ),
    0.5,
  );
  assert.equal(
    quantityForMeasure(
      products.find((product) => product.id === 'egg')!,
      8,
      'piece',
    ),
    2,
  );
  assert.equal(
    quantityForMeasure(
      products.find((product) => product.id === 'milk')!,
      250,
      'ml',
    ),
    1,
  );
  assert.equal(
    quantityForMeasure(
      products.find((product) => product.id === 'milk')!,
      250,
      'g',
    ),
    null,
  );
});

test('清单操作库存不足是原子的，超预算方案不能合并', () => {
  assert.throws(
    () =>
      mutateShoppingList([], products, {
        type: 'add',
        items: [{ productId: 'spinach', quantity: 99 }],
      }),
    /库存/,
  );
  assert.throws(
    () =>
      mutateShoppingList([], products, {
        type: 'apply_plan',
        items: [{ productId: 'spinach', quantity: 2 }],
        budget: 5,
      }),
    /预算/,
  );
});

test('对话动作能加入称重商品、移除、撤销和推进导航', async () => {
  assert.deepEqual((await shoppingAgent('把菠菜750克加入清单', products, { cart: [] })).action, {
    type: 'add',
    items: [{ productId: 'spinach', quantity: 1.5 }],
  });
  assert.equal((await shoppingAgent('撤销', products, { cart: [] })).action?.type, 'undo');
  assert.equal((await shoppingAgent('去下一站', products, { cart: [] })).action?.type, 'next');
  assert.equal(
    (await shoppingAgent('带我去水产区', products, { cart: [] })).action?.type,
    'navigate',
  );
  assert.equal((await shoppingAgent('不要加入清单', products, { cart: [] })).action, undefined);
  const prefs = { ...parseMealPreferences(request), budget: null };
  const confirmation = await shoppingAgent('确认清单', products, {
    cart: [],
    meal: prefs,
    recipeIds: ['pan-salmon#1-午餐', 'spinach-salad#1-午餐'],
  });
  assert.equal(confirmation.action?.type, 'apply_plan');
  assert.ok(confirmation.mealPlan?.canApply);
  assert.ok(
    (confirmation.action as { items: { quantity: number }[] }).items.every(
      (item) => item.quantity > 0,
    ),
  );
});
