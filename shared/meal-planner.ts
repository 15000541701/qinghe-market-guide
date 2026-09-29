import type {
  GeneratedDish,
  ListItem,
  MealPlan,
  MealPreferences,
  MealWant,
  Product,
  StoreCategory,
  UnresolvedMealIngredient,
} from './types';
import {
  defaultHomePantry,
  ingredientAliases,
  ingredientKey,
  ingredientNames,
  recipes,
} from './recipes';
import {
  cartTotal,
  isWeighed,
  lineCents,
  mergeMealItems,
  packageSize,
  quantityForMeasure,
  roundQuantity,
  purchasedQuantity,
} from './shopping';
import type { Recipe, RecipeIngredient } from './recipes';

type ScheduledDish = { recipe: Recipe; day: number; meal: string; kind?: GeneratedDish['kind'] };
type Demand = {
  amount: number;
  unit: 'g' | 'ml' | 'piece' | 'package';
  key: string;
  name: string;
  dishes: string[];
  basicPantry: boolean;
};

const stapleIds = new Set(['steamed-rice', 'oat-egg-breakfast']);
const vegetableIds = new Set(['spinach-greens', 'bokchoy-greens', 'lettuce-greens']);
const safeSubstitutes: Record<string, string[]> = {
  spinach: ['bokchoy', 'lettuce'],
  bokchoy: ['spinach', 'lettuce'],
  lettuce: ['spinach', 'bokchoy'],
};
const knownNonFoodCategories = new Set(['home', 'cleaning', 'clothing', 'personal-care']);

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
    includeRice: true,
    days: 1,
    mealsPerDay: 2,
    homePantry: [...defaultHomePantry],
  };
}

function normalized(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s·、，,（）()]/g, '');
}

function isFoodProduct(product: Product, categories: StoreCategory[]) {
  const category = categories.find((item) => item.id === product.category);
  if (category) return category.active && category.kind === 'food';
  return !knownNonFoodCategories.has(product.category);
}

function findFoodProduct(
  key: string,
  name: string,
  products: Product[],
  categories: StoreCategory[],
) {
  const food = products.filter((product) => isFoodProduct(product, categories));
  const wanted = normalized(name);
  const aliases = ingredientAliases[key] || [];
  const related = (left: string, right: string) => {
    const a = normalized(left);
    const b = normalized(right);
    return a === b || (Math.min(a.length, b.length) >= 2 && (a.includes(b) || b.includes(a)));
  };
  const candidates = food.filter(
    (product) =>
      product.id === key ||
      related(product.name, wanted) ||
      product.aliases.some(
        (alias) =>
          related(alias, wanted) || aliases.some((item) => normalized(alias) === normalized(item)),
      ),
  );
  if (candidates.length) return { product: candidates[0], substitute: false };
  for (const alternative of safeSubstitutes[key] || []) {
    const alternativeName = ingredientNames[alternative] || alternative;
    const product = food.find(
      (item) =>
        item.id === alternative ||
        normalized(item.name) === normalized(alternativeName) ||
        item.aliases.some((alias) => normalized(alias) === normalized(alternativeName)),
    );
    if (product) return { product, substitute: true };
  }
  return undefined;
}

function ingredientValue(ingredient: RecipeIngredient) {
  if (ingredient.grams !== undefined) return { amount: ingredient.grams, unit: 'g' as const };
  if (ingredient.milliliters !== undefined)
    return { amount: ingredient.milliliters, unit: 'ml' as const };
  if (ingredient.pieces !== undefined) return { amount: ingredient.pieces, unit: 'piece' as const };
  if (ingredient.units !== undefined) return { amount: ingredient.units, unit: 'package' as const };
  return { amount: 0, unit: 'package' as const };
}

function displayAmount(amount: number, unit: Demand['unit']) {
  const value = Number.isInteger(amount) ? String(amount) : String(Math.round(amount * 10) / 10);
  return `${value}${unit === 'g' ? 'g' : unit === 'ml' ? 'mL' : unit === 'piece' ? '个' : '份'}`;
}

