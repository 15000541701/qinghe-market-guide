import type { Product, Shelf } from './types';
import { shelfSlotCapacity, shelfSlotPlacementError, type ShelfSide } from './shelf-capacity';

export type Placement = {
  shelfId: string | null;
  shelfSide: ShelfSide | null;
  shelfLevel: number | null;
  shelfSlot: number | null;
};
export type PlacementChange = { id: string; expected: Placement; target: Placement };
export const unplaced = (): Placement => ({
  shelfId: null,
  shelfSide: null,
  shelfLevel: null,
  shelfSlot: null,
});
export function placementOf(product: Product): Placement {
  return {
    shelfId: product.shelfId ?? null,
    shelfSide: product.shelfSide ?? null,
    shelfLevel: product.shelfLevel ?? null,
    shelfSlot: product.shelfSlot ?? null,
  };
}
export function samePlacement(a: Placement, b: Placement) {
  return (
    a.shelfId === b.shelfId &&
    a.shelfSide === b.shelfSide &&
    a.shelfLevel === b.shelfLevel &&
    a.shelfSlot === b.shelfSlot
  );
}
export function applyPlacement(product: Product, target: Placement, shelves: Shelf[]): Product {
  const shelf = shelves.find((item) => item.id === target.shelfId);
  return {
    ...product,
    shelfId: target.shelfId ?? undefined,
    shelfSide: target.shelfSide ?? undefined,
    shelfLevel: target.shelfLevel ?? undefined,
    shelfSlot: target.shelfSlot ?? undefined,
    shelf: shelf?.name || '',
    merchandisingState:
      product.merchandisingState === 'pending-review'
        ? 'pending-review'
        : shelf
          ? 'placed'
          : 'unplaced',
  };
}
/** Keep explicit empty cells, filling older records into remaining cells in stable order. */
export function shelfCells(products: Product[], shelf: Shelf, side: ShelfSide, level: number) {
  const items = products.filter(
    (p) =>
      p.status !== 'archived' &&
      p.shelfId === shelf.id &&
      (p.shelfSide || Object.keys(shelf.accessPoints || {})[0] || 'front') === side &&
      (p.shelfLevel || 1) === level,
  );
  const cells: (Product | undefined)[] = Array.from({ length: shelfSlotCapacity(shelf) });
  const remaining: Product[] = [];
  for (const product of items) {
    const slot = product.shelfSlot;
    if (
      slot !== undefined &&
      Number.isInteger(slot) &&
      slot >= 0 &&
      slot < cells.length &&
      !cells[slot]
    )
      cells[slot] = product;
    else remaining.push(product);
  }
  for (const product of remaining) {
    const empty = cells.findIndex((item) => !item);
    if (empty < 0) cells.push(product);
    else cells[empty] = product;
  }
  return cells;
}
export function effectivePlacement(
  product: Product,
  products: Product[],
  shelves: Shelf[],
): Placement | undefined {
  const shelf = shelves.find((item) => item.id === product.shelfId && item.reachable);
  if (!shelf) return undefined;
  const side = product.shelfSide || (Object.keys(shelf.accessPoints || {})[0] as ShelfSide);
  const level = product.shelfLevel || 1;
  if (!side || !shelf.accessPoints?.[side] || level > (shelf.levels || 1)) return undefined;
  const slot = shelfCells(products, shelf, side, level).findIndex(
    (item) => item?.id === product.id,
  );
  return slot >= 0
    ? { shelfId: shelf.id, shelfSide: side, shelfLevel: level, shelfSlot: slot }
    : undefined;
}
export function placementIndex(products: Product[], shelves: Shelf[]) {
  const index = new Map<string, Placement>();
  for (const shelf of shelves.filter((item) => item.reachable))
    for (const side of Object.keys(shelf.accessPoints || {}) as ShelfSide[])
      for (let level = 1; level <= (shelf.levels || 1); level++)
        shelfCells(products, shelf, side, level).forEach((product, slot) => {
          if (product)
            index.set(product.id, {
              shelfId: shelf.id,
              shelfSide: side,
              shelfLevel: level,
              shelfSlot: slot,
            });
        });
  return index;
}
/** Normalise touched legacy layers as part of the same move so their order never jumps. */
export function planProductDrop(
  id: string,
  target: Placement,
  products: Product[],
  shelves: Shelf[],
) {
  const product = products.find((item) => item.id === id);
  if (!product || product.status === 'archived') throw new Error('商品不存在或已归档。');
  const source = effectivePlacement(product, products, shelves);
  const next = new Map<string, Placement>();
  const normalise = (location: Placement) => {
    const shelf = shelves.find((item) => item.id === location.shelfId);
    if (!shelf || !location.shelfSide || !location.shelfLevel) return;
    shelfCells(products, shelf, location.shelfSide, location.shelfLevel).forEach((item, slot) => {
      if (item) next.set(item.id, { ...location, shelfSlot: slot });
    });
  };
  if (source) normalise(source);
  if (target.shelfId) normalise(target);
  const occupant = [...next].find(
    ([otherId, place]) => otherId !== id && samePlacement(place, target),
  )?.[0];
  if (occupant) next.set(occupant, source || unplaced());
  next.set(id, target);
  return [...next].flatMap(([productId, location]): PlacementChange[] => {
    const expected = placementOf(products.find((item) => item.id === productId)!);
    return samePlacement(expected, location) ? [] : [{ id: productId, expected, target: location }];
  });
}
export function invertPlacementChanges(changes: PlacementChange[]): PlacementChange[] {
  return changes.map(({ id, expected, target }) => ({ id, expected: target, target: expected }));
}

