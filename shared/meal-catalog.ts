import type { Product, StoreCategory, MealPreferences } from './types';
import {
  ingredientEnglishTerms,
  ingredientKey,
  ingredientInFamily,
  ingredientFamilies,
  ingredientLineage,
} from './recipes';
import { availableForSale } from './catalog-status';
import { packageSize, type MeasureUnit } from './shopping';
import { packageSizeReliable } from './package-size';

const foodCategories = new Set([
  'vegetables',
  'vegetable',
  'fruit',
  'seafood',
  'meat',
  'meat-poultry',
  'dairy',
  'bakery',
  'pantry',
  'deli',
  'seasoning',
  'snacks',
  'frozen',
  'beverages',
  'beverage',
  'grain-legume',
  'pasta-noodle',
  'canned-preserved',
  'soup-broth',
  'sauce-condiment',
  'spices-oils',
  'tea-coffee',
  'snack-sweet',
  'sweetener',
]);

/** Chinese names are display/input data, never catalog search terms. */
export function englishProductName(product: Product) {
  return (
    product.aliases.find((alias) => /[a-z]{3}/i.test(alias) && !/[\u3400-\u9fff]/.test(alias)) ||
    (/[a-z]{3}/i.test(product.name) && !/[\u3400-\u9fff]/.test(product.name) ? product.name : '')
  );
}

export function isMealFood(product: Product, categories: StoreCategory[] = []) {
  const category = categories.find((item) => item.id === product.category);
  // Imported, unreviewed source categories can have an incorrect food flag.
  return (
    foodCategories.has(product.category) &&
    (!category || (category.active && category.kind === 'food'))
  );
}

export function englishContains(text: string, term: string) {
  const words = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  return ` ${words(text)} `.includes(` ${words(term)} `);
}

export function productIngredientKeys(product: Product) {
  const name = englishProductName(product);
  return [
    ...new Set(
      Object.entries(ingredientEnglishTerms)
        .filter(([, terms]) => terms.some((term) => englishContains(name, term)))
        .flatMap(([key]) => ingredientLineage(key)),
    ),
  ];
}

export function mealIngredientExcluded(key: string, excluded: string[]) {
  return excluded.some((family) => ingredientInFamily(key, family));
}

export function mealProductExcluded(product: Product, excluded: string[]) {
  if (!excluded.length) return false;
  if (excluded.includes('seafood') && product.category === 'seafood') return true;
  const keys = productIngredientKeys(product);
  if (keys.some((key) => mealIngredientExcluded(key, excluded))) return true;
  const name = englishProductName(product);
  if (
    excluded.some((key) => ['milk', 'cheese'].includes(key)) &&
    /\b(?:cheesecake|cheddar|parmesan|mozzarella|gouda|brie|feta|whey|casein|cream)\b/i.test(name)
  )
    return true;
  if (
    excluded.includes('butter') &&
    (/\bbuttercream\b/i.test(name) || (/\bbuttery\b/i.test(name) && !/\bolive oil\b/i.test(name)))
  )
    return true;
  if (excluded.includes('egg') && /\bmayonnaise\b/i.test(name) && !/\bvegan\b/i.test(name))
    return true;
  return false;
}

/** Conservative gate for already-known import problems; never invent a net weight. */
export function mealMeasureReliable(product: Product) {
  const size = packageSize(product);
  if (
    !product.packageSize ||
    !Number.isFinite(size.quantity) ||
    size.quantity <= 0 ||
    size.unit === 'package'
  )
    return false;
  // Reviewed sizes carry their source basis (spec line, listing or unit price); weighed goods
  // use the page estimate and are flagged as estimated.
  if (product.packageSize.basis) return packageSizeReliable(product.packageSize);
  const name = englishProductName(product);
  if (/priced per pound/i.test(name) && product.saleMode !== 'weight') return false;
  const multiple = name.match(
    /(\d+(?:\.\d+)?)\s*(fl\.?\s*oz\.?|oz\.?|lbs?\.?)\s*[,x]\s*(\d+)\s*(?:pk|ct|pack)\b/i,
  );
  if (multiple) {
    const [, amount, unit, count] = multiple;
    const base = +amount * (/^fl/i.test(unit) ? 29.5735 : /^lb/i.test(unit) ? 453.592 : 28.3495);
    const expectedUnit = /^fl/i.test(unit) ? 'ml' : 'g';
    if (
      size.unit !== expectedUnit ||
      Math.abs(size.quantity - base * +count) > Math.max(3, base * +count * 0.02)
    )
      return false;
  }
  return true;
}

