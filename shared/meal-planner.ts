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
  ingredientKey,
  ingredientNames,
  recipes,
  mealPlanningVersion,
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
import { purchaseLimit, availableForSale } from './catalog-status';
import {
  findMealProduct,
  mealMeasureReliable,
  mealProductExcluded,
  mealIngredientExcluded,
  dishMealKinds,
  canonicalMealIngredient,
} from './meal-catalog';
import { currencySymbol, productCurrency } from './currency';
import type { Recipe, RecipeIngredient } from './recipes';

type ScheduledDish = { recipe: Recipe; day: number; meal: string; kind?: GeneratedDish['kind'] };
type Demand = {
  amount: number;
  unit: 'g' | 'ml' | 'piece' | 'package';
  key: string;
  name: string;
  dishes: string[];
  basicPantry: boolean;
  productId?: string;
};

export function createMealPreferences(): MealPreferences {
  return {
    planningVersion: mealPlanningVersion,
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
    singleMeal: '晚餐',
    homePantry: [...defaultHomePantry],
  };
}

function findFoodProduct(
  key: string,
  _name: string,
  products: Product[],
  categories: StoreCategory[],
  unit?: Demand['unit'],
  excluded: string[] = [],
  productId?: string,
) {
  const product = findMealProduct(key, products, categories, unit, excluded, productId);
  return product ? { product, substitute: false } : undefined;
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
  return recipe.kind || 'mixed';
}

function mealNames(preferences: MealPreferences) {
  return preferences.mealsPerDay === 1
    ? [preferences.singleMeal || (preferences.wants.includes('breakfast') ? '早餐' : '晚餐')]
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
      amount.unit,
      preferences.excluded,
      ingredient.productId,
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
  const homes = new Set(
    [...preferences.homePantry, ...preferences.owned].filter(
      (key) => !preferences.buyPantry.includes(key),
    ),
  );
  const allowed = recipes.filter((recipe) =>
    recipe.ingredients.every((ingredient) => {
      if (mealIngredientExcluded(ingredient.key, preferences.excluded)) return false;
      if (homes.has(ingredient.key)) return true;
      const value = ingredientValue(ingredient);
      const product = findMealProduct(
        ingredient.key,
        products,
        categories,
        value.unit,
        preferences.excluded,
      );
      return (
        product &&
        availableForSale(product) &&
        mealMeasureReliable(product) &&
        packageSize(product).unit === value.unit
      );
    }),
  );
  const slots = mealNames(preferences);
  const schedule: ScheduledDish[] = [];
  const estimates = new Map<string, number>();
  const cost = (recipe: Recipe) => {
    if (!estimates.has(recipe.id))
      estimates.set(recipe.id, recipeEstimate(recipe, preferences, products, categories));
    return estimates.get(recipe.id)!;
  };
  const choose = (pool: Recipe[], day: number, offset: number) => {
    const requested = pool.find((recipe) => preferences.dishIds.includes(recipe.id));
    if (requested) return requested;
    const sorted =
      preferences.cheaper || preferences.budget !== null
        ? [...pool].sort((a, b) => cost(a) - cost(b))
        : pool;
    return sorted[preferences.cheaper ? 0 : (day + offset - 1) % Math.max(1, sorted.length)];
  };
  for (let day = 1; day <= preferences.days; day++)
    for (const meal of slots) {
      const breakfast = meal === '早餐' || meal === '加餐';
      const roles = breakfast
        ? (['staple', 'protein'] as const)
        : (['staple', 'protein', 'vegetable'] as const);
      for (const kind of roles) {
        if (kind === 'staple' && !preferences.includeRice) continue;
        const pool = allowed.filter(
          (recipe) =>
            recipe.kind === kind &&
            (!breakfast || recipe.wants.includes('breakfast') || recipe.id === 'toasted-bread'),
        );
        const preferred =
          kind === 'protein' && !breakfast
            ? pool.filter((recipe) => recipe.wants.some((want) => preferences.wants.includes(want)))
            : kind === 'vegetable' && preferences.wants.includes('greens')
              ? pool.filter((recipe) => recipe.wants.includes('greens'))
              : [];
        const fixedId = fixedRecipeIds?.find(
          (id) =>
            id.endsWith(`#${day}-${meal}`) && pool.some((recipe) => id.startsWith(`${recipe.id}#`)),
        );
        const recipe = fixedId
          ? pool.find((item) => fixedId.startsWith(`${item.id}#`))
          : choose(preferred.length ? preferred : pool, day, meal === '晚餐' ? 1 : 0);
        if (recipe) schedule.push({ recipe, day, meal, kind });
      }
    }
  return schedule;
}

