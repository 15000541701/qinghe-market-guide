import type { ListItem, MealPlan, MealPreferences, Product } from './types';
import { ingredientNames, recipes, type Recipe } from './recipes';
import {
  amountLabel,
  cartTotal,
  lineCents,
  mergeMealItems,
  quantityForGrams,
  roundQuantity,
  purchasedQuantity,
} from './shopping';

export function createMealPreferences(): MealPreferences {
  return {
    people: 2,
    budget: null,
    wants: [],
    owned: [],
    excluded: [],
    buyPantry: [],
    dishIds: [],
    cheaper: false,
    includeRice: false,
  };
}

function evaluate(
  recipesToUse: Recipe[],
  preferences: MealPreferences,
  products: Product[],
  cart: ListItem[],
): MealPlan {
  const scale = preferences.people / 2;
  const needed = new Map<string, { quantity: number; dishes: string[] }>();
  const owned = new Set<string>();
  const pending = new Set<string>();
  const missing = new Set<string>();
  const addIngredient = (
    key: string,
    grams: number | undefined,
    units: number | undefined,
    pantry: boolean | undefined,
    title: string,
  ) => {
    const label = ingredientNames[key] || key;
    if (preferences.excluded.includes(key)) {
      missing.add(`“${title}”含有已排除的${label}`);
      return;
    }
    if (preferences.owned.includes(key)) {
      owned.add(label);
      return;
    }
    if (pantry && !preferences.buyPantry.includes(key)) {
      pending.add(key);
      return;
    }
    const product = products.find((p) => p.id === key);
    if (!product || product.stock <= 0) {
      missing.add(`${label}当前无货`);
      return;
    }
    const quantity = grams
      ? quantityForGrams(product, grams * scale)
      : Math.max(1, Math.ceil((units || 1) * (pantry ? 1 : scale)));
    const entry = needed.get(key);
    if (entry) {
      entry.quantity = pantry
        ? Math.max(entry.quantity, quantity)
        : roundQuantity(entry.quantity + quantity);
      entry.dishes.push(title);
    } else needed.set(key, { quantity, dishes: [title] });
  };
  for (const recipe of recipesToUse)
    for (const ingredient of recipe.ingredients)
      addIngredient(
        ingredient.key,
        ingredient.grams,
        ingredient.units,
        ingredient.pantry,
        recipe.title,
      );
  if (preferences.includeRice) addIngredient('rice', 200, undefined, false, '米饭');
  const items: MealPlan['items'] = [];
  for (const [id, need] of needed) {
    const product = products.find((p) => p.id === id)!;
    const bought = purchasedQuantity(cart.find((item) => item.productId === id));
    const quantity = roundQuantity(Math.max(0, need.quantity - bought));
    if (bought > 0) owned.add(`${product.name}（清单已购部分）`);
    if (!quantity) continue;
    if (quantity > Math.min(product.stock, 99))
      missing.add(`${product.name}库存不足，需要${amountLabel(product, quantity)}`);
    items.push({
      product,
      quantity,
      amount: amountLabel(product, quantity),
      cost: lineCents(product, quantity) / 100,
      dishes: need.dishes,
    });
  }
  const merged = mergeMealItems(
    cart,
    items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
  );
  for (const item of merged.filter((item) => !item.checked)) {
    const product = products.find((p) => p.id === item.productId);
    if (!product || product.stock < item.quantity)
      missing.add(`现有清单中的${product?.name || '商品'}已缺货或库存不足`);
  }
  const total = cartTotal(merged, products);
  const existingCost = cartTotal(cart, products);
  const remaining =
    preferences.budget === null ? null : Math.round((preferences.budget - total) * 100) / 100;
  return {
    preferences,
    recipes: recipesToUse.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      minutes: recipe.minutes,
      steps: recipe.steps,
      ingredients: recipe.ingredients.map(
        (ingredient) => ingredientNames[ingredient.key] || ingredient.key,
      ),
    })),
    items,
    owned: [...owned],
    pendingPantry: [...pending],
    missing: [...missing],
    total,
    existingCost,
    addedCost: Math.round((total - existingCost) * 100) / 100,
    remaining,
    canApply: !missing.size && !pending.size && (remaining === null || remaining >= 0),
    notes: [
      preferences.includeRice
        ? '主食已计入采购；整袋米按整袋售价计算。'
        : '本方案搭配菜品，不含主食；需要米饭可说“也要买米”。',
      '称重食材按预计重量计价，实际结算以称重结果为准。',
      '家中已有的食材不计入采购；盒装、袋装商品按整份购买。',
    ],
  };
}

