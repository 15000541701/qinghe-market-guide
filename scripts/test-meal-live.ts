import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { configureNetworkProxy } from '../server/network-proxy';
import { getModelSettings } from '../server/model-settings';
import { shoppingAgent } from '../server/shopping-agent';
import { availableForSale } from '../shared/catalog-status';
import { productCurrency } from '../shared/currency';
import { englishProductName, productMealKinds } from '../shared/meal-catalog';
import type { Product, StoreCategory, ShoppingContext } from '../shared/types';

// Explicit live diagnostic, never part of npm test. It reads the store without
// importing database migrations and never writes a cart, product, or credential.
configureNetworkProxy();
const settings = getModelSettings();
if (settings.provider !== 'deepseek') throw new Error('Live checks require DeepSeek selection.');
const db = new DatabaseSync(path.resolve(process.env.DATA_DIR || 'data', 'market.sqlite'), {
  readOnly: true,
});
const products = (db.prepare('SELECT data FROM products').all() as { data: string }[])
  .map((row) => JSON.parse(row.data) as Product)
  .filter((product) => availableForSale(product) && productCurrency(product) === 'USD');
const categories = (
  db.prepare('SELECT data FROM store_categories').all() as { data: string }[]
).map((row) => JSON.parse(row.data) as StoreCategory);
db.close();

const cases: {
  id: string;
  message: string;
  people: number;
  days: number;
  meals: number;
  setup?: string;
  overBudget?: boolean;
}[] = [
  {
    id: 'sample',
    message: '两个人吃，预算 50 USD，想搭配西式鱼餐和沙拉',
    people: 2,
    days: 1,
    meals: 2,
  },
  {
    id: 'pasta',
    message: '四个人的晚餐，预算100美元，想吃鸡肉意面和蔬菜沙拉',
    people: 4,
    days: 1,
    meals: 1,
  },
  {
    id: 'excluded',
    message: '两个人的晚餐，预算50美元，不吃虾，想吃烤鱼和沙拉',
    people: 2,
    days: 1,
    meals: 1,
  },
  {
    id: 'breakfast',
    message: '一个人的早餐，预算20美元，想吃鸡蛋三明治',
    people: 1,
    days: 1,
    meals: 1,
  },
  {
    id: 'three-days',
    message: '两个人吃3天，每天两餐，预算150美元，想吃西式餐食，菜式不要重复',
    people: 2,
    days: 3,
    meals: 2,
  },
  {
    id: 'tight-budget',
    message: '两个人的晚餐，预算5美元，想吃三文鱼配沙拉',
    people: 2,
    days: 1,
    meals: 1,
    overBudget: true,
  },
  {
    id: 'owned',
    message: '两个人的晚餐，预算20美元，家里有鸡蛋和面包，想吃鸡蛋三明治配沙拉',
    people: 2,
    days: 1,
    meals: 1,
  },
  {
    id: 'no-starch',
    message: '两个人的晚餐，预算50美元，想吃烤鱼和沙拉，不要主食',
    people: 2,
    days: 1,
    meals: 1,
  },
  {
    id: 'week',
    message: '两个人一周三餐，预算200美元，想要西式餐食，尽量复用食材',
    people: 2,
    days: 7,
    meals: 3,
  },
  {
    id: 'followup',
    setup: '两个人的晚餐，预算50美元，想吃鱼和沙拉',
    message: '换一个方案',
    people: 2,
    days: 1,
    meals: 1,
  },
  {
    id: 'no-pork-pasta',
    message: '两个人的晚餐，预算80美元，不吃猪肉，想吃鸡肉意面和沙拉',
    people: 2,
    days: 1,
    meals: 1,
  },
  {
    id: 'replace-pasta',
    setup: '两个人的晚餐，预算50美元，想吃鱼和沙拉',
    message: '换成鸡肉意面和沙拉，预算80美元',
    people: 2,
    days: 1,
    meals: 1,
  },
];
const selected = process.argv.includes('--all')
  ? cases
  : cases.filter(
      (item) =>
        item.id === (process.argv.find((arg) => arg.startsWith('--case='))?.slice(7) || 'sample'),
    );
