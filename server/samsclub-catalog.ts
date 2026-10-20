import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Product, ProductDetailResponse, SamsClubCatalogRecord, Shelf, StoreCategory, StoreSection } from '../shared/types';
import { shelfSlotPlacementError } from '../shared/shelf-capacity';
import { entrance } from '../shared/catalog';
import { findPath } from '../shared/navigation';
let records: SamsClubCatalogRecord[] = [];
let catalogModifiedAt = 0;
function catalogRecords() {
  const file = path.resolve('shared/samsclub-catalog.json');
  const modifiedAt = statSync(file).mtimeMs;
  if (modifiedAt !== catalogModifiedAt) {
    records = JSON.parse(readFileSync(file, 'utf8')) as SamsClubCatalogRecord[];
    catalogModifiedAt = modifiedAt;
  }
  return records;
}

export function samsClubCategories(existing: StoreCategory[]): StoreCategory[] {
  const known = new Set(existing.map((category) => category.id));
  // Categories used only by archived records (e.g. floral) exist for labels but stay hidden.
  const onSale = new Set(catalogRecords().filter((record) => record.status !== 'archived').map((record) => record.category));
  const additions: StoreCategory[] = [];
  for (const record of catalogRecords()) {
    if (known.has(record.category)) continue;
    known.add(record.category);
    additions.push({ id: record.category, name: record.categoryName || record.category, active: onSale.has(record.category), sectionId: null, kind: record.displayGroup.includes('non-food') ? 'non_food' : 'food' });
  }
  return additions;
}

type CatalogOwned = NonNullable<Product['catalogSnapshot']>;
const catalogOwnedFields = ['category', 'storageCondition', 'displayGroup', 'packageSize', 'status'] as const;
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Values the catalog decides; staff edits to any of them are preserved on later syncs. */
function catalogOwned(record: SamsClubCatalogRecord): Required<CatalogOwned> {
  return {
    category: record.category,
    storageCondition: record.storageCondition,
    displayGroup: record.displayGroup,
    packageSize: record.packageSize || { quantity: 1, unit: 'package' },
    status: record.status === 'archived' ? 'archived' : record.price > 0 ? 'active' : 'draft',
  };
}

/** The same values before the review pass, i.e. what older databases were imported with. */
function ingestOwned(record: SamsClubCatalogRecord): Required<CatalogOwned> {
  const previous = record.reviewPrevious || {};
  return {
    ...catalogOwned(record),
    ...Object.fromEntries(Object.entries(previous).filter(([field]) => field !== 'categoryName')),
    status: record.price > 0 ? 'active' : 'draft',
  } as Required<CatalogOwned>;
}

const unplaced = (product: Product): Product => ({
  ...product,
  shelf: '',
  shelfId: undefined,
  shelfSide: undefined,
  shelfLevel: undefined,
  merchandisingState: product.storageCondition === 'unknown' ? 'pending-review' : 'unplaced',
});

/**
 * Bring imported products up to date with the reviewed source catalog. A catalog-owned field
 * changes only while it still holds the value last written from the catalog, so staff edits
 * survive. Placements that no longer fit the fixture rules are cleared for re-placement; the ones
 * that still fit stay put and count as placed.
 */
