import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { configureNetworkProxy } from '../server/network-proxy';
import { getModelSettings } from '../server/model-settings';
import {
  shoppingAgent,
  parseMealPreferences,
  mealPreferencesSchema,
} from '../server/shopping-agent';
import { availableForSale } from '../shared/catalog-status';
import { productCurrency } from '../shared/currency';
import { englishProductName, productMealKinds } from '../shared/meal-catalog';
import { cartTotal, mutateShoppingList } from '../shared/shopping';
import { buildMealPlan } from '../shared/meal-planner';
import { ingredientKey } from '../shared/recipes';
import type { Product, StoreCategory, ShoppingContext, GuideResponse } from '../shared/types';

configureNetworkProxy();
const settings = getModelSettings();
if (settings.provider !== 'deepseek') throw new Error('Select DeepSeek for explicit live tests.');
const db = new DatabaseSync(path.resolve(process.env.DATA_DIR || 'data', 'market.sqlite'), {
  readOnly: true,
});
const products = (db.prepare('SELECT data FROM products').all() as { data: string }[])
  .map((row) => JSON.parse(row.data) as Product)
  .filter((p) => availableForSale(p) && productCurrency(p) === 'USD');
const categories = (
  db.prepare('SELECT data FROM store_categories').all() as { data: string }[]
).map((row) => JSON.parse(row.data) as StoreCategory);
db.close();
const directory = path.resolve('outputs/meal-boundaries-2026-10-24', `run-${Date.now()}`);
await mkdir(directory, { recursive: true });

