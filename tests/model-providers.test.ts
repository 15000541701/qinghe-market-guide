import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { configureNetworkProxy } from '../server/network-proxy';

const directory = mkdtempSync(path.join(tmpdir(), 'qinghe-models-'));
const variables = [
  'DATA_DIR',
  'AI_PROVIDER',
  'AI_BASE_URL',
  'AI_API_KEY',
  'AI_MODEL',
  'AI_PROXY_URL',
  'GEMINI_BASE_URL',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'DEEPSEEK_BASE_URL',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_MODEL',
];
const original = Object.fromEntries(variables.map((key) => [key, process.env[key]]));
process.env.DATA_DIR = directory;
const { getModelSettings, getModelConnection, saveModelSettings, modelSettingsSchema } =
  await import('../server/model-settings');
const { completion, aiConfigured, AiError, guide } = await import('../server/ai');
const realFetch = globalThis.fetch;
const savedFile = path.join(directory, 'model-settings.json');
const messages = [
  { role: 'system', content: '只返回 JSON' },
  { role: 'user', content: '查找商品' },
];

beforeEach(() => {
  for (const key of variables) delete process.env[key];
  process.env.DATA_DIR = directory;
  rmSync(savedFile, { force: true });
  globalThis.fetch = async () => {
    throw new Error('Tests must not contact a real model');
  };
});

after(() => {
  globalThis.fetch = realFetch;
  for (const key of variables) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
  rmSync(directory, { recursive: true, force: true });
});

test('旧 Gemini 配置保留；迁移时 DeepSeek 默认值不会被旧保存文件覆盖', () => {
  process.env.AI_BASE_URL = 'https://legacy.invalid/v1';
  process.env.AI_API_KEY = 'legacy-key';
  process.env.AI_MODEL = 'gemini-2.5-flash';
  writeFileSync(
    savedFile,
    JSON.stringify({ model: 'gemini-3.1-flash-lite-preview', visionModel: 'old' }),
  );
  assert.deepEqual(getModelSettings(), {
    provider: 'gemini',
    model: 'gemini-3.1-flash-lite-preview',
  });
  assert.equal(getModelConnection().apiKey, 'legacy-key');
  process.env.AI_PROVIDER = 'deepseek';
  assert.deepEqual(getModelSettings(), { provider: 'deepseek', model: 'deepseek-flash' });
  assert.equal(aiConfigured(), false, '不能把 Gemini 密钥当作 DeepSeek 密钥');
  saveModelSettings({ provider: 'gemini', model: 'gemini-3.1-flash-lite-preview' });
  assert.equal(getModelSettings().provider, 'gemini', '界面保存后应能切回 Gemini');
});

test('不混合新旧端点与密钥；切换服务商保持各自凭据', () => {
  process.env.AI_BASE_URL = 'https://legacy.invalid/v1';
  process.env.AI_API_KEY = 'legacy-key';
  process.env.GEMINI_BASE_URL = 'https://gemini.invalid/v1';
  process.env.GEMINI_MODEL = 'gemini-2.5-flash';
  assert.equal(aiConfigured(), false, '新端点缺密钥时不能借用旧密钥');
  process.env.GEMINI_API_KEY = 'gemini-key';
  process.env.DEEPSEEK_API_KEY = 'deepseek-key';
  saveModelSettings({ provider: 'gemini', model: 'gemini-2.5-flash' });
  assert.equal(getModelConnection().apiKey, 'gemini-key');
  saveModelSettings({ provider: 'deepseek', model: 'deepseek-flash' });
  assert.equal(getModelConnection().baseUrl, 'https://api.deepseek.com');
  assert.equal(getModelConnection().apiKey, 'deepseek-key');
  saveModelSettings({ provider: 'gemini', model: 'gemini-2.5-flash' });
  assert.equal(getModelConnection().baseUrl, 'https://gemini.invalid/v1');
});

