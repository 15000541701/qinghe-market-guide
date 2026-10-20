import type { CatalogReviewField, SamsClubCatalogRecord, StorageBasis } from './types';
import { resolveStorage, storageFindings, type StorageCondition } from './storage-evidence';
import { packageSizeFromSource } from './package-size';

export type ReviewDecision = {
  /** Corrected category id; the Chinese name comes from `categoryNames`. */
  category?: string;
  /** Raw ingredient or ready-to-eat product; decides raw/prepared display groups. */
  processing?: 'raw' | 'prepared';
  /** Used only when the source text has no storage statement. */
  storageCondition?: Exclude<StorageCondition, 'unknown'>;
  archive?: boolean;
  note: string;
};
export type ReviewFile = {
  reviewedAt: string;
  reviewer: string;
  decisions: Record<string, ReviewDecision>;
};

export const categoryNames: Record<string, string> = {
  meat: '肉禽',
  seafood: '水产',
  dairy: '乳品蛋类',
  bakery: '烘焙',
  deli: '熟食',
  fruit: '水果',
  vegetables: '蔬菜',
  frozen: '冷冻食品',
  pantry: '粮油调味',
  seasoning: '调味',
  snacks: '零食糖果',
  beverages: '饮料咖啡',
  'paper-goods': '纸品与湿巾',
  cleaning: '日用清洁',
  home: '家居',
  pet: '宠物食品与用品',
  baby: '母婴用品',
  'personal-care': '个护',
  clothing: '服饰',
  floral: '鲜花绿植',
};
const nonFoodCategories = new Set([
  'paper-goods',
  'cleaning',
  'home',
  'pet',
  'baby',
  'personal-care',
  'clothing',
  'floral',
]);
const reviewFields: CatalogReviewField[] = [
  'category',
  'categoryName',
  'storageCondition',
  'displayGroup',
  'packageSize',
];

export const isNonFoodCategory = (category: string) => nonFoodCategories.has(category);
const familyOf = (category: string) =>
  category === 'fruit' || category === 'vegetables' ? 'produce' : category;
const preparedTitle =
  /\b(?:fully[- ]cooked|cooked|ready[- ]to[- ]eat|rotisserie|smoked|grilled|roasted)\b/i;

/** Same naming scheme as the ingest classifier, so fixtures keep their allowed groups. */
export function displayGroupFor(input: {
  category: string;
  processing: string;
  storage: StorageCondition;
  title: string;
}) {
  const family = familyOf(input.category);
  const suffix = input.processing ? `-${input.processing}` : '';
  if (isNonFoodCategory(input.category)) return `non-food-${family}`;
  if (input.storage === 'chilled-confirmed') return `chilled-${family}${suffix}`;
  if (input.storage === 'frozen-confirmed')
    return family === 'frozen'
      ? /\b(?:ice cream|sorbet|gelato|frozen yogurt|dessert)\b/i.test(input.title)
        ? 'freezer-dessert'
        : 'freezer-savory'
      : `frozen-${family}${suffix}`;
  if (input.storage === 'ambient-likely') return `ambient-${family}`;
  if (input.storage === 'served-hot') return `hot-${family}${suffix}`;
  return `review-${family}${suffix}`;
}

function processingFor(
  category: string,
  original: SamsClubCatalogRecord,
  decision: ReviewDecision | undefined,
) {
  if (decision?.processing) return decision.processing;
  if (category === 'deli') return 'prepared';
  const suffix = original.displayGroup.match(/-(raw|prepared)$/)?.[1] || '';
  if (category === original.category) return suffix;
  if (category === 'meat' || category === 'seafood')
    return preparedTitle.test(original.originalName) ? 'prepared' : 'raw';
  return '';
}

/** Values as ingested, before any review pass. */
export function ingestValues(record: SamsClubCatalogRecord): SamsClubCatalogRecord {
  return { ...record, ...record.reviewPrevious };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Re-derive reviewed fields from the ingest values, the record's own source text and the
 * reviewer decision. The result depends only on those inputs, so the pass is repeatable.
 */
export function reviewCatalogRecord(
  record: SamsClubCatalogRecord,
  decision?: ReviewDecision,
): SamsClubCatalogRecord {
  const original = ingestValues(record);
  const next: SamsClubCatalogRecord = { ...original };
  delete next.reviewPrevious;
  delete next.status;
  delete next.archiveReason;
  delete next.storageBasis;
  delete next.categoryNote;

  const category = decision?.category || original.category;
  if (category !== original.category) {
    next.category = category;
    next.categoryName = categoryNames[category] || original.categoryName;
    next.categoryNote = decision!.note;
  }
  const nonFood = isNonFoodCategory(category);
  const processing = processingFor(category, original, decision);

  let storage = original.storageCondition;
  let basis: StorageBasis | undefined;
  if (nonFood) storage = 'ambient-likely';
  else {
    const evidence = resolveStorage(storageFindings(original), familyOf(category));
    if (storage === 'unknown' && evidence.condition) storage = evidence.condition;
    else if (storage === 'unknown' && decision?.storageCondition) {
      storage = decision.storageCondition;
      basis = { kind: 'manual-review', text: decision.note };
    }
    if (!basis && evidence.condition === storage && evidence.quote)
      basis = { kind: 'source-text', text: evidence.quote };
    if (!basis && storage === 'frozen-confirmed' && /\bfrozen\b/i.test(original.originalName))
      basis = { kind: 'title', text: original.originalName };
  }
  next.storageCondition = storage;
  if (basis) next.storageBasis = basis;

  // Keep the ingest group unless the review changed what decides it.
  next.displayGroup =
    category === original.category && storage === original.storageCondition
      ? original.displayGroup
      : displayGroupFor({ category, processing, storage, title: original.originalName });

  if (!nonFood) {
    const quote =
      original.prices.find(
        (price) => price.channel === original.selectedChannel && price.clubId === original.clubId,
      ) || original.prices[0];
    next.packageSize = packageSizeFromSource({
      name: original.originalName,
      specifications: original.specifications,
      price: original.price,
      unitPriceText: quote?.unitPriceText,
      finalCostByWeight: original.finalCostByWeight,
    });
  }

  if (decision?.archive) {
    next.status = 'archived';
    next.archiveReason = decision.note;
  }

  const previous: SamsClubCatalogRecord['reviewPrevious'] = {};
  for (const field of reviewFields)
    if (!same(original[field], next[field])) Object.assign(previous, { [field]: original[field] });
  if (Object.keys(previous).length) next.reviewPrevious = previous;
  return next;
}