export function preparationState(product: Product) {
  const name = englishProductName(product);
  if (
    /fully cooked|ready to eat|rotisserie|smoke roasted|smoked|deli|cooked shrimp/i.test(name) ||
    product.category === 'deli'
  )
    return 'prepared_or_ready';
  if (
    /prepared|freezer-savory|freezer-dessert/.test(product.displayGroup || '') ||
    /breaded|battered|marinated|seasoned|sauce|stuffed|kit|burrito|bowl|sandwich|pizza|ravioli|macaroni|scampi|dumpling|wonton|nugget|patties|taquito|enchilada|quesadilla/i.test(
      name,
    )
  )
    return 'processed';
  if (/frozen/i.test(name)) return 'frozen_check_package';
  if (['vegetables', 'fruit'].includes(product.category)) return 'produce';
  return 'unknown_check_package';
}

const incompatible: Record<string, RegExp> = {
  spinach: /dip|ravioli|frittata|bites|cheese|frozen/i,
  lettuce: /kit|salad with|dressing/i,
  tomato: /sauce|salsa|paste|soup|juice|dried|tomatillo/i,
  chicken:
    /cooked|roasted|rotisserie|breaded|battered|nugget|patty|patties|broth|soup|salad|sandwich|jerky|seasoned|marinated|burrito|bowl|enchilada|quesadilla|pizza|dip/i,
  beef: /cooked|roasted|smoked|jerky|broth|soup|salami|bites|sausage|burger/i,
  pork: /cooked|ham|bacon|sausage|jerky|breaded/i,
  salmon: /smoked|roasted|stuffed|marinated|seasoned|bites|burger/i,
  shrimp: /cooked|breaded|battered|roll|sauce|salad|pasta|scampi/i,
  egg: /bites|egg whites?\b|substitute|sandwich|salad|noodle|chocolate|candy|mix/i,
  bread: /pudding|crumb|breaded|chocolate|cinnamon|garlic|cake/i,
  milk: /chocolate|candy|cocoa|powder|condensed|evaporated|butter|coconut|almond/i,
  potato: /chips|fries|salad|mashed|baked|sweet|soup|gnocchi/i,
  broccoli: /sauce|cheese|soup|kit/i,
  carrot: /cake|juice|kit/i,
  pasta: /sauce|salad|ravioli|prepared|cooked|kit/i,
  garlic: /toast|bread|butter|sauce|powder|granulated|seasoned/i,
  oats: /cookie|bar|granola|milk/i,
  yogurt: /coated|pretzel|raisins/i,
};

export function matchesMealIngredient(product: Product, key: string) {
  const canonical = ingredientKey(key) || key;
  const name = englishProductName(product);
  if (
    ['chicken', 'beef', 'pork', 'salmon', 'shrimp'].includes(canonical) &&
    ['processed', 'prepared_or_ready'].includes(preparationState(product))
  )
    return false;
  const terms =
    (Object.hasOwn(ingredientEnglishTerms, canonical)
      ? ingredientEnglishTerms[canonical]
      : undefined) || (/^[a-z][a-z -]+$/i.test(key) ? [key] : []);
  if (!terms.some((term) => englishContains(name, term))) return false;
  if (Object.hasOwn(incompatible, canonical) && incompatible[canonical].test(name)) return false;
  if (
    ['oil', 'salt', 'sugar', 'vinegar', 'black-pepper', 'soy-sauce'].includes(canonical) &&
    !['seasoning', 'pantry', 'spices-oils', 'sauce-condiment', 'sweetener'].includes(
      product.category,
    )
  )
    return false;
  return true;
}

