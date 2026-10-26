import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { placementOf, planProductDrop, unplaced, type PlacementChange } from '../shared/placement';
import {
  shelfGeometry,
  type ShelfLayoutAction,
  type ShelfLayoutResult,
} from '../shared/shelf-move';
import { shelfVersion, type ShelfBatchAction, type ShelfBatchUndo } from '../shared/shelf-batch';
import type { Product, Shelf } from '../shared/types';

test('陈列实际HTTP：移动、满层交换、替换、撤销、并发冲突、原子拒绝与货架通道检查', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'qinghe-placement-http-'));
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const address = probe.address();
  assert.ok(address && typeof address === 'object');
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  const endpoint = `http://127.0.0.1:${address.port}`;
  const child = spawn(process.execPath, ['--import', 'tsx', 'tests/fixtures/placement-server.ts'], {
    env: {
      ...process.env,
      DATA_DIR: directory,
      PORT: String(address.port),
      HOST: '127.0.0.1',
      DOTENV_CONFIG_PATH: path.join(directory, 'no-env'),
      AI_PROVIDER: 'deepseek',
      AI_PROXY_URL: '',
      AI_API_KEY: '',
      AI_BASE_URL: '',
      GEMINI_API_KEY: '',
      GEMINI_BASE_URL: '',
      DEEPSEEK_API_KEY: '',
      DEEPSEEK_BASE_URL: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  const request = async (route: string, body?: unknown, method = 'POST') => {
    const response = await fetch(`${endpoint}/api${route}`, {
      method: body === undefined ? 'GET' : method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    return { status: response.status, body: await response.json() };
  };
  const products = async () => (await request('/products')).body as Product[];
  const shelves = async () => (await request('/shelves')).body as Shelf[];
  const send = async (changes: PlacementChange[]) =>
    request('/merchandising/placements', { changes });
  const drop = async (id: string, shelfId: string, shelfSlot: number, shelfLevel = 1) =>
    send(
      planProductDrop(
        id,
        { shelfId, shelfSide: 'front', shelfLevel, shelfSlot },
        await products(),
        await shelves(),
      ),
    );
  const expected = (shelf: Shelf) => ({
    footprint: shelf.footprint,
    sectionId: shelf.sectionId,
    accessPoints: shelf.accessPoints,
  });
  const layout = async (shelf: Shelf, action: ShelfLayoutAction, rows?: Product[]) =>
    request(
      `/shelves/${shelf.id}/layout`,
      {
        expected: { geometry: shelfGeometry(shelf), revision: shelf.layoutRevision || 0 },
        action,
        expectedProducts: (rows || (await products()))
          .filter((product) => product.status !== 'archived' && product.shelfId === shelf.id)
          .map((product) => ({ id: product.id, placement: placementOf(product) })),
      },
      'PATCH',
    );
  const undoLayout = async (result: ShelfLayoutResult) =>
    request(
      `/shelves/${result.shelf.id}/layout`,
      {
        expected: {
          geometry: shelfGeometry(result.shelf),
          revision: result.shelf.layoutRevision || 0,
        },
        expectedProducts: result.expectedProducts,
        action: { type: 'restore', ...result.undo },
      },
      'PATCH',
    );
  const shelfBatch = async (ids: string[], action: ShelfBatchAction) => {
    const rows = await shelves(),
      all = await products();
    return request('/shelves/batch', {
      expected: rows.filter((shelf) => ids.includes(shelf.id)).map(shelfVersion),
      expectedProducts: all
        .filter(
          (product) =>
            product.status !== 'archived' && product.shelfId && ids.includes(product.shelfId),
        )
        .map((product) => ({ id: product.id, placement: placementOf(product) })),
      action,
    });
  };
  const undoShelfBatch = (undo: ShelfBatchUndo) => request('/shelves/batch', undo);
  try {
    let ready = false;
    for (let index = 0; index < 100; index++) {
      if (child.exitCode !== null) break;
      try {
        ready = (await request('/status')).status === 200;
        if (ready) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, output);
    await t.test('模型禁用且只使用临时夹具数据', async () => {
      assert.equal((await request('/status')).body.ai, false);
      assert.equal((await products()).length, 6);
    });
    await t.test('移到空格后刷新保留空位，撤销恢复原位置', async () => {
      const response = await drop('a', 'rack-a', 1, 2);
      assert.equal(response.status, 200, JSON.stringify(response.body));
      assert.equal((await products()).find((p) => p.id === 'a')?.shelfSlot, 1);
      assert.equal((await products()).find((p) => p.id === 'a')?.shelfLevel, 2);
      assert.equal((await products()).find((p) => p.id === 'b')?.shelfSlot, 1);
      assert.equal((await send(response.body.undo)).status, 200);
    });
    await t.test('满层互换一次提交成功，重复撤销请求会因旧位置冲突拒绝', async () => {
      const response = await drop('a', 'rack-b', 0);
      assert.equal(response.status, 200, JSON.stringify(response.body));
      const all = await products();
      assert.equal(all.find((p) => p.id === 'a')?.shelfId, 'rack-b');
      assert.equal(all.find((p) => p.id === 'c')?.shelfId, 'rack-a');
      assert.equal((await send(response.body.undo)).status, 200);
      assert.equal((await send(response.body.undo)).status, 409);
    });
    await t.test('待摆放替换，原商品移回待摆放；撤销恢复两件商品', async () => {
      const before = await products();
      const response = await drop('new', 'rack-b', 0);
      assert.equal(response.status, 200, JSON.stringify(response.body));
      const all = await products();
      assert.deepEqual(placementOf(all.find((p) => p.id === 'c')!), unplaced());
      assert.equal(all.find((p) => p.id === 'new')?.shelfId, 'rack-b');
      assert.equal((await send(response.body.undo)).status, 200);
      assert.deepEqual(await products(), before);
    });
    await t.test('冷冻商品换到普通货架会整单拒绝，其他商品不丢位置', async () => {
      const before = await products();
      const response = await drop('frozen', 'rack-a', 0);
      assert.equal(response.status, 409);
      assert.match(response.body.error, /冷冻/);
      assert.deepEqual(await products(), before);
    });
    await t.test('直接覆盖占用格位被拒绝，价格库存和陈列均不修改', async () => {
      const before = await products();
      const source = before.find((p) => p.id === 'a')!;
      const response = await send([
        {
          id: 'a',
          expected: placementOf(source),
          target: { shelfId: 'rack-b', shelfSide: 'front', shelfLevel: 1, shelfSlot: 0 },
        },
      ]);
      assert.equal(response.status, 409);
      assert.deepEqual(await products(), before);
    });
    await t.test('越界格位、重复商品和过期位置请求拒绝', async () => {
      const all = await products(),
        a = all.find((p) => p.id === 'a')!;
      const change = {
        id: 'a',
        expected: placementOf(a),
        target: { shelfId: 'rack-b', shelfSide: 'front' as const, shelfLevel: 1, shelfSlot: 20 },
      };
      assert.equal((await send([change])).status, 400);
      assert.equal((await send([change, change])).status, 400);
      assert.equal(
        (await send([{ ...change, expected: unplaced(), target: unplaced() }])).status,
        409,
      );
      assert.deepEqual(await products(), all);
    });
    await t.test('移回待摆放后撤销，其他业务字段保持不变', async () => {
      const before = await products(),
        ss = await shelves();
      const response = await send(planProductDrop('a', unplaced(), before, ss));
      assert.equal(response.status, 200);
      assert.equal((await products()).find((p) => p.id === 'a')?.shelfId, undefined);
      assert.equal((await send(response.body.undo)).status, 200);
      assert.deepEqual(await products(), before);
    });
    await t.test('移动货架同步到达点，商品引用和原有业务数据保持，支持撤销', async () => {
      const before = (await shelves()).find((s) => s.id === 'rack-a')!;
      const oldProducts = await products();
      const moved = await request(
        '/shelves/rack-a/position',
        { x: 4, y: 2, expected: expected(before) },
        'PATCH',
      );
      assert.equal(moved.status, 200, JSON.stringify(moved.body));
      assert.deepEqual(moved.body.accessPoints.front, { x: 4, y: 4 });
      assert.deepEqual(await products(), oldProducts);
      const stale = await request(
        '/shelves/rack-a/position',
        { x: 3, y: 2, expected: expected(before) },
        'PATCH',
      );
      assert.equal(stale.status, 409);
      assert.equal(
        (
          await request(
            '/shelves/rack-a/position',
            { x: 2, y: 2, expected: expected(moved.body) },
            'PATCH',
          )
        ).status,
        200,
      );
    });
    await t.test('货架重叠、侵占通道、挡其他取货点、超界均不保存', async () => {
      const before = (await shelves()).find((s) => s.id === 'rack-a')!;
      for (const [x, y] of [
        [6, 2],
        [10, 2],
        [5, 4],
        [67, 2],
      ]) {
        const result = await request(
          '/shelves/rack-a/position',
          { x, y, expected: expected(before) },
          'PATCH',
        );
        assert.equal(result.status, 409, JSON.stringify(result.body));
      }
      assert.deepEqual(
        (await shelves()).find((s) => s.id === 'rack-a'),
        before,
      );
    });
    await t.test('缩减容量不能挤掉已经保存的格位', async () => {
      const shelf = (await shelves()).find((s) => s.id === 'rack-a')!;
      const response = await request(
        '/shelves/rack-a',
        { ...shelf, id: undefined, capacityPerSlot: 1 },
        'PATCH',
      );
      assert.equal(response.status, 409);
    });

    await t.test('90度旋转原子更新取货侧及商品，库存价格和格位不变，可撤销', async () => {
      const before = (await shelves()).find((item) => item.id === 'rack-a')!;
      const original = await products();
      const result = await layout(before, { type: 'rotate', direction: 'cw' });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.shelf.rotation, 90);
      assert.deepEqual(result.body.shelf.accessPoints, { left: { x: 1, y: 2 } });
      for (const item of (await products()).filter((item) => item.shelfId === before.id)) {
        assert.equal(item.shelfSide, 'left');
        assert.equal(item.price, 12);
        assert.equal(item.stock, 7);
        assert.equal(item.shelfSlot, original.find((product) => product.id === item.id)?.shelfSlot);
      }
      assert.equal((await undoLayout(result.body)).status, 200);
      assert.deepEqual(await products(), original);
      assert.deepEqual(
        shelfGeometry((await shelves()).find((item) => item.id === before.id)!),
        shelfGeometry(before),
      );
    });
    await t.test('连续顺逆时针旋转按90度步进，旧版本请求不会重复旋转', async () => {
      const before = (await shelves()).find((item) => item.id === 'rack-a')!;
      const clockwise = await layout(before, { type: 'rotate', direction: 'cw' });
      assert.equal(clockwise.status, 200);
      assert.equal((await layout(before, { type: 'rotate', direction: 'cw' })).status, 409);
      const inverse = await layout(clockwise.body.shelf, { type: 'rotate', direction: 'ccw' });
      assert.equal(inverse.status, 200, JSON.stringify(inverse.body));
      assert.equal(inverse.body.shelf.rotation, before.rotation || 0);
      assert.deepEqual(inverse.body.shelf.accessPoints, before.accessPoints);
    });
    await t.test('框选矩形保存后到达点更新，原有层数容量和商品不变，支持撤销', async () => {
      const before = (await shelves()).find((item) => item.id === 'rack-a')!,
        original = await products();
      const result = await layout(before, {
        type: 'resize',
        footprint: { x: 3, y: 2, w: 2, h: 3 },
      });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.deepEqual(result.body.shelf.footprint, { x: 3, y: 2, w: 2, h: 3 });
      assert.deepEqual(result.body.shelf.accessPoints.front, { x: 3, y: 5 });
      assert.equal(result.body.shelf.levels, 2);
      assert.equal(result.body.shelf.capacityPerSlot, 2);
      assert.deepEqual(await products(), original);
      assert.equal((await undoLayout(result.body)).status, 200);
      assert.deepEqual(
        shelfGeometry((await shelves()).find((item) => item.id === 'rack-a')!),
        shelfGeometry(before),
      );
    });
    await t.test('自定义占地拒绝重叠、挡路、零面积和超限，货架和商品均不部分保存', async () => {
      const before = (await shelves()).find((item) => item.id === 'rack-a')!,
        original = await products();
      for (const footprint of [
        { x: 6, y: 2, w: 2, h: 2 },
        { x: 10, y: 2, w: 2, h: 2 },
        { x: 5, y: 4, w: 2, h: 2 },
        { x: 2, y: 2, w: 0, h: 2 },
        { x: 2, y: 2, w: 17, h: 2 },
      ]) {
        const result = await layout(before, { type: 'resize', footprint });
        assert.ok([400, 409].includes(result.status), JSON.stringify(result.body));
      }
      assert.deepEqual(
        (await shelves()).find((item) => item.id === 'rack-a'),
        before,
      );
      assert.deepEqual(await products(), original);
    });
    await t.test('商品位置在预览后改变会拒绝旋转，不能覆盖新摆放结果', async () => {
      const before = (await shelves()).find((item) => item.id === 'rack-a')!,
        original = await products();
      const moved = await drop('a', 'rack-a', 1, 2);
      assert.equal(moved.status, 200);
      assert.equal(
        (await layout(before, { type: 'rotate', direction: 'cw' }, original)).status,
        409,
      );
      assert.deepEqual(
        (await shelves()).find((item) => item.id === 'rack-a'),
        before,
      );
      assert.equal((await products()).find((item) => item.id === 'a')?.shelfLevel, 2);
      assert.equal((await send(moved.body.undo)).status, 200);
    });
    await t.test('不完整的撤销商品快照被拒绝，货架保持当前旋转结果', async () => {
      const before = (await shelves()).find((item) => item.id === 'rack-a')!;
      const result = await layout(before, { type: 'rotate', direction: 'cw' });
      assert.equal(result.status, 200);
      const broken = {
        ...result.body,
        undo: { ...result.body.undo, placements: result.body.undo.placements.slice(1) },
      };
      assert.equal((await undoLayout(broken)).status, 409);
      assert.equal((await shelves()).find((item) => item.id === 'rack-a')?.rotation, 90);
      assert.equal((await undoLayout(result.body)).status, 200);
    });

    await t.test('37号同类两层冷冻柜可以向上移动并原位撤销，层数保持2层', async () => {
      const before = (await shelves()).find((item) => item.id === 'cold-rack')!;
      assert.equal(before.levels, 2);
      const original = await products();
      const moved = await request(
        '/shelves/cold-rack/position',
        { x: before.footprint!.x, y: before.footprint!.y - 1, expected: expected(before) },
        'PATCH',
      );
      assert.equal(moved.status, 200, JSON.stringify(moved.body));
      assert.equal(moved.body.levels, 2);
      assert.deepEqual(moved.body.accessPoints.front, { x: 2, y: 6 });
      assert.deepEqual(await products(), original);
      assert.equal(
        (
          await request(
            '/shelves/cold-rack/position',
            { x: before.footprint!.x, y: before.footprint!.y, expected: expected(moved.body) },
            'PATCH',
          )
        ).status,
        200,
      );
    });
    await t.test('两层冷冻柜第二层可安放冷冻商品，设施编辑不强制降为单层', async () => {
      const original = await products();
      const placed = await drop('frozen', 'cold-rack', 1, 2);
      assert.equal(placed.status, 200, JSON.stringify(placed.body));
      const shelf = (await shelves()).find((item) => item.id === 'cold-rack')!;
      const edited = await request('/shelves/cold-rack', { ...shelf, id: undefined }, 'PATCH');
      assert.equal(edited.status, 200, JSON.stringify(edited.body));
      assert.equal(edited.body.levels, 2);
      assert.equal((await products()).find((item) => item.id === 'frozen')?.shelfLevel, 2);
      assert.equal((await send(placed.body.undo)).status, 200);
      assert.deepEqual(await products(), original);
    });
    await t.test('两层服饰挂架支持第二层商品、单架调整与撤销，设施编辑保留两层', async () => {
      const created = await request('/shelves', {
        id: 'clothing-rack', name: '服饰挂架', sectionId: 'other-zone', kind: 'hanging-rack',
        levels: 2, capacityPerSlot: 2, reachable: true,
        footprint: { x: 23, y: 3, w: 1, h: 4 },
        accessPoints: { left: { x: 22, y: 4 } }, position: { x: 22, y: 4 },
      });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      const placed = await send(planProductDrop('new', {
        shelfId: 'clothing-rack', shelfSide: 'left', shelfLevel: 2, shelfSlot: 0,
      }, await products(), await shelves()));
      assert.equal(placed.status, 200, JSON.stringify(placed.body));
      const original = (await products()).find((p) => p.id === 'new')!;
      const before = (await shelves()).find((s) => s.id === 'clothing-rack')!;
      const moved = await request('/shelves/clothing-rack/position', {
        x: 23, y: 2, expected: expected(before),
      }, 'PATCH');
      assert.equal(moved.status, 200, JSON.stringify(moved.body));
      assert.equal(moved.body.levels, 2);
      const edited = await request('/shelves/clothing-rack', { ...moved.body, id: undefined }, 'PATCH');
      assert.equal(edited.status, 200, JSON.stringify(edited.body));
      assert.equal(edited.body.levels, 2);
      for (const direction of ['cw', 'ccw'] as const) {
        const shelf = (await shelves()).find((s) => s.id === 'clothing-rack')!;
        const turned = await layout(shelf, { type: 'rotate', direction });
        assert.equal(turned.status, 200, JSON.stringify(turned.body));
        assert.equal(turned.body.shelf.levels, 2);
        assert.equal((await products()).find((p) => p.id === 'new')?.shelfLevel, 2);
        assert.equal((await undoLayout(turned.body)).status, 200);
      }
      const shelf = (await shelves()).find((s) => s.id === 'clothing-rack')!;
      const resized = await layout(shelf, {
        type: 'resize', footprint: { x: 23, y: 2, w: 2, h: 3 },
      });
      assert.equal(resized.status, 200, JSON.stringify(resized.body));
      assert.equal(resized.body.shelf.levels, 2);
      assert.equal((await undoLayout(resized.body)).status, 200);
      const after = (await products()).find((p) => p.id === 'new')!;
      assert.deepEqual(placementOf(after), placementOf(original));
      assert.equal(after.price, original.price);
      assert.equal(after.stock, original.stock);
      assert.equal((await send(placed.body.undo)).status, 200);
    });
    await t.test('两层挂架与普通货架组合可整组移动、撤销和分拆，碰撞仍整组拒绝', async () => {
      const ids = ['rack-a', 'clothing-rack'];
      const group = await shelfBatch(ids, { type: 'group' });
      assert.equal(group.status, 200, JSON.stringify(group.body));
      const moved = await shelfBatch(ids, { type: 'move', dx: 0, dy: 1 });
      assert.equal(moved.status, 200, JSON.stringify(moved.body));
      assert.equal(moved.body.shelves.find((s: Shelf) => s.id === 'clothing-rack')?.levels, 2);
      const snapshot = (await shelves()).filter((s) => ids.includes(s.id));
      const rejected = await shelfBatch(ids, { type: 'move', dx: -2, dy: 0 });
      assert.equal(rejected.status, 409);
      assert.deepEqual((await shelves()).filter((s) => ids.includes(s.id)), snapshot);
      assert.equal((await undoShelfBatch(moved.body.undo)).status, 200);
      assert.equal((await undoShelfBatch(group.body.undo)).status, 409, '旧版本撤销仍拒绝');
      const ungroup = await shelfBatch(ids, { type: 'ungroup' });
      assert.equal(ungroup.status, 200);
      assert.ok((await shelves()).filter((s) => ids.includes(s.id)).every((s) => !s.groupId));
      const removed = await shelfBatch(['clothing-rack'], { type: 'delete' });
      assert.equal(removed.status, 200);
    });
    await t.test('单层设施误配多层、超出8层与减少已占用层仍拒绝，不以修复为由放开限制', async () => {
      for (const kind of ['produce-table', 'display-table', 'service-counter', 'seafood-tank']) {
        const created = await request('/shelves', {
          id: `invalid-${kind}`, name: `无效${kind}`, sectionId: 'other-zone', kind, levels: 2,
          footprint: { x: 23, y: 3, w: 2, h: 2 },
          accessPoints: { front: { x: 23, y: 5 } }, position: { x: 23, y: 5 }, reachable: true,
        });
        assert.equal(created.status, 400, JSON.stringify(created.body));
      }
      const before = (await shelves()).find((s) => s.id === 'rack-a')!;
      const placed = await drop('new', 'rack-a', 0, 2);
      assert.equal(placed.status, 200);
      for (const levels of [0, 1, 9]) {
        const result = await request('/shelves/rack-a', { ...before, id: undefined, levels }, 'PATCH');
        assert.ok([400, 409].includes(result.status), JSON.stringify(result.body));
        assert.equal((await shelves()).find((s) => s.id === 'rack-a')?.levels, 2);
      }
      assert.equal((await send(placed.body.undo)).status, 200);
    });
    await t.test('跨入其他分区后仍可旋转和框选占地，商品和归类保持不变', async () => {
      const before = (await shelves()).find((item) => item.id === 'rack-a')!;
      const moved = await request(
        '/shelves/rack-a/position',
        { x: 23, y: 3, expected: expected(before) },
        'PATCH',
      );
      assert.equal(moved.status, 200, JSON.stringify(moved.body));
      assert.equal(moved.body.sectionId, 'test-zone');
      const turned = await layout(moved.body, { type: 'rotate', direction: 'cw' });
      assert.equal(turned.status, 200, JSON.stringify(turned.body));
      const resized = await layout(turned.body.shelf, {
        type: 'resize',
        footprint: { x: 25, y: 3, w: 3, h: 2 },
      });
      assert.equal(resized.status, 200, JSON.stringify(resized.body));
      assert.equal(resized.body.shelf.sectionId, 'test-zone');
      assert.ok(
        (await products())
          .filter((item) => item.shelfId === 'rack-a')
          .every((item) => item.price === 12 && item.stock === 7),
      );
      assert.equal((await undoLayout(resized.body)).status, 200);
    });
    await t.test('设施管理新增和编辑也允许跨区，分区调整不再要求包含所关联货架', async () => {
      const created = await request('/shelves', {
        id: 'cross-zone-new',
        name: '跨区货架',
        sectionId: 'test-zone',
        kind: 'display-table',
        levels: 1,
        capacityPerSlot: 2,
        footprint: { x: 26, y: 6, w: 2, h: 1 },
        accessPoints: { front: { x: 26, y: 7 } },
        position: { x: 26, y: 7 },
        reachable: true,
      });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      const edited = await request(
        '/shelves/cross-zone-new',
        {
          ...created.body,
          id: undefined,
          footprint: { x: 26, y: 12, w: 2, h: 1 },
          accessPoints: { front: { x: 26, y: 13 } },
          position: { x: 26, y: 13 },
        },
        'PATCH',
      );
      assert.equal(edited.status, 200, JSON.stringify(edited.body));
      const section = await request(
        '/sections/test-zone',
        { name: '陈列测试区', active: true, location: { x: 3, y: 9 } },
        'PATCH',
      );
      assert.equal(section.status, 200, JSON.stringify(section.body));
      assert.deepEqual((await shelves()).find((item) => item.id === 'cross-zone-new')?.footprint, {
        x: 26,
        y: 12,
        w: 2,
        h: 1,
      });
    });

    await t.test(
      '组合保存成员，不能单独移动或旋转成员；整体移动保持相对位置并支持撤销',
      async () => {
        const ids = ['rack-a', 'rack-b'];
        const before = (await shelves()).filter((s) => ids.includes(s.id));
        const grouped = await shelfBatch(ids, { type: 'group' });
        assert.equal(grouped.status, 200, JSON.stringify(grouped.body));
        const gid = grouped.body.shelves[0].groupId;
        assert.ok(gid);
        assert.ok(grouped.body.shelves.every((s: Shelf) => s.groupId === gid));
        assert.equal((await shelfBatch(['rack-a'], { type: 'move', dx: 0, dy: 1 })).status, 409);
        const member = (await shelves()).find((s) => s.id === 'rack-a')!;
        assert.equal((await layout(member, { type: 'rotate', direction: 'cw' })).status, 409);
        assert.equal(
          (
            await request(
              '/shelves/rack-a/position',
              { x: member.footprint!.x, y: member.footprint!.y + 1, expected: expected(member) },
              'PATCH',
            )
          ).status,
          409,
        );
        const moved = await shelfBatch(ids, { type: 'move', dx: 0, dy: 1 });
        assert.equal(moved.status, 200, JSON.stringify(moved.body));
        for (const shelf of moved.body.shelves as Shelf[])
          assert.equal(shelf.footprint!.y, before.find((s) => s.id === shelf.id)!.footprint!.y + 1);
        assert.equal((await undoShelfBatch(moved.body.undo)).status, 200);
        for (const shelf of (await shelves()).filter((s) => ids.includes(s.id)))
          assert.deepEqual(
            shelfGeometry(shelf),
            shelfGeometry(before.find((s) => s.id === shelf.id)!),
          );
      },
    );
    await t.test('整体移动有一件碰撞时全部不保存，过期的分组快照不能覆盖新结果', async () => {
      const ids = ['rack-a', 'rack-b'],
        before = (await shelves()).filter((s) => ids.includes(s.id));
      const rejected = await shelfBatch(ids, { type: 'move', dx: 0, dy: 6 });
      assert.equal(rejected.status, 409);
      assert.deepEqual(
        (await shelves()).filter((s) => ids.includes(s.id)),
        before,
      );
      const ungroup = await shelfBatch(ids, { type: 'ungroup' });
      assert.equal(ungroup.status, 200);
      assert.ok((await shelves()).filter((s) => ids.includes(s.id)).every((s) => !s.groupId));
      assert.equal((await undoShelfBatch(ungroup.body.undo)).status, 200);
      assert.ok((await shelves()).filter((s) => ids.includes(s.id)).every((s) => !!s.groupId));
      assert.equal((await undoShelfBatch(ungroup.body.undo)).status, 409);
    });
    await t.test('删除保留商品但清除陈列，撤销不抢走后来移动的商品并可恢复原位', async () => {
      const ids = ['rack-a', 'rack-b'],
        original = await products(),
        allShelves = await shelves(),
        before = allShelves.filter((s) => ids.includes(s.id));
      const removed = await shelfBatch(ids, { type: 'delete' });
      assert.equal(removed.status, 200, JSON.stringify(removed.body));
      assert.ok((await shelves()).every((s) => !ids.includes(s.id)));
      for (const shelf of await shelves())
        assert.equal(
          shelf.mapNumber,
          allShelves.find((item) => item.id === shelf.id)?.mapNumber,
          '其他货架的地图编号不改变',
        );
      assert.equal(
        (await request('/shelves', { ...before[0] })).status,
        409,
        '删除后的编号仍保留，不能覆盖撤销记录',
      );
      assert.equal((await products()).length, original.length);
      for (const product of (await products()).filter((p) => ['a', 'b', 'c', 'd'].includes(p.id))) {
        assert.deepEqual(placementOf(product), unplaced());
        assert.equal(product.stock, 7);
        assert.equal(product.price, 12);
        assert.equal(product.manualPlacement, true);
      }
      const repurposed = await drop('a', 'cold-rack', 0);
      assert.equal(repurposed.status, 200, JSON.stringify(repurposed.body));
      assert.equal((await undoShelfBatch(removed.body.undo)).status, 409);
      assert.equal((await send(repurposed.body.undo)).status, 200);
      const restored = await undoShelfBatch(removed.body.undo);
      assert.equal(restored.status, 200, JSON.stringify(restored.body));
      for (const shelf of (await shelves()).filter((s) => ids.includes(s.id))) {
        const old = before.find((s) => s.id === shelf.id)!;
        assert.deepEqual(shelfGeometry(shelf), shelfGeometry(old));
        assert.equal(shelf.groupId, old.groupId);
      }
      for (const product of (await products()).filter((p) => ['a', 'b', 'c', 'd'].includes(p.id)))
        assert.deepEqual(
          placementOf(product),
          placementOf(original.find((p) => p.id === product.id)!),
        );
    });

    await t.test('停用货架删除后仍可撤销，停用状态与原商品位置保留', async () => {
      const placed = await drop('frozen', 'cold-rack', 1, 2);
      assert.equal(placed.status, 200);
      const before = (await shelves()).find((s) => s.id === 'cold-rack')!;
      const disabled = await request(
        '/shelves/cold-rack',
        { ...before, id: undefined, reachable: false },
        'PATCH',
      );
      assert.equal(disabled.status, 200);
      const removed = await shelfBatch(['cold-rack'], { type: 'delete' });
      assert.equal(removed.status, 200);
      const restored = await undoShelfBatch(removed.body.undo);
      assert.equal(restored.status, 200, JSON.stringify(restored.body));
      assert.equal((await shelves()).find((s) => s.id === 'cold-rack')?.reachable, false);
      assert.equal((await products()).find((p) => p.id === 'frozen')?.shelfId, 'cold-rack');
      assert.equal((await products()).find((p) => p.id === 'frozen')?.shelfLevel, 2);
    });
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await exited;
    await rm(directory, { recursive: true, force: true });
  }
});
