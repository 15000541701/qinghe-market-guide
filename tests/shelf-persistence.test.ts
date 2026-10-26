import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('删除默认货架后重新启动不复活，原山姆商品保留价格库存并继续待摆放', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'qinghe-shelf-persistence-'));
  const run = (args: string[]) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        ['--import', 'tsx', 'tests/fixtures/shelf-delete-persistence.ts', ...args],
        { env: { ...process.env, DATA_DIR: directory }, encoding: 'utf8', timeout: 60000 },
      ),
    );
  try {
    const before = run(['remove']);
    assert.ok(before.products.length > 0);
    const after = run(['read', JSON.stringify(before)]);
    assert.equal(after.visible, false);
    assert.equal(after.deleted, true);
    assert.deepEqual(
      after.products.map(({ id, price, stock }: { id: string; price: number; stock: number }) => ({
        id,
        price,
        stock,
      })),
      before.products,
    );
    assert.ok(
      after.products.every(
        (item: { placement: string | null; manual: boolean }) =>
          item.placement === null && item.manual === true,
      ),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