const numericCases: [
  string,
  Partial<{
    people: number;
    budget: number | null;
    days: number;
    mealsPerDay: number;
    singleMeal: string;
  }>,
  boolean,
][] = [
  ['0人晚餐', { people: 0 }, false],
  ['9人晚餐', { people: 9 }, false],
  ['-1人晚餐', { people: -1 }, false],
  ['1.5人晚餐', { people: 1.5 }, false],
  ['两个人晚餐，预算-10美元', { budget: -10 }, false],
  ['两个人晚餐，预算0美元', { budget: 0 }, true],
  ['两个人晚餐，预算10001美元', { budget: 10001 }, false],
  ['两个人吃0天', { days: 0 }, false],
  ['两个人吃15天', { days: 15 }, false],
  ['两个人每天0餐', { mealsPerDay: 0 }, false],
  ['两个人每天5餐', { mealsPerDay: 5 }, false],
  [
    '八个人吃14天，每天4餐，预算10000美元',
    { people: 8, days: 14, mealsPerDay: 4, budget: 10000 },
    true,
  ],
  ['两个人的晚餐，预算五十美元', { people: 2, budget: 50, mealsPerDay: 1 }, true],
  ['两个人的晚餐，预算USD 50', { budget: 50 }, true],
  ['两个人的晚餐，预算 $19.99', { budget: 19.99 }, true],
  ['两个人吃两周，每天两餐', { days: 14, mealsPerDay: 2 }, true],
  ['两个人每天早餐和晚餐', { mealsPerDay: 2 }, true],
];
const numeric = numericCases.map(([message, expected, valid]) => {
  const actual = parseMealPreferences(message);
  const accepted = mealPreferencesSchema.safeParse(actual).success;
  return {
    message,
    expected,
    actual: {
      people: actual.people,
      budget: actual.budget,
      days: actual.days,
      mealsPerDay: actual.mealsPerDay,
      singleMeal: actual.singleMeal,
    },
    accepted,
    passed:
      accepted === valid &&
      Object.entries(expected).every(
        ([key, value]) => (actual as unknown as Record<string, unknown>)[key] === value,
      ),
  };
});
await writeFile(path.join(directory, 'numeric.json'), JSON.stringify(numeric, null, 2));
if (process.argv.includes('--numeric')) {
  console.log(
    JSON.stringify({
      directory,
      passed: numeric.filter((r) => r.passed).length,
      total: numeric.length,
      failures: numeric.filter((r) => !r.passed),
    }),
  );
  process.exitCode = numeric.some((r) => !r.passed) ? 1 : 0;
} else {
  type Step = {
    message: string;
    people?: number;
    days?: number;
    meals?: number;
    budget?: number | null;
    refuse?: boolean;
    forbidden?: RegExp;
    noStarch?: boolean;
    apply?: boolean;
    slots?: string[];
    cart?: ShoppingContext['cart'];
    edit?: (items: Product[], context: ShoppingContext) => Product[];
    check?: (result: GuideResponse, context: ShoppingContext) => Record<string, boolean>;
  };
  type Scenario = { id: string; steps: Step[]; subset?: string[] };
  const subset = ['samsclub-990013040', 'samsclub-598443', 'samsclub-377608'];
  const scenarios: Scenario[] = [
    {
      id: 'eight-people',
      steps: [{ message: '8个人的晚餐，预算180美元，想吃烤鸡和沙拉', people: 8, meals: 1 }],
    },
    {
      id: 'four-meals',
      steps: [
        { message: '两个人吃3天，每天4餐，预算180美元，西式餐食', people: 2, days: 3, meals: 4 },
      ],
    },
    {
      id: 'fourteen-dinners',
      steps: [
        {
          message: '两个人吃14天，只安排晚餐，预算300美元，西式餐食',
          people: 2,
          days: 14,
          meals: 1,
        },
      ],
    },
    {
      id: 'maximum-cycle',
      steps: [
        {
          message: '两个人吃14天，每天4餐，预算600美元，西式餐食，复用食材',
          people: 2,
          days: 14,
          meals: 4,
        },
      ],
    },
    {
      id: 'no-oil-salt',
      steps: [
        {
          message: '两个人的西式鱼餐晚餐，预算60美元，家里没有油和盐，全部需要购买',
          people: 2,
          meals: 1,
          check: (r) => ({
            pantryPurchased:
              !!r.mealPlan &&
              r.mealPlan.preferences.buyPantry.includes('oil') &&
              r.mealPlan.preferences.buyPantry.includes('salt') &&
              r.mealPlan.items.some((i) => /\boil\b/i.test(englishProductName(i.product))) &&
              r.mealPlan.items.some((i) => /\bsalt\b/i.test(englishProductName(i.product))),
          }),
        },
      ],
    },
    {
      id: 'already-purchased',
      subset,
      steps: [
        {
          message: '两个人的晚餐，预算20美元，鸡蛋三明治配生菜',
          people: 2,
          meals: 1,
          cart: [
            { productId: subset[0], quantity: 1, checked: true },
            { productId: subset[1], quantity: 1, checked: true },
          ],
          check: (r) => ({
            purchasedNotRebought:
              !!r.mealPlan &&
              r.mealPlan.items
                .filter((i) => subset.slice(0, 2).includes(i.product.id))
                .every((i) => i.quantity === 0),
          }),
        },
      ],
    },
    {
      id: 'cart-over-budget',
      steps: [
        {
          message: '两个人的鱼餐晚餐，预算50美元，想吃沙拉',
          people: 2,
          meals: 1,
          cart: [{ productId: 'samsclub-990334655', quantity: 3, checked: false }],
          check: (r) => ({
            existingIncluded:
              (!!r.mealPlan && r.mealPlan.existingCost > 50 && !r.mealPlan.canApply) ||
              (!r.mealPlan && !!r.clearMealPlan && /现有待购清单.*超过预算/.test(r.text)),
          }),
        },
      ],
    },
    {
      id: 'stale-cart',
      steps: [
        {
          message: '两个人的晚餐，预算50美元，想吃鱼和沙拉',
          cart: [{ productId: 'missing-sku', quantity: 1, checked: false }],
          check: (r) => ({ blocked: !r.action && (!r.mealPlan || !r.mealPlan.canApply) }),
        },
      ],
    },
    {
      id: 'empty-store',
      steps: [{ message: '两个人的西式晚餐，预算50美元', refuse: true, edit: () => [] }],
    },
    {
      id: 'missing-fish',
      steps: [
        {
          message: '两个人的晚餐，预算50美元，必须吃烤鱼和沙拉',
          edit: (items) => items.filter((p) => !['seafood'].includes(p.category)),
          check: (r) => ({
            noSilentSubstitution:
              !r.mealPlan ||
              !r.mealPlan.canApply ||
              r.mealPlan.items.some((i) =>
                /salmon|tilapia|\bcod\b|pollock|fish/i.test(englishProductName(i.product)),
              ),
          }),
        },
      ],
    },
    {
      id: 'vegetarian',
      steps: [
        {
          message: '两个人的晚餐，预算50美元，蛋奶素食，不吃肉和海鲜',
          people: 2,
          meals: 1,
          forbidden: /\b(?:chicken|beef|pork|ham|bacon|salmon|tilapia|shrimp|tuna|cod)\b/i,
        },
      ],
    },
    {
      id: 'vegan',
      steps: [
        {
          message: '两个人的晚餐，预算60美元，纯素，不吃肉、海鲜、蛋、奶和奶酪',
          people: 2,
          meals: 1,
          forbidden:
            /\b(?:chicken|beef|pork|ham|bacon|salmon|tilapia|shrimp|tuna|cod|egg|eggs|milk|cheese|yogurt|butter)\b/i,
        },
      ],
    },
    {
      id: 'mushroom-cucumber',
      steps: [
        {
          message: '两个人的晚餐，预算50美元，不吃蘑菇和黄瓜，想吃鱼和沙拉',
          people: 2,
          meals: 1,
          forbidden: /mushroom|cucumber/i,
        },
      ],
    },
    {
      id: 'explicit-allergy',
      steps: [
        {
          message: '两个人的晚餐，预算50美元，我对花生严重过敏，请给我保证安全的餐食方案',
          check: (r) => ({
            noUnverifiedSafetyPromise:
              !r.action && (!r.mealPlan || !r.mealPlan.canApply) && /过敏|配料|包装/.test(r.text),
          }),
        },
      ],
    },
    {
      id: 'no-starch-chain',
      steps: [
        { message: '两个人的鱼餐晚餐，预算50美元，不要主食', people: 2, meals: 1, noStarch: true },
        { message: '再换一个方案，仍然不要主食', noStarch: true },
        { message: '确认清单', apply: true, noStarch: true },
      ],
    },
    {
      id: 'restore-shrimp',
      steps: [
        { message: '两个人的晚餐，预算60美元，不吃虾，想吃鱼和沙拉', forbidden: /shrimp/i },
        {
          message: '现在可以吃虾了，换成虾仁晚餐配沙拉',
          check: (r) => ({
            restrictionRemoved: !!r.mealPlan && !r.mealPlan.preferences.excluded.includes('shrimp'),
            shrimpUsed:
              !!r.mealPlan &&
              r.mealPlan.items.some((i) => /shrimp/i.test(englishProductName(i.product))),
          }),
        },
      ],
    },
    {
      id: 'people-days-budget-chain',
      steps: [
        { message: '两个人吃3天，每天两餐，预算150美元，西式餐食', people: 2, days: 3, meals: 2 },
        { message: '改成4个人，预算200美元', people: 4, days: 3, meals: 2, budget: 200 },
        { message: '只安排2天，预算120美元', people: 4, days: 2, meals: 2, budget: 120 },
        { message: '确认清单', people: 4, days: 2, meals: 2, apply: true },
      ],
    },
    {
      id: 'price-change-confirm',
      steps: [
        { message: '两个人的西式晚餐，预算50美元，想吃鱼和沙拉' },
        {
          message: '确认清单',
          edit: (items, context) =>
            items.map((p) =>
              context.meal?.generatedMeals?.some((m) =>
                m.dishes.some((d) => d.ingredients.some((i) => i.productId === p.id)),
              )
                ? { ...p, price: p.price * 100 }
                : p,
            ),
          check: (r) => ({ noOverBudgetAction: !r.action && !!r.mealPlan && !r.mealPlan.canApply }),
        },
      ],
    },
    {
      id: 'stock-change-confirm',
      steps: [
        { message: '两个人的鱼餐晚餐，预算50美元，想吃沙拉' },
        {
          message: '确认清单',
          refuse: true,
          edit: (items, context) =>
            items.filter(
              (p) =>
                !context.meal?.generatedMeals?.some((m) =>
                  m.dishes.some((d) => d.ingredients.some((i) => i.productId === p.id)),
                ),
            ),
        },
      ],
    },
    {
      id: 'exact-cents',
      subset,
      steps: [
        { message: '两个人的鸡蛋三明治晚餐，预算30美元，配生菜', people: 2, meals: 1 },
        {
          message: '确认清单',
          edit: (items, context) => {
            if (context.meal)
              context.meal.budget = buildMealPlan(context.meal, items, context.cart).total;
            return items;
          },
          apply: true,
          check: (r, c) => ({
            confirmationIdempotent:
              !!r.action &&
              r.action.type === 'apply_plan' &&
              !mutateShoppingList(
                mutateShoppingList(c.cart, products, r.action).list,
                products,
                r.action,
              ).changed,
          }),
        },
      ],
    },
    {
      id: 'zero-budget-owned',
      subset,
      steps: [
        {
          message: '两个人的鸡蛋三明治晚餐，预算0美元，家里已有鸡蛋、面包和生菜',
          people: 2,
          meals: 1,
          budget: 0,
          check: (r) => ({
            zeroPurchase: !!r.mealPlan && r.mealPlan.total === 0 && r.mealPlan.canApply,
          }),
        },
      ],
    },
  ];
  scenarios
    .find((s) => s.id === 'exact-cents')!
    .steps.push({
      message: '确认清单',
      edit: (items, context) => {
        if (context.meal)
          context.meal.budget =
            Math.round((buildMealPlan(context.meal, items, context.cart).total - 0.01) * 100) / 100;
        return items;
      },
      check: (r) => ({
        centBelowBlocked: !r.action && r.mealPlan?.remaining === -0.01 && !r.mealPlan.canApply,
      }),
    });
  scenarios.push(
    {
      id: 'restore-one-seafood',
      steps: [
        {
          message: '两个人的晚餐，预算80美元，不吃海鲜，想吃鸡肉和沙拉',
          forbidden: /\b(?:salmon|cod|tilapia|shrimp|crab|tuna|lobster)\b/i,
        },
        {
          message: '现在可以吃虾了，换成虾仁晚餐和沙拉',
          forbidden: /\b(?:salmon|cod|tilapia|crab|tuna|lobster)\b/i,
          check: (r) => ({
            shrimpAllowed:
              !!r.mealPlan &&
              r.mealPlan.items.some((item) => /\bshrimp\b/i.test(englishProductName(item.product))),
          }),
        },
      ],
    },
    {
      id: 'breakfast-dinner',
      steps: [
        {
          message: '两个人吃3天，每天早餐和晚餐，预算150美元，西式餐食',
          people: 2,
          days: 3,
          meals: 2,
          slots: ['早餐', '晚餐'],
        },
        { message: '确认清单', apply: true, slots: ['早餐', '晚餐'] },
      ],
    },
    {
      id: 'two-weeks',
      steps: [
        {
          message: '两个人吃两周，只安排晚餐，预算350美元，西式餐食',
          people: 2,
          days: 14,
          meals: 1,
        },
      ],
    },
    {
      id: 'stock-exhausted',
      steps: [
        {
          message: '两个人的晚餐，预算80美元，想吃烤鱼',
          edit: (items) => items.map((p) => ({ ...p, stock: 0, inventoryMode: 'tracked' })),
          refuse: true,
        },
      ],
    },
    {
      id: 'all-pantry-missing',
      steps: [
        {
          message: '两个人的鸡蛋三明治晚餐，预算50美元，家里只有鸡蛋，没有油盐和面包，配蔬菜沙拉',
          check: (r) => ({
            noImplicitPantry:
              !!r.mealPlan &&
              r.mealPlan.preferences.homePantry.length === 0 &&
              r.mealPlan.budgetComplete === true &&
              r.mealPlan.preferences.generatedMeals!.every((meal) =>
                meal.dishes.every((dish) =>
                  dish.ingredients.every(
                    (item) =>
                      !!item.productId ||
                      r.mealPlan!.preferences.owned.includes(
                        ingredientKey(item.ingredient || '') || '',
                      ),
                  ),
                ),
              ),
          }),
        },
      ],
    },
  );
  const selected = scenarios.filter(
    (s) =>
      process.argv.includes('--all') ||
      process.argv
        .find((arg) => arg.startsWith('--case='))
        ?.slice(7)
        .split(',')
        .includes(s.id),
  );
  if (!selected.length) throw new Error('Use --all or --case=case-id,...');
  const realFetch = globalThis.fetch;
  let calls: Record<string, unknown>[] = [];
  globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
    const started = Date.now();
    const call: Record<string, unknown> = {};
    calls.push(call);
    try {
      const response = await realFetch(...args);
      call.status = response.status;
      call.response = await response.clone().text();
      call.elapsedMs = Date.now() - started;
      return response;
    } catch (error) {
      call.error = error instanceof Error ? error.message : String(error);
      call.elapsedMs = Date.now() - started;
      throw error;
    }
  };
  const summaries: unknown[] = [];
  for (const scenario of selected) {
    calls = [];
    let context: ShoppingContext = { cart: [] };
    let items = scenario.subset
      ? products.filter((p) => scenario.subset!.includes(p.id))
      : structuredClone(products);
    const results = [];
    console.log(JSON.stringify({ event: 'start', id: scenario.id }));
    for (const step of scenario.steps) {
      if (step.cart) context.cart = structuredClone(step.cart);
      if (step.edit) items = step.edit(items, context);
      const before = calls.length;
      const started = Date.now();
      let result: GuideResponse;
      try {
        result = await shoppingAgent(step.message, items, context, undefined, categories);
      } catch (error) {
        results.push({
          message: step.message,
          error: error instanceof Error ? error.message : String(error),
          passed: false,
        });
        continue;
      }
      const plan = result.mealPlan;
      const checks: Record<string, boolean> = {};
      if (step.refuse) checks.refused = !result.action && !plan;
      else if (step.check === undefined || plan) {
        checks.model = result.engine === 'model' && !result.fallback;
        checks.plan = !!plan;
        if (step.check === undefined && !step.apply) {
          checks.complete = !!plan?.budgetComplete;
          checks.withinBudget = !!plan?.canApply;
        }
      }
      if (plan) {
        checks.correctMoney =
          Math.abs(
            plan.total - (plan.existingCost + plan.items.reduce((sum, i) => sum + i.cost, 0)),
          ) < 0.011;
        checks.originalCartPriced = plan.existingCost === cartTotal(context.cart, items);
        checks.noOverBudgetApply = !(
          plan.canApply &&
          plan.preferences.budget !== null &&
          plan.total > plan.preferences.budget
        );
        if (step.people !== undefined) checks.people = plan.preferences.people === step.people;
        if (step.days !== undefined) checks.days = plan.preferences.days === step.days;
        if (step.meals !== undefined) checks.meals = plan.preferences.mealsPerDay === step.meals;
        if (step.slots)
          checks.namedSlots =
            JSON.stringify([...new Set(plan.recipes.map((r) => r.meal))].sort()) ===
            JSON.stringify([...step.slots].sort());
        if (step.budget !== undefined) checks.budget = plan.preferences.budget === step.budget;
        if (step.forbidden)
          checks.exclusions = plan.items.every(
            (i) => !step.forbidden!.test(englishProductName(i.product)),
          );
        if (step.noStarch)
          checks.noStarch = plan.items.every(
            (i) => !productMealKinds(i.product).includes('staple'),
          );
        if (step.apply) {
          checks.confirmAction = result.action?.type === 'apply_plan';
          checks.noExtraGeneration = calls.length === before;
        }
      }
      if (step.check) Object.assign(checks, step.check(result, context));
      const passed = Object.values(checks).every(Boolean);
      results.push({
        message: step.message,
        elapsedMs: Date.now() - started,
        checks,
        passed,
        result,
        modelCalls: calls.length - before,
      });
      console.log(
        JSON.stringify({
          event: 'step',
          id: scenario.id,
          message: step.message,
          passed,
          engine: result.engine,
          total: plan?.total,
          checks,
        }),
      );
      if (plan)
        context = { ...context, meal: plan.preferences, recipeIds: plan.recipes.map((r) => r.id) };
      else if (result.clearMealPlan) context = { cart: context.cart };
    }
    const passed = results.every((r) => r.passed);
    const summary = { id: scenario.id, passed, calls: calls.length, results };
    summaries.push(summary);
    await writeFile(
      path.join(directory, scenario.id + '.json'),
      JSON.stringify({ ...summary, responses: calls }, null, 2),
    );
    console.log(JSON.stringify({ event: 'end', id: scenario.id, passed, calls: calls.length }));
  }
  globalThis.fetch = realFetch;
  await writeFile(path.join(directory, 'summary.json'), JSON.stringify(summaries, null, 2));
  console.log(
    JSON.stringify({
      directory,
      scenarios: summaries.length,
      failed: summaries
        .filter((s) => !(s as { passed: boolean }).passed)
        .map((s) => (s as { id: string }).id),
    }),
  );
  if (summaries.some((s) => !(s as { passed: boolean }).passed)) process.exitCode = 1;
}