function inferKind(recipe: Recipe): GeneratedDish['kind'] {
  if (stapleIds.has(recipe.id)) return 'staple';
  if (vegetableIds.has(recipe.id)) return 'vegetable';
  if (
    recipe.wants.includes('meat') ||
    recipe.wants.includes('fish') ||
    recipe.wants.includes('shrimp')
  )
    return 'protein';
  if (recipe.wants.includes('egg') && !recipe.wants.includes('breakfast')) return 'protein';
  if (recipe.wants.includes('breakfast')) return 'mixed';
  return 'mixed';
}

function mealNames(preferences: MealPreferences) {
  return preferences.mealsPerDay === 1
    ? ['晚餐']
    : preferences.mealsPerDay === 2
      ? ['午餐', '晚餐']
      : preferences.mealsPerDay === 3
        ? ['早餐', '午餐', '晚餐']
        : ['早餐', '午餐', '晚餐', '加餐'];
}

function recipeEstimate(
  recipe: Recipe,
  preferences: MealPreferences,
  products: Product[],
  categories: StoreCategory[],
) {
  return recipe.ingredients.reduce((sum, ingredient) => {
    const canonical = ingredientKey(ingredient.key) || ingredient.key;
    const amount = ingredientValue(ingredient);
    if (
      (ingredient.pantryType === 'basic' || defaultHomePantry.includes(canonical)) &&
      preferences.homePantry.includes(canonical)
    )
      return sum;
    const match = findFoodProduct(
      canonical,
      ingredientNames[ingredient.key] || ingredient.key,
      products,
      categories,
    );
    if (!match) return sum + 100000;
    const quantity =
      amount.unit === 'package'
        ? 1
        : quantityForMeasure(match.product, amount.amount * (preferences.people / 2), amount.unit);
    return sum + (quantity === null ? 100000 : lineCents(match.product, quantity));
  }, 0);
}

