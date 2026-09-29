import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { makeSeedProducts } from '../shared/catalog';
import type { Product } from '../shared/types';
import { zones } from '../shared/catalog';
import type { Shelf, StoreCategory, StoreSection } from '../shared/types';
import { packageSize as inferPackageSize } from '../shared/shopping';

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
  for (const product of makeSeedProducts())
    productInsert.run(product.id, JSON.stringify(product));
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}
const productRows = db.prepare('SELECT id, data FROM products').all() as { id: string; data: string }[];
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
