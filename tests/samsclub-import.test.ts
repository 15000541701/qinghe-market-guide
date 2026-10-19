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
    assert.equal(result.archived, source.filter((record) => record.status === 'archived').length);
    const db = new DatabaseSync(path.join(directory, 'market.sqlite'));
    let sample: Product;
    let shelf: { id: string; name: string };
    try {
      const products: Product[] = db.prepare('SELECT data FROM products').all().map((row) => JSON.parse(String(row.data)));
      const byId = new Map(source.map((record) => [`samsclub-${record.itemId}`, record]));
      const onSale = products.filter((product) => product.status !== 'archived');
      const eligible = onSale.filter((product) => product.storageCondition !== 'unknown');
      assert.ok(eligible.length > 0);
      assert.ok(eligible.every((product) => product.merchandisingState === 'placed'), JSON.stringify(eligible.filter((product) => product.merchandisingState !== 'placed').map((product) => ({ id: product.id, group: product.displayGroup, storage: product.storageCondition }))));
      assert.ok(products.filter((product) => product.storageCondition === 'unknown').every((product) => !product.shelfId));
      assert.ok(products.filter((product) => product.status === 'archived').every((product) => !product.shelfId && product.archiveReason));
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

test('已有门店升级到复核目录：同步分类、储存、净含量与归档，不覆盖人工修改', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'qinghe-samsclub-review-sync-'));
  const runImport = () => execFileSync(process.execPath,
    ['--import', 'tsx', 'scripts/import-samsclub-catalog.ts'],
    { env: { ...process.env, DATA_DIR: directory }, encoding: 'utf8', timeout: 60000 },
  );
  try {
    const source: SamsClubCatalogRecord[] = JSON.parse(readFileSync('shared/samsclub-catalog.json', 'utf8'));
    const reviewed = source.filter((record) => record.reviewPrevious?.category && record.status !== 'archived');
    const archived = source.find((record) => record.status === 'archived')!;
    const [moved, edited] = reviewed;
    assert.ok(moved && edited && archived);
    runImport();
    const db = new DatabaseSync(path.join(directory, 'market.sqlite'));
    const read = (id: string): Product => JSON.parse(String(db.prepare('SELECT data FROM products WHERE id=?').get(`samsclub-${id}`)?.data));
    const write = (product: Product) => db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(product), product.id);
    try {
      // Rewind three products to how a pre-review store imported them.
      const rewind = (record: SamsClubCatalogRecord, changes: Partial<Product> = {}) => {
        const product = read(record.itemId);
        delete product.catalogSnapshot;
        delete product.storageBasis;
        delete product.archiveReason;
        write({
          ...product,
          ...(record.reviewPrevious as Partial<Product>),
          status: 'active',
          merchandisingState: 'pending-review',
          shelf: '',
          shelfId: undefined,
          ...changes,
        });
      };
      rewind(moved);
      rewind(edited, { category: 'pantry' });
      rewind(archived);
    } finally { db.close(); }
    runImport();
    const reopened = new DatabaseSync(path.join(directory, 'market.sqlite'), { readOnly: true });
    try {
      const get = (id: string): Product => JSON.parse(String(reopened.prepare('SELECT data FROM products WHERE id=?').get(`samsclub-${id}`)?.data));
      const synced = get(moved.itemId);
      assert.equal(synced.category, moved.category);
      assert.equal(synced.displayGroup, moved.displayGroup);
      assert.deepEqual(synced.packageSize, moved.packageSize);
      if (moved.storageCondition !== 'unknown') assert.equal(synced.merchandisingState, 'placed');
      const kept = get(edited.itemId);
      assert.equal(kept.category, 'pantry', 'staff category edit must survive the sync');
      assert.equal(kept.catalogSnapshot?.category, edited.reviewPrevious!.category);
      const hidden = get(archived.itemId);
      assert.equal(hidden.status, 'archived');
      assert.equal(hidden.archiveReason, archived.archiveReason);
      assert.ok(!hidden.shelfId);
    } finally { reopened.close(); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