export function buildMealPlan(
  preferences: MealPreferences,
  products: Product[],
  cart: ListItem[],
  fixedRecipeIds?: string[],
): MealPlan {
  const allowed = recipes.filter(
    (recipe) =>
      !recipe.ingredients.some((ingredient) => preferences.excluded.includes(ingredient.key)),
  );
  const fixed = fixedRecipeIds
    ?.map((id) => allowed.find((recipe) => recipe.id === id))
    .filter((recipe): recipe is Recipe => !!recipe);
  if (fixedRecipeIds?.length && fixed?.length === fixedRecipeIds.length)
    return evaluate(fixed, preferences, products, cart);
  const explicitlyRequested = preferences.dishIds
    .map((id) => allowed.find((recipe) => recipe.id === id))
    .filter((recipe): recipe is Recipe => !!recipe);
  const wants = preferences.wants.length
    ? preferences.wants
    : explicitlyRequested.length
      ? []
      : (['meat', 'greens'] as const);
  let combinations: Recipe[][] = [explicitlyRequested];
  const unmet: string[] = [];
  for (const want of wants.slice(0, 3)) {
    if (explicitlyRequested.some((recipe) => recipe.wants.includes(want))) continue;
    const choices = allowed.filter((recipe) => recipe.wants.includes(want));
    if (!choices.length) {
      unmet.push(
        `没有符合当前忌口条件的${want === 'fish' ? '鱼类' : want === 'greens' ? '绿叶菜' : '菜品'}方案`,
      );
      continue;
    }
    combinations = combinations.flatMap((combo) =>
      choices.map((recipe) => [...new Map([...combo, recipe].map((r) => [r.id, r])).values()]),
    );
  }
  if (preferences.dishIds.some((id) => !allowed.some((recipe) => recipe.id === id)))
    unmet.push('指定菜谱包含已排除食材，需换一种菜品');
  const plans = combinations
    .filter((combo) => combo.length)
    .map((combo) => evaluate(combo, preferences, products, cart));
  const score = (plan: MealPlan) => [
    plan.missing.length + unmet.length,
    plan.remaining !== null && plan.remaining < 0 ? 1 : 0,
    preferences.cheaper
      ? plan.total
      : plan.recipes.reduce((sum, recipe) => sum + recipes.findIndex((r) => r.id === recipe.id), 0),
    plan.total,
  ];
  plans.sort((a, b) => {
    const x = score(a);
    const y = score(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  });
  const plan = plans[0] || evaluate([], preferences, products, cart);
  if (!plan.recipes.length) unmet.push('暂时没有可组合的菜谱');
  plan.missing.push(...unmet);
  if (unmet.length) plan.canApply = false;
  return plan;
}

export function describeMealPlan(plan: MealPlan, previousTotal?: number) {
  const budget = plan.preferences.budget;
  let text = `按 ${plan.preferences.people} 人份搭配了${plan.recipes.map((recipe) => recipe.title).join('、') || '当前可用食材'}。待购清单合计 ¥${plan.total.toFixed(2)}${budget === null ? '，未设置预算上限' : `，预算 ¥${budget.toFixed(2)}`}。`;
  if (plan.preferences.cheaper && previousTotal !== undefined)
    text +=
      plan.total < previousTotal
        ? ` 保持人数和份量，预计少花 ¥${(previousTotal - plan.total).toFixed(2)}。`
        : ' 当前没有更便宜且符合条件的搭配，保留这份方案。';
  if (plan.remaining !== null && plan.remaining < 0)
    text += ` 超出 ¥${(-plan.remaining).toFixed(2)}，请提高预算或调整菜品，暂不能一键加入。`;
  if (plan.pendingPantry.length)
    text += ` 还需确认家里有${plan.pendingPantry.map((key) => ingredientNames[key]).join('、')}；这些调味目前未计价。`;
  if (plan.missing.length) text += ` ${plan.missing.join('；')}。`;
  return text;
}
