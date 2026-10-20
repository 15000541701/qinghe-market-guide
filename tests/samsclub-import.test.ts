import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { entrance } from '../shared/catalog';
import { findPath } from '../shared/navigation';
import { shelfSlotPlacementError } from '../shared/shelf-capacity';
import type { Point, Product, SamsClubCatalogRecord, Shelf, StoreSection } from '../shared/types';

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
      const hot = onSale.filter((product) => product.storageCondition === 'served-hot');
      assert.equal(hot.length, 2);
      assert.ok(hot.every((product) => product.shelfId === 'deli-hot-counter' && product.shelfSide === 'front'));
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

// Staff placements must survive a restart: startup plans only products that have no slot.
type Side = NonNullable<Product['shelfSide']>;
type Slot = { shelfId: string; shelfSide: Side; shelfLevel: number };
const slotOf = (product: Product): Slot => ({ shelfId: product.shelfId!, shelfSide: product.shelfSide!, shelfLevel: product.shelfLevel! });
const sameSlot = (a: Slot, b: Slot) => a.shelfId === b.shelfId && a.shelfSide === b.shelfSide && a.shelfLevel === b.shelfLevel;
const readRows = <T>(db: DatabaseSync, table: string): T[] =>
  db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(String(row.data)) as T);

/** The slots PATCH /api/products/:id/placement accepts: reachable pick-up sides, levels the fixture rules allow and that are not full. */
function placementLayout(db: DatabaseSync) {
  const sections = readRows<StoreSection>(db, 'store_sections');
  const shelves = readRows<Shelf>(db, 'shelves');
  const active = new Set(sections.filter((section) => section.active).map((section) => section.id));
  const sides = shelves.flatMap((shelf) =>
    !shelf.reachable || !shelf.footprint || !active.has(shelf.sectionId)
      ? []
      : (Object.entries(shelf.accessPoints || {}) as [Side, Point | undefined][])
          .filter(([, point]) => !!point && findPath(entrance, point, sections, shelves).length > 0)
          // Only gondolas and chillers have several levels.
          .map(([side]) => ({ shelf, side, levels: ['gondola', 'chiller'].includes(shelf.kind || 'gondola') ? shelf.levels || 1 : 1 })),
  );
  return {
    shelves,
    openSlots(product: Product): Slot[] {
      const products = readRows<Product>(db, 'products');
      return sides.flatMap(({ shelf, side, levels }) =>
        Array.from({ length: levels }, (_, index) => index + 1)
          .filter((level) => !shelfSlotPlacementError(shelf, product, products, side, level))
          .map((level) => ({ shelfId: shelf.id, shelfSide: side, shelfLevel: level })),
      );
    },
  };
}

/** Starts the real API process on a temporary DATA_DIR; its startup runs the layout sync once. */
async function startApi(directory: string) {
  const port = await new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolve(port));
    });
  });
  const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    env: { ...process.env, DATA_DIR: directory, PORT: String(port), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { output += chunk; });
  const stop = () => new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    child.once('exit', () => resolve());
    child.kill();
  });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 90000;
  try {
    for (;;) {
      assert.equal(child.exitCode, null, `API exited early: ${output}`);
      assert.ok(Date.now() < deadline, `API did not start in time: ${output}`);
      try {
        if ((await fetch(`${base}/api/shelves`)).ok) break;
      } catch { /* not listening yet */ }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } catch (error) {
    await stop();
    throw error;
  }
  return { base, stop };
}

