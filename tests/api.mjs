import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'test-results', `api-${Date.now()}`);
await mkdir(dataDir, { recursive: true });
let failModel = false;
let sawImage = false;
const mock = http.createServer(async (req, res) => {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw);
  assert.equal(req.url, '/v1/chat/completions');
  assert.equal(req.headers.authorization, 'Bearer test-only-key');
  if (failModel) {
    res.writeHead(401);
    res.end('{}');
    return;
  }
  const image = Array.isArray(body.messages[1].content);
  if (image) {
    assert.ok(body.messages[1].content[1].image_url.url.startsWith('data:image/jpeg;base64,'));
    sawImage = true;
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify(
              image
                ? { candidates: [{ name: '新鲜菠菜', category: 'vegetables', score: 0.92 }] }
                : {
                    categories: ['vegetables'],
                    min: null,
                    max: 5,
                    productIds: [],
                    leafy: true,
                    sort: 'price',
                    relevant: true,
                  },
            ),
          },
        },
      ],
    }),
  );
});
await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
const modelPort = mock.address().port;
const env = {
  ...process.env,
  PORT: '3197',
  HOST: '127.0.0.1',
  DATA_DIR: dataDir,
  AI_BASE_URL: `http://127.0.0.1:${modelPort}/v1`,
  AI_API_KEY: 'test-only-key',
  AI_MODEL: 'test-vision',
};
const launch = () =>
  spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
let server;
const base = 'http://127.0.0.1:3197';
const waitReady = async () => {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`${base}/api/status`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw Error('test API failed to start');
};
const request = async (url, body, method = 'POST') =>
  fetch(`${base}/api${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const stop = async (child) => {
  if (!child || child.exitCode !== null) return;
  const closed = new Promise((resolve) => child.once('exit', resolve));
  child.kill();
  await closed;
};
try {
  server = launch();
  await waitReady();
  const response = await request('/chat', { message: '五元以内的绿叶蔬菜' });
  const guide = await response.json();
  assert.equal(guide.engine, 'model');
  assert.deepEqual(
    guide.products.map((p) => p.id),
    ['bokchoy', 'spinach'],
  );
  const form = new FormData();
  form.append(
    'image',
    new Blob([await readFile('public/images/spinach.jpg')], { type: 'image/jpeg' }),
    'vegetable.jpg',
  );
  const vision = await (await fetch(`${base}/api/vision`, { method: 'POST', body: form })).json();
  assert.equal(vision.candidates[0].category, 'vegetables');
  assert.equal(vision.candidates[0].productId, 'spinach');
  assert.ok(sawImage);
  assert.ok((await fetch(`${base}${vision.image}`)).ok);
  const invalid = new FormData();
  invalid.append('image', new Blob(['not an image'], { type: 'image/jpeg' }), 'bad.jpg');
  assert.equal((await fetch(`${base}/api/vision`, { method: 'POST', body: invalid })).status, 400);
  failModel = true;
  const fallback = await (await request('/chat', { message: '五元以内的绿叶蔬菜' })).json();
  assert.equal(fallback.engine, 'rules');
  assert.ok(fallback.fallback);
  const denied = await fetch(`${base}/api/vision`, { method: 'POST', body: form });
  assert.equal(denied.status, 502);
  assert.ok((await denied.json()).error.includes('密钥'));
  const newProduct = {
    name: 'API 测试菠菜',
    category: 'vegetables',
    price: 5.2,
    unit: '500g',
    stock: 20,
    shelf: 'A-01',
    source: 'manual',
    image: vision.image,
  };
  const created = await request('/products', newProduct);
  assert.equal(created.status, 201);
  const product = await created.json();
  const updated = await request(`/products/${product.id}`, { ...newProduct, price: 6.2 }, 'PATCH');
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).history.length, 2);
  assert.equal((await request('/products', { ...newProduct, price: -1 })).status, 400);
  assert.equal((await request('/products', { ...newProduct, shelf: 'C-01' })).status, 400);
  await stop(server);
  server = launch();
  await waitReady();
  const products = await (await fetch(`${base}/api/products`)).json();
  assert.equal(products.find((p) => p.id === product.id).price, 6.2);
  console.log(
    'PASS: model chat, image request/recognition/upload, invalid image, model failure fallback, credential error, CRUD validation, price history, database restart persistence.',
  );
} finally {
  await stop(server);
  await new Promise((resolve) => mock.close(resolve));
}