function scheduledFromGenerated(
  preferences: MealPreferences,
  products: Product[],
): ScheduledDish[] {
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
          const selected = products.find((product) => product.id === item.productId);
          const key =
            ingredientKey(source) || (selected && canonicalMealIngredient(selected)) || source;
          return {
            key,
            productId: item.productId,
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
      const selectedProduct = ingredient.productId
        ? products.find((p) => p.id === ingredient.productId)
        : undefined;
      if (
        mealIngredientExcluded(canonical, preferences.excluded) ||
        (selectedProduct && mealProductExcluded(selectedProduct, preferences.excluded))
      ) {
        missing.add(`“${title}”含有已排除的${rawName}`);
        continue;
      }
      if (homes.has(canonical) && !buyPantry.has(canonical)) {
        owned.add(rawName);
        continue;
      }
      const identity = `${ingredient.productId || canonical}|${value.unit}`;
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
          productId: ingredient.productId,
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
    const match = findFoodProduct(
      need.key,
      need.name,
      products,
      storeCategories,
      need.unit,
      preferences.excluded,
      need.productId,
    );
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
    if (purchaseUnits === null || !mealMeasureReliable(product)) {
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
    if (mergedQuantity > purchaseLimit(product)) {
      const amount = displayAmount(need.amount, need.units);
      const reason = product.inventoryMode === 'untracked' ? '超过单品购买上限' : '库存不足';
      unresolved.push({
        ingredient: product.name,
        amount,
        status: 'out_of_stock',
        dishes: [...new Set(need.dishes)],
      });
      missing.add(`${product.name}${reason}，需要${required}份`);
      unavailableProducts.add(product.id);
    }
    const size = packageSize(product);
    const packDescription = `${size.estimated ? '约' : ''}${size.quantity}${size.unit === 'g' ? 'g' : size.unit === 'ml' ? 'mL' : size.unit === 'piece' ? '个' : '份'}${size.estimated ? '（估重）' : ''}`;
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
      calculation: `${displayAmount(need.amount, need.units)} ÷ ${packDescription}，整包装向上取整为 ${required} 份；${currencySymbol(productCurrency(product))}${product.price.toFixed(2)}/${product.unit}`,
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
    if (
      !product ||
      product.price <= 0 ||
      product.status === 'draft' ||
      product.status === 'archived' ||
      item.quantity > purchaseLimit(product)
    ) {
      const reason =
        product?.inventoryMode === 'untracked' ? '超过单品清单数量上限' : '已缺货或库存不足';
      missing.add(`现有清单中的${product?.name || '商品'}${reason}`);
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
  const currency = products[0] ? productCurrency(products[0]) : 'CNY';
  const symbol = currencySymbol(currency);
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
    ? `本店可购部分 ${symbol}${total.toFixed(2)}，还有 ${unpriced.length + unresolved.filter((item) => item.status === 'out_of_stock').length} 项未计价。`
    : '';
  return {
    currency,
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
      '按美国山姆商品规划西式餐食；中文展示，商品按英文原名匹配。默认家中有食用油和盐，可在常备项中修改。',
      '大蒜、黑胡椒、酱料等不默认已有；规格不明确或缺货的商品不作完整预算承诺。',
      '包装采购先合并全周期需求、扣除已购和清单数量，再按完整包装向上取整。',
      '西式餐食搭配仅供参考；生熟状态不明时以包装说明为准，不提供精确营养值或减重承诺。',
      ...(items.some((item) => item.quantity > 0 && packageSize(item.product).estimated)
        ? ['含按磅称重的商品：每份重量与金额按页面估价计算，实际以门店称重结算为准。']
        : []),
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
  // Old browser contexts must not resurrect the Chinese recipe planner.
  if (preferences.planningVersion !== mealPlanningVersion)
    preferences = {
      ...preferences,
      planningVersion: mealPlanningVersion,
      generatedMeals: undefined,
      dishIds: [],
    };
  const slots = preferences.days * preferences.mealsPerDay;
  const schedule =
    preferences.generatedMeals?.length === slots
      ? scheduledFromGenerated(preferences, products)
      : staticSchedule(preferences, products, storeCategories, fixedRecipeIds);
  const unmet: string[] = [];
  if (preferences.dishIds.some((id) => !recipes.some((recipe) => recipe.id === id)))
    unmet.push('指定菜谱不属于当前西式餐食目录，需重新选择');
  for (let day = 1; day <= preferences.days; day++)
    for (const meal of mealNames(preferences)) {
      const group = schedule.filter((item) => item.day === day && item.meal === meal);
      const kinds = new Set(
        group.flatMap((item) =>
          dishMealKinds(
            {
              kind: item.kind || inferKind(item.recipe),
              ingredients: item.recipe.ingredients.map((ingredient) => ({
                ingredient: ingredient.key,
                productId: ingredient.productId,
              })),
            },
            products,
          ),
        ),
      );
      const required =
        meal === '早餐' || meal === '加餐'
          ? ['staple', 'protein']
          : ['staple', 'protein', 'vegetable'];
      if (
        required.some(
          (kind) =>
            (kind !== 'staple' || preferences.includeRice) &&
            !kinds.has(kind as GeneratedDish['kind']),
        )
      )
        unmet.push(`第${day}天${meal}缺少可用食材，暂不能组成完整西式餐食`);
    }
  const plan = evaluate(schedule, preferences, products, cart, storeCategories);
  plan.missing.push(...unmet);
  if (unmet.length) {
    plan.canApply = false;
    plan.budgetComplete = false;
    plan.remaining = null;
  }
  return plan;
}

export function describeMealPlan(plan: MealPlan, previousTotal?: number) {
  const symbol = currencySymbol(plan.currency || 'CNY');
  const budget = plan.preferences.budget;
  const unpricedCount = plan.unpriced?.length || 0;
  const outOfStockCount =
    plan.unresolved?.filter((item) => item.status === 'out_of_stock').length || 0;
  const otherMissingCount = Math.max(0, plan.missing.length - unpricedCount - outOfStockCount);
  const amount = plan.budgetComplete
    ? `计划食材采购 ${symbol}${(plan.newlyAddedCost ?? plan.addedCost).toFixed(2)}；原清单 ${symbol}${plan.existingCost.toFixed(2)}；合并待购 ${symbol}${plan.total.toFixed(2)}`
    : `本店可购部分 ${symbol}${plan.total.toFixed(2)}；${unpricedCount} 项未计价、${outOfStockCount} 项缺货${otherMissingCount ? `、${otherMissingCount} 项条件未满足` : ''}`;
  const menu =
    plan.preferences.days === 1
      ? [...new Set(plan.recipes.map((recipe) => recipe.meal || '餐食'))]
          .map(
            (meal) =>
              `${meal}：${plan.recipes
                .filter((recipe) => (recipe.meal || '餐食') === meal)
                .map((recipe) => recipe.title)
                .join('、')}`,
          )
          .join('；')
      : '';
  let text = `${menu ? `${menu}。\n` : ''}按 ${plan.preferences.people} 人、${plan.preferences.days} 天、每天 ${plan.preferences.mealsPerDay} 餐搭配。${amount}${budget === null ? '；未设置预算上限。' : `；预算 ${symbol}${budget.toFixed(2)}。`}`;
  if (plan.preferences.cheaper && previousTotal !== undefined)
    text +=
      plan.total < previousTotal
        ? ` 保持人数和份量，预计少花 ${symbol}${(previousTotal - plan.total).toFixed(2)}。`
        : ' 当前没有更便宜且符合条件的搭配，保留这份方案。';
  if (plan.remaining !== null && plan.remaining < 0)
    text += ` 超出 ${symbol}${(-plan.remaining).toFixed(2)}，请提高预算或调整菜品，暂不能一键加入。`;
  if (plan.missing.length) text += ` ${plan.missing.join('；')}。`;
  return text;
}