export function syncSamsClubProducts(products: Product[], shelves: Shelf[]): Product[] {
  const byId = new Map(catalogRecords().map((record) => [`samsclub-${record.itemId}`, record]));
  const changed: Product[] = [];
  for (const product of products) {
    const record = byId.get(product.id);
    if (!record || product.sourceRetailer !== 'Sam’s Club US') continue;
    const target = catalogOwned(record);
    const base = { ...ingestOwned(record), ...product.catalogSnapshot };
    let next: Product = { ...product };
    const snapshot: CatalogOwned = {};
    for (const field of catalogOwnedFields) {
      // No form or SKU file edits package sizes. A bare {1, package} is the placeholder that
      // earlier saves inferred from a unit word such as “件”, so the reviewed size replaces it.
      const placeholder =
        field === 'packageSize' && same(product.packageSize, { quantity: 1, unit: 'package' });
      const untouched =
        placeholder || same(product[field], base[field]) || same(product[field], target[field]);
      if (untouched) Object.assign(next, { [field]: target[field] });
      Object.assign(snapshot, { [field]: untouched ? target[field] : base[field] });
    }
    next.catalogSnapshot = snapshot;
    if (same(next.storageCondition, record.storageCondition) && record.storageBasis)
      next.storageBasis = record.storageBasis;
    else delete next.storageBasis;
    if (next.status === 'archived' && record.archiveReason) next.archiveReason = record.archiveReason;
    else delete next.archiveReason;

    const shelf = shelves.find((item) => item.id === next.shelfId);
    if (next.status === 'archived' && next.shelfId) next = { ...unplaced(next), merchandisingState: 'unplaced' };
    else if (
      next.shelfId &&
      (!shelf ||
        !next.shelfSide ||
        // Capacity is not re-checked here: an existing placement already holds its slot.
        shelfSlotPlacementError(shelf, next, [], next.shelfSide, next.shelfLevel || 1))
    )
      next = unplaced(next);
    // A slot that passes the fixture rules is a placement, whoever made it (drag-and-drop board,
    // edit form, SKU file), pending items included. Earlier builds saved such slots without
    // marking them placed, and startup re-plans everything not placed, so it moved or cleared them.
    else if (next.shelfId) next.merchandisingState = 'placed';
    else if (next.merchandisingState === 'pending-review' && next.storageCondition !== 'unknown')
      next.merchandisingState = 'unplaced';
    if (!same(next, product)) changed.push(next);
  }
  return changed;
}

