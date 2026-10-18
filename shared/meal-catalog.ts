import type { Product, StoreCategory } from './types';
import { ingredientEnglishTerms, ingredientKey } from './recipes';
import { availableForSale } from './catalog-status';
import { packageSize, type MeasureUnit } from './shopping';

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
  return Object.entries(ingredientEnglishTerms)
    .filter(([, terms]) => terms.some((term) => englishContains(name, term)))
    .map(([key]) => key);
}

export function mealIngredientExcluded(key: string, excluded: string[]) {
  return (
    excluded.includes(key) ||
    (excluded.includes('fish') && ['salmon', 'seabass', 'carp'].includes(key)) ||
    (excluded.includes('seafood') && ['salmon', 'seabass', 'carp', 'shrimp'].includes(key))
  );
}

export function mealProductExcluded(product: Product, excluded: string[]) {
  if (!excluded.length) return false;
  const keys = productIngredientKeys(product);
  return excluded.some((key) => keys.includes(key));
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
  if (/breaded|battered|marinated|seasoned|sauce|stuffed|kit/i.test(name)) return 'processed';
  if (/frozen/i.test(name)) return 'frozen_check_package';
  if (['vegetables', 'fruit'].includes(product.category)) return 'produce';
  return 'unknown_check_package';
}

const incompatible: Record<string, RegExp> = {
  spinach: /dip|ravioli|frittata|bites|cheese|frozen/i,
  lettuce: /kit|salad with|dressing/i,
  tomato: /sauce|salsa|paste|soup|juice|dried|tomatillo/i,
  chicken:
    /cooked|roasted|rotisserie|breaded|battered|nugget|patty|patties|broth|soup|salad|sandwich|jerky|seasoned|marinated/i,
  beef: /cooked|roasted|smoked|jerky|broth|soup|salami|bites|sausage|burger/i,
  pork: /cooked|ham|bacon|sausage|jerky|breaded/i,
  salmon: /smoked|roasted|stuffed|marinated|seasoned|bites|burger/i,
  shrimp: /cooked|breaded|battered|roll|sauce|salad|pasta/i,
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
  const terms = ingredientEnglishTerms[canonical] || (/^[a-z][a-z -]+$/i.test(key) ? [key] : []);
  if (!terms.some((term) => englishContains(name, term))) return false;
  if (incompatible[canonical]?.test(name)) return false;
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
    contents: packageSize(p),
    price: p.price,
    currency: p.currency || 'USD',
    preparation: preparationState(p),
  }));
}

/** A Western sandwich or bowl can cover several meal roles in one dish. */
export function dishMealKinds(
  dish: { kind: string; ingredients: { ingredient?: string; productId?: string }[] },
  products: Product[] = [],
) {
  if (dish.kind !== 'mixed') return [dish.kind];
  const keys = new Set(
    dish.ingredients.flatMap((item) => {
      const key = item.ingredient ? ingredientKey(item.ingredient) : undefined;
      const product = products.find((p) => p.id === item.productId);
      return [...(key ? [key] : []), ...(product ? productIngredientKeys(product) : [])];
    }),
  );
  const roles: Record<string, string[]> = {
    staple: ['bread', 'potato', 'pasta', 'oats', 'rice', 'noodles'],
    protein: [
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
  return Object.entries(roles)
    .filter(([, ingredients]) => ingredients.some((key) => keys.has(key)))
    .map(([role]) => role);
}