function staticSchedule(
  preferences: MealPreferences,
  products: Product[],
  categories: StoreCategory[],
  fixedRecipeIds?: string[],
): ScheduledDish[] {
  const allowed = recipes.filter(
    (recipe) =>
      !recipe.ingredients.some((ingredient) => preferences.excluded.includes(ingredient.key)),
  );
  const slots = mealNames(preferences);
  if (fixedRecipeIds?.length) {
    const fixed = fixedRecipeIds.flatMap((value, index) => {
      const match = value.match(/^(.*?)#(\d+)-(.+)$/);
      const recipe = allowed.find((item) => item.id === (match?.[1] || value));
      if (!recipe) return [];
      const day = match ? +match[2] : Math.floor(index / Math.max(1, preferences.mealsPerDay)) + 1;
      const meal = match ? match[3] : slots[index % slots.length];
      return [{ recipe, day, meal, kind: inferKind(recipe) }];
    });
    const fixedGroups = new Map<string, ScheduledDish[]>();
    for (const item of fixed) {
      const key = `${item.day}-${item.meal}`;
      fixedGroups.set(key, [...(fixedGroups.get(key) || []), item]);
    }
    const fixedComplete = Array.from({ length: preferences.days }, (_, index) => index + 1).every(
      (day) =>
        slots.every((meal) => {
          const group = fixedGroups.get(`${day}-${meal}`) || [];
          if (!group.length) return false;
          if (!['午餐', '晚餐'].includes(meal)) return true;
          const kinds = new Set(group.map((item) => item.kind));
          return (
            group.length >= 3 &&
            kinds.has('staple') &&
            kinds.has('protein') &&
            kinds.has('vegetable')
          );
        }),
    );
    if (fixedComplete) return fixed;
  }
  const explicitlyRequested = preferences.dishIds
    .map((id) => allowed.find((recipe) => recipe.id === id))
    .filter((recipe): recipe is Recipe => !!recipe);
  const breakfastChoices = allowed.filter((recipe) => recipe.wants.includes('breakfast'));
  const proteinChoices = allowed.filter(
    (recipe) =>
      ['fish', 'meat', 'shrimp'].some((want) => recipe.wants.includes(want as MealWant)) ||
      (recipe.wants.includes('egg') && !recipe.wants.includes('breakfast')),
  );
  const vegetableChoices = allowed.filter((recipe) => vegetableIds.has(recipe.id));
  const sortByCost = (choices: Recipe[]) =>
    preferences.cheaper
      ? [...choices].sort(
          (a, b) =>
            recipeEstimate(a, preferences, products, categories) -
            recipeEstimate(b, preferences, products, categories),
        )
      : choices;
  const sortedBreakfastChoices = sortByCost(breakfastChoices);
  const sortedProteinChoices = sortByCost(proteinChoices);
  const sortedVegetableChoices = sortByCost(vegetableChoices);
  const rice = allowed.find((recipe) => recipe.id === 'steamed-rice');
  const breakfastDefault = breakfastChoices[0] || proteinChoices[0];
  const schedule: ScheduledDish[] = [];
  for (let day = 1; day <= preferences.days; day++)
    for (const meal of slots) {
      if (meal === '早餐' || meal === '加餐') {
        const choice =
          sortedBreakfastChoices[(day - 1) % Math.max(1, sortedBreakfastChoices.length)] ||
          breakfastDefault;
        if (choice) schedule.push({ recipe: choice, day, meal, kind: inferKind(choice) });
        continue;
      }
      if (preferences.includeRice && rice)
        schedule.push({ recipe: rice, day, meal, kind: 'staple' });
      const requested = explicitlyRequested.find((recipe) => inferKind(recipe) === 'protein');
      const requestedFish = preferences.wants.includes('fish');
      const requestedMeat = preferences.wants.includes('meat');
      const chosenPool = requestedFish
        ? proteinChoices.filter((recipe) => recipe.wants.includes('fish'))
        : requestedMeat
          ? proteinChoices.filter((recipe) => recipe.wants.includes('meat'))
          : proteinChoices;
      const pool = sortByCost(chosenPool.length ? chosenPool : sortedProteinChoices);
      const protein =
        requested ||
        pool[
          preferences.cheaper ? 0 : (day + (meal === '晚餐' ? 1 : 0) - 1) % Math.max(1, pool.length)
        ];
      if (protein) schedule.push({ recipe: protein, day, meal, kind: inferKind(protein) });
      const vegPool = vegetableChoices.length
        ? sortedVegetableChoices
        : sortByCost(allowed.filter((recipe) => recipe.wants.includes('vegetables')));
      const vegetable =
        vegPool[
          preferences.cheaper
            ? 0
            : (day + (meal === '晚餐' ? 1 : 0) - 1) % Math.max(1, vegPool.length)
        ];
      if (vegetable) schedule.push({ recipe: vegetable, day, meal, kind: inferKind(vegetable) });
    }
  return schedule;
}

function scheduledFromGenerated(preferences: MealPreferences): ScheduledDish[] {
  return (preferences.generatedMeals || []).flatMap((slot) =>
    slot.dishes.map((dish) => ({
      recipe: {
        id: dish.id,
        title: dish.title,
        wants: [] as MealWant[],
        minutes: dish.minutes,
        steps: dish.steps,
        ingredients: dish.ingredients.map((item) => {
          const source = item.ingredient || item.productId || '未知食材';
          const key = item.productId || ingredientKey(source) || source;
          return {
            key,
            ...(item.grams !== undefined ? { grams: item.grams } : {}),
            ...(item.milliliters !== undefined ? { milliliters: item.milliliters } : {}),
            ...(item.pieces !== undefined ? { pieces: item.pieces } : {}),
            ...(item.units !== undefined ? { units: item.units } : {}),
          };
        }),
      },
      day: slot.day,
      meal: slot.meal,
      kind: dish.kind,
    })),
  );
}

function evaluate(
  scheduled: ScheduledDish[],
  preferences: MealPreferences,
  products: Product[],
  cart: ListItem[],
  storeCategories: StoreCategory[],
): MealPlan {
  const scale = preferences.people / 2;
  const homes = new Set([
    ...(preferences.homePantry || defaultHomePantry),
    ...(preferences.owned || []),
  ]);
  const buyPantry = new Set(preferences.buyPantry || []);
  const demand = new Map<string, Demand>();
  const owned = new Set<string>();
  const unresolved: UnresolvedMealIngredient[] = [];
  const missing = new Set<string>();
  for (const { recipe, day, meal } of scheduled)
    for (const ingredient of recipe.ingredients) {
      const rawName = ingredientNames[ingredient.key] || ingredient.key;
      const canonical = ingredientKey(ingredient.key) || ingredient.key;
      const value = ingredientValue(ingredient);
      const amount = value.amount * scale;
      const title = `第${day}天${meal}·${recipe.title}`;
      const basicPantry =
        ingredient.pantryType === 'basic' || defaultHomePantry.includes(canonical);
      if (homes.has(canonical) && (!basicPantry || !buyPantry.has(canonical))) {
        owned.add(rawName);
        continue;
      }
      if (preferences.excluded.includes(canonical)) {
        missing.add(`“${title}”含有已排除的${rawName}`);
        continue;
      }
      const identity = `${canonical}|${value.unit}`;
      const previous = demand.get(identity);
      if (previous) {
        previous.amount += amount;
        previous.dishes.push(title);
      } else {
        demand.set(identity, {
          amount,
          unit: value.unit,
          key: canonical,
          name: rawName,
          dishes: [title],
          basicPantry,
        });
      }
    }

  const productNeeds = new Map<
    string,
    {
      product: Product;
      units: Demand['unit'];
      amount: number;
      dishes: string[];
      substitute: boolean;
    }
  >();
  let recipeCostCents = 0;
  for (const need of demand.values()) {
    const match = findFoodProduct(need.key, need.name, products, storeCategories);
    const dishes = [...new Set(need.dishes)];
    if (!match) {
      unresolved.push({
        ingredient: need.name,
        amount: displayAmount(need.amount, need.unit),
        status: 'not_in_store',
        dishes,
      });
      missing.add(`${need.name}本店暂无匹配商品`);
      continue;
    }
    const { product, substitute } = match;
    const purchaseUnits =
      need.unit === 'package'
        ? product.saleMode === 'pack'
          ? 1
          : null
        : quantityForMeasure(product, need.amount, need.unit);
    if (purchaseUnits === null) {
      unresolved.push({
        ingredient: need.name,
        amount: displayAmount(need.amount, need.unit),
        status: 'unit_mismatch',
        dishes,
      });
      missing.add(`${need.name}需求${displayAmount(need.amount, need.unit)}，本店规格无法可靠换算`);
      continue;
    }
    const size = packageSize(product);
    recipeCostCents += Math.round(
      Math.round(product.price * 100) *
        (need.amount / (size.unit === need.unit ? size.quantity : 1)),
    );
    const identity = `${product.id}|${need.unit}`;
    const previous = productNeeds.get(identity);
    if (previous) {
      previous.amount += need.amount;
      previous.dishes.push(...dishes);
      previous.substitute ||= substitute;
    } else
      productNeeds.set(identity, {
        product,
        units: need.unit,
        amount: need.amount,
        dishes,
        substitute,
      });
  }

  const items: MealPlan['items'] = [];
  const unavailableProducts = new Set<string>();
  for (const need of productNeeds.values()) {
    const { product } = need;
    const required =
      need.units === 'package'
        ? Math.ceil(need.amount)
        : quantityForMeasure(product, need.amount, need.units as 'g' | 'ml' | 'piece');
    if (required === null) continue;
    const existing = cart.find((item) => item.productId === product.id);
    const bought = purchasedQuantity(existing);
    const quantity = roundQuantity(Math.max(0, required - bought));
    const listed = existing && !existing.checked ? existing.quantity : 0;
    const mergedQuantity = Math.max(quantity, listed);
    const additional = roundQuantity(Math.max(0, mergedQuantity - listed));
    const costCents = lineCents(product, mergedQuantity) - lineCents(product, listed);
    if (bought > 0) owned.add(`${product.name}（已购）`);
    if (mergedQuantity > Math.min(product.stock, 99)) {
      const amount = displayAmount(need.amount, need.units);
      unresolved.push({
        ingredient: product.name,
        amount,
        status: 'out_of_stock',
        dishes: [...new Set(need.dishes)],
      });
      missing.add(`${product.name}库存不足，需要${required}份`);
      unavailableProducts.add(product.id);
    }
    const size = packageSize(product);
    const packDescription = `${size.quantity}${size.unit === 'g' ? 'g' : size.unit === 'ml' ? 'mL' : size.unit === 'piece' ? '个' : '份'}`;
    items.push({
      product,
      quantity,
      amount: isWeighed(product)
        ? `预计 ${Math.round(size.quantity * quantity)}g`
        : `${quantity} × ${product.unit}`,
      cost: costCents / 100,
      dishes: [...new Set(need.dishes)],
      matchStatus: need.substitute ? 'substitute' : 'matched',
      recipeAmount: displayAmount(need.amount, need.units),
      packageAmount: `${quantity} × ${packDescription}`,
      recipeGrams: need.units === 'g' ? Math.round(need.amount) : undefined,
      purchasedQuantity: bought,
      remainingQuantity: Math.max(0, required - bought),
      listedQuantity: listed,
      additionalQuantity: additional,
      calculation: `${displayAmount(need.amount, need.units)} ÷ ${packDescription}，整包装向上取整为 ${required} 份；${product.price.toFixed(2)} 元/${product.unit}`,
    });
  }

  const merged = mergeMealItems(
    cart,
    items
      .filter((item) => item.quantity > 0)
      .map((item) => ({ productId: item.product.id, quantity: item.quantity })),
  );
  for (const item of merged.filter((entry) => !entry.checked)) {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product || item.quantity > Math.min(product.stock, 99)) {
      missing.add(`现有清单中的${product?.name || '商品'}已缺货或库存不足`);
      unavailableProducts.add(item.productId);
    }
  }
  const total = cartTotal(
    merged.filter((item) => !unavailableProducts.has(item.productId)),
    products,
  );
  const existingCost = cartTotal(
    cart.filter((item) => !unavailableProducts.has(item.productId)),
    products,
  );
  const budgetComplete = unresolved.length === 0 && missing.size === 0;
  const remaining =
    preferences.budget === null || !budgetComplete
      ? null
      : Math.round((preferences.budget - total) * 100) / 100;
  const recipesForUi = scheduled.map(({ recipe, day, meal, kind }) => ({
    id: `${recipe.id}#${day}-${meal}`,
    title: recipe.title,
    day,
    meal,
    kind: kind || inferKind(recipe),
    minutes: recipe.minutes,
    steps: recipe.steps,
    ingredients: recipe.ingredients.map(
      (ingredient) => ingredientNames[ingredient.key] || ingredient.key,
    ),
    ingredientAmounts: recipe.ingredients.map((ingredient) => {
      const name = ingredientNames[ingredient.key] || ingredient.key;
      const value = ingredientValue(ingredient);
      return { name, amount: displayAmount(value.amount * scale, value.unit) };
    }),
  }));
  const unpriced = unresolved
    .filter((item) => item.status !== 'out_of_stock')
    .map((item) => `${item.ingredient}（${item.amount}）`);
  const incomplete = unresolved.length > 0;
  const pricedPart = incomplete
    ? `本店可购部分 ¥${total.toFixed(2)}，还有 ${unpriced.length + unresolved.filter((item) => item.status === 'out_of_stock').length} 项未计价。`
    : '';
  return {
    preferences,
    recipes: recipesForUi,
    items,
    owned: [...owned],
    pendingPantry: [],
    missing: [...missing],
    total,
    existingCost,
    addedCost: Math.round((total - existingCost) * 100) / 100,
    remaining,
    canApply: !missing.size && (remaining === null || remaining >= 0) && budgetComplete,
    notes: [
      '默认食用油、盐、糖、生抽、老抽、醋、料酒家中已有，不计入采购；可说“家里没有油”更新。',
      '葱姜蒜和特色调味不默认已有；食谱继续显示用量，缺货或本店暂无的食材会单独标出。',
      '包装采购先合并全周期需求、扣除已购和清单数量，再按完整包装向上取整。',
      '菜谱是家常搭配参考，不提供精确营养值、医疗建议或减重承诺。',
      ...(pricedPart ? [pricedPart] : []),
    ],
    recipeCost: recipeCostCents / 100,
    newlyAddedCost: Math.max(0, Math.round((total - existingCost) * 100) / 100),
    unpriced,
    unresolved,
    budgetComplete,
  };
}

