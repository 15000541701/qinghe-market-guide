import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { entrance } from '../shared/catalog';
import { availableForSale } from '../shared/catalog-status';
import { buildShelfRoute, isWalkable } from '../shared/navigation';
import { effectivePlacement, placementOf, samePlacement, unplaced } from '../shared/placement';
import { cartTotal, mutateShoppingList, quantityForMeasure } from '../shared/shopping';
import type {
  GuideResponse, ListItem, MealPlan, Product, ProductDetailResponse, Shelf, StoreSection,
} from '../shared/types';

// HTTP exercises run the real backend; browser-only state is exercised explicitly
// with shared business helpers, never claimed as a browser interaction test.
const root = fileURLToPath(new URL('..', import.meta.url));
process.chdir(root);
const args = process.argv.slice(2);
assert.ok(args.every((arg) => ['--live', '--direct', '--help'].includes(arg)), '仅支持 --live、--direct、--help');
if (args.includes('--help')) {
  console.log('npm run demo:check：离线接口检查；npm run demo:check:live：额外调用当前配置的模型 API；追加 -- --direct 可仅在本次进程禁用 AI_PROXY_URL。页面展示请用 npm run demo。');
  process.exit(0);
}
const live = args.includes('--live');
const startedAt = new Date().toISOString();
const output = path.resolve('outputs/midterm-demo', startedAt.replace(/[:.]/g, '-'));
const temporary = await mkdtemp(path.join(tmpdir(), 'qinghe-midterm-'));
const steps: { title: string; status: '通过' | '失败' | '跳过'; input: string;
  summary: string; elapsedMs: number; evidence?: unknown }[] = [];
const children: ChildProcess[] = [];
let counter = 0;
let products: Product[] = [], shelves: Shelf[] = [], sections: StoreSection[] = [];
let plan: MealPlan | undefined;
let cart: ListItem[] = [];

async function step(title: string, input: string, run: () => Promise<{ summary: string; evidence?: unknown }>, available = true) {
  console.log(`\n${++counter}. ${title}\n   输入：${input}`);
  const began = Date.now();
  if (!available) {
    steps.push({ title, input, status: '跳过', summary: '前置步骤未成功，无法验证。', elapsedMs: 0 });
    console.log('   [跳过] 前置步骤未成功。');
    return;
  }
  try {
    const result = await run();
    steps.push({ title, input, status: '通过', ...result, elapsedMs: Date.now() - began });
    console.log(`   [通过] ${result.summary}`);
  } catch (error) {
    const summary = error instanceof Error ? error.message : '未知错误';
    steps.push({ title, input, status: '失败', summary, elapsedMs: Date.now() - began });
    console.log(`   [失败] ${summary}`);
  }
}