test('拒绝跨服务商模型及未知字段，并兼容旧版仅含 model 的请求', () => {
  assert.equal(
    modelSettingsSchema.safeParse({ provider: 'deepseek', model: 'gemini-2.5-flash' }).success,
    false,
  );
  assert.equal(
    modelSettingsSchema.safeParse({ provider: 'gemini', model: 'deepseek-flash' }).success,
    false,
  );
  assert.equal(
    modelSettingsSchema.safeParse({ provider: 'other', model: 'deepseek-flash' }).success,
    false,
  );
  assert.equal(
    modelSettingsSchema.safeParse({ model: 'deepseek-flash', apiKey: 'secret' }).success,
    false,
  );
  assert.deepEqual(modelSettingsSchema.parse({ model: 'deepseek-flash' }), {
    provider: 'deepseek',
    model: 'deepseek-flash',
  });
});

test('DeepSeek 文字和图片请求使用正确端点、密钥及 JSON/非思考参数', async () => {
  process.env.AI_PROVIDER = 'deepseek';
  process.env.DEEPSEEK_BASE_URL = 'https://deepseek.invalid/';
  process.env.DEEPSEEK_API_KEY = 'deepseek-test-only';
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    calls++;
    assert.equal(String(input), 'https://deepseek.invalid/chat/completions');
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      'Bearer deepseek-test-only',
    );
    const body = JSON.parse(init?.body as string);
    assert.equal(body.model, 'deepseek-flash');
    assert.deepEqual(body.thinking, { type: 'disabled' });
    assert.deepEqual(body.response_format, { type: 'json_object' });
    if (calls === 2) {
      assert.equal(body.max_tokens, 18000, '保留周期菜谱的输出长度');
      assert.equal(body.messages[1].content[1].image_url.url, 'data:image/jpeg;base64,aW1hZ2U=');
    }
    return Response.json({ choices: [{ message: { content: '{"ok":true}' } }] });
  };
  assert.deepEqual(await completion(messages), { ok: true });
  const imageMessages = [
    messages[0],
    {
      role: 'user',
      content: [
        { type: 'text', text: '识别商品并返回 JSON' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,aW1hZ2U=' } },
      ],
    },
  ];
  await completion(imageMessages, true, 18000, 0.65);
  assert.equal(calls, 2);
});

test('Gemini 保持现有请求格式，完整接口后缀不会重复拼接', async () => {
  process.env.GEMINI_BASE_URL = 'https://gemini.invalid/v1/chat/completions/';
  process.env.GEMINI_API_KEY = 'gemini-test-only';
  process.env.GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://gemini.invalid/v1/chat/completions');
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      'Bearer gemini-test-only',
    );
    const body = JSON.parse(init?.body as string);
    assert.equal(body.model, 'gemini-3.1-flash-lite-preview');
    assert.equal(body.thinking, undefined);
    assert.equal(body.response_format, undefined);
    return Response.json({ choices: [{ message: { content: '```json\n{"ok":true}\n```' } }] });
  };
  assert.deepEqual(await completion(messages), { ok: true });
});

test('缺少 DeepSeek 密钥及 Pro 图片请求在本地拦截，不发送请求', async () => {
  process.env.AI_PROVIDER = 'deepseek';
  process.env.GEMINI_API_KEY = 'do-not-use';
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw Error();
  };
  await assert.rejects(
    completion(messages),
    (error: unknown) => error instanceof AiError && error.status === 503,
  );
  process.env.DEEPSEEK_API_KEY = 'test-only';
  saveModelSettings({ provider: 'deepseek', model: 'deepseek-v4-pro' });
  await assert.rejects(completion(messages, true), /仅支持文字/);
  assert.equal(called, false);
});

test('无效地址、鉴权失败、限流和格式错误保留可操作提示与规则降级', async () => {
  process.env.AI_PROVIDER = 'deepseek';
  process.env.DEEPSEEK_API_KEY = 'test-only';
  process.env.DEEPSEEK_BASE_URL = 'bad-url';
  await assert.rejects(completion(messages), /地址格式无效/);
  process.env.DEEPSEEK_BASE_URL = 'https://deepseek.invalid';
  for (const [status, pattern] of [
    [401, /拒绝访问/],
    [402, /余额不足/],
    [429, /额度或请求频率/],
  ] as const) {
    globalThis.fetch = async () => new Response('{}', { status });
    await assert.rejects(completion(messages), pattern);
  }
  globalThis.fetch = async () =>
    Response.json({ choices: [{ message: { content: 'incomplete json {' } }] });
  await assert.rejects(completion(messages), /格式无法解析/);
  globalThis.fetch = async () => new Response('{}', { status: 401 });
  const response = await guide('找菠菜', []);
  assert.equal(response.engine, 'rules');
  assert.match(response.fallback || '', /规则匹配/);
  assert.match(response.fallback || '', /拒绝访问/, '向用户展示具体原因而不是笼统不可用');
});

