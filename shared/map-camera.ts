import type { Point } from './types';

/** Fit every route vertex, leaving room for the start/stop markers. */
export function fitRouteCamera(points: Point[], width: number, height: number, cell = 28) {
  if (!points.length || width <= 0 || height <= 0) return null;
  const padding = Math.min(36, width / 6, height / 6);
  const xs = points.map((point) => (point.x + 0.5) * cell);
  const ys = points.map((point) => (point.y + 0.5) * cell);
  const left = Math.min(...xs),
    right = Math.max(...xs);
  const top = Math.min(...ys),
    bottom = Math.max(...ys);
  const zoom = Math.min(
    1.35,
    (width - padding * 2) / Math.max(cell, right - left),
    (height - padding * 2) / Math.max(cell, bottom - top),
  );
  return {
    zoom,
    pan: {
      x: width / 2 - ((left + right) / 2) * zoom,
      y: height / 2 - ((top + bottom) / 2) * zoom,
    },
  };
}