async function launch(modelEnabled: boolean) {
  const directory = path.join(temporary, modelEnabled ? 'live' : 'offline');
  await mkdir(directory, { recursive: true });
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const address = probe.address();
  assert.ok(address && typeof address === 'object');
  await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  let configured: NodeJS.ProcessEnv = { ...process.env };
  if (modelEnabled) {
    // Read credentials only for the explicit live mode; do not print or copy .env.
    try { configured = { ...parse(await readFile('.env')), ...process.env }; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (args.includes('--direct')) configured.AI_PROXY_URL = '';
    const saved = path.resolve(configured.DATA_DIR || 'data', 'model-settings.json');
    try { await copyFile(saved, path.join(directory, 'model-settings.json')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  } else {
    Object.assign(configured, {
      AI_PROVIDER: 'deepseek', AI_PROXY_URL: '', AI_API_KEY: '', AI_BASE_URL: '',
      GEMINI_API_KEY: '', GEMINI_BASE_URL: '', DEEPSEEK_API_KEY: '', DEEPSEEK_BASE_URL: '',
    });
  }
  const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: root,
    env: { ...configured, DATA_DIR: directory, PORT: String(address.port), HOST: '127.0.0.1',
      DOTENV_CONFIG_PATH: path.join(directory, 'no-env') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  let spawnError: Error | undefined;
  child.on('error', (error) => { spawnError = error; });
  // Consume output without exposing configuration or treating stderr as a test result.
  child.stdout?.on('data', () => {});
  child.stderr?.on('data', () => {});
  const endpoint = `http://127.0.0.1:${address.port}`;
  const api = async <T>(route: string, body?: unknown, method = 'POST', expected = 200): Promise<T> => {
    const response = await fetch(`${endpoint}/api${route}`, {
      method: body === undefined ? 'GET' : method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(modelEnabled ? 240_000 : 20_000),
    });
    const result = await response.json();
    assert.equal(response.status, expected, `HTTP ${response.status}：${result.error || route}`);
    return result as T;
  };
  for (let attempt = 0; attempt < 150; attempt++) {
    if (spawnError || child.exitCode !== null) throw new Error('演示后端启动失败，请检查 Node.js 版本和模型代理配置。');
    try {
      const response = await fetch(`${endpoint}/api/status`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return api;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('演示后端启动超时。');
}

function mealEvidence(response: GuideResponse) {
  const value = response.mealPlan!;
  return { engine: response.engine, fallback: response.fallback, text: response.text,
    preferences: value.preferences, recipes: value.recipes,
    items: value.items.map((line) => ({ id: line.product.id, name: line.product.name,
      quantity: line.quantity, amount: line.amount, cost: line.cost, calculation: line.calculation })),
    total: value.total, budgetComplete: value.budgetComplete, canApply: value.canApply,
    unresolved: value.unresolved, missing: value.missing };
}

try {
  console.log(`青禾超市 · 期中功能演示\n模式：${live ? '本地业务演练 + 真实模型 API' : '本地业务演练（模型禁用）'}\n数据：独立临时数据库，原门店不变。`);
  const api = await launch(false);
  await step('商品目录与详情', '读取商品、分类、分区和货架，并打开一件商品详情。', async () => {
    [products, shelves, sections] = await Promise.all([
      api<Product[]>('/products'), api<Shelf[]>('/shelves'), api<StoreSection[]>('/sections'),
    ]);
    assert.ok(products.length && shelves.length && sections.length);
    const active = products.filter(availableForSale);
    assert.ok(active.length);
    const detail = await api<ProductDetailResponse>(`/products/${active[0].id}`);
    assert.equal(detail.product.id, active[0].id);
    return { summary: `${products.length} 件目录商品，${active.length} 件可售，${shelves.length} 个货架；详情可读取。`,
      evidence: { product: detail.product.name, galleryCount: detail.gallery.length, sections: sections.length } };
  });

  let search: GuideResponse | undefined;
  await step('中文商品搜索和价格筛选', '找牛奶，单品价格在20美元以内。', async () => {
    search = await api<GuideResponse>('/chat', { message: '20美元以内的牛奶', currency: 'USD' });
    assert.equal(search.engine, 'rules');
    assert.ok(search.products.length, '未找到符合条件的牛奶。');
    assert.ok(search.products.every((p) => p.price <= 20 && p.currency === 'USD' && availableForSale(p)));
    return { summary: `找到 ${search.products.length} 件符合条件的商品，均在价格范围内。`, evidence: search };
  });
  await step('上下文续问', '接着说“只要10美元以下的”。', async () => {
    const next = await api<GuideResponse>('/chat', {
      message: '只要10美元以下的', currency: 'USD', previous: search!.filters,
    });
    assert.equal(next.filters.max, 10);
    assert.equal(next.filters.term, search!.filters.term);
    assert.ok(next.products.length);
    assert.ok(next.products.every((p) => p.price <= 10));
    return { summary: `保留牛奶检索条件，缩小到 ${next.products.length} 件商品。`, evidence: next };
  }, !!search?.products.length);

  await step('周期餐食与整包装采购', '两个人吃3天，每天两餐，预算不限，想吃西式餐食。', async () => {
    const response = await api<GuideResponse>('/assistant', {
      message: '两个人吃3天，每天两餐，预算不限，想吃西式餐食', currency: 'USD', context: { cart: [] },
    });
    assert.ok(response.mealPlan, response.text);
    const candidate = response.mealPlan;
    const slots = new Set(candidate.recipes.map((recipe) => `${recipe.day}-${recipe.meal}`));
    assert.equal(candidate.preferences.people, 2);
    assert.equal(candidate.preferences.days, 3);
    assert.equal(slots.size, 6);
    assert.equal(response.engine, 'rules');
    assert.ok(response.fallback);
    assert.ok(candidate.items.length);
    assert.equal(candidate.total, cartTotal(candidate.items.map((line) => ({
      productId: line.product.id, quantity: line.quantity, checked: false,
    })), products));
    for (const line of candidate.items) {
      if (line.product.saleMode === 'pack') assert.ok(Number.isInteger(line.quantity));
    }
    plan = candidate;
    return { summary: `覆盖6餐、${candidate.items.length}项采购，合计 $${candidate.total.toFixed(2)}；本步骤使用本地备用模板。`, evidence: mealEvidence(response) };
  });

  await step('确认清单与重复确认保护', '确认采购清单，再确认一次。', async () => {
    assert.ok(plan!.canApply, `方案尚不可确认：${plan!.missing.join('、')}`);
    const confirm = () => api<GuideResponse>('/assistant', {
      message: '确认采购清单', currency: 'USD', context: { cart, meal: plan!.preferences, recipeIds: plan!.recipes.map((r) => r.id) },
    });
    const response = await confirm();
    assert.equal(response.action?.type, 'apply_plan', response.text);
    cart = mutateShoppingList(cart, products, response.action!).list;
    assert.ok(cart.length);
    const before = structuredClone(cart);
    const repeated = await confirm();
    assert.equal(repeated.action?.type, 'apply_plan', repeated.text);
    const result = mutateShoppingList(cart, products, repeated.action!);
    assert.deepEqual(result.list, before);
    return { summary: `${cart.length}项商品已加入会话清单；重复确认没有累加数量。`, evidence: { cart, total: cartTotal(cart, products), repeatedChanged: result.changed } };
  }, !!plan);

  await step('移除与撤销指令', '移除清单中的第一件商品，然后撤销上一步。', async () => {
    const before = structuredClone(cart);
    const product = products.find((p) => p.id === cart[0].productId)!;
    const removed = await api<GuideResponse>('/assistant', {
      message: `从清单移除${product.name}`, currency: 'USD', context: { cart },
    });
    assert.equal(removed.action?.type, 'remove', removed.text);
    cart = mutateShoppingList(cart, products, removed.action!).list;
    assert.ok(!cart.some((item) => item.productId === product.id));
    const undo = await api<GuideResponse>('/assistant', { message: '撤销上一步', currency: 'USD', context: { cart } });
    assert.equal(undo.action?.type, 'undo');
    // Browser history is local to the UI. Here the script owns the session snapshot.
    cart = before;
    return { summary: '移除操作生效，接口返回撤销指令；脚本会话恢复原清单。', evidence: { removed: removed.action, undo: undo.action,
      scope: '共享清单逻辑与接口指令；未验证浏览器撤销按钮和本地存储。' } };
  }, !!cart.length);

  await step('多站路线与设施避障', '按清单规划采购路线，再去下一站。', async () => {
    const command = await api<GuideResponse>('/assistant', { message: '按清单规划采购路线', currency: 'USD', context: { cart } });
    assert.equal(command.action?.type, 'navigate');
    const targets: Shelf[] = [];
    for (const item of cart) {
      const product = products.find((p) => p.id === item.productId)!;
      const place = effectivePlacement(product, products, shelves);
      assert.ok(place, `${product.name}缺少有效陈列位置。`);
      const shelf = shelves.find((s) => s.id === place.shelfId)!;
      targets.push({ ...shelf, id: `${shelf.id}:${place.shelfSide}`, position: shelf.accessPoints![place.shelfSide!]! });
    }
    const route = buildShelfRoute(targets, entrance, sections, shelves);
    assert.equal(route.unreachable?.length || 0, 0, route.unreachable?.join('；'));
    assert.equal(route.shelfStops?.length, new Set(targets.map((s) => s.id)).size);
    assert.ok(route.points.length > 1);
    route.points.forEach((point, i) => {
      assert.ok(isWalkable(point, sections, shelves));
      if (i) assert.equal(Math.abs(point.x - route.points[i - 1].x) + Math.abs(point.y - route.points[i - 1].y), 1);
    });
    const next = await api<GuideResponse>('/assistant', { message: '去下一站', currency: 'USD', context: { cart } });
    assert.equal(next.action?.type, 'next');
    return { summary: `覆盖${route.shelfStops!.length}个取货面，${route.distance}米、预计${route.minutes}分钟；路径连续且避开设施。`, evidence: route };
  }, !!cart.length);

  await step('超市端改价、库存与顾客数据同步', '在独立门店修改一件商品，随后重新读取并计算清单金额。', async () => {
    const original = products.find((p) => availableForSale(p) && p.shelfId && p.name.length <= 60 && p.unit.length <= 20)!;
    assert.ok(original);
    const newPrice = Math.round((original.price + 1) * 100) / 100;
    const saved = await api<Product>(`/products/${original.id}`, {
      name: original.name, category: original.category, price: newPrice, unit: original.unit,
      stock: 3, shelf: original.shelf, shelfId: original.shelfId, shelfSide: original.shelfSide,
      shelfLevel: original.shelfLevel, source: 'manual',
    }, 'PATCH');
    assert.equal(saved.price, newPrice);
    const refreshed = await api<Product[]>('/products');
    const changed = refreshed.find((p) => p.id === original.id)!;
    assert.equal(changed.stock, 3);
    assert.equal(changed.price, newPrice);
    const list = [{ productId: changed.id, quantity: 1, checked: false }];
    assert.equal(cartTotal(list, refreshed), newPrice);
    assert.equal(changed.history.at(-1)?.price, newPrice);
    products = refreshed;
    return { summary: `售价 $${original.price.toFixed(2)} → $${newPrice.toFixed(2)}，库存改为3；新读取的数据和清单计价同步。`, evidence: { name: changed.name, price: changed.price, stock: changed.stock, history: changed.history.at(-1) } };
  }, !!products.length);

  await step('陈列移出与撤销持久化', '将一件商品移回待摆放，重新读取，再调用接口撤销。', async () => {
    const original = products.find((p) => availableForSale(p) && effectivePlacement(p, products, shelves))!;
    assert.ok(original);
    const expected = placementOf(original);
    const result = await api<{ undo: unknown }>('/merchandising/placements', {
      changes: [{ id: original.id, expected, target: unplaced() }],
    });
    let rows = await api<Product[]>('/products');
    assert.ok(samePlacement(placementOf(rows.find((p) => p.id === original.id)!), unplaced()));
    await api('/merchandising/placements', { changes: result.undo });
    rows = await api<Product[]>('/products');
    assert.ok(samePlacement(placementOf(rows.find((p) => p.id === original.id)!), expected));
    return { summary: '商品移回待摆放后读取生效；撤销后原货架、侧面、层位和格位恢复。', evidence: { product: original.name, original: expected, intermediate: unplaced(), restored: expected } };
  }, !!products.length);

  await step('异常输入与包装换算', '输入0人晚餐、空消息；演算128mL用油对应1.8L包装。', async () => {
    const rejected = await api<GuideResponse>('/assistant', { message: '0人晚餐', currency: 'USD', context: { cart: [] } });
    assert.equal(rejected.clearMealPlan, true);
    assert.ok(!rejected.mealPlan && !rejected.action);
    await api('/assistant', { message: '', currency: 'USD', context: { cart: [] } }, 'POST', 400);
    const oil = { ...products[0], unit: '1.8L', saleMode: 'pack', packageSize: { quantity: 1800, unit: 'ml' } } as Product;
    assert.equal(quantityForMeasure(oil, 128, 'ml'), 1);
    return { summary: '非法人数和空消息被拒绝；128mL需求按1瓶购买（明确标注的合成规格示例）。', evidence: { rejected: rejected.text, packageExample: { source: '合成规格示例，共享换算函数', need: '128mL', size: '1.8L', quantity: 1 } } };
  }, !!products.length);

  if (live) {
    console.log('\n正在启动真实模型演示：2个业务场景；餐食生成可能触发程序内重试，等待期间会显示进度。');
    let liveApi: Awaited<ReturnType<typeof launch>> | undefined;
    await step('真实模型配置就绪', '沿用当前.env与已保存的模型选择，不改动原设置。', async () => {
      liveApi = await launch(true);
      const status = await liveApi<{ ai: boolean }>('/status');
      assert.equal(status.ai, true, '当前模型尚未配置完整，未发出真实模型请求。');
      const settings = await liveApi<{ provider: string; model: string }>('/model-settings');
      return { summary: `${settings.provider} / ${settings.model}；配置完整，实际可用性由后续请求验证。`, evidence: settings };
    });
    const liveReady = steps.at(-1)?.status === '通过';
    const heartbeat = setInterval(() => console.log('   正在等待模型与业务校验完成……'), 20_000);
    try {
      await step('真实模型中文导购', '推荐20美元以内的牛奶。', async () => {
        const result = await liveApi!<GuideResponse>('/chat', { message: '推荐20美元以内的牛奶', currency: 'USD' });
        assert.equal(result.engine, 'model', `模型未成功，实际使用规则：${result.fallback || result.text}`);
        assert.ok(result.products.length, '模型返回了空结果，本场景未成功。');
        assert.equal(result.filters.max, 20);
        assert.ok(result.products.every((p) => p.price <= 20 && availableForSale(p)));
        return { summary: `真实模型解析需求，程序筛选出${result.products.length}件商品。`, evidence: result };
      }, liveReady);
      await step('真实模型餐食生成', '两个人的早餐，预算不限，想吃鸡蛋三明治。', async () => {
        const result = await liveApi!<GuideResponse>('/assistant', {
          message: '两个人的早餐，预算不限，想吃鸡蛋三明治', currency: 'USD', context: { cart: [] },
        });
        assert.equal(result.engine, 'model', `模型未成功，实际使用备用模板：${result.fallback || result.text}`);
        assert.ok(result.mealPlan?.preferences.generatedMeals?.length);
        assert.equal(result.mealPlan.preferences.people, 2);
        assert.equal(result.mealPlan.preferences.generatedMeals.length, 1);
        assert.equal(result.mealPlan.preferences.generatedMeals[0].meal, '早餐');
        assert.ok(result.mealPlan.items.length);
        return { summary: `真实模型生成${result.mealPlan.recipes.length}道菜，程序核算采购金额 $${result.mealPlan.total.toFixed(2)}；${result.mealPlan.canApply ? '可确认采购' : '仍有待处理采购条件，详见记录'}。`, evidence: mealEvidence(result) };
      }, liveReady);
    } finally { clearInterval(heartbeat); }
  }
} catch (error) {
  steps.push({ title: '演示环境', status: '失败', input: '启动并执行演示',
    summary: error instanceof Error ? error.message : '未知错误', elapsedMs: 0 });
} finally {
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    const stopped = new Promise<void>((resolve) => child.once('exit', () => resolve()));
    child.kill();
    const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
    await stopped;
    clearTimeout(timer);
  }
  await rm(temporary, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const passed = steps.filter((item) => item.status === '通过').length;
  const failed = steps.filter((item) => item.status === '失败').length;
  const skipped = steps.filter((item) => item.status === '跳过').length;
  const report = { startedAt, finishedAt: new Date().toISOString(), mode: live ? 'live' : 'offline',
    scope: '真实本地HTTP接口、共享业务函数、独立数据库；未验证页面、浏览器存储、语音、真实定位。',
    passed, failed, skipped, steps };
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  const markdown = `# 青禾超市期中功能演示\n\n时间：${startedAt}\n\n模式：${live ? '本地业务 + 真实模型' : '本地业务，模型禁用'}\n\n通过 ${passed}，失败 ${failed}，跳过 ${skipped}。\n\n${report.scope}\n\n` +
    steps.map((item, i) => `## ${i + 1}. ${item.title} · ${item.status}\n\n输入：${item.input}\n\n${item.summary}\n\n耗时：${(item.elapsedMs / 1000).toFixed(1)}秒\n\n`).join('') +
    '详细输入、返回结果和路线点见同目录 report.json。规则和备用模板的通过不代表模型验证通过；跳过不算通过。\n';
  await writeFile(path.join(output, 'report.md'), markdown);
  console.log(`\n演示完成：通过 ${passed}，失败 ${failed}，跳过 ${skipped}。\n报告：${path.join(output, 'report.md')}`);
  if (failed || skipped) process.exitCode = 1;
}
