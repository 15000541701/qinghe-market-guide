#!/usr/bin/env node
import { execFile as execFileCallback } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const root = process.cwd();
const queueDir = path.join(root, '.cache/samsclub-bulk');
const requestFile = path.join(queueDir, 'queue-refresh-request.json');
const responseFile = path.join(queueDir, 'queue-refresh-response.json');
const stopFile = path.join(queueDir, 'STOP-QUEUE');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(temporary, file);
}

async function run(command, args) {
  const startedAt = new Date().toISOString();
  try {
    const result = await execFile(command, args, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    });
    return {
      command: [command, ...args],
      exitCode: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    };
  } catch (error) {
    return {
      command: [command, ...args],
      exitCode: Number.isInteger(error?.code) ? error.code : 1,
      signal: error?.signal || null,
      startedAt,
      completedAt: new Date().toISOString(),
      stdout: String(error?.stdout || ''),
      stderr: String(error?.stderr || error?.message || error),
    };
  }
}

async function processRequest(id) {
  const startedAt = new Date().toISOString();
  const builder = await run('node', ['scripts/samsclub-build-queue.mjs']);
  const catalogImport = await run('node', ['--import', 'tsx', 'scripts/import-samsclub-catalog.ts']);
  const response = {
    id,
    startedAt,
    completedAt: new Date().toISOString(),
    ok: builder.exitCode === 0 && catalogImport.exitCode === 0,
    builder,
    catalogImport,
  };
  await writeJsonAtomic(responseFile, response);
  console.log(JSON.stringify({ id, ok: response.ok, builderExitCode: builder.exitCode, importExitCode: catalogImport.exitCode }));
}

async function main() {
  const previous = await readJson(responseFile);
  let processedId = previous?.id == null ? null : String(previous.id);
  console.log(JSON.stringify({ worker: 'samsclub-queue-worker', pollMs: 1000, processedId }));

  while (true) {
    try {
      await fs.access(stopFile);
      console.log('Stopped by .cache/samsclub-bulk/STOP-QUEUE.');
      return;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }

    try {
      const request = await readJson(requestFile);
      const id = request?.id == null ? null : String(request.id);
      if (id && id !== processedId) {
        await processRequest(id);
        processedId = id;
        continue;
      }
    } catch (error) {
      console.error(`Queue refresh error: ${error?.message || error}`);
    }

    await sleep(1000);
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