/** Only plain ingredients can be covered by a household ingredient of the same kind. */
export function canonicalMealIngredient(product: Product) {
  if (['processed', 'prepared_or_ready'].includes(preparationState(product))) return undefined;
  return productIngredientKeys(product).find(
    (key) => !['fish', 'seafood'].includes(key) && matchesMealIngredient(product, key),
  );
}

export function findMealProduct(
  key: string,
  products: Product[],
  categories: StoreCategory[] = [],
  unit?: MeasureUnit,
  excluded: string[] = [],
  productId?: string,
) {
  const candidates = products.filter(
    (product) =>
      isMealFood(product, categories) &&
      product.status !== 'draft' &&
      product.status !== 'archived' &&
      product.price > 0 &&
      !mealProductExcluded(product, excluded) &&
      (productId ? product.id === productId : matchesMealIngredient(product, key)),
  );
  return candidates.sort((a, b) => {
    const rank = (p: Product) =>
      Number(availableForSale(p)) * 4 +
      Number(mealMeasureReliable(p) && (!unit || packageSize(p).unit === unit)) * 2;
    return rank(b) - rank(a) || a.price - b.price;
  })[0];
}

/** Compact full food catalog for model planning; no fixed recipe shortlist. */
export function mealCatalog(
  products: Product[],
  categories: StoreCategory[] = [],
  excluded: string[] = [],
) {
  return products.filter(
    (p) =>
      isMealFood(p, categories) &&
      availableForSale(p) &&
      englishProductName(p) &&
      mealMeasureReliable(p) &&
      !mealProductExcluded(p, excluded),
  );
}

export function mealCatalogRows(products: Product[]) {
  return products.map((p) => ({
    id: p.id,
    name: englishProductName(p),
    category: p.category,
    contents: (({ quantity, unit, estimated }) => ({
      quantity,
      unit,
      ...(estimated ? { estimated } : {}),
    }))(packageSize(p)),
    price: p.price,
    currency: p.currency || 'USD',
    preparation: preparationState(p),
    mealRoles: productMealKinds(p),
  }));
}

export function mealCatalogForPreferences(
  preferences: MealPreferences,
  products: Product[],
  categories: StoreCategory[] = [],
) {
  const strictVegan = ['chicken', 'beef', 'pork', 'seafood', 'egg', 'milk', 'cheese'].every((key) =>
    preferences.excluded.includes(key),
  );
  const vegetarian = ['chicken', 'beef', 'pork', 'seafood'].every((key) =>
    preferences.excluded.includes(key),
  );
  return mealCatalog(products, categories, preferences.excluded).filter((product) => {
    if (vegetarian && ['meat', 'meat-poultry', 'seafood'].includes(product.category)) return false;
    if (!preferences.includeRice && productMealKinds(product).includes('staple')) return false;
    // Without ingredient panels, avoid composite meals and unknown recipes for
    // strict plant-only requests; keep the model on basic plant ingredients.
    if (strictVegan) {
      if (['bakery', 'deli', 'snacks', 'frozen'].includes(product.category)) return false;
      if (['prepared_or_ready', 'processed'].includes(preparationState(product))) return false;
    }
    return true;
  });
}

const roleIngredients: Record<string, string[]> = {
  staple: ['bread', 'potato', 'pasta', 'oats', 'rice', 'noodles'],
  protein: [
    ...ingredientFamilies.fish,
    ...ingredientFamilies.seafood,
    'fish',
    'seafood',
    'salmon',
    'seabass',
    'carp',
    'chicken',
    'beef',
    'pork',
    'shrimp',
    'egg',
    'milk',
    'yogurt',
    'tofu',
  ],
  vegetable: ['spinach', 'lettuce', 'broccoli', 'tomato', 'carrot', 'onion', 'bokchoy'],
};

