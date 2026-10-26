import type { Product, Shelf, StoreSection } from './types';
import {
  createShelfMoveValidator,
  shelfGeometry,
  translatedShelf,
  type PlacedSnapshot,
  type ShelfGeometry,
} from './shelf-move';

export type ShelfVersion = {
  id: string;
  revision: number;
  groupId: string | null;
  deleted: boolean;
};
export type ShelfTarget = {
  id: string;
  geometry: ShelfGeometry;
  groupId: string | null;
  deleted: boolean;
};
export type ShelfBatchAction =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'group' | 'ungroup' | 'delete' }
  | { type: 'restore'; shelves: ShelfTarget[]; products: PlacedSnapshot[] };
export type ShelfBatchUndo = {
  expected: ShelfVersion[];
  expectedProducts: PlacedSnapshot[];
  action: Extract<ShelfBatchAction, { type: 'restore' }>;
};
export type ShelfBatchResult = { shelves: Shelf[]; products: Product[]; undo: ShelfBatchUndo };
export function shelfVersion(shelf: Shelf): ShelfVersion {
  return {
    id: shelf.id,
    revision: shelf.layoutRevision || 0,
    groupId: shelf.groupId || null,
    deleted: !!shelf.deleted,
  };
}
export function shelfTarget(shelf: Shelf): ShelfTarget {
  return {
    id: shelf.id,
    geometry: shelfGeometry(shelf),
    groupId: shelf.groupId || null,
    deleted: !!shelf.deleted,
  };
}
export function expandShelfSelection(ids: string[], shelves: Shelf[]): string[] {
  const selected = shelves.filter(
    (shelf) => ids.includes(shelf.id) && !shelf.deleted && shelf.footprint,
  );
  const groups = new Set(selected.flatMap((shelf) => (shelf.groupId ? [shelf.groupId] : [])));
  return shelves
    .filter(
      (shelf) =>
        !shelf.deleted &&
        shelf.footprint &&
        (ids.includes(shelf.id) || (!!shelf.groupId && groups.has(shelf.groupId))),
    )
    .map((shelf) => shelf.id);
}
export function toggleShelfSelection(
  current: string[],
  clicked: string,
  additive: boolean,
  shelves: Shelf[],
): string[] {
  const unit = expandShelfSelection([clicked], shelves);
  if (!additive) return unit;
  const remove = unit.every((id) => current.includes(id));
  return remove
    ? current.filter((id) => !unit.includes(id))
    : expandShelfSelection([...current, ...unit], shelves);
}
export function shelfSelectionBounds(shelves: Shelf[]) {
  const rects = shelves.flatMap((shelf) => (shelf.footprint ? [shelf.footprint] : []));
  if (!rects.length) return undefined;
  const x = Math.min(...rects.map((rect) => rect.x)),
    y = Math.min(...rects.map((rect) => rect.y));
  return {
    x,
    y,
    w: Math.max(...rects.map((rect) => rect.x + rect.w)) - x,
    h: Math.max(...rects.map((rect) => rect.y + rect.h)) - y,
  };
}
export function translateShelfSelection(ids: string[], dx: number, dy: number, shelves: Shelf[]) {
  return shelves
    .filter((shelf) => ids.includes(shelf.id))
    .map((shelf) => translatedShelf(shelf, shelf.footprint!.x + dx, shelf.footprint!.y + dy));
}
export function shelfBatchPlacementError(
  updates: Shelf[],
  shelves: Shelf[],
  sections: StoreSection[],
) {
  const staged = [
    ...shelves.filter((shelf) => !updates.some((update) => update.id === shelf.id)),
    ...updates,
  ].filter((shelf) => !shelf.deleted);
  const validate = createShelfMoveValidator(
    shelves.filter((shelf) => !shelf.deleted),
    sections,
    staged,
  );
  for (const shelf of updates.filter((item) => !item.deleted)) {
    const reason = validate(shelf);
    if (reason) return `“${shelf.name}”：${reason}`;
  }
  return '';
}
