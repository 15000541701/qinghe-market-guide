import test from 'node:test';
import assert from 'node:assert/strict';
import { fitRouteCamera } from '../shared/map-camera';
import type { Point } from '../shared/types';

const route: Point[] = [
  { x: 15, y: 23 },
  { x: 15, y: 10 },
  { x: 55, y: 10 },
  { x: 55, y: 2 },
  { x: 2, y: 2 },
];
for (const [width, height] of [
  [1000, 300],
  [600, 280],
  [240, 280],
  [160, 180],
]) {
  test(`路线全貌适应 ${width}×${height} 视口，所有取货点和起点均在画面内`, () => {
    const camera = fitRouteCamera(route, width, height)!;
    assert.ok(camera.zoom > 0 && camera.zoom < 1);
    for (const point of route) {
      const x = (point.x + 0.5) * 28 * camera.zoom + camera.pan.x;
      const y = (point.y + 0.5) * 28 * camera.zoom + camera.pan.y;
      const marker = 10 * camera.zoom;
      assert.ok(x - marker >= 0 && x + marker <= width);
      assert.ok(y - marker >= 0 && y + marker <= height);
    }
    const boundsCenter = { x: ((2 + 55 + 1) / 2) * 28, y: ((2 + 23 + 1) / 2) * 28 };
    assert.ok(Math.abs(boundsCenter.x * camera.zoom + camera.pan.x - width / 2) < 1e-6);
    assert.ok(Math.abs(boundsCenter.y * camera.zoom + camera.pan.y - height / 2) < 1e-6);
  });
}
test('单点和直线路线没有除零；隐藏地图和空路线不产生无效相机', () => {
  for (const points of [
    [{ x: 20, y: 10 }],
    [
      { x: 20, y: 2 },
      { x: 20, y: 23 },
    ],
  ]) {
    const camera = fitRouteCamera(points, 600, 300)!;
    assert.ok(
      Number.isFinite(camera.zoom) &&
        Number.isFinite(camera.pan.x) &&
        Number.isFinite(camera.pan.y),
    );
  }
  assert.equal(fitRouteCamera([], 600, 300), null);
  assert.equal(fitRouteCamera(route, 0, 300), null);
});