function ingredientMealKinds(keys: string[]) {
  return Object.entries(roleIngredients)
    .filter(([, ingredients]) => ingredients.some((key) => keys.includes(key)))
    .map(([role]) => role);
}

/** Meal roles describe the actual food, not its claimed dish kind or a recipe shortlist. */
export function productMealKinds(product: Product) {
  const name = englishProductName(product);
  // Condiments and supplements cannot fill a main meal role just because their
  // names contain fish, tomato, milk, or protein.
  if (
    ['snacks', 'snack-sweet', 'beverages', 'beverage'].includes(product.category) ||
    ['seasoning', 'sauce-condiment', 'spices-oils', 'supplement'].includes(product.category) ||
    (/\b(?:flour|baking mix|bread crumbs|breadcrumbs)\b/i.test(name) &&
      !/\b(?:tortillas?|wraps?)\b/i.test(name)) ||
    /\b(?:protein powder|broth|stock|seasoning|extract)\b/i.test(name) ||
    (!['vegetables', 'vegetable', 'fruit', 'deli'].includes(product.category) &&
      /\b(?:sauce|dressing|dip)\b/i.test(name))
  )
    return [];
  const roles = new Set(ingredientMealKinds(productIngredientKeys(product)));
  // Salad kits and vegetables such as asparagus, cucumber, and bell peppers are
  // valid vegetables even when they are absent from the small fallback lexicon.
  if (['vegetables', 'vegetable'].includes(product.category)) roles.add('vegetable');
  const breadContainer =
    /\b(?:buns?|bread|bagels?|rolls?)\b/i.test(name) &&
    !/\b(?:chicken|beef|pork|bacon|ham|sausage)\b/i.test(name);
  if (['meat', 'meat-poultry', 'seafood'].includes(product.category) && !breadContainer)
    roles.add('protein');
  if (breadContainer) roles.add('staple');
  if (
    /\b(?:quinoa|couscous|bulgur|barley|farro|tortillas?|wraps?|macaroni|ravioli|tortellini|lasagna|linguine)\b/i.test(
      name,
    )
  )
    roles.add('staple');
  if (
    /\b(?:cheese|tofu|lentils?|chickpeas?|garbanzo|edamame|black beans|kidney beans|pinto beans)\b/i.test(
      name,
    )
  )
    roles.add('protein');
  if (
    /\b(?:asparagus|cucumbers?|zucchini|bell peppers?|green beans|cauliflower|cabbage|kale)\b/i.test(
      name,
    )
  )
    roles.add('vegetable');
  return [...roles];
}

/** A sandwich or bowl can cover several meal roles, regardless of its declared kind. */
export function dishMealKinds(
  dish: {
    kind: string;
    ingredients: {
      ingredient?: string;
      productId?: string;
      grams?: number;
      milliliters?: number;
      pieces?: number;
    }[];
  },
  products: Product[] = [],
) {
  return [
    ...new Set(
      dish.ingredients.flatMap((item) => {
        const measured =
          item.grams !== undefined || item.milliliters !== undefined || item.pieces !== undefined;
        if (
          measured &&
          !((item.grams || 0) >= 20 || (item.milliliters || 0) >= 30 || (item.pieces || 0) >= 0.5)
        )
          return [];
        const product = products.find((p) => p.id === item.productId);
        // A supplied product ID is authoritative; don't let a misleading ingredient
        // name turn a seasoning into a vegetable or protein.
        if (item.productId) return product ? productMealKinds(product) : [];
        const key = item.ingredient ? ingredientKey(item.ingredient) : undefined;
        return key ? ingredientMealKinds([key]) : [];
      }),
    ),
  ];
}
