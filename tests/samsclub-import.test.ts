import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Product, Shelf, SamsClubCatalogRecord } from '../shared/types';

test('新库导入可恢复已验证布局，重复启动保留人工价格、库存和货架调整', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'qinghe-samsclub-import-'));
  const runImport = () =>
    JSON.parse(
      execFileSync(process.execPath, ['--import', 'tsx', 'scripts/import-samsclub-catalog.ts'], {
        env: { ...process.env, DATA_DIR: directory },
        encoding: 'utf8',
        timeout: 60000,
      }),
    );
  try {
    const source: SamsClubCatalogRecord[] = JSON.parse(
      readFileSync('shared/samsclub-catalog.json', 'utf8'),
    );
    const result = runImport();
    assert.equal(result.totalProducts, source.length);
    assert.equal(result.otherProducts, 0);
    assert.equal(result.archived, source.filter((record) => record.status === 'archived').length);
    const db = new DatabaseSync(path.join(directory, 'market.sqlite'));
    let sample: Product;
    let shelf: Shelf;
    try {
      const products: Product[] = db
        .prepare('SELECT data FROM products')
        .all()
        .map((row) => JSON.parse(String(row.data)));
      const byId = new Map(source.map((record) => [`samsclub-${record.itemId}`, record]));
      const onSale = products.filter((product) => product.status !== 'archived');
      const eligible = onSale.filter((product) => product.storageCondition !== 'unknown');
      assert.ok(eligible.length > 0);
      assert.ok(
        eligible.every((product) => product.merchandisingState === 'placed'),
        JSON.stringify(
          eligible
            .filter((product) => product.merchandisingState !== 'placed')
            .map((product) => ({
              id: product.id,
              group: product.displayGroup,
              storage: product.storageCondition,
            })),
        ),
      );
      assert.ok(
        products
          .filter((product) => product.storageCondition === 'unknown')
          .every((product) => !product.shelfId),
      );
      for (const product of products)
        assert.equal(product.sourcePageId, byId.get(product.id)?.sourcePageId);
      assert.ok(products.filter((product) => product.status === 'archived').every((product) => !product.shelfId && product.archiveReason));
      const hot = onSale.filter((product) => product.storageCondition === 'served-hot');
      assert.equal(hot.length, 2);
      assert.ok(hot.every((product) => product.shelfId === 'deli-hot-counter' && product.shelfSide === 'front'));
      sample = { ...eligible[0], price: 12.34, stock: 17, priceOrigin: 'manual', shelfSlot: 0 };
      db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(sample), sample.id);
      assert.ok(sample.shelfId);
      shelf = JSON.parse(
        String(db.prepare('SELECT data FROM shelves WHERE id=?').get(sample.shelfId)?.data),
      );
      shelf.name += '（人工调整）';
      shelf.rotation = 360;
      shelf.layoutRevision = 7;
      db.prepare('UPDATE shelves SET data=? WHERE id=?').run(JSON.stringify(shelf), shelf.id);
    } finally {
      db.close();
    }
    assert.equal(runImport().totalProducts, source.length);
    const reopened = new DatabaseSync(path.join(directory, 'market.sqlite'), { readOnly: true });
    try {
      const saved = JSON.parse(
        String(reopened.prepare('SELECT data FROM products WHERE id=?').get(sample!.id)?.data),
      );
      assert.equal(saved.price, 12.34);
      assert.equal(saved.stock, 17);
      assert.equal(saved.priceOrigin, 'manual');
      assert.equal(saved.shelfSlot, 0);
      const savedShelf = JSON.parse(
        String(reopened.prepare('SELECT data FROM shelves WHERE id=?').get(shelf!.id)?.data),
      );
      assert.equal(savedShelf.name, shelf!.name);
      assert.equal(savedShelf.rotation, 360);
      assert.equal(savedShelf.layoutRevision, 7);
    } finally {
      reopened.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
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

test('已有门店补建现做热食档口并修复占位净含量；保存商品不再清掉净含量', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'qinghe-samsclub-hot-counter-'));
  const env = { ...process.env, DATA_DIR: directory };
  const runImport = () => execFileSync(process.execPath,
    ['--import', 'tsx', 'scripts/import-samsclub-catalog.ts'],
    { env, encoding: 'utf8', timeout: 60000 },
  );
  try {
    const source: SamsClubCatalogRecord[] = JSON.parse(readFileSync('shared/samsclub-catalog.json', 'utf8'));
    const hotRecords = source.filter((record) => record.storageCondition === 'served-hot');
    const butter = source.find((record) => record.itemId === '990422756')!;
    runImport();
    const db = new DatabaseSync(path.join(directory, 'market.sqlite'));
    const read = (id: string): Product => JSON.parse(String(db.prepare('SELECT data FROM products WHERE id=?').get(`samsclub-${id}`)?.data));
    const write = (product: Product) => db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(product), product.id);
    try {
      // A store from before 2026-10-20: no counter, hot food still pending, and a package size
      // that an earlier save replaced with the {1, package} placeholder.
      db.prepare('DELETE FROM shelves WHERE id=?').run('deli-hot-counter');
      for (const record of hotRecords) {
        const product = read(record.itemId);
        delete product.storageBasis;
        write({
          ...product,
          ...(record.reviewPrevious as Partial<Product>),
          catalogSnapshot: { ...product.catalogSnapshot, ...(record.reviewPrevious as Partial<Product>) },
          merchandisingState: 'pending-review',
          shelf: '',
          shelfId: undefined,
          shelfSide: undefined,
          shelfLevel: undefined,
        });
      }
      write({ ...read(butter.itemId), packageSize: { quantity: 1, unit: 'package' } });
    } finally { db.close(); }
    runImport();
    const reopened = new DatabaseSync(path.join(directory, 'market.sqlite'), { readOnly: true });
    try {
      const get = (id: string): Product => JSON.parse(String(reopened.prepare('SELECT data FROM products WHERE id=?').get(`samsclub-${id}`)?.data));
      assert.ok(reopened.prepare('SELECT data FROM shelves WHERE id=?').get('deli-hot-counter'));
      for (const record of hotRecords) {
        const product = get(record.itemId);
        assert.equal(product.storageCondition, 'served-hot');
        assert.equal(product.shelfId, 'deli-hot-counter');
        assert.equal(product.merchandisingState, 'placed');
      }
      assert.deepEqual(get(butter.itemId).packageSize, butter.packageSize);
    } finally { reopened.close(); }

    // Edits and drag-and-drop placement save the product; only a changed unit redefines the package.
    execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
      const { getProduct, saveProduct } = await import('./server/db.ts');
      saveProduct({ ...getProduct('samsclub-990422756'), price: 10.5 });
      saveProduct({ ...getProduct('samsclub-980149227'), unit: '500g' });
    `], { env, encoding: 'utf8', timeout: 60000 });
    const saved = new DatabaseSync(path.join(directory, 'market.sqlite'), { readOnly: true });
    try {
      const get = (id: string): Product => JSON.parse(String(saved.prepare('SELECT data FROM products WHERE id=?').get(`samsclub-${id}`)?.data));
      assert.equal(get('990422756').price, 10.5);
      assert.deepEqual(get('990422756').packageSize, butter.packageSize);
      assert.deepEqual(get('980149227').packageSize, { quantity: 500, unit: 'g' });
    } finally { saved.close(); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('热食柜台位置被门店自建设施占用时不自动添加，商品保持待安排', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'qinghe-samsclub-hot-blocked-'));
  const env = { ...process.env, DATA_DIR: directory };
  const runImport = () => spawnSync(process.execPath,
    ['--import', 'tsx', 'scripts/import-samsclub-catalog.ts'],
    { env, encoding: 'utf8', timeout: 60000 },
  );
  try {
    const source: SamsClubCatalogRecord[] = JSON.parse(readFileSync('shared/samsclub-catalog.json', 'utf8'));
    const hotRecords = source.filter((record) => record.storageCondition === 'served-hot');
    assert.equal(runImport().status, 0);
    const db = new DatabaseSync(path.join(directory, 'market.sqlite'));
    try {
      const counter: Shelf = JSON.parse(String(db.prepare('SELECT data FROM shelves WHERE id=?').get('deli-hot-counter')?.data));
      db.prepare('DELETE FROM shelves WHERE id=?').run(counter.id);
      const staffTable: Shelf = { ...counter, id: 'staff-display', name: '门店自建展台', kind: 'display-table', allowedDisplayGroups: ['chilled-deli'] };
      db.prepare('INSERT INTO shelves (id, data) VALUES (?, ?)').run(staffTable.id, JSON.stringify(staffTable));
      for (const record of hotRecords) {
        const product: Product = JSON.parse(String(db.prepare('SELECT data FROM products WHERE id=?').get(`samsclub-${record.itemId}`)?.data));
        db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify({ ...product, shelf: '', shelfId: undefined, merchandisingState: 'unplaced' }), product.id);
      }
    } finally { db.close(); }
    const result = runImport();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /现做热食档口与现有门店布局冲突/);
    const reopened = new DatabaseSync(path.join(directory, 'market.sqlite'), { readOnly: true });
    try {
      assert.equal(reopened.prepare('SELECT data FROM shelves WHERE id=?').get('deli-hot-counter'), undefined);
      assert.ok(reopened.prepare('SELECT data FROM shelves WHERE id=?').get('staff-display'));
      for (const record of hotRecords) {
        const product: Product = JSON.parse(String(reopened.prepare('SELECT data FROM products WHERE id=?').get(`samsclub-${record.itemId}`)?.data));
        assert.ok(!product.shelfId);
        assert.equal(product.merchandisingState, 'unplaced');
      }
    } finally { reopened.close(); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