test('超市端拖拽陈列保存后重启：未安排和储存条件待确认的商品都保留人工位置', { timeout: 240000 }, async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'qinghe-samsclub-drag-drop-'));
  const databaseFile = path.join(directory, 'market.sqlite');
  const runImport = () => execFileSync(process.execPath,
    ['--import', 'tsx', 'scripts/import-samsclub-catalog.ts'],
    { env: { ...process.env, DATA_DIR: directory }, encoding: 'utf8', timeout: 60000 },
  );
  const api = await startApi(directory);
  try {
    const plan = (() => {
      const db = new DatabaseSync(databaseFile);
      try {
        const layout = placementLayout(db);
        const onSale = readRows<Product>(db, 'products').filter((product) => product.status !== 'archived');
        // Startup placed this one. Send it back to “awaiting placement” while the API is running,
        // like a product the planner could not fit until staff made room for it.
        const planned = onSale.find((product) => product.storageCondition === 'ambient-likely' && product.shelfId)!;
        const awaiting: Product = {
          ...planned, shelf: '', shelfId: undefined, shelfSide: undefined, shelfLevel: undefined, merchandisingState: 'unplaced',
        };
        db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(awaiting), awaiting.id);
        // Storage unknown: startup never picks a slot for these, so only staff can place them.
        const pending = onSale.filter((product) => product.storageCondition === 'unknown')
          .find((product) => layout.openSlots(product).length > 0)!;
        assert.ok(pending && !pending.shelfId && pending.merchandisingState === 'pending-review');
        // Not the slot startup would pick again (the one it just left), so a re-plan cannot pass by accident.
        const awaitingSlot = layout.openSlots(awaiting).filter((slot) => !sameSlot(slot, slotOf(planned))).at(-1)!;
        const pendingSlot = layout.openSlots(pending).at(-1)!;
        assert.ok(awaitingSlot && pendingSlot);
        return { awaiting, awaitingSlot, pending, pendingSlot };
      } finally { db.close(); }
    })();
    const drops = [[plan.awaiting, plan.awaitingSlot], [plan.pending, plan.pendingSlot]] as const;

    const saved: Product[] = [];
    for (const [product, slot] of drops) {
      const response = await fetch(`${api.base}/api/products/${encodeURIComponent(product.id)}/placement`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        // The same body the drag-and-drop board sends.
        body: JSON.stringify({ ...slot, expected: { shelfId: product.shelfId, shelfSide: product.shelfSide, shelfLevel: product.shelfLevel } }),
      });
      const body = await response.text();
      assert.equal(response.status, 200, body);
      saved.push(JSON.parse(body));
    }
    await api.stop();

    runImport(); // restart
    const reopened = new DatabaseSync(databaseFile, { readOnly: true });
    try {
      const get = (id: string): Product => JSON.parse(String(reopened.prepare('SELECT data FROM products WHERE id=?').get(id)?.data));
      for (const [product, slot] of drops) {
        const kept = get(product.id);
        assert.deepEqual(slotOf(kept), slot, `${product.name} must keep the slot staff chose`);
        assert.equal(kept.merchandisingState, 'placed');
      }
      // Placing a pending item does not review, price or list it.
      const kept = get(plan.pending.id);
      assert.equal(kept.storageCondition, 'unknown');
      assert.equal(kept.price, plan.pending.price);
      assert.equal(kept.stock, plan.pending.stock);
      assert.equal(kept.status, plan.pending.status);
    } finally { reopened.close(); }
    // The API recorded the state itself; startup did not have to repair it.
    assert.deepEqual(saved.map((product) => product.merchandisingState), ['placed', 'placed']);
  } finally {
    await api.stop();
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test('旧版拖拽留下的位置（状态仍是未安排/待复核）重启后保留；失效的位置仍被清除并重新安排', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'qinghe-samsclub-legacy-placement-'));
  const databaseFile = path.join(directory, 'market.sqlite');
  const runImport = () => execFileSync(process.execPath,
    ['--import', 'tsx', 'scripts/import-samsclub-catalog.ts'],
    { env: { ...process.env, DATA_DIR: directory }, encoding: 'utf8', timeout: 60000 },
  );
  try {
    runImport();
    const setup = (() => {
      const db = new DatabaseSync(databaseFile);
      try {
        const layout = placementLayout(db);
        const products = readRows<Product>(db, 'products');
        const onSale = products.filter((product) => product.status !== 'archived');
        const write = (product: Product) => db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(product), product.id);
        // How the drag-and-drop API used to save: slot fields only, merchandisingState left as it was.
        const dropped = (product: Product, slot: Slot, merchandisingState: Product['merchandisingState']): Product => ({
          ...product,
          shelf: layout.shelves.find((shelf) => shelf.id === slot.shelfId)!.name,
          ...slot,
          merchandisingState,
        });
        const staff = onSale.find((product) => product.storageCondition === 'ambient-likely' && product.shelfId)!;
        const staffSlot = layout.openSlots(staff).filter((slot) => !sameSlot(slot, slotOf(staff))).at(-1)!;
        const pending = onSale.filter((product) => product.storageCondition === 'unknown')
          .find((product) => layout.openSlots(product).length > 0)!;
        const pendingSlot = layout.openSlots(pending).at(-1)!;
        // A genuinely invalid slot: confirmed-frozen goods on an ambient gondola.
        const frozen = onSale.find((product) => product.storageCondition === 'frozen-confirmed' && product.shelfId)!;
        const gondola = layout.shelves.find((shelf) => shelf.kind === 'gondola' && shelf.reachable && shelf.footprint && Object.keys(shelf.accessPoints || {}).length)!;
        const invalidSlot: Slot = { shelfId: gondola.id, shelfSide: Object.keys(gondola.accessPoints!)[0] as Side, shelfLevel: 1 };
        assert.ok(shelfSlotPlacementError(gondola, frozen, products, invalidSlot.shelfSide, 1), 'precondition: frozen goods on an ambient gondola break the fixture rules');
        // Known storage but no slot: startup must still plan it.
        const waiting = onSale.find((product) => product.storageCondition === 'chilled-confirmed' && product.shelfId)!;
        assert.ok(staffSlot && pendingSlot);
        write(dropped(staff, staffSlot, 'unplaced'));
        write(dropped(pending, pendingSlot, 'pending-review'));
        write(dropped(frozen, invalidSlot, 'placed'));
        write({ ...waiting, shelf: '', shelfId: undefined, shelfSide: undefined, shelfLevel: undefined, merchandisingState: 'unplaced' });
        return { staff, staffSlot, pending, pendingSlot, frozen, invalidSlot, waiting };
      } finally { db.close(); }
    })();

    runImport(); // restart
    const reopened = new DatabaseSync(databaseFile, { readOnly: true });
    try {
      const get = (id: string): Product => JSON.parse(String(reopened.prepare('SELECT data FROM products WHERE id=?').get(id)?.data));
      for (const [product, slot] of [[setup.staff, setup.staffSlot], [setup.pending, setup.pendingSlot]] as const) {
        const kept = get(product.id);
        assert.deepEqual(slotOf(kept), slot, `${product.name} must keep the slot staff chose`);
        assert.equal(kept.merchandisingState, 'placed', 'a product holding a valid slot is recorded as placed');
      }
      const kept = get(setup.pending.id);
      assert.equal(kept.storageCondition, 'unknown');
      assert.equal(kept.price, setup.pending.price);
      assert.equal(kept.status, setup.pending.status);

      const replanned = get(setup.frozen.id);
      assert.ok(!sameSlot(slotOf(replanned), setup.invalidSlot), 'an invalid slot must be cleared');
      assert.equal(readRows<Shelf>(reopened, 'shelves').find((shelf) => shelf.id === replanned.shelfId)?.kind, 'freezer');
      assert.equal(replanned.merchandisingState, 'placed');

      const filled = get(setup.waiting.id);
      assert.ok(filled.shelfId, 'a product without a slot is still planned automatically');
      assert.equal(filled.merchandisingState, 'placed');
    } finally { reopened.close(); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
