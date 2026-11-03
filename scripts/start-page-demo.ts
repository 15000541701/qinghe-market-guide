import { spawn, type ChildProcess } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';

const root = fileURLToPath(new URL('..', import.meta.url));
process.chdir(root);
const args = process.argv.slice(2);
const known = ['--live', '--direct', '--offline', '--no-open', '--no-build', '--help'];
if (args.some((arg) => !known.includes(arg))) throw new Error(`支持的参数：${known.join('、')}`);
if (args.includes('--help')) {
  console.log(
    'npm run demo -- --direct\n启动独立演示门店、打开页面并自动播放。\n--offline 禁用模型；--no-open 仅启动服务；--no-build 复用现有构建。',
  );
  process.exit(0);
}

let backend: ChildProcess | undefined;
let buildProcess: ChildProcess | undefined;
let directory: string | undefined;
let closing = false;
async function terminate(child?: ChildProcess) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const done = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  child.kill();
  const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
  await done;
  clearTimeout(timer);
}
async function cleanup() {
  if (closing) return;
  closing = true;
  await terminate(buildProcess);
  await terminate(backend);
  if (directory) await rm(directory, { recursive: true, force: true });
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void cleanup().finally(() => process.exit(0));
  });
}
async function build(entry: string, parameters: string[]) {
  const child = spawn(process.execPath, [entry, ...parameters], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  buildProcess = child;
  let output = '';
  child.stdout.on('data', (chunk) => {
    output = (output + chunk).slice(-16000);
  });
  child.stderr.on('data', (chunk) => {
    output = (output + chunk).slice(-16000);
  });
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`页面构建失败：\n${output}`)),
    );
  });
  buildProcess = undefined;
}

try {
  if (!args.includes('--no-build')) {
    console.log('正在准备自动演示页面……');
    await build('node_modules/typescript/bin/tsc', ['--noEmit']);
    await build('node_modules/vite/bin/vite.js', ['build']);
  }
  let configured: NodeJS.ProcessEnv = { ...process.env };
  if (!args.includes('--offline')) {
    try {
      configured = { ...parse(await readFile('.env')), ...process.env };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  directory = await mkdtemp(path.join(tmpdir(), 'qinghe-page-demo-'));
  await mkdir(directory, { recursive: true });
  if (!args.includes('--offline')) {
    try {
      await copyFile(
        path.resolve(configured.DATA_DIR || 'data', 'model-settings.json'),
        path.join(directory, 'model-settings.json'),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  } else {
    Object.assign(configured, {
      AI_PROVIDER: 'deepseek',
      AI_API_KEY: '',
      AI_BASE_URL: '',
      GEMINI_API_KEY: '',
      GEMINI_BASE_URL: '',
      DEEPSEEK_API_KEY: '',
      DEEPSEEK_BASE_URL: '',
      AI_PROXY_URL: '',
    });
  }
  if (args.includes('--direct')) configured.AI_PROXY_URL = '';
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const address = probe.address();
  if (!address || typeof address === 'string') throw new Error('未能选择可用端口。');
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  backend = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...configured,
      DATA_DIR: directory,
      PORT: String(port),
      HOST: '127.0.0.1',
      DOTENV_CONFIG_PATH: path.join(directory, 'no-env'),
      DEMO_PRESENTATION: '1',
    },
  });
  let spawnFailed = false;
  backend.on('error', () => {
    spawnFailed = true;
  });
  backend.stdout?.on('data', () => {});
  backend.stderr?.on('data', () => {});
  const endpoint = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (spawnFailed || backend.exitCode !== null) break;
    try {
      const status = await fetch(`${endpoint}/api/status`, { signal: AbortSignal.timeout(1000) });
      if (status.ok && (await status.json()).presentation === true) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready)
    throw new Error('演示服务未启动，请检查 Node.js 版本和代理配置；可尝试追加 --direct。');
  const url = `${endpoint}/?demo=1&autoplay=1`;
  console.log(
    `\n页面自动演示已启动：${url}\n网页会自动输入、切换页面、操作清单与地图，并展示超市端改价和陈列。\n底部可暂停、调速、重播；终端按 Ctrl+C 关闭服务。\n`,
  );
  if (!args.includes('--no-open')) {
    const command =
      process.platform === 'darwin'
        ? 'open'
        : process.platform === 'win32'
          ? 'rundll32.exe'
          : 'xdg-open';
    const parameters = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
    const opener = spawn(command, parameters, { stdio: 'ignore' });
    opener.once('error', () => console.log(`请手动打开：${url}`));
    opener.unref();
  }
  await new Promise<void>((resolve) => backend!.once('exit', () => resolve()));
  if (!closing) throw new Error('演示服务意外退出，请重新启动。');
} catch (error) {
  if (!closing) {
    console.error(error instanceof Error ? error.message : '演示服务未能启动。');
    process.exitCode = 1;
  }
} finally {
  await cleanup();
}