export function buildMealPlan(
  preferences: MealPreferences,
  products: Product[],
  cart: ListItem[],
  fixedRecipeIds?: string[],
  storeCategories: StoreCategory[] = [],
): MealPlan {
  const slots = preferences.days * preferences.mealsPerDay;
  if (preferences.generatedMeals?.length === slots)
    return evaluate(
      scheduledFromGenerated(preferences),
      preferences,
      products,
      cart,
      storeCategories,
    );
  const schedule = staticSchedule(preferences, products, storeCategories, fixedRecipeIds);
  const unmet: string[] = [];
  if (preferences.dishIds.some((id) => !recipes.some((recipe) => recipe.id === id)))
    unmet.push('指定菜谱不可用，需重新选择');
  if (!schedule.length) unmet.push('暂时没有符合条件的完整餐食组合');
  const plan = evaluate(schedule, preferences, products, cart, storeCategories);
  plan.missing.push(...unmet);
  if (unmet.length) plan.canApply = false;
  return plan;
}

export function describeMealPlan(plan: MealPlan, previousTotal?: number) {
  const budget = plan.preferences.budget;
  const unpricedCount = plan.unpriced?.length || 0;
  const outOfStockCount =
    plan.unresolved?.filter((item) => item.status === 'out_of_stock').length || 0;
  const otherMissingCount = Math.max(0, plan.missing.length - unpricedCount - outOfStockCount);
  const amount = plan.budgetComplete
    ? `计划食材采购 ¥${(plan.newlyAddedCost ?? plan.addedCost).toFixed(2)}；原清单 ¥${plan.existingCost.toFixed(2)}；合并待购 ¥${plan.total.toFixed(2)}`
    : `本店可购部分 ¥${plan.total.toFixed(2)}；${unpricedCount} 项未计价、${outOfStockCount} 项缺货${otherMissingCount ? `、${otherMissingCount} 项条件未满足` : ''}`;
  let text = `按 ${plan.preferences.people} 人、${plan.preferences.days} 天、每天 ${plan.preferences.mealsPerDay} 餐搭配。${amount}${budget === null ? '；未设置预算上限。' : `；预算 ¥${budget.toFixed(2)}。`}`;
  if (plan.preferences.cheaper && previousTotal !== undefined)
    text +=
      plan.total < previousTotal
        ? ` 保持人数和份量，预计少花 ¥${(previousTotal - plan.total).toFixed(2)}。`
        : ' 当前没有更便宜且符合条件的搭配，保留这份方案。';
  if (plan.remaining !== null && plan.remaining < 0)
    text += ` 超出 ¥${(-plan.remaining).toFixed(2)}，请提高预算或调整菜品，暂不能一键加入。`;
  if (plan.missing.length) text += ` ${plan.missing.join('；')}。`;
  return text;
}
