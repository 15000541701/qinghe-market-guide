import type { Product, StoreCategory } from './types';

const familyLabels: Record<string, string> = {
  'meat-poultry': '肉禽',
  seafood: '水产',
  dairy: '乳制品',
  'grain-legume': '谷物与豆类',
  'pasta-noodle': '意面与面食',
  'canned-preserved': '罐藏与腌渍食品',
  'soup-broth': '汤与高汤',
  'sauce-condiment': '酱料与调味',
  'spices-oils': '香料与油',
  'tea-coffee': '茶与咖啡',
  beverage: '饮料',
  bakery: '烘焙与饼干',
  'snack-sweet': '零食与甜点',
  supplement: '营养补充品',
  'packaged-other': '其他包装食品',
  'unclassified-review': '分类待确认',
  sweetener: '蜂蜜与甜味剂',
  'non-food-review': '非食品个护',
  fruit: '水果',
  vegetable: '蔬菜',
};

const displayGroupLabels: Record<string, string> = {
  'produce-fruit': '鲜果',
  'produce-vegetable': '鲜蔬',
  'ambient-canned-produce': '罐藏蔬果与豆类',
  'ambient-canned-soup': '罐装汤与高汤',
  'ambient-dry-grain': '常温谷物与豆类',
  'ambient-pasta': '常温意面与面食',
  'ambient-sauces': '常温酱料与调味',
  'ambient-spices': '常温香料与油',
  'ambient-tea-coffee': '常温茶与咖啡',
  'ambient-beverages': '常温饮品',
  'ambient-bakery': '常温烘焙食品',
  'ambient-snacks': '常温零食与甜点',
  'ambient-supplements': '常温营养补充品',
  'ambient-seafood-preserved': '常温保藏水产',
  'ambient-cured-meat': '常温腌制肉品',
  'ambient-ready-meals': '常温即食与料理包',
  'ambient-sweetener': '常温蜂蜜与甜味剂',
  'ambient-dairy': '常温乳制品',
  'ambient-other': '常温其他包装食品',
  'ambient-non-food': '日用个护',
  'freezer-dessert': '冷冻甜品',
  'freezer-savory': '冷冻咸食',
  'freezer-produce': '冷冻果蔬',
  'review-storage': '储存条件待确认',
  'unclassified-review': '分类待确认',
};

const processLabels: Partial<Record<NonNullable<Product['processingForm']>, string>> = {
  'fresh-whole': '鲜品原料',
  canned: '罐藏',
  dried: '干制',
  smoked: '烟熏',
  marinated: '腌制',
  fermented: '发酵',
  frozen: '冷冻加工',
  prepared: '熟制或预处理',
  pickled: '腌渍',
  preserved: '保藏加工',
  'instant-ready': '即食或即烹',
  packaged: '包装食品',
  unknown: '处理形态待确认',
};

const storageLabels: Record<NonNullable<Product['storageCondition']>, string> = {
  'ambient-likely': '常温倾向',
  'chilled-confirmed': '冷藏保存',
  'frozen-confirmed': '冷冻保存',
  'chilled-or-frozen-confirmed': '冷藏或冷冻',
  unknown: '保存条件待确认',
};

export function merchandisingFamilyLabel(family?: string, fallback = '') {
  return (family && familyLabels[family]) || fallback || family || '';
}

export function productCategoryLabel(
  product: Product,
  categories: StoreCategory[],
  fallback = '',
) {
  return (
    categories.find((category) => category.id === product.category)?.name ||
    (product.catalogOrigin === 'open-prices'
      ? merchandisingFamilyLabel(product.merchandisingFamily || product.category, product.category)
      : fallback || product.category)
  );
}

export function productPlacementStatus(product: Product) {
  if (product.catalogOrigin !== 'open-prices') return '';
  if (
    product.classificationConfidence === 'needs-review' ||
    product.merchandisingFamily === 'unclassified-review'
  )
    return '分类待确认';
  if (product.classificationConfidence === 'candidate')
    return '候选分类待复核';
  if (product.storageCondition === 'unknown') return '保存条件待确认';
  if (
    product.merchandisingState === 'pending-review'
  )
    return '商品待复核';
  if (
    product.merchandisingState === 'unplaced' ||
    !product.shelfId ||
    !product.shelfSide ||
    !product.shelfLevel
  )
    return '待安排陈列';
  return '已安排陈列';
}

export function productMerchandisingSummary(product: Product) {
  if (product.catalogOrigin !== 'open-prices') {
    return product.sourceRetailer === 'Sam’s Club US' &&
      product.storageCondition === 'chilled-or-frozen-confirmed'
      ? storageLabels[product.storageCondition]
      : '';
  }
  const reviewGroup =
    product.displayGroup === 'review-storage' ||
    product.displayGroup === 'unclassified-review';
  const parts = [
    reviewGroup
      ? undefined
      : displayGroupLabels[product.displayGroup || ''] ||
        merchandisingFamilyLabel(product.merchandisingFamily || product.category),
    reviewGroup && product.processingForm && product.processingForm !== 'unknown'
      ? processLabels[product.processingForm]
      : undefined,
    product.storageCondition === 'chilled-confirmed' ||
    product.storageCondition === 'frozen-confirmed' ||
    product.storageCondition === 'chilled-or-frozen-confirmed'
      ? storageLabels[product.storageCondition]
      : undefined,
    productPlacementStatus(product) !== '已安排陈列'
      ? productPlacementStatus(product)
      : undefined,
  ].filter(Boolean);
  return [...new Set(parts)].join(' · ');
}

export function productHasNavigableShelf(product: Product) {
  if (product.catalogOrigin === 'open-prices')
    return (
      product.merchandisingState === 'placed' &&
      !!product.shelfId &&
      !!product.shelfSide &&
      !!product.shelfLevel
    );
  return !!(product.shelfId || product.shelf);
}
