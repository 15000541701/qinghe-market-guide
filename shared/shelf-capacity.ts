import type { Product, Shelf } from './types';

export const DEFAULT_CAPACITY_PER_SLOT = 4;
export const MIN_CAPACITY_PER_SLOT = 1;
export const MAX_CAPACITY_PER_SLOT = 20;

export type ShelfSide = NonNullable<Product['shelfSide']>;

export function shelfSlotCapacity(shelf: Shelf): number {
  const configured = shelf.capacityPerSlot;
  return Number.isInteger(configured) && configured! >= MIN_CAPACITY_PER_SLOT && configured! <= MAX_CAPACITY_PER_SLOT
    ? configured!
    : DEFAULT_CAPACITY_PER_SLOT;
}

export function shelfSlotUsage(
  products: Product[],
  shelfId: string,
  side: ShelfSide,
  level: number,
  excludingProductId?: string,
): number {
  return products.filter(
    (product) =>
      product.status !== 'archived' &&
      product.id !== excludingProductId &&
      product.shelfId === shelfId &&
      product.shelfSide === side &&
      (product.shelfLevel || 1) === level,
  ).length;
}

export function shelfSlotPlacementError(
  shelf: Shelf,
  product: Pick<Product, 'id' | 'name' | 'displayGroup' | 'storageCondition'>,
  products: Product[],
  side: ShelfSide,
  level: number,
): string | undefined {
  const chilledOrFrozen = product.storageCondition === 'chilled-or-frozen-confirmed';
  const coldFixture = shelf.kind === 'chiller' || shelf.kind === 'freezer';
  if (chilledOrFrozen && !coldFixture)
    return `“${product.name}”已确认需要冷链保存，请放入冷藏柜或冷冻柜。`;

  const allowedGroups = shelf.allowedDisplayGroups || [];
  const displayGroup = product.displayGroup?.trim();
  if (allowedGroups.length) {
    if (!displayGroup || displayGroup === 'review-storage' || displayGroup === 'unclassified-review')
      return `“${product.name}”尚未确认陈列分组；请先完成分类，或选择未配置分组限制的设施。`;
    if (!allowedGroups.includes(displayGroup))
      return `“${product.name}”的陈列分组“${displayGroup}”不适用于设施“${shelf.name}”。`;
  }

  if (product.storageCondition === 'frozen-confirmed' && shelf.kind !== 'freezer')
    return `“${product.name}”已确认需冷冻保存，请放入冷冻柜。`;
  if (product.storageCondition === 'chilled-confirmed' && shelf.kind !== 'chiller')
    return `“${product.name}”已确认需冷藏保存，请放入冷藏柜。`;

  const usage = shelfSlotUsage(products, shelf.id, side, level, product.id);
  const capacity = shelfSlotCapacity(shelf);
  if (usage >= capacity)
    return `该侧面第${level}层已满（${usage}/${capacity} 个 SKU）；请另选层位或在设施管理中新增货架。`;
  return undefined;
}