export function placementChangesError(
  changes: PlacementChange[],
  products: Product[],
  shelves: Shelf[],
) {
  const staged = products.map((product) => {
    const change = changes.find((item) => item.id === product.id);
    return change ? applyPlacement(product, change.target, shelves) : product;
  });
  for (const change of changes) {
    if (!change.target.shelfId) continue;
    const shelf = shelves.find((item) => item.id === change.target.shelfId);
    if (
      !shelf?.reachable ||
      !change.target.shelfSide ||
      !shelf.accessPoints?.[change.target.shelfSide]
    )
      return '目标货架这一侧不可到达。';
    if (
      !change.target.shelfLevel ||
      change.target.shelfLevel > (shelf.levels || 1) ||
      (change.target.shelfSlot !== null && change.target.shelfSlot >= shelfSlotCapacity(shelf))
    )
      return '目标格位超出货架容量。';
    const reason = shelfSlotPlacementError(
      shelf,
      staged.find((product) => product.id === change.id)!,
      staged,
      change.target.shelfSide,
      change.target.shelfLevel,
    );
    if (reason) return reason;
  }
  return '';
}
export type DropAssessment = {
  kind: 'empty' | 'occupied' | 'same' | 'move' | 'swap' | 'replace' | 'blocked';
  label: string;
  reason: string;
  shortReason: string;
};
function shortPlacementReason(reason: string) {
  if (/需冷冻/.test(reason)) return '需放入冷冻柜';
  if (/需冷藏/.test(reason)) return '需放入冷藏柜';
  if (/冷链/.test(reason)) return '需放入冷藏或冷冻柜';
  if (/尚未确认陈列分组/.test(reason)) return '请先确认商品分组';
  if (/陈列分组/.test(reason)) return '陈列分组不匹配';
  if (/不可到达/.test(reason)) return '当前侧面不可达';
  if (/超出|已满/.test(reason)) return '格位容量不足';
  return reason.replace(/^“[^”]*”/, '');
}
export type ShelfCandidate = {
  product: Product;
  canPlace: boolean;
  pending: boolean;
  reason: string;
  shortReason: string;
  priority: number;
};
export function rankShelfCandidates(
  products: Product[],
  shelf: Shelf | undefined,
  shelves: Shelf[],
): ShelfCandidate[] {
  const placed = placementIndex(products, shelves);
  const side = Object.keys(shelf?.accessPoints || {})[0] as ShelfSide | undefined;
  return products
    .filter((product) => product.status !== 'archived')
    .map((product): ShelfCandidate => {
      const pending = !placed.has(product.id);
      const reason =
        !shelf?.footprint || !side
          ? '请先补全货架占地与到达侧。'
          : !shelf.reachable
            ? '货架当前不可到达。'
            : shelfSlotPlacementError(shelf, product, [], side, 1) || '';
      return {
        product,
        pending,
        canPlace: !reason,
        reason,
        shortReason: reason ? shortPlacementReason(reason) : '',
        priority: reason ? 2 : pending ? 0 : 1,
      };
    })
    .sort((a, b) => a.priority - b.priority);
}
/** Evaluate every visible cell before hover, using the same rules as a drop. */
export function assessProductDrop(
  product: Product | undefined,
  target: Placement,
  products: Product[],
  shelves: Shelf[],
): DropAssessment {
  const shelf = shelves.find((item) => item.id === target.shelfId);
  const occupant =
    shelf && target.shelfSide
      ? shelfCells(products, shelf, target.shelfSide, target.shelfLevel || 1)[target.shelfSlot || 0]
      : undefined;
  if (!product)
    return {
      kind: occupant ? 'occupied' : 'empty',
      label: occupant ? '已陈列' : '空位',
      reason: '先选择商品，即可查看所有格位能否安放。',
      shortReason: '先选商品查看是否可放',
    };
  const source = effectivePlacement(product, products, shelves);
  if (source && samePlacement(source, target))
    return {
      kind: 'same',
      label: '当前位置',
      reason: '商品已在这里，无需移动。',
      shortReason: '无需移动',
    };
  const reason = placementChangesError(
    planProductDrop(product.id, target, products, shelves),
    products,
    shelves,
  );
  if (reason)
    return {
      kind: 'blocked',
      label: '不可放置',
      reason,
      shortReason: shortPlacementReason(reason),
    };
  if (occupant)
    return {
      kind: source ? 'swap' : 'replace',
      label: source ? '可交换' : '可替换',
      reason: source
        ? `与“${occupant.name}”交换位置。`
        : `替换“${occupant.name}”，原商品移回待摆放。`,
      shortReason: source ? '两件商品互换位置' : '原商品移回待摆放',
    };
  return {
    kind: 'move',
    label: '可放入',
    reason: '空位，符合所选商品的陈列条件。',
    shortReason: '符合陈列条件',
  };
}
