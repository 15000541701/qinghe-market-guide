import type { Point, Product, Shelf, StoreSection } from './types';
import type { Placement } from './placement';
import { mapBounds } from './map-config';
import {
  fixedFixtures,
  mainAisles,
  fixtureOperationFootprint,
  fixtureSupportsLevels,
} from './layout';
import { entrance } from './catalog';

type Rect = NonNullable<Shelf['footprint']>;
export type Turn = 'cw' | 'ccw';
export type ShelfGeometry = {
  footprint: Rect;
  accessPoints: NonNullable<Shelf['accessPoints']>;
  accessOrder: Side[];
  position: Point | null;
  rotation: number;
};
export type PlacedSnapshot = { id: string; placement: Placement };
export type ShelfLayoutAction =
  | { type: 'rotate'; direction: Turn }
  | { type: 'resize'; footprint: Rect }
  | { type: 'restore'; geometry: ShelfGeometry; placements: PlacedSnapshot[] };
export type ShelfLayoutResult = {
  shelf: Shelf;
  products: Product[];
  expectedProducts: PlacedSnapshot[];
  undo: { geometry: ShelfGeometry; placements: PlacedSnapshot[] };
};
type Side = NonNullable<import('./types').Product['shelfSide']>;
export function shelfGeometry(shelf: Shelf): ShelfGeometry {
  if (!shelf.footprint) throw new Error('请先补全货架占地资料。');
  return {
    footprint: { ...shelf.footprint },
    accessPoints: { ...shelf.accessPoints },
    accessOrder: Object.keys(shelf.accessPoints || {}) as Side[],
    position: shelf.position && { ...shelf.position },
    rotation: shelf.rotation || 0,
  };
}
export function restoreShelfGeometry(shelf: Shelf, geometry: ShelfGeometry): Shelf {
  const { accessOrder, ...fields } = geometry;
  return {
    ...shelf,
    ...fields,
    accessPoints: Object.fromEntries(
      accessOrder.map((side) => [side, geometry.accessPoints[side]!]),
    ),
  };
}
export function rotateShelfSide(side: Side, direction: Turn): Side {
  const order: Side[] = ['back', 'right', 'front', 'left'];
  return order[(order.indexOf(side) + (direction === 'cw' ? 1 : 3)) % 4];
}
export function rotatedShelf(shelf: Shelf, direction: Turn): Shelf {
  if (!shelf.footprint) throw new Error('请先补全货架占地资料。');
  const { x, y, w, h } = shelf.footprint;
  const turn = (point: Point): Point =>
    direction === 'cw'
      ? { x: x + h - 1 - (point.y - y), y: y + point.x - x }
      : { x: x + point.y - y, y: y + w - 1 - (point.x - x) };
  return {
    ...shelf,
    footprint: { x, y, w: h, h: w },
    rotation: (shelf.rotation || 0) + (direction === 'cw' ? 90 : -90),
    accessPoints: Object.fromEntries(
      Object.entries(shelf.accessPoints || {}).map(([side, point]) => [
        rotateShelfSide(side as Side, direction),
        turn(point),
      ]),
    ),
    position: shelf.position ? turn(shelf.position) : null,
  };
}
export function resizedShelf(shelf: Shelf, footprint: Rect): Shelf {
  if (!shelf.footprint) throw new Error('请先补全货架占地资料。');
  const old = shelf.footprint;
  const points = Object.fromEntries(
    Object.entries(shelf.accessPoints || {}).map(([side, point]) => {
      const vertical = side === 'left' || side === 'right';
      const oldLength = vertical ? old.h : old.w,
        newLength = vertical ? footprint.h : footprint.w;
      const offset = vertical ? point.y - old.y : point.x - old.x;
      const nextOffset =
        oldLength <= 1
          ? Math.floor((newLength - 1) / 2)
          : Math.round((offset * (newLength - 1)) / (oldLength - 1));
      const next = vertical
        ? {
            x: side === 'left' ? footprint.x - 1 : footprint.x + footprint.w,
            y: footprint.y + nextOffset,
          }
        : {
            x: footprint.x + nextOffset,
            y: side === 'back' ? footprint.y - 1 : footprint.y + footprint.h,
          };
      return [side, next];
    }),
  ) as Shelf['accessPoints'];
  const primary = Object.entries(shelf.accessPoints || {}).find(
    ([, point]) => point.x === shelf.position?.x && point.y === shelf.position?.y,
  )?.[0] as Side | undefined;
  return {
    ...shelf,
    footprint,
    accessPoints: points,
    position: primary ? points?.[primary] || null : Object.values(points || {})[0] || null,
  };
}
export function footprintFromCorners(first: Point, second: Point): Rect {
  return {
    x: Math.min(first.x, second.x),
    y: Math.min(first.y, second.y),
    w: Math.abs(first.x - second.x),
    h: Math.abs(first.y - second.y),
  };
}
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function reachableCells(shelves: Shelf[]) {
  const blocked = new Set<string>();
  const rectangles = [
    ...fixedFixtures.map((fixture) => fixture.rect),
    ...shelves.flatMap((shelf) =>
      shelf.footprint
        ? [
            shelf.footprint,
            ...(fixtureOperationFootprint(shelf) ? [fixtureOperationFootprint(shelf)!] : []),
          ]
        : [],
    ),
  ];
  for (const rect of rectangles)
    for (let x = rect.x; x < rect.x + rect.w; x++)
      for (let y = rect.y; y < rect.y + rect.h; y++) blocked.add(`${x},${y}`);
  const seen = new Set<string>();
  if (blocked.has(`${entrance.x},${entrance.y}`)) return seen;
  const queue = [entrance];
  seen.add(`${entrance.x},${entrance.y}`);
  for (let index = 0; index < queue.length; index++) {
    const { x, y } = queue[index];
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      const key = `${nx},${ny}`;
      if (
        nx < 1 ||
        ny < 1 ||
        nx > mapBounds.maxX ||
        ny > mapBounds.maxY ||
        blocked.has(key) ||
        seen.has(key)
      )
        continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}
export function translatedShelf(shelf: Shelf, x: number, y: number): Shelf {
  if (!shelf.footprint) return shelf;
  const dx = x - shelf.footprint.x,
    dy = y - shelf.footprint.y;
  const shift = (p: { x: number; y: number }) => ({ x: p.x + dx, y: p.y + dy });
  return {
    ...shelf,
    footprint: { ...shelf.footprint, x, y },
    position: shelf.position ? shift(shelf.position) : null,
    accessPoints: Object.fromEntries(
      Object.entries(shelf.accessPoints || {}).map(([side, point]) => [side, shift(point)]),
    ),
  };
}
export function createShelfMoveValidator(
  shelves: Shelf[],
  sections: StoreSection[],
  finalLayout?: Shelf[],
) {
  const before = reachableCells(shelves);
  const finalReachable = finalLayout ? reachableCells(finalLayout) : undefined;
  return (next: Shelf): string | undefined => {
    const rect = next.footprint;
    const section = sections.find((item) => item.id === next.sectionId && item.active);
    if (!rect || !section) return '请选择已关联启用分区的实体货架。';
    const levels = next.levels ?? 1;
    if (!Number.isInteger(levels) || levels < 1 || levels > 8) return '设施层数需在1–8层之间。';
    if (!fixtureSupportsLevels(next.kind) && levels !== 1)
      return '该类设施仅支持1层，请先调整设施配置。';
    if (
      ![rect.w, rect.h].every(Number.isInteger) ||
      rect.w < 1 ||
      rect.h < 1 ||
      rect.w > 16 ||
      rect.h > 16
    )
      return '占地宽、高需为1–16个整数格。';
    if (
      ![rect.x, rect.y, rect.w, rect.h].every(Number.isInteger) ||
      rect.x < 1 ||
      rect.y < 1 ||
      rect.x + rect.w > mapBounds.maxX + 1 ||
      rect.y + rect.h > mapBounds.maxY + 1
    )
      return '货架超出地图边界。';
    if (mainAisles.some((aisle) => overlaps(rect, aisle))) return '不能挡住主通道。';
    if (fixedFixtures.some((fixture) => overlaps(rect, fixture.rect)))
      return '不能覆盖收银或服务设施。';
    if (
      (finalLayout || shelves).some(
        (shelf) => shelf.id !== next.id && shelf.footprint && overlaps(rect, shelf.footprint),
      )
    )
      return '与其他货架重叠。';
    const staged = finalLayout || shelves.map((shelf) => (shelf.id === next.id ? next : shelf));
    const reachable = finalReachable || reachableCells(staged);
    for (const point of Object.values(next.accessPoints || {})) {
      if (next.reachable && !reachable.has(`${point.x},${point.y}`))
        return '顾客无法从通道到达货架这一侧。';
    }
    if (next.reachable && !Object.keys(next.accessPoints || {}).length)
      return '货架缺少顾客到达点。';
    for (const shelf of shelves.filter((item) => item.id !== next.id && item.reachable)) {
      const after = staged.find((item) => item.id === shelf.id);
      if (!after?.reachable) continue;
      for (const [side, point] of Object.entries(shelf.accessPoints || {})) {
        const target = after.accessPoints?.[side as Side];
        if (
          before.has(`${point.x},${point.y}`) &&
          (!target || !reachable.has(`${target.x},${target.y}`))
        )
          return `会挡住通往“${shelf.name}”的通道。`;
      }
    }
    return undefined;
  };
}

export function shelfMoveError(
  next: Shelf,
  shelves: Shelf[],
  sections: StoreSection[],
): string | undefined {
  return createShelfMoveValidator(shelves, sections)(next);
}
