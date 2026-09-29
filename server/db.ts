import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { makeSeedProducts } from '../shared/catalog';
import type { Product } from '../shared/types';
import { zones } from '../shared/catalog';
import type { Shelf, StoreCategory, StoreSection } from '../shared/types';
import { packageSize as inferPackageSize } from '../shared/shopping';
import { findPath, isWalkable } from '../shared/navigation';
import { entrance } from '../shared/catalog';
import { defaultFixture, legacyDefaultRects, realisticSections } from '../shared/layout';

const dataDirectory = path.resolve(process.env.DATA_DIR || 'data');
mkdirSync(dataDirectory, { recursive: true });
export const db = new DatabaseSync(path.join(dataDirectory, 'market.sqlite'));
db.exec(
  'PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS store_categories (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS store_sections (id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS shelves (id TEXT PRIMARY KEY, data TEXT NOT NULL);',
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
  for (const product of makeSeedProducts()) productInsert.run(product.id, JSON.stringify(product));
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
  const normalized = normalizeProduct({ ...product, packageSize: undefined });
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
export const getShelves = () => {
  const activeSections = new Set(
    getSections()
      .filter((section) => section.active)
      .map((section) => section.id),
  );
  return readTable<Shelf>('shelves').map((shelf) => ({
    ...shelf,
    reachable: shelf.reachable && activeSections.has(shelf.sectionId),
  }));
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
