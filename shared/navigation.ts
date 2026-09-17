import { entrance, extraObstacles, zones } from './catalog';
import type { Category, Point, Route } from './types';

export function isWalkable(p: Point) {
  return (
    Number.isInteger(p.x) &&
    Number.isInteger(p.y) &&
    p.x >= 1 &&
    p.x <= 31 &&
    p.y >= 1 &&
    p.y <= 23 &&
    ![...zones.map((z) => z.rect), ...extraObstacles].some(
      (r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h,
    )
  );
}
export function findPath(start: Point, end: Point): Point[] {
  if (!isWalkable(start) || !isWalkable(end)) return [];
  const key = (p: Point) => `${p.x},${p.y}`;
  const queue = [start];
  const previous = new Map<string, Point | null>([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (key(p) === key(end)) {
      const path: Point[] = [];
      let current: Point | null = p;
      while (current) {
        path.unshift(current);
        current = previous.get(key(current)) || null;
      }
      return path;
    }
    for (const next of [
      { x: p.x + 1, y: p.y },
      { x: p.x - 1, y: p.y },
      { x: p.x, y: p.y + 1 },
      { x: p.x, y: p.y - 1 },
    ]) {
      if (isWalkable(next) && !previous.has(key(next))) {
        previous.set(key(next), p);
        queue.push(next);
      }
    }
  }
  return [];
}
export function buildRoute(targets: Category[], start = entrance): Route {
  const pending = [...new Set(targets)];
  const stops: Category[] = [];
  const points = [start];
  while (pending.length) {
    const paths = pending
      .map((id) => ({
        id,
        path: findPath(points.at(-1)!, zones.find((z) => z.id === id)!.location),
      }))
      .filter((x) => x.path.length);
    paths.sort((a, b) => a.path.length - b.path.length);
    if (!paths.length) break;
    const closest = paths[0];
    points.push(...closest.path.slice(1));
    stops.push(closest.id);
    pending.splice(pending.indexOf(closest.id), 1);
  }
  const distance = Math.max(0, points.length - 1) * 2;
  return { points, stops, distance, minutes: Math.max(1, Math.ceil(distance / 60)) };
}
export function routeInstructions(points: Point[]): string[] {
  const segments: { direction: string; length: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const direction =
      dx > 0 ? '向地图右侧' : dx < 0 ? '向地图左侧' : dy > 0 ? '向入口方向' : '向门店内侧';
    if (segments.at(-1)?.direction === direction) segments.at(-1)!.length += 2;
    else segments.push({ direction, length: 2 });
  }
  return segments.map((s) => `${s.direction}走 ${s.length} 米`);
}
