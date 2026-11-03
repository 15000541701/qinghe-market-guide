import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { placementOf, unplaced } from '../shared/placement';
import type { Product } from '../shared/types';

async function start(presentation: boolean, context: TestContext) {
  const directory = await mkdtemp(path.join(tmpdir(), 'qinghe-demo-http-'));
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
  const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    env: {
      ...process.env,
      DATA_DIR: directory,
      PORT: String(address.port),
      HOST: '127.0.0.1',
      DOTENV_CONFIG_PATH: path.join(directory, 'no-env'),
      DEMO_PRESENTATION: presentation ? '1' : '',
      AI_PROVIDER: 'deepseek',
      AI_PROXY_URL: '',
      AI_API_KEY: '',
      AI_BASE_URL: '',
      GEMINI_API_KEY: '',
      GEMINI_BASE_URL: '',
      DEEPSEEK_API_KEY: '',
      DEEPSEEK_BASE_URL: '',
    },
    stdio: 'ignore',
  });
  let spawnFailed = false;
  child.on('error', () => {
    spawnFailed = true;
  });
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  context.after(async () => {
    if (child.exitCode === null && child.pid) {
      child.kill();
      const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
      await exited;
      clearTimeout(timer);
    }
    await rm(directory, { recursive: true, force: true });
  });
  const api = async (route: string, body?: unknown, method = 'POST') => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api${route}`, {
      method: body === undefined ? 'GET' : method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    return { status: response.status, body: await response.json() };
  };
  for (let attempt = 0; attempt < 150; attempt++) {
    if (spawnFailed || child.exitCode !== null) break;
    try {
      if ((await api('/status')).status === 200) return api;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('本地演示检查服务未能启动。');
}

test('普通门店不开放演示重置接口', async (context) => {
  const api = await start(false, context);
  assert.equal((await api('/status')).body.presentation, false);
  const before = (await api('/products')).body as Product[];
  assert.equal((await api('/demo/reset', {})).status, 404);
  assert.equal((await api('/demo/checkpoints', {})).status, 404);
  assert.equal((await api('/demo/checkpoints/unknown/restore', {})).status, 404);
  assert.deepEqual((await api('/products')).body, before);
});

test('独立演示门店重播恢复初始价格、库存、历史和陈列，重复重置保持一致', async (context) => {
  const api = await start(true, context);
  const status = (await api('/status')).body;
  assert.equal(status.presentation, true);
  assert.equal(status.ai, false);
  const original = ((await api('/products')).body as Product[]).find(
    (p) =>
      p.category === 'dairy' &&
      /whole milk/i.test(p.name) &&
      !/yogurt/i.test(p.name) &&
      p.status !== 'archived' &&
      p.shelfId &&
      p.name.length <= 60,
  )!;
  assert.ok(original);
  const originalProgress = (await api('/demo/checkpoints', {})).body.id;
  const updated = await api(
    `/products/${original.id}`,
    {
      name: original.name,
      category: original.category,
      price: original.price + 1,
      unit: original.unit,
      stock: 3,
      shelf: original.shelf,
      shelfId: original.shelfId,
      shelfSide: original.shelfSide,
      shelfLevel: original.shelfLevel,
      source: 'manual',
    },
    'PATCH',
  );
  assert.equal(updated.status, 200);
  const pricedProgress = (await api('/demo/checkpoints', {})).body.id;
  const removed = await api('/merchandising/placements', {
    changes: [{ id: original.id, expected: placementOf(updated.body), target: unplaced() }],
  });
  assert.equal(removed.status, 200);
  let rows = (await api('/products')).body as Product[];
  assert.equal(rows.find((p) => p.id === original.id)?.shelfId, undefined);
  const unplacedProgress = (await api('/demo/checkpoints', {})).body.id;
  assert.equal((await api(`/demo/checkpoints/${pricedProgress}/restore`, {})).status, 200);
  rows = (await api('/products')).body;
  assert.deepEqual(
    rows.find((p) => p.id === original.id),
    updated.body,
  );
  assert.equal((await api(`/demo/checkpoints/${unplacedProgress}/restore`, {})).status, 200);
  rows = (await api('/products')).body;
  assert.equal(rows.find((p) => p.id === original.id)?.shelfId, undefined);
  assert.equal(rows.find((p) => p.id === original.id)?.price, updated.body.price);
  assert.equal((await api(`/demo/checkpoints/${originalProgress}/restore`, {})).status, 200);
  rows = (await api('/products')).body;
  assert.deepEqual(
    rows.find((p) => p.id === original.id),
    original,
  );
  for (let iteration = 0; iteration < 2; iteration++) {
    assert.equal((await api('/demo/reset', {})).status, 200);
    rows = (await api('/products')).body as Product[];
    assert.deepEqual(
      rows.find((p) => p.id === original.id),
      original,
    );
  }
  assert.equal((await api(`/demo/checkpoints/${pricedProgress}/restore`, {})).status, 404);
});
