import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { makeSeedProducts } from '../shared/catalog';
import type { Product } from '../shared/types';
import { zones } from '../shared/catalog';
import type { Point, Shelf, StoreCategory, StoreSection } from '../shared/types';
import { packageSize as inferPackageSize } from '../shared/shopping';
import { findPath, isWalkable } from '../shared/navigation';
import { entrance } from '../shared/catalog';
import {
  defaultFixture,
  fixedFixtures,
  legacyDefaultRects,
  mainAisles,
  realisticSections,
} from '../shared/layout';
import { fixtureAccessPoints } from '../shared/layout';
import { mapBounds } from '../shared/map-config';
import { realCatalogProducts } from '../shared/real-catalog';
import { openPricesUsdCatalog } from '../shared/open-prices-usd-catalog';
import { samsClubCategories, samsClubProducts, syncSamsClubProducts } from './samsclub-catalog';
import samsClubLayout from '../shared/samsclub-layout.json';
import {
  openPricesMerchandisingFamilies,
} from '../shared/open-prices-merchandising';
import { storeCategoryRenames } from '../shared/merchandising-display';
import {
  DEFAULT_CAPACITY_PER_SLOT,
  shelfSlotCapacity,
  shelfSlotPlacementError,
} from '../shared/shelf-capacity';
import {
  classifyOpenPricesProduct,
  decisionForOpenPricesBarcode,
  type ClassifiedOpenPricesProduct,
} from './open-prices-merchandising-migration';

