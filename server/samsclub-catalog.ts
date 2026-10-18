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
  const additions: StoreCategory[] = [];
  for (const record of catalogRecords()) {
    if (known.has(record.category)) continue;
    known.add(record.category);
    additions.push({ id: record.category, name: record.categoryName || record.category, active: true, sectionId: null, kind: record.displayGroup.includes('non-food') ? 'non_food' : 'food' });
  }
  return additions;
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
    const product: Product = {
      id,
      sku: `SAM-US-${record.itemId}`,
      sourceSku: record.itemId,
      sourcePageId: record.sourcePageId,
      name: record.name,
      brand: record.brand || undefined,
      barcode: record.barcode || undefined,
      category: record.category,
      price: record.price,
      unit: record.unit,
      currency: 'USD',
      catalogOrigin: 'retailer',
      priceOrigin: 'samsclub',
      status: record.price > 0 ? 'active' : 'draft',
      inventoryMode: 'tracked',
      stock: 100,
      image: `/images/samsclub/${record.itemId}/card.jpg`,
      sourceImageUrl: record.gallery[0]?.sourceUrl,
      description: record.description,
      tags: ['山姆精选', ...(record.brand ? [record.brand] : [])],
      aliases: [record.originalName, record.itemId, record.name],
      shelf: '',
      merchandisingState: record.storageCondition === 'unknown' ? 'pending-review' : 'unplaced',
      storageCondition: record.storageCondition as Product['storageCondition'],
      displayGroup,
      packageSize: record.packageSize || { quantity: 1, unit: 'package' },
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
    const kind =
      record.storageCondition === 'frozen-confirmed'
        ? 'freezer'
        : record.storageCondition === 'chilled-confirmed' || record.storageCondition === 'chilled-or-frozen-confirmed' ||
            record.displayGroup.startsWith('chilled-')
          ? 'chiller'
          : record.category === 'bakery'
            ? 'display-table'
            : record.category === 'clothing'
              ? 'hanging-rack'
            : 'gondola';
    const sectionsByCategory: Record<string, string> = { fruit: 'fruit', vegetables: 'vegetables', seafood: 'seafood', deli: 'deli-service', frozen: 'openprices-frozen', 'paper-goods': 'paper-zone', cleaning: 'household', home: 'household', 'personal-care': 'care-zone', baby: 'care-zone', pet: 'pet-zone', clothing: 'household', snacks: 'pantry', seasoning: 'pantry', pantry: 'pantry' };
    const nonFoodSections = ['household', 'paper-zone', 'care-zone', 'pet-zone'];
    const nonFood = ['paper-goods', 'cleaning', 'home', 'personal-care', 'baby', 'pet', 'clothing'].includes(record.category);
    const preparedCold = /^chilled-(?:deli|bakery|seasoning|sauces|pantry|frozen|beverages)(?:-|$)/.test(displayGroup) || ['chilled-seafood-prepared', 'review-seafood-prepared'].includes(displayGroup);
    const preferredSection = (preparedCold ? 'deli-service' : sectionsByCategory[record.category]) || (record.category === 'meat' || record.category === 'meat-poultry' ? 'meat'
      : record.category === 'seafood' ? 'seafood'
        : kind === 'chiller' ? 'dairy' : record.category);
    const candidates = shelves
      .filter((shelf) => (shelf.kind === kind || (record.storageCondition === 'chilled-or-frozen-confirmed' && shelf.kind === 'freezer')) && shelf.reachable && shelf.footprint && (record.category !== 'meat' || shelf.kind !== 'chiller' || shelf.sectionId === 'meat') && (nonFood ? nonFoodSections.includes(shelf.sectionId) : !nonFoodSections.includes(shelf.sectionId)))
      .sort(
        (a, b) =>
          Number(b.sectionId === preferredSection) - Number(a.sectionId === preferredSection),
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
    products.push(product);
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
