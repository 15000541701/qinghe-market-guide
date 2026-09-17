import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { makeSeedProducts } from '../shared/catalog';
import type { Product } from '../shared/types';

const dataDirectory = path.resolve(process.env.DATA_DIR || 'data');
mkdirSync(dataDirectory, { recursive: true });
export const db = new DatabaseSync(path.join(dataDirectory, 'market.sqlite'));
db.exec(
  'PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL);',
);
const count = db.prepare('SELECT COUNT(*) as total FROM products').get() as { total: number };
if (!count.total) {
  const insert = db.prepare('INSERT INTO products (id, data) VALUES (?, ?)');
  db.exec('BEGIN');
  try {
    for (const product of makeSeedProducts()) insert.run(product.id, JSON.stringify(product));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
export function getProducts(): Product[] {
  return (db.prepare('SELECT data FROM products ORDER BY rowid').all() as { data: string }[]).map(
    (row) => JSON.parse(row.data),
  );
}
export function getProduct(id: string): Product | undefined {
  const row = db.prepare('SELECT data FROM products WHERE id = ?').get(id) as
    { data: string } | undefined;
  return row ? JSON.parse(row.data) : undefined;
}
export function saveProduct(product: Product) {
  db.prepare(
    'INSERT INTO products (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
  ).run(product.id, JSON.stringify(product));
  return product;
}