test('显式代理通过本地 CONNECT 转发请求，回环接口绕过代理', async () => {
  let tunnels = 0;
  const proxy = createHttpServer();
  proxy.on('connect', (request, socket) => {
    tunnels++;
    assert.equal(request.url, 'deepseek.invalid:80');
    socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    socket.once('data', () => {
      const body = '{"ok":true}';
      socket.end(
        `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n${body}`,
      );
    });
  });
  const local = createHttpServer((_request, response) => response.end('local-ok'));
  await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  await new Promise<void>((resolve) => local.listen(0, '127.0.0.1', resolve));
  const proxyAddress = proxy.address();
  const localAddress = local.address();
  assert.ok(proxyAddress && typeof proxyAddress === 'object');
  assert.ok(localAddress && typeof localAddress === 'object');
  process.env.AI_PROXY_URL = `http://127.0.0.1:${proxyAddress.port}`;
  const restore = configureNetworkProxy();
  try {
    const response = await realFetch('http://deepseek.invalid/chat/completions', {
      signal: AbortSignal.timeout(3000),
    });
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(
      await (await realFetch(`http://127.0.0.1:${localAddress.port}`)).text(),
      'local-ok',
    );
    assert.equal(tunnels, 1, '只代理外部地址，本机接口不经过代理');
  } finally {
    restore();
    proxy.closeAllConnections();
    local.closeAllConnections();
    await Promise.all([
      new Promise<void>((resolve) => proxy.close(() => resolve())),
      new Promise<void>((resolve) => local.close(() => resolve())),
    ]);
  }
});

test('HTTP 设置接口拒绝错配，不返回密钥，并持久保存服务商选择', async () => {
  const childDirectory = path.join(directory, 'api');
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const address = probe.address();
  assert.ok(address && typeof address === 'object');
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  const endpoint = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    PORT: String(port),
    HOST: '127.0.0.1',
    DATA_DIR: childDirectory,
    DOTENV_CONFIG_PATH: path.join(directory, 'no-env-file'),
    AI_PROVIDER: 'deepseek',
    DEEPSEEK_BASE_URL: `${endpoint}/mock-deepseek`,
    DEEPSEEK_API_KEY: 'deepseek-fake-key',
    GEMINI_BASE_URL: `${endpoint}/mock-gemini`,
    GEMINI_API_KEY: 'gemini-fake-key',
  };
  let output = '';
  const launch = () => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout?.on('data', (data) => {
      output += data;
    });
    child.stderr?.on('data', (data) => {
      output += data;
    });
    return child;
  };
  const stop = async (child: ChildProcess) => {
    if (child.exitCode !== null) return;
    const closed = new Promise<void>((resolve) => child.once('exit', () => resolve()));
    child.kill();
    await closed;
  };
  const ready = async () => {
    for (let attempt = 0; attempt < 80; attempt++) {
      try {
        if ((await realFetch(`${endpoint}/api/status`)).ok) return;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`API did not start: ${output}`);
  };
  let child = launch();
  try {
    await ready();
    assert.deepEqual(await (await realFetch(`${endpoint}/api/model-settings`)).json(), {
      provider: 'deepseek',
      model: 'deepseek-flash',
    });
    const invalid = await realFetch(`${endpoint}/api/model-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'deepseek', model: 'gemini-2.5-flash' }),
    });
    assert.equal(invalid.status, 400);
    const selected = { provider: 'gemini', model: 'gemini-3.1-flash-lite-preview' };
    const saved = await realFetch(`${endpoint}/api/model-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected),
    });
    assert.equal(saved.status, 200);
    assert.deepEqual(await saved.json(), selected, '仅返回服务商和模型，不暴露密钥');
    await stop(child);
    child = launch();
    await ready();
    assert.deepEqual(await (await realFetch(`${endpoint}/api/model-settings`)).json(), selected);
  } finally {
    await stop(child);
  }
});