if (!selected.length) throw new Error('Unknown live test case.');
const directory = path.resolve('outputs/meal-live-2026-10-24', `run-${Date.now()}`);
await mkdir(directory, { recursive: true });
const realFetch = globalThis.fetch;
let calls: Record<string, unknown>[] = [];
globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
  const started = Date.now();
  const request = JSON.parse(String(args[1]?.body || '{}'));
  const call: Record<string, unknown> = {
    model: request.model,
    maxTokens: request.max_tokens,
    messageCharacters: JSON.stringify(request.messages || []).length,
    feedback:
      request.messages?.at(-1)?.role === 'user' &&
      /^(?:程序按|请按这些校验错误)/.test(request.messages.at(-1).content)
        ? request.messages.at(-1).content
        : undefined,
  };
  calls.push(call);
  console.log(JSON.stringify({ event: 'model-start', number: calls.length, ...call }));
  try {
    const response = await realFetch(...args);
    const body = await response.clone().text();
    Object.assign(call, {
      elapsedMs: Date.now() - started,
      status: response.status,
      response: body,
    });
    let metadata: any;
    try {
      metadata = JSON.parse(body);
    } catch {
      /* Recorded verbatim for diagnosis. */
    }
    console.log(
      JSON.stringify({
        event: 'model-end',
        elapsedMs: call.elapsedMs,
        status: response.status,
        finishReason: metadata?.choices?.[0]?.finish_reason,
        usage: metadata?.usage,
      }),
    );
    return response;
  } catch (error) {
    Object.assign(call, {
      elapsedMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(
      JSON.stringify({ event: 'model-error', elapsedMs: call.elapsedMs, error: call.error }),
    );
    throw error;
  }
};
const summary: unknown[] = [];
for (const item of selected) {
  calls = [];
  const started = Date.now();
  console.log(JSON.stringify({ event: 'case-start', ...item }));
  let context: ShoppingContext = { cart: [] };
  let setupTitles: string[] = [];
  if (item.setup) {
    const setup = await shoppingAgent(item.setup, products, context, undefined, categories);
    if (!setup.mealPlan) throw new Error('Follow-up setup failed');
    context = {
      cart: [],
      meal: setup.mealPlan.preferences,
      recipeIds: setup.mealPlan.recipes.map((recipe) => recipe.id),
    };
    setupTitles = setup.mealPlan.recipes.map((recipe) => recipe.title);
  }
  const result = await shoppingAgent(item.message, products, context, undefined, categories);
  const plan = result.mealPlan;
  const chosen = plan?.items.map((item) => item.product) || [];
  const titles = plan?.recipes.map((recipe) => recipe.title) || [];
  const checks: Record<string, boolean> = {
    model: result.engine === 'model' && !result.fallback,
    complete: plan?.budgetComplete === true && !plan.missing.length,
    people: plan?.preferences.people === item.people,
    slots:
      new Set(plan?.recipes.map((recipe) => `${recipe.day}-${recipe.meal}`)).size ===
      item.days * item.meals,
    amounts:
      !!plan &&
      Math.abs(
        plan.total - (plan.existingCost + plan.items.reduce((sum, line) => sum + line.cost, 0)),
      ) < 0.011,
    budget:
      !!plan &&
      (item.overBudget
        ? !plan.canApply && plan.total > (plan.preferences.budget || 0) && /超出/.test(result.text)
        : plan.canApply),
  };
  if (['sample', 'excluded', 'followup'].includes(item.id))
    checks.salad = titles.some((title) => /沙拉/.test(title));
  if (item.id === 'excluded')
    checks.noShrimp = chosen.every((product) => !/\bshrimp\b/i.test(englishProductName(product)));
  if (['pasta', 'replace-pasta', 'no-pork-pasta'].includes(item.id))
    checks.realPasta = chosen.some(
      (product) =>
        /\b(?:pasta|macaroni|ravioli|tortellini|lasagna)\b/i.test(englishProductName(product)) &&
        productMealKinds(product).includes('staple'),
    );
  if (item.id === 'owned')
    checks.ownedNotBought = chosen.every(
      (product) =>
        !['samsclub-990013040', 'samsclub-598443', 'samsclub-990492043'].includes(product.id),
    );
  if (item.id === 'no-starch')
    checks.noStarch = chosen.every((product) => !productMealKinds(product).includes('staple'));
  if (item.id === 'followup')
    checks.changed = JSON.stringify(titles) !== JSON.stringify(setupTitles);
  if (item.id === 'no-pork-pasta')
    checks.noPork = chosen.every(
      (product) => !/\b(?:pork|ham|bacon|prosciutto|salami)\b/i.test(englishProductName(product)),
    );
  if (plan?.canApply) {
    const beforeConfirmation = calls.length;
    const confirmation = await shoppingAgent(
      '确认清单',
      products,
      {
        cart: context.cart,
        meal: plan.preferences,
        recipeIds: plan.recipes.map((recipe) => recipe.id),
      },
      undefined,
      categories,
    );
    checks.confirmWithoutRegeneration =
      calls.length === beforeConfirmation && confirmation.action?.type === 'apply_plan';
    checks.confirmPreservesPlan =
      confirmation.mealPlan?.total === plan.total &&
      confirmation.mealPlan?.preferences.mealsPerDay === plan.preferences.mealsPerDay;
  }
  const passed = Object.values(checks).every(Boolean);
  const record = {
    id: item.id,
    message: item.message,
    ...settings,
    elapsedMs: Date.now() - started,
    engine: result.engine,
    fallback: result.fallback,
    text: result.text,
    total: plan?.total,
    canApply: plan?.canApply,
    budgetComplete: plan?.budgetComplete,
    missing: plan?.missing,
    preferences: plan?.preferences,
    recipes: plan?.recipes,
    items: plan?.items.map(({ product, ...line }) => ({
      ...line,
      productId: product.id,
      name: product.name,
      packageSize: product.packageSize,
      price: product.price,
    })),
    modelCalls: calls.length,
    checks,
    passed,
  };
  await writeFile(
    path.join(directory, `${item.id}.json`),
    JSON.stringify({ ...record, calls }, null, 2),
  );
  summary.push(record);
  console.log(
    JSON.stringify({
      event: 'case-end',
      id: item.id,
      engine: result.engine,
      fallback: result.fallback,
      elapsedMs: record.elapsedMs,
      total: plan?.total,
      canApply: plan?.canApply,
      missing: plan?.missing,
      text: result.text,
      modelCalls: calls.length,
      checks,
      passed,
    }),
  );
}
globalThis.fetch = realFetch;
await writeFile(path.join(directory, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ reportDirectory: directory }));
if (summary.some((record) => (record as { passed: boolean }).passed === false))
  process.exitCode = 1;
