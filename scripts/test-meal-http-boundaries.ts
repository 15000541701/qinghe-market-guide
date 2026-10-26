import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import type { GuideResponse } from '../shared/types';

// Always start an isolated backend with no model credentials or user database.
// This script can safely run even when the development server has a live key.
const dataDirectory = await mkdtemp(path.join(tmpdir(), 'qinghe-meal-http-'));
const probe = createServer();
await new Promise<void>((resolve, reject) => {
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', resolve);
});
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
  DATA_DIR: dataDirectory,
  DOTENV_CONFIG_PATH: path.join(dataDirectory, 'no-env-file'),
  AI_PROVIDER: 'deepseek',
  AI_PROXY_URL: '',
  AI_API_KEY: '',
  GEMINI_API_KEY: '',
  DEEPSEEK_API_KEY: '',
  AI_BASE_URL: '',
  GEMINI_BASE_URL: '',
  DEEPSEEK_BASE_URL: '',
};
const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let startupOutput = '';
child.stdout.on('data', (data) => {
  startupOutput += data;
});
child.stderr.on('data', (data) => {
  startupOutput += data;
});
const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) break;
    try {
      ready = (await fetch(`${endpoint}/api/status`, { signal: AbortSignal.timeout(1000) })).ok;
      if (ready) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Isolated backend did not start: ${startupOutput}`);
  const directory = path.resolve(
    'outputs/meal-boundaries-2026-10-25',
    `http-offline-${Date.now()}`,
  );
  await mkdir(directory, { recursive: true });
  const cases = [
    ...[
      '0人晚餐',
      '-1人晚餐',
      '1.5人晚餐',
      '9人晚餐',
      '两个人吃15天',
      '两个人每天0餐',
      '两个人每天5餐',
      '两个人的晚餐预算-10美元',
    ].map((message, index) => ({
      id: `number-${index}`,
      body: { message, currency: 'USD', context: { cart: [] } },
      status: 200,
      clear: true,
    })),
    {
      id: 'currency',
      body: { message: '两个人的晚餐，预算人民币50元', currency: 'USD', context: { cart: [] } },
      status: 200,
      clear: true,
    },
    {
      id: 'allergy',
      body: { message: '花生过敏，请保证餐食安全', currency: 'USD', context: { cart: [] } },
      status: 200,
      clear: true,
    },
    {
      id: 'stale-cart',
      body: {
        message: '两个人的西式晚餐',
        currency: 'USD',
        context: { cart: [{ productId: 'gone-sku', quantity: 1, checked: false }] },
      },
      status: 200,
      clear: true,
    },
    {
      id: 'empty-message',
      body: { message: '', currency: 'USD', context: { cart: [] } },
      status: 400,
    },
    {
      id: 'oversized-message',
      body: { message: '晚餐'.repeat(401), currency: 'USD', context: { cart: [] } },
      status: 400,
    },
    { id: 'missing-context', body: { message: '两个人的西式晚餐', currency: 'USD' }, status: 400 },
    {
      id: 'negative-cart',
      body: {
        message: '两个人的西式晚餐',
        currency: 'USD',
        context: { cart: [{ productId: 'x', quantity: -1, checked: false }] },
      },
      status: 400,
    },
    {
      id: 'invalid-currency',
      body: { message: '两个人的西式晚餐', currency: 'EUR', context: { cart: [] } },
      status: 400,
    },
  ];
  const results: {
    id: string;
    passed: boolean;
    status: number;
    elapsedMs: number;
    result: unknown;
  }[] = [];
  for (const item of cases) {
    const started = Date.now();
    const response = await fetch(`${endpoint}/api/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.body),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    const passed =
      response.status === item.status &&
      !result.mealPlan &&
      !result.action &&
      (!('clear' in item) || result.clearMealPlan === true);
    results.push({
      id: item.id,
      passed,
      status: response.status,
      elapsedMs: Date.now() - started,
      result,
    });
  }
  const post = async (body: unknown) => {
    const response = await fetch(`${endpoint}/api/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    return { status: response.status, result: (await response.json()) as GuideResponse };
  };
  const sampleStarted = Date.now();
  const sample = await post({
    message: '两个人吃，预算50 USD，想搭配西式鱼餐和沙拉',
    currency: 'USD',
    context: { cart: [] },
  });
  const samplePlan = sample.result.mealPlan;
  results.push({
    id: 'offline-fish-salad',
    status: sample.status,
    elapsedMs: Date.now() - sampleStarted,
    passed:
      sample.status === 200 &&
      sample.result.engine === 'rules' &&
      !!sample.result.fallback &&
      samplePlan?.canApply === true &&
      samplePlan.total <= 50 &&
      samplePlan.recipes.some((recipe) => recipe.title.includes('沙拉')) &&
      !sample.result.action,
    result: sample.result,
  });
  if (samplePlan) {
    const context = {
      cart: [],
      meal: { ...samplePlan.preferences, budget: samplePlan.total },
      recipeIds: samplePlan.recipes.map((recipe) => recipe.id),
    };
    for (const [id, budget, expectedApply] of [
      ['exact-budget', samplePlan.total, true],
      ['one-cent-below', Math.round((samplePlan.total - 0.01) * 100) / 100, false],
    ] as const) {
      const started = Date.now();
      const answer = await post({
        message: '确认清单',
        currency: 'USD',
        context: { ...context, meal: { ...context.meal, budget } },
      });
      results.push({
        id,
        status: answer.status,
        elapsedMs: Date.now() - started,
        passed:
          answer.status === 200 &&
          answer.result.mealPlan?.canApply === expectedApply &&
          answer.result.mealPlan?.total === samplePlan.total &&
          (expectedApply ? answer.result.action?.type === 'apply_plan' : !answer.result.action),
        result: answer.result,
      });
    }
  }
  const cycleStarted = Date.now();
  const cycle = await post({
    message: '两个人吃14天，每天4餐，预算600美元，西式餐食',
    currency: 'USD',
    context: { cart: [] },
  });
  results.push({
    id: 'offline-56-meals',
    status: cycle.status,
    elapsedMs: Date.now() - cycleStarted,
    passed:
      cycle.status === 200 &&
      cycle.result.engine === 'rules' &&
      cycle.result.mealPlan?.canApply === true &&
      new Set(cycle.result.mealPlan.recipes.map((recipe) => `${recipe.day}-${recipe.meal}`))
        .size === 56,
    result: cycle.result,
  });
  await writeFile(path.join(directory, 'summary.json'), JSON.stringify(results, null, 2));
  console.log(
    JSON.stringify({
      directory,
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed),
    }),
  );
  if (results.some((r) => !r.passed)) process.exitCode = 1;
} finally {
  if (child.exitCode === null && child.signalCode === null) child.kill();
  await exited;
  await rm(dataDirectory, { recursive: true, force: true });
}