const dataDirectory = path.resolve(process.env.DATA_DIR || 'data');
// The active catalog now comes from Sam’s Club. Do not resurrect the removed legacy batches.
const legacyCatalogEnabled = false;
mkdirSync(dataDirectory, { recursive: true });
export const db = new DatabaseSync(path.join(dataDirectory, 'market.sqlite'));
db.exec(
  'PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS store_categories (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS store_sections (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS shelves (id TEXT PRIMARY KEY, data TEXT NOT NULL);',
);
const initializeSamLayout = ['products', 'store_categories', 'store_sections', 'shelves'].every(
  (table) => (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count === 0,
);
const sectionInsert = db.prepare('INSERT OR IGNORE INTO store_sections (id, data) VALUES (?, ?)');
for (const zone of zones) sectionInsert.run(zone.id, JSON.stringify({ ...zone, active: true }));
const categoryInsert = db.prepare(
  'INSERT OR IGNORE INTO store_categories (id, data) VALUES (?, ?)',
);
const seedCategories: StoreCategory[] = [
  ...zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    active: true,
    sectionId: zone.id,
    kind: 'food' as const,
  })),
  { id: 'deli', name: '熟食', active: true, sectionId: 'bakery', kind: 'food' },
  { id: 'seasoning', name: '调味', active: true, sectionId: 'pantry', kind: 'food' },
  { id: 'snacks', name: '零食', active: true, sectionId: 'pantry', kind: 'food' },
  { id: 'clothing', name: '服饰', active: true, sectionId: 'pantry', kind: 'non_food' },
  { id: 'cleaning', name: '日用清洁', active: true, sectionId: 'pantry', kind: 'non_food' },
  { id: 'personal-care', name: '个护', active: true, sectionId: 'pantry', kind: 'non_food' },
  { id: 'home', name: '家居', active: true, sectionId: 'pantry', kind: 'non_food' },
];
for (const category of seedCategories) {
  categoryInsert.run(category.id, JSON.stringify(category));
  const row = db.prepare('SELECT data FROM store_categories WHERE id = ?').get(category.id) as
    { data: string } | undefined;
  if (row) {
    const existing = JSON.parse(row.data) as StoreCategory;
    if (!existing.kind)
      db.prepare('UPDATE store_categories SET data = ? WHERE id = ?').run(
        JSON.stringify({ ...existing, kind: category.kind }),
        category.id,
      );
  }
}
const shelfInsert = db.prepare('INSERT OR IGNORE INTO shelves (id, data) VALUES (?, ?)');
for (const zone of zones) {
  const id = `${zone.id}-shelf-01`;
  shelfInsert.run(
    id,
    JSON.stringify({
      id,
      sectionId: zone.id,
      name: `${zone.code}-01`,
      position: zone.location,
      reachable: true,
    }),
  );
}
const productInsert = db.prepare('INSERT OR IGNORE INTO products (id, data) VALUES (?, ?)');
db.exec('BEGIN');
try {
  if (legacyCatalogEnabled && process.env.SEED_DEMO_DATA === 'true')
    for (const product of makeSeedProducts())
      productInsert.run(product.id, JSON.stringify(product));
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}
const productRows = db.prepare('SELECT id, data FROM products').all() as {
  id: string;
  data: string;
}[];
const migrateProduct = db.prepare('UPDATE products SET data = ? WHERE id = ?');
for (const row of productRows) {
  const product = JSON.parse(row.data) as Product;
  if (!product.packageSize) {
    migrateProduct.run(
      JSON.stringify({ ...product, packageSize: inferPackageSize(product) }),
      row.id,
    );
  }
}
// Fill missing legacy shelf records, keeping every existing shelf and product assignment intact.
// Each legacy shelf number receives its own adjacent aisle point instead of a shared zone point.
const migrationSections = (
  db.prepare('SELECT data FROM store_sections').all() as { data: string }[]
).map((row) => JSON.parse(row.data) as StoreSection);
const migrationShelves = (db.prepare('SELECT data FROM shelves').all() as { data: string }[]).map(
  (row) => JSON.parse(row.data) as Shelf,
);
for (const row of productRows) {
  const product = JSON.parse(row.data) as Product;
  if (!product.shelf) continue;
  const section = migrationSections.find((item) => product.shelf.startsWith(`${item.code}-`));
  if (!section?.active) continue;
  const assigned = migrationShelves.find((item) => item.id === product.shelfId);
  // Previous demo seeding incorrectly assigned every -02/-03 product to shelf-01.
  const wrongSeedAssignment =
    product.shelfId === `${section.id}-shelf-01` &&
    assigned?.name === `${section.code}-01` &&
    [`${section.code}-02`, `${section.code}-03`].includes(product.shelf);
  if (assigned && !wrongSeedAssignment) continue;
  const bind = (shelf: Shelf) =>
    migrateProduct.run(
      JSON.stringify({
        ...product,
        packageSize: product.packageSize || inferPackageSize(product),
        shelfId: shelf.id,
      }),
      row.id,
    );
  const existingByName = migrationShelves.find(
    (item) => item.sectionId === section.id && item.name === product.shelf,
  );
  if (existingByName) {
    bind(existingByName);
    continue;
  }
  const occupied = new Set(
    migrationShelves
      .filter((item) => item.position)
      .map((item) => `${item.position!.x},${item.position!.y}`),
  );
  const candidates = [];
  const { x, y, w, h } = section.rect;
  for (let px = x - 1; px <= x + w; px++) {
    for (let py = y - 1; py <= y + h; py++) {
      if (px !== x - 1 && px !== x + w && py !== y - 1 && py !== y + h) continue;
      const point = { x: px, y: py };
      if (
        !occupied.has(`${px},${py}`) &&
        isWalkable(point, migrationSections) &&
        findPath(entrance, point, migrationSections).length
      )
        candidates.push(point);
    }
  }
  candidates.sort(
    (a, b) =>
      Math.abs(a.x - section.location.x) +
      Math.abs(a.y - section.location.y) -
      Math.abs(b.x - section.location.x) -
      Math.abs(b.y - section.location.y),
  );
  const id =
    product.shelfId && !wrongSeedAssignment
      ? product.shelfId
      : `${section.id}-shelf-${product.shelf.slice(section.code.length + 1).toLowerCase()}`;
  const shelf: Shelf = {
    id,
    name: product.shelf,
    sectionId: section.id,
    position: candidates[0] || null,
    reachable: !!candidates[0],
  };
  shelfInsert.run(id, JSON.stringify(shelf));
  migrationShelves.push(shelf);
  bind(shelf);
}
db.exec('CREATE TABLE IF NOT EXISTS layout_migrations (id TEXT PRIMARY KEY, backup TEXT NOT NULL)');
if (!db.prepare('SELECT id FROM layout_migrations WHERE id = ?').get('fixtures-v1')) {
  db.exec('BEGIN');
  try {
    const oldSections = (
      db.prepare('SELECT data FROM store_sections').all() as { data: string }[]
    ).map((r) => JSON.parse(r.data) as StoreSection);
    const oldShelves = (db.prepare('SELECT data FROM shelves').all() as { data: string }[]).map(
      (r) => JSON.parse(r.data) as Shelf,
    );
    const oldProducts = (db.prepare('SELECT data FROM products').all() as { data: string }[]).map(
      (r) => JSON.parse(r.data) as Product,
    );
    db.prepare('INSERT INTO layout_migrations (id, backup) VALUES (?, ?)').run(
      'fixtures-v1',
      JSON.stringify({ sections: oldSections, shelves: oldShelves, products: oldProducts }),
    );
    const matches = (a: StoreSection['rect'], b: StoreSection['rect']) =>
      a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
    const customSections = oldSections.filter(
      (s) => !legacyDefaultRects[s.id] || !matches(s.rect, legacyDefaultRects[s.id]),
    );
    const migrated = new Set<string>();
    for (const template of realisticSections) {
      const previous = oldSections.find((s) => s.id === template.id);
      if (
        previous &&
        (!legacyDefaultRects[previous.id] ||
          !matches(previous.rect, legacyDefaultRects[previous.id]))
      )
        continue;
      if (
        customSections.some(
          (s) =>
            s.active &&
            s.id !== template.id &&
            s.rect.x < template.rect.x + template.rect.w &&
            s.rect.x + s.rect.w > template.rect.x &&
            s.rect.y < template.rect.y + template.rect.h &&
            s.rect.y + s.rect.h > template.rect.y,
        )
      )
        continue;
      const section = {
        ...template,
        name: previous?.name || template.name,
        code: previous?.code || template.code,
        color: previous?.color || template.color,
        tint: previous?.tint || template.tint,
        active: previous?.active ?? true,
      };
      db.prepare(
        'INSERT INTO store_sections (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
      ).run(section.id, JSON.stringify(section));
      migrated.add(section.id);
      for (let index = 0; index < 3; index++) {
        const name = `${section.code}-${String(index + 1).padStart(2, '0')}`;
        const existing = oldShelves.find((s) => s.sectionId === section.id && s.name === name);
        if (existing?.footprint) continue;
        const shelf: Shelf = {
          ...(existing || {
            id: `${section.id}-shelf-${String(index + 1).padStart(2, '0')}`,
            sectionId: section.id,
            name,
            reachable: true,
          }),
          ...defaultFixture(section, index),
        };
        db.prepare(
          'INSERT INTO shelves (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
        ).run(shelf.id, JSON.stringify(shelf));
      }
    }
    for (const row of db.prepare('SELECT id, data FROM store_categories').all() as {
      id: string;
      data: string;
    }[]) {
      const category = JSON.parse(row.data) as StoreCategory;
      const target =
        category.kind === 'non_food' && category.sectionId === 'pantry'
          ? 'household'
          : category.id === 'deli' && category.sectionId === 'bakery'
            ? 'deli-service'
            : null;
      if (target && migrated.has(target))
        db.prepare('UPDATE store_categories SET data=? WHERE id=?').run(
          JSON.stringify({ ...category, sectionId: target }),
          row.id,
        );
    }
    const allShelves = (db.prepare('SELECT data FROM shelves').all() as { data: string }[]).map(
      (r) => JSON.parse(r.data) as Shelf,
    );
    for (const [index, product] of oldProducts.entries()) {
      let shelf =
        allShelves.find((s) => s.id === product.shelfId) ||
        allShelves.find((s) => s.name === product.shelf);
      if (
        ['toilet-paper', 'laundry-detergent'].includes(product.id) &&
        shelf?.sectionId === 'pantry' &&
        migrated.has('household')
      )
        shelf = allShelves.find(
          (s) => s.id === `household-shelf-${product.id === 'toilet-paper' ? '01' : '02'}`,
        );
      if (!shelf?.footprint || product.shelfSide || product.shelfLevel) continue;
      const sides = Object.keys(shelf.accessPoints || {}) as NonNullable<Product['shelfSide']>[];
      db.prepare('UPDATE products SET data=? WHERE id=?').run(
        JSON.stringify({
          ...product,
          shelf: shelf.name,
          shelfId: shelf.id,
          shelfSide: sides[index % sides.length],
          shelfLevel: (shelf.levels || 1) > 1 ? 2 : 1,
        }),
        product.id,
      );
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
export function getProducts(): Product[] {
  const shelves = (db.prepare('SELECT data FROM shelves').all() as { data: string }[]).map(
    (row) => JSON.parse(row.data) as Shelf,
  );
  return (db.prepare('SELECT data FROM products ORDER BY rowid').all() as { data: string }[]).map(
    (row) => withCurrentShelf(normalizeProduct(JSON.parse(row.data)), shelves),
  );
}
function normalizeProduct(product: Product): Product {
  return product.packageSize ? product : { ...product, packageSize: inferPackageSize(product) };
}
function withCurrentShelf(product: Product, shelves?: Shelf[]): Product {
  shelves ||= (db.prepare('SELECT data FROM shelves').all() as { data: string }[]).map(
    (row) => JSON.parse(row.data) as Shelf,
  );
  const shelf =
    shelves.find((item) => item.id === product.shelfId) ||
    shelves.find((item) => item.name === product.shelf);
  return shelf ? { ...product, shelfId: shelf.id, shelf: shelf.name } : product;
}
export function getProduct(id: string): Product | undefined {
  const row = db.prepare('SELECT data FROM products WHERE id = ?').get(id) as
    { data: string } | undefined;
  return row ? withCurrentShelf(normalizeProduct(JSON.parse(row.data))) : undefined;
}
export function saveProduct(product: Product) {
  // Only a changed unit redefines the package (manually entered goods use units such as “500g”).
  // Otherwise keep parsed net contents such as Sam’s Club sizes, which no form or SKU file edits.
  const stored = getProduct(product.id);
  const normalized = normalizeProduct(
    stored?.unit === product.unit ? product : { ...product, packageSize: undefined },
  );
  db.prepare(
    'INSERT INTO products (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
  ).run(normalized.id, JSON.stringify(normalized));
  return normalized;
}
function readTable<T>(table: string): T[] {
  return (db.prepare(`SELECT data FROM ${table} ORDER BY rowid`).all() as { data: string }[]).map(
    (row) => JSON.parse(row.data),
  );
}
export const getCategories = () => readTable<StoreCategory>('store_categories');
export const getSections = () => readTable<StoreSection>('store_sections');
export const getShelves = (includeDeleted = false) => {
  const activeSections = new Set(
    getSections()
      .filter((section) => section.active)
      .map((section) => section.id),
  );
  return readTable<Shelf>('shelves').map((shelf, index) => ({
    ...shelf,
    mapNumber: shelf.mapNumber || index + 1,
    reachable: shelf.reachable && activeSections.has(shelf.sectionId),
  })).filter((shelf) => includeDeleted || !shelf.deleted);
};
export function saveCategory(value: StoreCategory) {
  db.prepare(
    'INSERT INTO store_categories (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
  ).run(value.id, JSON.stringify(value));
  return value;
}
export function saveSection(value: StoreSection) {
  db.prepare(
    'INSERT INTO store_sections (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
  ).run(value.id, JSON.stringify(value));
  return value;
}
export function saveShelf(value: Shelf) {
  db.prepare(
    'INSERT INTO shelves (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
  ).run(value.id, JSON.stringify(value));
  return value;
}

// Family categories are inserted only after these table accessors initialize.
for (const [id, family] of Object.entries(openPricesMerchandisingFamilies)) {
  const sectionId = family.sectionId && getSections().some((section) => section.id === family.sectionId)
    ? family.sectionId
    : null;
  if (!getCategories().some((category) => category.id === id))
    saveCategory({ id, name: family.label, kind: family.kind, sectionId, active: true });
}

// Catalog rollout is additive. Legacy seed records are archived, not deleted.
if (!db.prepare('SELECT id FROM layout_migrations WHERE id=?').get('real-sku-v1')) {
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO layout_migrations (id, backup) VALUES (?, ?)').run(
      'real-sku-v1',
      JSON.stringify({
        products: getProducts(),
        sections: getSections(),
        shelves: getShelves(),
        categories: getCategories(),
      }),
    );
    const additions: StoreSection[] = [
      {
        id: 'paper-zone',
        name: '纸品与一次性用品',
        code: 'K',
        color: '#6e8c87',
        tint: '#eff6f3',
        rect: { x: 33, y: 2, w: 7, h: 8 },
        location: { x: 35, y: 9 },
        active: true,
      },
      {
        id: 'pet-zone',
        name: '宠物用品',
        code: 'L',
        color: '#9b8061',
        tint: '#f8f1e7',
        rect: { x: 33, y: 12, w: 7, h: 8 },
        location: { x: 35, y: 19 },
        active: true,
      },
      {
        id: 'care-zone',
        name: '日化与个人护理',
        code: 'M',
        color: '#8c80a4',
        tint: '#f3f0f8',
        rect: { x: 42, y: 2, w: 5, h: 8 },
        location: { x: 44, y: 9 },
        active: true,
      },
      {
        id: 'snack-zone',
        name: '零食与冷冻食品',
        code: 'N',
        color: '#ae8859',
        tint: '#faf3e8',
        rect: { x: 42, y: 12, w: 5, h: 8 },
        location: { x: 44, y: 19 },
        active: true,
      },
    ];
    for (const section of additions) {
      if (getSections().some((s) => s.id === section.id)) continue;
      if (
        getSections().some(
          (s) =>
            s.active &&
            s.rect.x < section.rect.x + section.rect.w &&
            s.rect.x + s.rect.w > section.rect.x &&
            s.rect.y < section.rect.y + section.rect.h &&
            s.rect.y + s.rect.h > section.rect.y,
        )
      )
        continue;
      saveSection(section);
      const count = section.rect.w >= 7 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const fixture: Shelf = {
          id: `${section.id}-shelf-${i + 1}`,
          sectionId: section.id,
          name: `${section.code}-${String(i + 1).padStart(2, '0')}`,
          reachable: true,
          ...defaultFixture(section, i),
        };
        if (section.id === 'snack-zone' && i === 1) {
          fixture.kind = 'freezer';
          fixture.levels = 1;
          fixture.footprint = { x: 44, y: 18, w: 3, h: 1 };
          fixture.accessPoints = { front: fixtureAccessPoints(fixture.footprint).front };
          fixture.position = fixture.accessPoints.front!;
        }
        saveShelf(fixture);
      }
    }
    const categories: StoreCategory[] = [
      {
        id: 'paper-goods',
        name: '纸品与湿巾',
        kind: 'non_food',
        active: true,
        sectionId: getSections().some((s) => s.id === 'paper-zone') ? 'paper-zone' : 'household',
      },
      {
        id: 'pet',
        name: '宠物食品与用品',
        kind: 'non_food',
        active: true,
        sectionId: getSections().some((s) => s.id === 'pet-zone') ? 'pet-zone' : 'household',
      },
      { id: 'frozen', name: '冷冻食品', kind: 'food', active: true, sectionId: 'snack-zone' },
      { id: 'beverages', name: '饮料与冲调', kind: 'food', active: true, sectionId: 'pantry' },
      { id: 'baby', name: '母婴用品', kind: 'non_food', active: true, sectionId: 'care-zone' },
    ];
    for (const category of categories)
      if (!getCategories().some((c) => c.id === category.id)) saveCategory({ ...category,
        sectionId: getSections().some((s) => s.id === category.sectionId) ? category.sectionId : null });
    const seedIds = new Set(makeSeedProducts().map((p) => p.id));
    for (const product of getProducts()) {
      if (
        process.env.SEED_DEMO_DATA !== 'true' && seedIds.has(product.id) &&
        product.history.length &&
        product.history.every((record) => record.source === 'seed')
      )
        saveProduct({ ...product, catalogOrigin: 'legacy-demo', status: 'archived', stock: 0 });
    }
    if (legacyCatalogEnabled)
      for (const product of realCatalogProducts()) if (!getProduct(product.id)) saveProduct(product);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function saveProductsAtomically(products: Product[]) {
  db.exec('BEGIN');
  try {
    for (const product of products) saveProduct(product);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
export function saveShelfAndProductsAtomically(shelf: Shelf, products: Product[]) {
  saveShelvesAndProductsAtomically([shelf], products);
}
export function saveShelvesAndProductsAtomically(shelves: Shelf[], products: Product[]) {
  db.exec('BEGIN');
  try {
    for (const shelf of shelves) saveShelf(shelf);
    for (const product of products) saveProduct(product);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Default retailer catalog is displayed immediately; no fictitious JD stock counts.
// Refresh public quotes only when a recorded quote changes, preserving manual pricing/images.
const retailerDefaults: Product[] = legacyCatalogEnabled ? realCatalogProducts() : [];
db.exec('BEGIN');
try {
  if (!db.prepare('SELECT id FROM layout_migrations WHERE id=?').get('retailer-display-v1'))
    db.prepare('INSERT INTO layout_migrations (id, backup) VALUES (?, ?)').run('retailer-display-v1', JSON.stringify({ products: getProducts() }));
  for (const [index, defaults] of retailerDefaults.entries()) {
    const previous = getProduct(defaults.id);
    if (!previous || previous.status === 'archived') continue;
    const changed: Product = { ...previous };
    if (previous.status === 'draft' && !previous.history.some((h) => h.source === 'manual' || h.source === 'suggested')) changed.status = 'active';
    if (!previous.inventoryMode && previous.stock === 0) changed.inventoryMode = 'untracked';
    const manualPrice = previous.priceOrigin === 'manual' || previous.history.some((h) => h.source === 'manual' || h.source === 'suggested');
    if (defaults.price > 0 && !manualPrice) {
      changed.price = defaults.price; changed.priceOrigin = 'jd-retail'; changed.priceSourceUrl = defaults.priceSourceUrl;
      changed.priceCheckedAt = defaults.priceCheckedAt; changed.priceNote = defaults.priceNote;
      changed.sourceSku = defaults.sourceSku; changed.sourceUrl = defaults.sourceUrl;
      if (previous.price !== defaults.price || !previous.history.length)
        changed.history = [...previous.history, { price: defaults.price, unit: previous.unit, date: defaults.priceCheckedAt!, source: 'retail' as const }].slice(-120);
    }
    if (!previous.image || previous.image === '/images/market.jpg' || previous.image === previous.sourceImageUrl) {
      changed.image = defaults.image; changed.sourceImageUrl = defaults.sourceImageUrl;
    }
    if (!previous.shelfId) {
      const category = getCategories().find((c) => c.id === previous.category);
      const candidates = getShelves().filter((s) => s.reachable && s.footprint && s.sectionId === category?.sectionId);
      const shelf = candidates[index % Math.max(1, candidates.length)];
      if (shelf) {
        const sides = Object.keys(shelf.accessPoints || {}) as NonNullable<Product['shelfSide']>[];
        changed.shelfId = shelf.id; changed.shelf = shelf.name; changed.shelfSide = sides[index % sides.length];
        changed.shelfLevel = (shelf.levels || 1) > 1 ? 2 : 1;
      }
    }
    changed.description = defaults.description;
    changed.tags = [changed.priceOrigin === 'jd-retail' ? '京东零售价' : changed.price > 0 ? '已上架' : '已上架 · 报价暂未获取'];
    if (JSON.stringify(changed) !== JSON.stringify(previous)) saveProduct(changed);
  }
  db.exec('COMMIT');
} catch (error) { db.exec('ROLLBACK'); throw error; }

// Keep the former synthetic assortment recoverable, but stop serving it to customers.
const displayArchiveId = 'display-catalog-archive-v1';
if (!db.prepare('SELECT id FROM layout_migrations WHERE id=?').get(displayArchiveId)) {
  const displayRows = (db.prepare('SELECT id, data FROM products').all() as {
    id: string;
    data: string;
  }[]).filter((row) => row.id.startsWith('display-'));
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO layout_migrations (id, backup) VALUES (?, ?)').run(
      displayArchiveId,
      JSON.stringify({ archivedAt: '2026-10-12', products: displayRows }),
    );
    for (const row of displayRows) {
      const product = JSON.parse(row.data) as Product;
      migrateProduct.run(JSON.stringify({ ...product, status: 'archived' }), row.id);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Preserve and hide the later-added Chinese JD/Sam catalog as one recoverable batch.
const cnRetailArchiveId = 'cn-retail-catalog-archive-v1';
if (!db.prepare('SELECT id FROM layout_migrations WHERE id=?').get(cnRetailArchiveId)) {
  const retailerIds = new Set(retailerDefaults.map((product) => product.id));
  const retailerRows = (db.prepare('SELECT id, data FROM products').all() as {
    id: string;
    data: string;
  }[]).filter((row) => retailerIds.has(row.id));
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO layout_migrations (id, backup) VALUES (?, ?)').run(
      cnRetailArchiveId,
      JSON.stringify({ archivedAt: '2026-10-12', products: retailerRows }),
    );
    for (const row of retailerRows) {
      const product = JSON.parse(row.data) as Product;
      const hasManualPrice =
        product.priceOrigin === 'manual' ||
        product.history.some((record) => record.source === 'manual' || record.source === 'suggested');
      if (hasManualPrice) {
        db.prepare('UPDATE products SET data=? WHERE id=?').run(
          JSON.stringify({ ...product, catalogOrigin: 'manual' }),
          row.id,
        );
        continue;
      }
      migrateProduct.run(JSON.stringify({ ...product, status: 'archived' }), row.id);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Initialize valid retained products to tracked stock 100 once; later restarts
// and additive imports never reset decremented/user-edited stock.
const stockDefaultMigrationId = 'initial-tracked-stock-100-v1';
if (!db.prepare('SELECT id FROM layout_migrations WHERE id=?').get(stockDefaultMigrationId)) {
  const stockRows = (db.prepare('SELECT id, data FROM products').all() as {
    id: string;
    data: string;
  }[]).filter((row) => {
    const product = JSON.parse(row.data) as Product;
    return product.status !== 'archived' && product.price > 0;
  });
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO layout_migrations (id, backup) VALUES (?, ?)').run(
      stockDefaultMigrationId,
      JSON.stringify({ initializedAt: '2026-10-12', products: stockRows }),
    );
    for (const row of stockRows) {
      const product = JSON.parse(row.data) as Product;
      migrateProduct.run(JSON.stringify({ ...product, stock: 100, inventoryMode: 'tracked' }), row.id);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const existingBarcodes = new Set(
  getProducts().map((product) => product.barcode).filter((barcode): barcode is string => !!barcode),
);
const importedOpenPrices = openPricesUsdCatalog
  .filter(() => legacyCatalogEnabled)
  .filter((record) => !existingBarcodes.has(record.barcode))
  .map((record): Product => {
    const unit = `${record.quantity}${record.quantityUnit}`;
    const decision = decisionForOpenPricesBarcode(record.barcode, record.categoriesTags);
    const priceNote = record.pricePer
      ? `Open Prices ${record.date} · USD/${record.pricePer}`
      : `Open Prices ${record.date} · USD包装参考价（来源未注明计价方式）`;
    const product: Product = {
      id: `openprices-usd-${record.barcode}`,
      sku: `OFF-${record.barcode}`,
      barcode: record.barcode,
      sourceSku: record.barcode,
      catalogOrigin: 'open-prices',
      status: 'active',
      inventoryMode: 'tracked',
      priceOrigin: 'open-prices',
      currency: 'USD',
      priceSourceUrl: `https://prices.openfoodfacts.org/api/v1/prices/${record.priceId}`,
      priceCheckedAt: record.date,
      priceNote,
      pricePer: record.pricePer,
      priceRecordId: record.priceId,
      priceIsDiscounted: record.discounted,
      priceWithoutDiscount: record.priceWithoutDiscount,
      priceLocationId: record.locationId || undefined,
      priceLocationOsmId: record.locationOsmId || undefined,
      priceLocationOsmType: record.locationOsmType || undefined,
      priceLocationName: record.locationName || undefined,
      priceLocationDisplayName: record.locationDisplayName || undefined,
      priceLocationCity: record.locationCity || undefined,
      priceLocationCountry: record.locationCountry || undefined,
      priceProofId: record.proofId || undefined,
      sourceImageUrl: record.imageUrl,
      sourceRetailer: record.locationName || 'Open Prices',
      sourceUrl: `https://world.openfoodfacts.org/product/${record.barcode}`,
      sourceListingUrl: `https://prices.openfoodfacts.org/api/v1/prices/${record.priceId}`,
      sourceCheckedAt: '2026-10-12',
      name: record.name,
      brand: record.brand,
      category: 'unclassified-review',
      price: record.price,
      unit,
      image: record.imageUrl,
      description: '',
      tags: [record.brand],
      aliases: [record.name, record.brand],
      stock: 100,
      shelf: '',
      saleMode: 'pack',
      history: [
        {
          price: record.price,
          unit,
          date: record.date,
          source: 'open-prices',
          currency: 'USD',
        },
      ],
      createdAt: '2026-10-12T00:00:00+08:00',
    };
    return classifyOpenPricesProduct(product, decision);
  });
db.exec('BEGIN');
try {
  for (const product of importedOpenPrices)
    productInsert.run(product.id, JSON.stringify(product));
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

// Backfill the embedded Open Prices store metadata for the first imported batch
// without changing its price, location ID, shelf assignment, or stock.
const openPricesLocationMigrationId = 'openprices-location-metadata-v1';
if (!db.prepare('SELECT id FROM layout_migrations WHERE id=?').get(openPricesLocationMigrationId)) {
  const byBarcode = new Map(openPricesUsdCatalog.map((record) => [record.barcode, record]));
  const rows = (db.prepare('SELECT id, data FROM products').all() as { id: string; data: string }[])
    .filter((row) => {
      const product = JSON.parse(row.data) as Product;
      return product.catalogOrigin === 'open-prices' && !!product.barcode && byBarcode.has(product.barcode);
    });
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO layout_migrations (id, backup) VALUES (?, ?)').run(
      openPricesLocationMigrationId,
      JSON.stringify({ backedUpAt: '2026-10-12', products: rows }),
    );
    for (const row of rows) {
      const product = JSON.parse(row.data) as Product;
      const record = byBarcode.get(product.barcode!);
      if (!record) continue;
      saveProduct({
        ...product,
        priceLocationName: product.priceLocationName || record.locationName || undefined,
        priceLocationDisplayName: product.priceLocationDisplayName || record.locationDisplayName || undefined,
        priceLocationCity: product.priceLocationCity || record.locationCity || undefined,
        priceLocationCountry: product.priceLocationCountry || record.locationCountry || undefined,
      });
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Migrate the reviewed barcode decisions once. This snapshot includes the whole
// affected catalog and layout; prices, stock, history, and non-target records are
// copied through unchanged.
const openPricesMerchandisingMigrationId = 'openprices-merchandising-layout-v1';
if (legacyCatalogEnabled && !db.prepare('SELECT id FROM layout_migrations WHERE id=?').get(openPricesMerchandisingMigrationId)) {
  const byBarcode = new Map(openPricesUsdCatalog.map((record) => [record.barcode, record]));
  const targetRows = (db.prepare('SELECT id, data FROM products').all() as { id: string; data: string }[])
    .filter((row) => {
      const product = JSON.parse(row.data) as Product;
      return product.catalogOrigin === 'open-prices' && !!product.barcode && byBarcode.has(product.barcode);
    });
  if (targetRows.length !== openPricesUsdCatalog.length)
    throw new Error(`Open Prices 陈列迁移需要 ${openPricesUsdCatalog.length} 条条码商品，实际找到 ${targetRows.length} 条。`);

  const targetIds = new Set(targetRows.map((row) => row.id));
  const classified = targetRows.map(({ id, data }) => {
    const product = JSON.parse(data) as Product;
    const record = byBarcode.get(product.barcode!)!;
    const decision = decisionForOpenPricesBarcode(product.barcode!, record.categoriesTags);
    const next = classifyOpenPricesProduct(product, decision);
    return {
      id,
      original: data,
      decision,
      product: {
        ...next,
        shelf: '',
        shelfId: undefined,
        shelfSide: undefined,
        shelfLevel: undefined,
      } as ClassifiedOpenPricesProduct,
    };
  });

  const newSections: StoreSection[] = [
    {
      id: 'openprices-ambient-north',
      name: '常温商品陈列区 · 北排',
      code: 'P',
      color: '#72805a',
      tint: '#f2f3e9',
      rect: { x: 49, y: 1, w: 19, h: 9 },
      location: { x: 49, y: 5 },
      active: true,
    },
    {
      id: 'openprices-ambient-south',
      name: '常温商品陈列区 · 南排',
      code: 'Q',
      color: '#72805a',
      tint: '#f2f3e9',
      rect: { x: 49, y: 12, w: 19, h: 8 },
      location: { x: 49, y: 16 },
      active: true,
    },
    {
      id: 'openprices-frozen',
      name: '冷冻商品陈列区',
      code: 'R',
      color: '#5b8390',
      tint: '#edf5f7',
      rect: { x: 49, y: 22, w: 19, h: 1 },
      location: { x: 49, y: 21 },
      active: true,
    },
  ];
  const overlaps = (a: StoreSection['rect'], b: StoreSection['rect']) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const currentSections = getSections();
  for (const section of newSections) {
    const existing = currentSections.find((candidate) => candidate.id === section.id);
    if (existing) {
      if (JSON.stringify(existing.rect) !== JSON.stringify(section.rect))
        throw new Error(`陈列扩区 ${section.name} 与现有同名区域几何不符，未自动覆盖。`);
      continue;
    }
    const collision = currentSections.find((candidate) => candidate.active && overlaps(candidate.rect, section.rect));
    if (collision) throw new Error(`新增区域 ${section.name} 与现有区域 ${collision.name} 重叠，未移动商品。`);
  }

  db.exec('BEGIN');
  try {
    const snapshot = {
      snapshotAt: '2026-10-12',
      sections: db.prepare('SELECT id, data FROM store_sections').all(),
      shelves: db.prepare('SELECT id, data FROM shelves').all(),
      categories: db.prepare('SELECT id, data FROM store_categories').all(),
      products: targetRows,
    };
    db.prepare('INSERT INTO layout_migrations (id, backup) VALUES (?, ?)').run(
      openPricesMerchandisingMigrationId,
      JSON.stringify(snapshot),
    );

    for (const section of newSections) {
      if (!currentSections.some((candidate) => candidate.id === section.id)) saveSection(section);
    }
    const ambientGroups = [...new Set(
      classified
        .filter(({ product }) => product.merchandisingState === 'placed' && product.displayGroup?.startsWith('ambient-'))
        .map(({ product }) => product.displayGroup!),
    )].filter((group) => group !== 'ambient-non-food');
    const freezerGroups = [...new Set(
      classified
        .filter(({ product }) => product.merchandisingState === 'placed' && product.storageCondition === 'frozen-confirmed')
        .map(({ product }) => product.displayGroup!),
    )];

    const shelfRows = db.prepare('SELECT id, data FROM shelves').all() as { id: string; data: string }[];
    const existingShelves = shelfRows.map(({ data }) => JSON.parse(data) as Shelf);
    const shelfUpsert = db.prepare('INSERT INTO shelves (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data');
    const newAmbientShelves: Shelf[] = [];
    let ambientIndex = 0;
    for (const { sectionId, y, count } of [
      { sectionId: 'openprices-ambient-north', y: 2, count: 7 },
      { sectionId: 'openprices-ambient-north', y: 6, count: 7 },
      { sectionId: 'openprices-ambient-south', y: 13, count: 7 },
      { sectionId: 'openprices-ambient-south', y: 17, count: 6 },
    ]) {
      for (let column = 0; column < count; column++) {
        const x = 50 + column * 2;
        const footprint = { x, y, w: 1, h: 3 };
        const points = fixtureAccessPoints(footprint);
        const shelf: Shelf = {
          id: `openprices-ambient-shelf-${String(++ambientIndex).padStart(2, '0')}`,
          sectionId,
          name: `常温-${String(ambientIndex).padStart(2, '0')}`,
          kind: 'gondola',
          footprint,
          levels: 4,
          capacityPerSlot: DEFAULT_CAPACITY_PER_SLOT,
          allowedDisplayGroups: ambientGroups,
          accessPoints: { left: points.left, right: points.right },
          position: points.left,
          reachable: true,
        };
        newAmbientShelves.push(shelf);
        shelfUpsert.run(shelf.id, JSON.stringify(shelf));
      }
    }

    const frozenShelves: Shelf[] = [];
    for (let index = 0; index < 6; index++) {
      const x = 50 + index * 3;
      const footprint = { x, y: 22, w: 3, h: 1 };
      const points = fixtureAccessPoints(footprint);
      const shelf: Shelf = {
        id: `openprices-freezer-${String(index + 1).padStart(2, '0')}`,
        sectionId: 'openprices-frozen',
        name: `冷冻-${String(index + 1).padStart(2, '0')}`,
        kind: 'freezer',
        footprint,
        levels: 1,
        capacityPerSlot: DEFAULT_CAPACITY_PER_SLOT,
        allowedDisplayGroups: freezerGroups,
        accessPoints: { front: points.front },
        position: points.front,
        reachable: true,
      };
      frozenShelves.push(shelf);
      shelfUpsert.run(shelf.id, JSON.stringify(shelf));
    }

    const byId = new Map(existingShelves.map((shelf) => [shelf.id, shelf]));
    const updateShelfGroups = (id: string, groups: string[]) => {
      const shelf = byId.get(id);
      if (!shelf) throw new Error(`陈列迁移缺少既有设施 ${id}。`);
      const updated = { ...shelf, capacityPerSlot: shelf.capacityPerSlot || DEFAULT_CAPACITY_PER_SLOT, allowedDisplayGroups: groups };
      byId.set(id, updated);
      shelfUpsert.run(updated.id, JSON.stringify(updated));
    };
    for (const id of ['pantry-shelf-01', 'legacy-pantry-19', 'legacy-pantry-20'])
      updateShelfGroups(id, ambientGroups);
    updateShelfGroups('household-shelf-01', ['ambient-non-food']);
    updateShelfGroups('snack-zone-shelf-2', freezerGroups);

    const freshFruitShelf = byId.get('fruit-shelf-01');
    const freshVegetableShelf = byId.get('vegetables-shelf-01');
    if (!freshFruitShelf || !freshVegetableShelf)
      throw new Error('陈列迁移需要原有水果与蔬菜台。');
    for (const shelf of existingShelves.filter((item) => item.sectionId === 'fruit'))
      updateShelfGroups(shelf.id, ['produce-fruit']);
    for (const shelf of existingShelves.filter((item) => item.sectionId === 'vegetables'))
      updateShelfGroups(shelf.id, ['produce-vegetable']);
    for (const shelf of existingShelves.filter((item) => item.sectionId === 'meat'))
      updateShelfGroups(shelf.id, ['fresh-meat']);
    for (const shelf of existingShelves.filter((item) => item.sectionId === 'seafood'))
      updateShelfGroups(shelf.id, ['fresh-seafood']);

    const allShelves = (db.prepare('SELECT data FROM shelves').all() as { data: string }[])
      .map(({ data }) => JSON.parse(data) as Shelf);
    const sections = getSections();
    const targetProducts = new Map(classified.map(({ id, product }) => [id, product]));
    const workingProducts = (db.prepare('SELECT data FROM products').all() as { data: string }[])
      .map(({ data }) => JSON.parse(data) as Product)
      .filter((product) => !targetIds.has(product.id) && product.status !== 'archived');
    const plannedSlots = new Map<string, string>();
    for (const product of workingProducts) {
      if (!product.shelfId || !product.shelfSide) continue;
      plannedSlots.set(`${product.shelfId}|${product.shelfSide}|${product.shelfLevel || 1}`, product.displayGroup || '__occupied__');
    }
    const candidateSlots = (shelfIds: Set<string>) => allShelves.flatMap((shelf) => {
      if (!shelfIds.has(shelf.id) || !shelf.footprint || !shelf.reachable) return [];
      return Object.entries(shelf.accessPoints || []).flatMap(([side, point]) => {
        if (!point || !findPath(entrance, point, sections, allShelves).length) return [];
        return Array.from({ length: shelf.levels || 1 }, (_, index) => ({
          shelf,
          side: side as NonNullable<Product['shelfSide']>,
          level: index + 1,
        }));
      });
    });
    const placeGroup = (group: string, products: ClassifiedOpenPricesProduct[], slots: ReturnType<typeof candidateSlots>) => {
      for (const product of products) {
        const slot = slots.find((candidate) => {
          const key = `${candidate.shelf.id}|${candidate.side}|${candidate.level}`;
          const currentGroup = plannedSlots.get(key);
          return (!currentGroup || currentGroup === group) &&
            !shelfSlotPlacementError(candidate.shelf, product, workingProducts, candidate.side, candidate.level);
        });
        if (!slot) throw new Error(`“${product.name}”(${product.sku || product.id}) 的陈列分组 ${group} 没有剩余兼容容量。`);
        const key = `${slot.shelf.id}|${slot.side}|${slot.level}`;
        plannedSlots.set(key, group);
        const placed = {
          ...product,
          shelfId: slot.shelf.id,
          shelf: slot.shelf.name,
          shelfSide: slot.side,
          shelfLevel: slot.level,
        } as ClassifiedOpenPricesProduct;
        targetProducts.set(product.id, placed);
        workingProducts.push(placed);
      }
    };

    const groups = new Map<string, ClassifiedOpenPricesProduct[]>();
    for (const product of targetProducts.values()) {
      if (product.status === 'archived' || product.merchandisingState !== 'placed') continue;
      const group = product.displayGroup || 'unclassified-review';
      groups.set(group, [...(groups.get(group) || []), product]);
    }
    const ambientShelfIds = new Set([
      'pantry-shelf-01',
      'legacy-pantry-19',
      'legacy-pantry-20',
      ...newAmbientShelves.map((shelf) => shelf.id),
    ]);
    const freezerShelfIds = new Set([
      'snack-zone-shelf-2',
      ...frozenShelves.map((shelf) => shelf.id),
    ]);
    const ambientSlots = candidateSlots(ambientShelfIds);
    const freezerSlots = candidateSlots(freezerShelfIds);
    const freshFruitSlots = candidateSlots(new Set(['fruit-shelf-01']));
    const freshVegetableSlots = candidateSlots(new Set(['vegetables-shelf-01']));
    const nonFoodSlots = candidateSlots(new Set(['household-shelf-01']));
    for (const [group, products] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
      if (group === 'produce-fruit') placeGroup(group, products, freshFruitSlots);
      else if (group === 'produce-vegetable') placeGroup(group, products, freshVegetableSlots);
      else if (group === 'ambient-non-food') placeGroup(group, products, nonFoodSlots);
      else if (productGroupStorage(products) === 'frozen') placeGroup(group, products, freezerSlots);
      else if (group.startsWith('ambient-')) placeGroup(group, products, ambientSlots);
      else throw new Error(`已确认商品的陈列分组“${group}”未配置适配设施。`);
    }

    for (const [id, product] of targetProducts) {
      db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(product), id);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function productGroupStorage(products: ClassifiedOpenPricesProduct[]): 'frozen' | 'ambient' {
  return products.some((product) => product.storageCondition === 'frozen-confirmed') ? 'frozen' : 'ambient';
}

// Tighten only the new Open Prices fixture rows; keep the original departments
// and their user-managed fixture positions intact.
const openPricesLayoutDensityMigrationId = 'openprices-layout-density-v1';
if (legacyCatalogEnabled && !db.prepare('SELECT id FROM layout_migrations WHERE id=?').get(openPricesLayoutDensityMigrationId)) {
  const targetSectionIds = new Set([
    'openprices-ambient-north',
    'openprices-ambient-south',
    'openprices-frozen',
  ]);
  const targetShelfIds = new Set([
    ...Array.from({ length: 27 }, (_, index) => `openprices-ambient-shelf-${String(index + 1).padStart(2, '0')}`),
    ...Array.from({ length: 6 }, (_, index) => `openprices-freezer-${String(index + 1).padStart(2, '0')}`),
  ]);
  const originalSections = (db.prepare('SELECT id,data FROM store_sections').all() as { id: string; data: string }[])
    .filter((row) => targetSectionIds.has(row.id));
  const originalShelves = (db.prepare('SELECT id,data FROM shelves').all() as { id: string; data: string }[])
    .filter((row) => targetShelfIds.has(row.id));
  if (originalSections.length !== 3 || originalShelves.length !== 33)
    throw new Error('货架间距迁移需要原有3个扩区和33个新增设施。');

  db.exec('BEGIN');
  try {
    const productRows = (db.prepare('SELECT id,data FROM products').all() as { id: string; data: string }[])
      .filter((row) => (JSON.parse(row.data) as Product).catalogOrigin === 'open-prices');
    db.prepare('INSERT INTO layout_migrations (id,backup) VALUES (?,?)').run(
      openPricesLayoutDensityMigrationId,
      JSON.stringify({
        snapshotAt: '2026-10-12',
        previousMapBounds: { maxX: 77, maxY: 23 },
        sections: originalSections,
        shelves: originalShelves,
        productLocations: productRows.map(({ id, data }) => {
          const product = JSON.parse(data) as Product;
          return {
            id,
            shelfId: product.shelfId,
            shelf: product.shelf,
            shelfSide: product.shelfSide,
            shelfLevel: product.shelfLevel,
          };
        }),
      }),
    );

    const sectionUpsert = db.prepare(
      'INSERT INTO store_sections (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
    );
    for (const row of originalSections) {
      const section = JSON.parse(row.data) as StoreSection;
      section.rect = { ...section.rect, w: 19 };
      sectionUpsert.run(section.id, JSON.stringify(section));
    }

    const shelfUpsert = db.prepare(
      'INSERT INTO shelves (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
    );
    const movedShelves: Shelf[] = [];
    for (let index = 0; index < 27; index++) {
      const id = `openprices-ambient-shelf-${String(index + 1).padStart(2, '0')}`;
      const row = originalShelves.find((item) => item.id === id);
      if (!row) throw new Error(`货架间距迁移缺少设施 ${id}。`);
      const shelf = JSON.parse(row.data) as Shelf;
      const withinRow = index % 7;
      const footprint = { ...shelf.footprint!, x: 50 + withinRow * 2, w: 1, h: 3 };
      const points = fixtureAccessPoints(footprint);
      const updated: Shelf = {
        ...shelf,
        footprint,
        accessPoints: { left: points.left, right: points.right },
        position: points.left,
      };
      movedShelves.push(updated);
      shelfUpsert.run(updated.id, JSON.stringify(updated));
    }
    for (let index = 0; index < 6; index++) {
      const id = `openprices-freezer-${String(index + 1).padStart(2, '0')}`;
      const row = originalShelves.find((item) => item.id === id);
      if (!row) throw new Error(`货架间距迁移缺少设施 ${id}。`);
      const shelf = JSON.parse(row.data) as Shelf;
      const footprint = { ...shelf.footprint!, x: 50 + index * 3, y: 22, w: 3, h: 1 };
      const points = fixtureAccessPoints(footprint);
      const updated: Shelf = {
        ...shelf,
        footprint,
        accessPoints: { front: points.front },
        position: points.front,
      };
      movedShelves.push(updated);
      shelfUpsert.run(updated.id, JSON.stringify(updated));
    }

    const allSections = getSections();
    const allShelves = getShelves();
    const overlaps = (a: NonNullable<Shelf['footprint']>, b: NonNullable<Shelf['footprint']>) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    for (const section of allSections.filter((item) => targetSectionIds.has(item.id))) {
      if (
        section.rect.x < 1 || section.rect.x + section.rect.w - 1 > mapBounds.maxX ||
        section.rect.y < 1 || section.rect.y + section.rect.h - 1 > mapBounds.maxY
      ) throw new Error(`扩区 ${section.name} 超出缩紧后的地图边界。`);
    }
    for (const moved of movedShelves) {
      if (!moved.footprint) throw new Error(`设施 ${moved.id} 缺少footprint。`);
      if (
        moved.footprint.x < 1 || moved.footprint.x + moved.footprint.w - 1 > mapBounds.maxX ||
        moved.footprint.y < 1 || moved.footprint.y + moved.footprint.h - 1 > mapBounds.maxY
      ) throw new Error(`设施 ${moved.name} 超出缩紧后的地图边界。`);
      const collision = allShelves.find((other) =>
        other.id !== moved.id && other.footprint && overlaps(moved.footprint!, other.footprint),
      );
      if (collision) throw new Error(`设施 ${moved.name} 与设施 ${collision.name} 重叠。`);
      for (const point of Object.values(moved.accessPoints || {})) {
        if (!point || !isWalkable(point, allSections, allShelves) || !findPath(entrance, point, allSections, allShelves).length)
          throw new Error(`设施 ${moved.name} 的访问点不可达。`);
      }
    }

    const activeProducts = getProducts().filter((product) => product.status !== 'archived');
    const placedOpenPrices = activeProducts.filter(
      (product) => product.catalogOrigin === 'open-prices' && product.merchandisingState === 'placed',
    );
    const slotCounts = new Map<string, number>();
    for (const product of activeProducts) {
      if (!product.shelfId || !product.shelfSide) continue;
      const key = `${product.shelfId}|${product.shelfSide}|${product.shelfLevel || 1}`;
      slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
    }
    for (const [key, count] of slotCounts) {
      const shelf = allShelves.find((item) => item.id === key.split('|')[0]);
      if (!shelf || count > shelfSlotCapacity(shelf))
        throw new Error(`设施层位 ${key} 超过配置容量。`);
    }
    for (const product of placedOpenPrices) {
      const shelf = allShelves.find((item) => item.id === product.shelfId);
      const point = shelf?.accessPoints?.[product.shelfSide!];
      if (
        !shelf || !point || !isWalkable(point, allSections, allShelves) ||
        !findPath(entrance, point, allSections, allShelves).length ||
        shelfSlotPlacementError(shelf, product, activeProducts, product.shelfSide!, product.shelfLevel || 1)
      ) throw new Error(`商品 ${product.id} 的压缩后货架访问点、分类兼容性或容量校验失败。`);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Add verified Sam’s Club batches without replacing prior products or staff edits.
db.exec('BEGIN');
try {
  if (initializeSamLayout) {
    // Fresh clones need the validated fixture geometry, including the former
    // legacy fixture IDs used by the replanner. Never replace an existing store.
    db.exec('DELETE FROM shelves; DELETE FROM store_sections; DELETE FROM store_categories;');
    for (const category of samsClubLayout.categories) categoryInsert.run(category.id, JSON.stringify(category));
    for (const section of samsClubLayout.sections) sectionInsert.run(section.id, JSON.stringify(section));
    for (const shelf of samsClubLayout.shelves) shelfInsert.run(shelf.id, JSON.stringify(shelf));
  }
  for (const category of samsClubCategories(getCategories())) saveCategory(category);
  // Rename categories that still carry an earlier seeded default; staff names stay.
  for (const category of getCategories()) {
    const rename = storeCategoryRenames[category.id];
    if (rename?.from.includes(category.name)) saveCategory({ ...category, name: rename.name });
  }
  for (const shelf of getShelves()) {
    const groups = shelf.allowedDisplayGroups || [];
    if (!groups.length) continue;
    let allowedDisplayGroups = groups;
    if (shelf.kind === 'chiller' && shelf.sectionId === 'meat')
      // Raw-meat chillers take chilled raw meat; the ready-to-eat chiller stays separate.
      allowedDisplayGroups = groups.includes('chilled-meat-prepared') && !groups.includes('review-meat-raw')
        ? groups.filter((group) => group !== 'chilled-meat-raw')
        : [...new Set([...groups, 'chilled-meat-raw'])];
    // Shelf-stable meat and reviewed condiments use the general ambient food fixtures.
    else if (groups.includes('ambient-pantry')) allowedDisplayGroups = [...new Set([...groups, 'ambient-meat'])];
    else if (groups.includes('ambient-sauces'))
      allowedDisplayGroups = [...new Set([...groups, 'ambient-seasoning', 'ambient-pantry', 'ambient-meat'])];
    if (allowedDisplayGroups.join('|') !== groups.join('|'))
      db.prepare('UPDATE shelves SET data=? WHERE id=?').run(JSON.stringify({ ...shelf, allowedDisplayGroups }), shelf.id);
  }
  // Café hot food is ordered at a service counter in the deli section (added 2026-10-20). Existing
  // stores get it only where it fits: inside its section, clear of fixtures and main aisles, and
  // without its staff band cutting off a pickup point that customers can reach today.
  const hotCounter = samsClubLayout.shelves.find((shelf) => shelf.id === 'deli-hot-counter') as
    | Shelf
    | undefined;
  const shelvesBeforeCounter = getShelves();
  if (hotCounter?.footprint && !shelvesBeforeCounter.some((shelf) => shelf.id === hotCounter.id)) {
    type Rect = NonNullable<Shelf['footprint']>;
    const sections = getSections();
    const section = sections.find((item) => item.id === hotCounter.sectionId && item.active);
    const footprint = hotCounter.footprint;
    const band = { ...footprint, y: footprint.y - 1, h: 1 };
    const overlap = (a: Rect, b: Rect) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const key = (point: Point) => `${point.x},${point.y}`;
    const reachableCells = (fixtures: Shelf[]) => {
      const seen = new Set([key(entrance)]);
      const queue: Point[] = [entrance];
      for (let i = 0; i < queue.length; i++)
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const next = { x: queue[i].x + dx, y: queue[i].y + dy };
          if (!seen.has(key(next)) && isWalkable(next, sections, fixtures)) {
            seen.add(key(next));
            queue.push(next);
          }
        }
      return seen;
    };
    const before = reachableCells(shelvesBeforeCounter);
    const after = reachableCells([...shelvesBeforeCounter, hotCounter]);
    const pickupPoints = [
      ...shelvesBeforeCounter
        .filter((shelf) => shelf.reachable)
        .flatMap((shelf) => Object.values(shelf.accessPoints || {})),
      ...sections.filter((item) => item.active).map((item) => item.location),
    ].filter((point): point is Point => !!point && before.has(key(point)));
    const fits =
      !!section &&
      footprint.x >= section.rect.x &&
      footprint.y >= section.rect.y &&
      footprint.x + footprint.w <= section.rect.x + section.rect.w &&
      footprint.y + footprint.h <= section.rect.y + section.rect.h &&
      !shelvesBeforeCounter.some((shelf) => shelf.footprint && overlap(shelf.footprint, footprint)) &&
      ![...fixedFixtures.map((fixture) => fixture.rect), ...mainAisles].some(
        (rect) => overlap(rect, footprint) || overlap(rect, band),
      ) &&
      Object.values(hotCounter.accessPoints || {}).every((point) => !!point && after.has(key(point))) &&
      pickupPoints.every((point) => after.has(key(point)));
    if (fits) shelfInsert.run(hotCounter.id, JSON.stringify(hotCounter));
    else
      console.warn(
        '现做热食档口与现有门店布局冲突，未自动添加；请在超市端为熟食档口新增服务柜台，陈列分组填写 hot-deli-prepared。',
      );
  }
  // Reviewed catalog fields (category, storage, package size, archive) reach existing stores
  // unless staff changed them; categories emptied by the review are hidden.
  for (const product of syncSamsClubProducts(getProducts(), getShelves()))
    db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(product), product.id);
  const usedCategories = new Set(getProducts().filter((product) => product.status !== 'archived').map((product) => product.category));
  for (const category of getCategories())
    if (category.id.startsWith('samsclub-') && category.active && !usedCategories.has(category.id))
      saveCategory({ ...category, active: false });
  const current = getProducts();
  const layoutShelves = getShelves();
  const retryPlacement = current.filter((product) => !product.manualPlacement && product.sourceRetailer === 'Sam’s Club US' && product.status !== 'archived' && (
    product.merchandisingState !== 'placed' ||
    (product.category === 'meat' && ['chilled-confirmed', 'chilled-or-frozen-confirmed'].includes(product.storageCondition || '') && product.shelfId && layoutShelves.find((shelf) => shelf.id === product.shelfId)?.sectionId !== 'meat')
  ));
  const movedIds = new Set(retryPlacement.map((product) => product.id));
  for (const placed of samsClubProducts(current.filter((product) => !movedIds.has(product.id)), getShelves(), getSections()).filter((product) => movedIds.has(product.id))) {
    const previous = retryPlacement.find((product) => product.id === placed.id)!;
    db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify({ ...previous, shelf: placed.shelf, shelfId: placed.shelfId, shelfSide: placed.shelfSide, shelfLevel: placed.shelfLevel, merchandisingState: placed.merchandisingState }), placed.id);
  }
  for (const product of samsClubProducts(getProducts(), getShelves(), getSections()))
    productInsert.run(product.id, JSON.stringify(product));
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}
