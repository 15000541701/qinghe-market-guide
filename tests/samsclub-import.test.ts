import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Product, SamsClubCatalogRecord } from '../shared/types';

test('新库导入可恢复已验证布局，重复启动保留人工价格、库存和货架调整', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'qinghe-samsclub-import-'));
  const runImport = () => JSON.parse(execFileSync(process.execPath,
    ['--import', 'tsx', 'scripts/import-samsclub-catalog.ts'],
    { env: { ...process.env, DATA_DIR: directory }, encoding: 'utf8', timeout: 60000 },
  ));
  try {
    const source: SamsClubCatalogRecord[] = JSON.parse(readFileSync('shared/samsclub-catalog.json', 'utf8'));
    const result = runImport();
    assert.equal(result.totalProducts, source.length);
    assert.equal(result.otherProducts, 0);
    const db = new DatabaseSync(path.join(directory, 'market.sqlite'));
    let sample: Product;
    let shelf: { id: string; name: string };
    try {
      const products: Product[] = db.prepare('SELECT data FROM products').all().map((row) => JSON.parse(String(row.data)));
      const byId = new Map(source.map((record) => [`samsclub-${record.itemId}`, record]));
      const eligible = products.filter((product) => product.storageCondition !== 'unknown');
      assert.ok(eligible.length > 0);
      assert.ok(eligible.every((product) => product.merchandisingState === 'placed'), JSON.stringify(eligible.filter((product) => product.merchandisingState !== 'placed').map((product) => ({ id: product.id, group: product.displayGroup, storage: product.storageCondition }))));
      assert.ok(products.filter((product) => product.storageCondition === 'unknown').every((product) => !product.shelfId));
      for (const product of products) assert.equal(product.sourcePageId, byId.get(product.id)?.sourcePageId);
      sample = { ...eligible[0], price: 12.34, stock: 17, priceOrigin: 'manual' };
      db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(sample), sample.id);
      assert.ok(sample.shelfId);
      shelf = JSON.parse(String(db.prepare('SELECT data FROM shelves WHERE id=?').get(sample.shelfId)?.data));
      shelf.name += '（人工调整）';
      db.prepare('UPDATE shelves SET data=? WHERE id=?').run(JSON.stringify(shelf), shelf.id);
    } finally { db.close(); }
    assert.equal(runImport().totalProducts, source.length);
    const reopened = new DatabaseSync(path.join(directory, 'market.sqlite'), { readOnly: true });
    try {
      const saved = JSON.parse(String(reopened.prepare('SELECT data FROM products WHERE id=?').get(sample!.id)?.data));
      assert.equal(saved.price, 12.34);
      assert.equal(saved.stock, 17);
      assert.equal(saved.priceOrigin, 'manual');
      const savedShelf = JSON.parse(String(reopened.prepare('SELECT data FROM shelves WHERE id=?').get(shelf!.id)?.data));
      assert.equal(savedShelf.name, shelf!.name);
    } finally { reopened.close(); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
