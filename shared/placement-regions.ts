import type { Point } from './types';
import { mapBounds } from './map-config';
import { fixedFixtures, mainAisles } from './layout';

/** The whole usable floor, including occupied shelf space; not a list of valid drop origins. */
export function shelfUsableFloorCells(): Point[] {
  const reserved = [...mainAisles, ...fixedFixtures.map((fixture) => fixture.rect)];
  const cells: Point[] = [];
  for (let y = 1; y <= mapBounds.maxY; y++)
    for (let x = 1; x <= mapBounds.maxX; x++) {
      if (
        !reserved.some(
          (rect) => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h,
        )
      )
        cells.push({ x, y });
    }
  return cells;
}
/** One translucent fill; only exposed edges get a dashed outline, without internal seams. */
export function placementRegionPaths(points: Point[]) {
  const cells = new Set(points.map(({ x, y }) => `${x},${y}`));
  const rows = new Map<number, number[]>();
  for (const key of cells) {
    const [x, y] = key.split(',').map(Number);
    const row = rows.get(y) || [];
    row.push(x);
    rows.set(y, row);
  }
  const fill: string[] = [],
    outline: string[] = [];
  for (const [y, xs] of rows) {
    xs.sort((a, b) => a - b);
    let start = xs[0],
      end = start;
    const flush = () => fill.push(`M${start} ${y}h${end - start + 1}v1h${-(end - start + 1)}Z`);
    for (let index = 1; index < xs.length; index++) {
      if (xs[index] === end + 1) end = xs[index];
      else {
        flush();
        start = end = xs[index];
      }
    }
    flush();
    for (const x of xs) {
      if (!cells.has(`${x},${y - 1}`)) outline.push(`M${x} ${y}h1`);
      if (!cells.has(`${x + 1},${y}`)) outline.push(`M${x + 1} ${y}v1`);
      if (!cells.has(`${x},${y + 1}`)) outline.push(`M${x} ${y + 1}h1`);
      if (!cells.has(`${x - 1},${y}`)) outline.push(`M${x} ${y}v1`);
    }
  }
  return { fill: fill.join(''), outline: outline.join('') };
}