export function samsClubProducts(
  existing: Product[],
  shelves: Shelf[],
  sections: StoreSection[],
): Product[] {
  const products: Product[] = [];
  const reachable = new Map<string, boolean>();
  // Prepared seafood has one compatible shared freezer; generic frozen groceries
  // also have an overflow case. Reserve the constrained case first on a new store.
  const orderedRecords = [...catalogRecords()].sort((a, b) =>
    Number(b.displayGroup === 'frozen-seafood-prepared') - Number(a.displayGroup === 'frozen-seafood-prepared'),
  );
  for (const record of orderedRecords) {
    const id = `samsclub-${record.itemId}`;
    if (existing.some((product) => product.id === id)) continue;
    const selectedQuote = record.prices.find((quote) => quote.channel === record.selectedChannel && quote.clubId === record.clubId);
    const displayGroup = record.displayGroup;
    const owned = catalogOwned(record);
    const product: Product = {
      id,
      sku: `SAM-US-${record.itemId}`,
      sourceSku: record.itemId,
      sourcePageId: record.sourcePageId,
      name: record.name,
      brand: record.brand || undefined,
      barcode: record.barcode || undefined,
      ...owned,
      price: record.price,
      unit: record.unit,
      currency: 'USD',
      catalogOrigin: 'retailer',
      priceOrigin: 'samsclub',
      inventoryMode: 'tracked',
      stock: 100,
      image: `/images/samsclub/${record.itemId}/card.jpg`,
      sourceImageUrl: record.gallery[0]?.sourceUrl,
      description: record.description,
      tags: ['山姆精选', ...(record.brand ? [record.brand] : [])],
      aliases: [record.originalName, record.itemId, record.name],
      shelf: '',
      merchandisingState: record.storageCondition === 'unknown' ? 'pending-review' : 'unplaced',
      ...(record.storageBasis ? { storageBasis: record.storageBasis } : {}),
      ...(record.archiveReason ? { archiveReason: record.archiveReason } : {}),
      catalogSnapshot: owned,
      saleMode: 'pack',
      sourceRetailer: 'Sam’s Club US',
      sourceUrl: record.sourceUrl,
      sourceCheckedAt: record.capturedAt,
      createdAt: record.capturedAt,
      priceSourceUrl: record.sourceUrl,
      priceCheckedAt: record.capturedAt,
      priceLocationName: record.clubId ? `${selectedQuote?.city || 'Sam’s Club'} · Club ${record.clubId}` : 'Sam’s Club 在线配送',
      priceNote:
        '来源页面的门店/渠道参考价格；门店演示库存为100。称重商品按页面估价展示，实际按重量结算。',
      history: [
        {
          price: record.price,
          unit: record.unit,
          currency: 'USD',
          date: record.capturedAt,
          source: 'retail',
        },
      ],
    };
    products.push(product);
    if (record.status === 'archived') continue;
    const kind =
      record.storageCondition === 'served-hot'
        ? 'service-counter'
        : record.storageCondition === 'frozen-confirmed'
          ? 'freezer'
          : record.storageCondition === 'chilled-confirmed' || record.storageCondition === 'chilled-or-frozen-confirmed' ||
              record.displayGroup.startsWith('chilled-')
            ? 'chiller'
            : record.category === 'bakery'
              ? 'display-table'
              : record.category === 'clothing'
                ? 'hanging-rack'
                : displayGroup === 'ambient-produce'
                  ? 'produce-table'
                  : 'gondola';
    const sectionsByCategory: Record<string, string> = { fruit: 'fruit', vegetables: 'vegetables', seafood: 'seafood', deli: 'deli-service', frozen: 'openprices-frozen', 'paper-goods': 'paper-zone', cleaning: 'household', home: 'household', 'personal-care': 'care-zone', baby: 'care-zone', pet: 'pet-zone', clothing: 'household', snacks: 'snack-zone', seasoning: 'pantry', pantry: 'pantry' };
    const nonFoodSections = ['household', 'paper-zone', 'care-zone', 'pet-zone'];
    const nonFood = ['paper-goods', 'cleaning', 'home', 'personal-care', 'baby', 'pet', 'clothing'].includes(record.category);
    const preparedCold = /^chilled-(?:deli|bakery|seasoning|sauces|pantry|frozen|beverages)(?:-|$)/.test(displayGroup) || ['chilled-seafood-prepared', 'review-seafood-prepared'].includes(displayGroup);
    const preferredSection = (preparedCold ? 'deli-service' : sectionsByCategory[record.category]) || (record.category === 'meat' || record.category === 'meat-poultry' ? 'meat'
      : record.category === 'seafood' ? 'seafood'
        : kind === 'chiller' ? 'dairy' : record.category);
    // Dedicated fixtures (fewer allowed groups) fill before shared overflow fixtures.
    const specificity = (shelf: Shelf) => shelf.allowedDisplayGroups?.length || Number.MAX_SAFE_INTEGER;
    const candidates = shelves
      .filter((shelf) => (shelf.kind === kind || (record.storageCondition === 'chilled-or-frozen-confirmed' && shelf.kind === 'freezer')) && shelf.reachable && shelf.footprint && (record.category !== 'meat' || shelf.kind !== 'chiller' || shelf.sectionId === 'meat') && (nonFood ? nonFoodSections.includes(shelf.sectionId) : !nonFoodSections.includes(shelf.sectionId)))
      .sort(
        (a, b) =>
          Number(b.sectionId === preferredSection) - Number(a.sectionId === preferredSection) ||
          specificity(a) - specificity(b),
      );
    placement: for (const shelf of candidates) {
      if (record.storageCondition === 'unknown') {
        product.merchandisingState = 'pending-review';
        break placement;
      }
      for (const [side, point] of Object.entries(shelf.accessPoints || {})) {
        if (!point) continue;
        const accessKey = `${shelf.id}:${side}`;
        if (!reachable.has(accessKey)) reachable.set(accessKey, findPath(entrance, point, sections, shelves).length > 0);
        if (!reachable.get(accessKey)) continue;
        for (let level = 1; level <= (shelf.levels || 1); level++) {
          const shelfSide = side as NonNullable<Product['shelfSide']>;
          if (shelfSlotPlacementError(shelf, product, [...existing, ...products], shelfSide, level))
            continue;
          Object.assign(product, {
            shelf: shelf.name,
            shelfId: shelf.id,
            shelfSide,
            shelfLevel: level,
            merchandisingState: 'placed',
          });
          break placement;
        }
      }
    }
  }
  return products;
}

export function productDetail(product: Product): ProductDetailResponse {
  const source = catalogRecords().find((record) => product.id === `samsclub-${record.itemId}`);
  if (!source)
    return {
      product,
      gallery: product.image ? [{ url: product.image }] : [],
      introduction: product.description,
      highlights: product.tags,
      specifications: [],
      prices: [],
    };
  return {
    product,
    originalName: source.originalName,
    gallery: source.gallery,
    introduction: source.introduction,
    introductionIsSummary: source.introductionIsSummary,
    highlights: source.highlights,
    specifications: source.specifications,
    prices: source.prices as ProductDetailResponse['prices'],
    selectedChannel: source.selectedChannel,
    finalCostByWeight: source.finalCostByWeight,
  };
}
