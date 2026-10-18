#!/usr/bin/env node
// Sam's Club layout planner. Default mode is read-only; --apply uses a backup,
// an immediate transaction, and whitelisted layout-field updates.
import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { findPath, isWalkable } from '../shared/navigation.ts';
import { entrance } from '../shared/catalog.ts';
import { fixtureAccessPoints, fixedFixtures, mainAisles } from '../shared/layout.ts';
import { mapBounds } from '../shared/map-config.ts';
import { MAX_CAPACITY_PER_SLOT, shelfSlotCapacity, shelfSlotPlacementError } from '../shared/shelf-capacity.ts';
import type { Product, Shelf, StoreSection } from '../shared/types.ts';

type JsonRow = { id: string; data: string };
type AnyProduct = Product & Record<string, any>;
const root = process.cwd();
const dataDirectory = path.resolve(process.env.DATA_DIR || 'data');
const databaseFile = path.join(dataDirectory, 'market.sqlite');
const reportDirectory = path.join(root, '.cache/samsclub-bulk');
const dryRunReportFile = path.join(reportDirectory, 'layout-replan-dry-run.json');
const appliedReportFile = path.join(reportDirectory, 'layout-replan-applied.json');
const targetCategories = [
  'meat', 'seafood', 'dairy', 'bakery', 'deli', 'fruit', 'vegetables', 'frozen',
  'pantry', 'seasoning', 'snacks', 'beverages', 'paper-goods', 'cleaning', 'home',
  'pet', 'baby', 'personal-care', 'clothing',
] as const;
const targetSet = new Set<string>(targetCategories);
const categoryLimit = 100;
const minimumCapacityByRole = {
  gondola: 4,
  chiller: 4,
  meatRawChiller: 4,
  produceChiller: 4,
  freezer: 6,
  table: 8,
  clothingRack: 10,
  deliChiller: 4,
};
const growthHeadroom = 0.25;
const nonFoodCategories = new Set(['paper-goods', 'cleaning', 'home', 'pet', 'baby', 'personal-care', 'clothing']);
const nonFoodSections = new Set(['household', 'paper-zone', 'care-zone', 'pet-zone']);
const foodSectionByCategory: Record<string, string[]> = {
  meat: ['meat'], seafood: ['seafood'], dairy: ['dairy'], bakery: ['bakery'],
  deli: ['deli-service'], fruit: ['fruit'], vegetables: ['vegetables'], frozen: ['openprices-frozen', 'snack-zone'],
  pantry: ['pantry'], seasoning: ['pantry'], snacks: ['snack-zone', 'pantry'], beverages: ['pantry'],
  'paper-goods': ['paper-zone'], cleaning: ['household'], home: ['household'],
  pet: ['pet-zone'], baby: ['care-zone'], 'personal-care': ['care-zone'], clothing: ['household'],
};
const slotFields = ['shelf', 'shelfId', 'shelfSide', 'shelfLevel', 'merchandisingState'] as const;
const shelfChangeFields = ['name', 'kind', 'levels', 'capacityPerSlot', 'allowedDisplayGroups', 'accessPoints', 'position', 'reachable'] as const;

function uniqueBackupPath(directory: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let candidate = path.join(directory, `market-layout-replan-${stamp}.sqlite`);
  let suffix = 1;
  while (existsSync(candidate)) {
    candidate = path.join(directory, `market-layout-replan-${stamp}-${suffix}.sqlite`);
    suffix++;
  }
  return candidate;
}

function decodeRows<T>(db: DatabaseSync, table: string): Array<T & { id: string }> {
  const rows = db.prepare(`SELECT id, data FROM ${table}`).all() as JsonRow[];
  return rows.map((row) => ({ id: row.id, ...(JSON.parse(row.data) as T) }));
}
function clone<T>(value: T): T { return structuredClone(value); }
function rectanglesOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function mainClass(product: AnyProduct): string | null {
  if (targetSet.has(product.category)) return product.category;
  return product.category === 'meat-poultry' ? 'meat' : null;
}
function rawMeatDisplayConflict(product: AnyProduct): boolean {
  return product.category === 'meat' && product.displayGroup === 'chilled-meat-raw' && /\bsalad\b/i.test(String(product.name || ''));
}
function beforeSlot(product: AnyProduct) {
  return Object.fromEntries(slotFields.map((field) => [field, product[field] ?? null]));
}
function afterSlot(product: AnyProduct) {
  return Object.fromEntries(slotFields.map((field) => [field, product[field] ?? null]));
}
function configureShelf(
  shelvesById: Map<string, Shelf>,
  id: string,
  patch: Partial<Shelf>,
  options: { accessSides?: Array<'left' | 'right' | 'front' | 'back'> } = {},
): void {
  const existing = shelvesById.get(id);
  if (!existing) throw new Error(`Required existing fixture was not found: ${id}`);
  const next = { ...existing, ...patch } as Shelf;
  if (options.accessSides?.length) {
    if (!next.footprint) throw new Error(`Fixture ${id} has no footprint for access-point setup.`);
    const points = fixtureAccessPoints(next.footprint);
    next.accessPoints = Object.fromEntries(options.accessSides.map((side) => [side, points[side]]));
    next.position = next.accessPoints[options.accessSides[0]] || null;
  }
  next.reachable = true;
  shelvesById.set(id, next);
}
function isKnownStorage(value: unknown): boolean {
  return ['ambient-likely', 'chilled-confirmed', 'frozen-confirmed', 'chilled-or-frozen-confirmed'].includes(String(value));
}
function shelfCandidates(product: AnyProduct): string[] {
  const category = product.category === 'meat-poultry' ? 'meat' : String(product.category || '');
  const group = String(product.displayGroup || '');
  const storage = String(product.storageCondition || '');
  if (storage === 'unknown' || !isKnownStorage(storage)) return [];

  if (category === 'meat') {
    if (group === 'chilled-meat-prepared') return ['legacy-meat-15'];
    if (group === 'frozen-meat-prepared') return ['openprices-freezer-03'];
    if (group === 'frozen-meat-raw') return ['openprices-freezer-01', 'openprices-freezer-02'];
    if (group === 'chilled-meat-raw' || (group === 'review-meat-raw' && storage === 'chilled-or-frozen-confirmed'))
      return ['meat-shelf-01', 'legacy-meat-14'];
    if (storage === 'chilled-confirmed' || storage === 'chilled-or-frozen-confirmed')
      return ['meat-shelf-01', 'legacy-meat-14'];
    if (storage === 'frozen-confirmed') return ['openprices-freezer-01', 'openprices-freezer-02'];
  }
  if (category === 'seafood') {
    if (['chilled-seafood-prepared', 'review-seafood-prepared'].includes(group) && storage !== 'frozen-confirmed') return ['deli-service-shelf-01', 'deli-service-shelf-02', 'deli-service-shelf-03'];
    if (group === 'chilled-seafood-raw') return ['seafood-shelf-01', 'legacy-seafood-12', 'legacy-seafood-13'];
    if (group === 'frozen-seafood-prepared') return ['openprices-freezer-06'];
    if (group === 'frozen-seafood-raw') return ['openprices-freezer-04', 'openprices-freezer-05'];
    if (group === 'freezer-savory' && storage === 'frozen-confirmed') return ['openprices-freezer-04', 'openprices-freezer-05'];
    if (storage === 'chilled-confirmed' || storage === 'chilled-or-frozen-confirmed') return ['seafood-shelf-01', 'legacy-seafood-12', 'legacy-seafood-13'];
    if (storage === 'frozen-confirmed') return ['openprices-freezer-04', 'openprices-freezer-05'];
  }
  if (category === 'dairy' && ['chilled-dairy', 'chilled-eggs', 'review-dairy'].includes(group))
    return ['dairy-shelf-01', 'legacy-dairy-16', 'legacy-dairy-17'];
  if (category === 'fruit' || category === 'vegetables') {
    const produceShelf = category === 'fruit' ? 'fruit-shelf-01' : 'vegetables-shelf-01';
    if (group === 'chilled-produce' || (group === 'review-produce' && storage === 'chilled-or-frozen-confirmed'))
      return [produceShelf];
    if (group === 'freezer-produce' && storage === 'frozen-confirmed') return ['openprices-freezer-06'];
    if (storage === 'chilled-confirmed' || storage === 'chilled-or-frozen-confirmed') return [produceShelf];
    if (storage === 'frozen-confirmed') return ['openprices-freezer-06'];
    if (storage === 'ambient-likely') return category === 'fruit'
      ? (group === 'ambient-produce' ? ['legacy-fruit-10', 'legacy-fruit-11'] : [])
      : (group === 'ambient-produce' ? ['legacy-vegetables-8', 'legacy-vegetables-9'] : []);
  }
  if (category === 'deli' && ['chilled-deli', 'chilled-deli-prepared', 'review-deli-prepared'].includes(group))
    return ['deli-service-shelf-01', 'deli-service-shelf-02', 'deli-service-shelf-03'];
  if (category === 'bakery') {
    if (group === 'frozen-bakery' && storage === 'frozen-confirmed') return ['snack-zone-shelf-2', 'openprices-freezer-06'];
    if (group === 'chilled-bakery') return ['deli-service-shelf-01', 'deli-service-shelf-02', 'deli-service-shelf-03'];
    if (group === 'ambient-bakery') return ['bakery-shelf-01', 'bakery-shelf-02', 'legacy-bakery-18'];
  }
  if (['chilled-sauces', 'chilled-seasoning', 'chilled-pantry', 'chilled-frozen', 'chilled-beverages'].includes(group))
    return ['deli-service-shelf-01', 'deli-service-shelf-02', 'deli-service-shelf-03'];
  if (category === 'seasoning' && group === 'review-seasoning' && (storage === 'chilled-confirmed' || storage === 'chilled-or-frozen-confirmed'))
    return ['deli-service-shelf-01', 'deli-service-shelf-02', 'deli-service-shelf-03'];
  if (category === 'beverages' && ['chilled-beverages', 'review-beverages'].includes(group) && storage !== 'frozen-confirmed')
    return ['deli-service-shelf-01', 'deli-service-shelf-02', 'deli-service-shelf-03'];
  // A source row can retain review-frozen even when its public product title
  // explicitly says Frozen. Honor the explicit cold-chain evidence in a freezer.
  if (
    category === 'frozen' && group === 'review-frozen' &&
    storage === 'chilled-or-frozen-confirmed' && /\bfrozen\b/i.test(String(product.name || ''))
  ) return ['snack-zone-shelf-2', 'openprices-freezer-06'];
  if (storage === 'frozen-confirmed') {
    if (group === 'freezer-produce') return ['openprices-freezer-06'];
    if (category === 'frozen' || ['freezer-savory', 'freezer-dessert', 'frozen-deli-prepared'].includes(group)) return ['snack-zone-shelf-2', 'openprices-freezer-06'];
  }
  if (storage === 'ambient-likely') {
    if (group === 'ambient-snacks' && category === 'snacks') return ['snack-zone-shelf-1', 'legacy-pantry-19', 'legacy-pantry-20'];
    if (group === 'ambient-bakery' && category === 'bakery') return ['bakery-shelf-01', 'bakery-shelf-02'];
    if (['ambient-pantry', 'ambient-seasoning', 'ambient-beverages', 'ambient-dairy', 'ambient-seafood', 'ambient-seafood-preserved', 'ambient-ready-meals', 'ambient-canned-soup', 'ambient-canned-produce', 'ambient-dry-grain', 'ambient-pasta', 'ambient-sauces', 'ambient-spices'].includes(group))
      return ['pantry-shelf-01', 'legacy-pantry-19', 'legacy-pantry-20'];
    if (group === 'non-food-cleaning' && category === 'cleaning') return ['household-shelf-01'];
    if (group === 'non-food-home' && category === 'home') return ['household-shelf-02'];
    if (group === 'non-food-clothing' && category === 'clothing') return ['household-shelf-03'];
    if (group === 'non-food-paper-goods' && category === 'paper-goods') return ['paper-zone-shelf-1', 'paper-zone-shelf-2', 'paper-zone-shelf-3'];
    if (group === 'non-food-pet' && category === 'pet') return ['pet-zone-shelf-1', 'pet-zone-shelf-2', 'pet-zone-shelf-3'];
    if (['non-food-baby', 'non-food-personal-care'].includes(group) && ['baby', 'personal-care'].includes(category)) return ['care-zone-shelf-1', 'care-zone-shelf-2'];
  }
  return [];
}

async function main(): Promise<void> {
  const applyMode = process.argv.includes('--apply');
  const db = applyMode ? new DatabaseSync(databaseFile) : new DatabaseSync(databaseFile, { readOnly: true });
  let transactionStarted = false;
  let backupFile: string | null = null;
  try {
    if (applyMode) {
      db.exec('PRAGMA busy_timeout = 10000');
      const backupDirectory = path.join(reportDirectory, 'backups');
      await mkdir(backupDirectory, { recursive: true });
      backupFile = uniqueBackupPath(backupDirectory);
      await backup(db, backupFile);
      db.exec('BEGIN IMMEDIATE');
      transactionStarted = true;
    } else {
      db.exec('BEGIN');
      transactionStarted = true;
    }

    // In apply mode these are read only after BEGIN IMMEDIATE, so this plan is
    // built from the locked, current database rather than an earlier report.
    const sections = decodeRows<StoreSection>(db, 'store_sections');
    const shelves = decodeRows<Shelf>(db, 'shelves');
    const products = decodeRows<AnyProduct>(db, 'products');
    if (!applyMode) {
      db.exec('COMMIT');
      transactionStarted = false;
    }

  const activeSam = products.filter((product) => product.sourceRetailer === 'Sam’s Club US' && product.status !== 'archived');
  const counts = new Map<string, number>();
  for (const product of activeSam) {
    const main = mainClass(product);
    if (main) counts.set(main, (counts.get(main) || 0) + 1);
  }
  const overCap = [...counts.entries()].filter(([, count]) => count > categoryLimit).map(([category, count]) => ({ category, count, cap: categoryLimit }));

  const shelvesById = new Map<string, Shelf>(shelves.map((shelf) => [shelf.id, clone(shelf)]));
  const shelfPatches = new Map<string, Shelf>();
  const setShelf = (id: string, patch: Partial<Shelf>, accessSides?: Array<'left' | 'right' | 'front' | 'back'>) => {
    configureShelf(shelvesById, id, patch, accessSides ? { accessSides } : {});
    shelfPatches.set(id, shelvesById.get(id)!);
  };
  const gondola = (id: string, groups: string[], name?: string, capacity = minimumCapacityByRole.gondola) => setShelf(id, {
    kind: 'gondola', levels: 4, capacityPerSlot: capacity, allowedDisplayGroups: groups,
    ...(name ? { name } : {}),
  });
  const chiller = (id: string, groups: string[], options: { rawMeat?: boolean; deli?: boolean; name?: string } = {}) => setShelf(id, {
    kind: 'chiller', levels: 4, capacityPerSlot: options.rawMeat ? minimumCapacityByRole.meatRawChiller : options.deli ? minimumCapacityByRole.deliChiller : minimumCapacityByRole.chiller,
    allowedDisplayGroups: groups, ...(options.name ? { name: options.name } : {}),
  }, ['front']);
  const table = (id: string, groups: string[], name?: string) => setShelf(id, {
    kind: 'display-table', levels: 1, capacityPerSlot: minimumCapacityByRole.table, allowedDisplayGroups: groups,
    ...(name ? { name } : {}),
  }, ['front']);
  const freezer = (id: string, groups: string[], name?: string) => setShelf(id, {
    kind: 'freezer', levels: 2, capacityPerSlot: minimumCapacityByRole.freezer, allowedDisplayGroups: groups,
    ...(name ? { name } : {}),
  }, ['front']);

  // Separate raw and ready-to-eat meat into distinct fixtures.
  chiller('meat-shelf-01', ['chilled-meat-raw', 'review-meat-raw'], { rawMeat: true, name: '肉禽生品冷藏柜-01' });
  chiller('legacy-meat-14', ['chilled-meat-raw', 'review-meat-raw'], { rawMeat: true, name: '肉禽生品冷藏柜-02' });
  chiller('legacy-meat-15', ['chilled-meat-prepared'], { name: '肉禽熟制品冷藏柜' });

  // Give refrigerated produce its own cold fixtures instead of routing it to dairy.
  chiller('vegetables-shelf-01', ['chilled-produce', 'chilled-produce-prepared', 'review-produce'], { name: '蔬菜冷藏柜' });
  chiller('fruit-shelf-01', ['chilled-produce', 'chilled-produce-prepared', 'review-produce'], { name: '水果冷藏柜' });

  // Use two idle seafood island footprints for refrigerated seafood; retain the third tank.
  chiller('seafood-shelf-01', ['chilled-seafood-raw', 'review-seafood-raw'], { name: '水产生鲜冷藏柜-01' });
  chiller('legacy-seafood-12', ['chilled-seafood-raw', 'review-seafood-raw'], { name: '水产生鲜冷藏柜-02' });
  chiller('legacy-seafood-13', ['chilled-seafood-raw', 'review-seafood-raw'], { name: '水产生鲜冷藏柜-03' });

  // Keep dairy/eggs in their own cold case; reserve the two existing cases as overflow.
  chiller('dairy-shelf-01', ['chilled-dairy', 'chilled-eggs', 'review-dairy'], { name: '乳品与蛋类冷藏柜-01' });
  chiller('legacy-dairy-16', ['chilled-dairy', 'chilled-eggs', 'review-dairy'], { name: '乳品与蛋类冷藏柜-02' });
  chiller('legacy-dairy-17', ['chilled-dairy', 'chilled-eggs', 'review-dairy'], { name: '乳品与蛋类冷藏柜-03' });
  chiller('deli-service-shelf-01', [
    'chilled-deli', 'chilled-deli-prepared', 'review-deli-prepared', 'chilled-seafood-prepared', 'review-seafood-prepared', 'chilled-bakery',
    'chilled-sauces', 'chilled-seasoning', 'review-seasoning', 'chilled-pantry', 'chilled-frozen', 'chilled-beverages', 'review-beverages',
  ], { deli: true, name: '熟食与冷藏即食柜' });
  chiller('deli-service-shelf-02', [
    'chilled-deli', 'chilled-deli-prepared', 'review-deli-prepared', 'chilled-seafood-prepared', 'review-seafood-prepared', 'chilled-bakery',
    'chilled-sauces', 'chilled-seasoning', 'review-seasoning', 'chilled-pantry', 'chilled-frozen', 'chilled-beverages', 'review-beverages',
  ], { deli: true, name: '熟食与冷藏即食柜-02' });
  chiller('deli-service-shelf-03', [
    'chilled-deli', 'chilled-deli-prepared', 'review-deli-prepared', 'chilled-seafood-prepared', 'review-seafood-prepared', 'chilled-bakery',
    'chilled-sauces', 'chilled-seasoning', 'review-seasoning', 'chilled-pantry', 'chilled-frozen', 'chilled-beverages', 'review-beverages',
  ], { deli: true, name: '熟食与冷藏即食柜-03' });
  table('bakery-shelf-01', ['ambient-bakery'], '烘焙展示台-01');
  table('bakery-shelf-02', ['ambient-bakery'], '烘焙展示台-02');
  table('legacy-bakery-18', ['ambient-bakery'], '烘焙展示台-03');

  // Ambient food and non-food remain in separate areas; the third household fixture becomes a rack.
  const ambientFoodGroups = ['ambient-pantry', 'ambient-seasoning', 'ambient-beverages', 'ambient-dairy', 'ambient-seafood', 'ambient-seafood-preserved', 'ambient-ready-meals', 'ambient-canned-soup', 'ambient-canned-produce', 'ambient-dry-grain', 'ambient-pasta', 'ambient-sauces', 'ambient-spices', 'ambient-snacks'];
  gondola('pantry-shelf-01', ambientFoodGroups, '粮油调味与饮品-01');
  gondola('legacy-pantry-19', ambientFoodGroups, '常温食品扩展位-01');
  gondola('legacy-pantry-20', ambientFoodGroups, '常温食品扩展位-02');
  gondola('snack-zone-shelf-1', ['ambient-snacks'], '零食货架-01');
  gondola('household-shelf-01', ['non-food-cleaning'], '日用清洁货架');
  gondola('household-shelf-02', ['non-food-home'], '家居用品货架');
  setShelf('household-shelf-03', {
    kind: 'hanging-rack', levels: 2, capacityPerSlot: minimumCapacityByRole.clothingRack,
    allowedDisplayGroups: ['non-food-clothing'], name: '服饰挂架',
  }, ['left', 'right']);
  gondola('paper-zone-shelf-1', ['non-food-paper-goods'], '纸品货架');
  gondola('paper-zone-shelf-2', ['non-food-paper-goods'], '纸品货架-02');
  gondola('paper-zone-shelf-3', ['non-food-paper-goods'], '纸品货架-03');
  gondola('pet-zone-shelf-1', ['non-food-pet'], '宠物用品货架');
  gondola('pet-zone-shelf-2', ['non-food-pet'], '宠物用品货架-02');
  gondola('pet-zone-shelf-3', ['non-food-pet'], '宠物用品货架-03');
  gondola('care-zone-shelf-1', ['non-food-baby', 'non-food-personal-care'], '母婴与个护货架-01');
  gondola('care-zone-shelf-2', ['non-food-baby', 'non-food-personal-care'], '母婴与个护货架-02');
  for (const [id, group, label] of [
    ['legacy-vegetables-8', 'ambient-produce', '常温蔬菜展示台-01'],
    ['legacy-vegetables-9', 'ambient-produce', '常温蔬菜展示台-02'],
    ['legacy-fruit-10', 'ambient-produce', '常温水果展示台-01'],
    ['legacy-fruit-11', 'ambient-produce', '常温水果展示台-02'],
  ]) setShelf(id, { kind: 'produce-table', levels: 1, capacityPerSlot: minimumCapacityByRole.table, allowedDisplayGroups: [group], name: label });

  // Frozen raw and prepared proteins use dedicated cases; generic frozen groceries stay separate.
  freezer('openprices-freezer-01', ['frozen-meat-raw'], '肉禽生品冷冻柜-01');
  freezer('openprices-freezer-02', ['frozen-meat-raw'], '肉禽生品冷冻柜-02');
  freezer('openprices-freezer-03', ['frozen-meat-prepared'], '肉禽熟制品冷冻柜');
  freezer('openprices-freezer-04', ['frozen-seafood-raw'], '水产生鲜冷冻柜-01');
  freezer('openprices-freezer-05', ['frozen-seafood-raw'], '水产生鲜冷冻柜-02');
  freezer('openprices-freezer-06', ['frozen-seafood-prepared', 'freezer-produce', 'freezer-savory', 'freezer-dessert', 'frozen-bakery', 'frozen-deli-prepared', 'review-frozen'], '熟制水产与冷冻食品柜');
  freezer('snack-zone-shelf-2', ['freezer-savory', 'freezer-dessert', 'freezer-produce', 'frozen-bakery', 'frozen-deli-prepared', 'review-frozen'], '冷冻即食与甜品柜');

  const plannedShelves = [...shelvesById.values()];
  const sectionsById = new Map(sections.map((section) => [section.id, section]));
  const geometryErrors: Array<Record<string, unknown>> = [];
  for (const shelf of plannedShelves) {
    const section = sectionsById.get(shelf.sectionId);
    const footprint = shelf.footprint;
    if (!section || !section.active) {
      geometryErrors.push({ shelfId: shelf.id, reason: 'inactive-or-missing-section' });
      continue;
    }
    if (!footprint) {
      geometryErrors.push({ shelfId: shelf.id, reason: 'missing-footprint' });
      continue;
    }
    if (
      footprint.x < 1 || footprint.y < 1 || footprint.w < 1 || footprint.h < 1 ||
      footprint.x + footprint.w > mapBounds.maxX + 1 || footprint.y + footprint.h > mapBounds.maxY + 1
    ) geometryErrors.push({ shelfId: shelf.id, reason: 'outside-map-bounds', footprint });
    if (
      footprint.x < section.rect.x || footprint.y < section.rect.y ||
      footprint.x + footprint.w > section.rect.x + section.rect.w ||
      footprint.y + footprint.h > section.rect.y + section.rect.h
    ) geometryErrors.push({ shelfId: shelf.id, reason: 'outside-section', footprint, sectionId: section.id });
    if (shelf.capacityPerSlot && (shelf.capacityPerSlot > 20 || shelf.capacityPerSlot < 1))
      geometryErrors.push({ shelfId: shelf.id, reason: 'capacity-outside-shared-limit', capacityPerSlot: shelf.capacityPerSlot });
    if (fixedFixtures.some((fixture) => rectanglesOverlap(footprint, fixture.rect)))
      geometryErrors.push({ shelfId: shelf.id, reason: 'overlaps-fixed-fixture', footprint });
    const aisle = mainAisles.find((candidate) => rectanglesOverlap(footprint, candidate));
    if (aisle) geometryErrors.push({ shelfId: shelf.id, reason: 'overlaps-main-aisle', footprint, aisle });
  }
  const footprintRows = plannedShelves.filter((shelf) => shelf.footprint);
  for (let i = 0; i < footprintRows.length; i++) {
    for (let j = i + 1; j < footprintRows.length; j++) {
      const left = footprintRows[i]; const right = footprintRows[j];
      if (left.footprint && right.footprint && rectanglesOverlap(left.footprint, right.footprint))
        geometryErrors.push({ shelfId: left.id, overlapsShelfId: right.id, reason: 'overlapping-fixtures' });
    }
  }

  const accessPointReachabilityCache = new Map<string, boolean>();
  const canReachAccessPoint = (point: { x: number; y: number }): boolean => {
    const key = `${point.x},${point.y}`;
    const cached = accessPointReachabilityCache.get(key);
    if (cached !== undefined) return cached;
    const reachable = isWalkable(point, sections, plannedShelves) && findPath(entrance, point, sections, plannedShelves).length > 0;
    accessPointReachabilityCache.set(key, reachable);
    return reachable;
  };
  for (const shelf of shelfPatches.values()) {
    if (!shelf.footprint) {
      shelf.reachable = false;
      shelf.position = null;
      geometryErrors.push({ shelfId: shelf.id, reason: 'missing-footprint-for-access-points' });
      continue;
    }
    const candidatePoints = fixtureAccessPoints(shelf.footprint);
    const accessPoints = Object.fromEntries(
      Object.entries(candidatePoints).filter(([, point]) => canReachAccessPoint(point)),
    ) as NonNullable<Shelf['accessPoints']>;
    shelf.accessPoints = accessPoints;
    const reachablePoint = Object.values(accessPoints)[0];
    shelf.reachable = Boolean(reachablePoint);
    shelf.position = reachablePoint || null;
    if (!reachablePoint) geometryErrors.push({ shelfId: shelf.id, reason: 'no-reachable-access-point', accessPoints: candidatePoints });
  }

  const samIds = new Set(activeSam.map((product) => product.id));
  const plannedProducts: AnyProduct[] = products.map((product) => {
    if (!samIds.has(product.id)) return clone(product);
    const cleared = { ...product, shelf: '', merchandisingState: 'unplaced' } as AnyProduct;
    delete cleared.shelfId; delete cleared.shelfSide; delete cleared.shelfLevel;
    return cleared;
  });
  const plannedById = new Map(plannedProducts.map((product, index) => [product.id, index]));
  const sortedSam = [...activeSam].sort((a, b) => {
    const aMain = mainClass(a); const bMain = mainClass(b);
    const aOrder = aMain ? targetCategories.indexOf(aMain as typeof targetCategories[number]) : Number.MAX_SAFE_INTEGER;
    const bOrder = bMain ? targetCategories.indexOf(bMain as typeof targetCategories[number]) : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder || String(a.id).localeCompare(String(b.id));
  });
  const compatibleCandidates = (product: AnyProduct): string[] => {
    const group = String(product.displayGroup || '').trim();
    if (!group || group === 'unclassified-review') return [];
    return shelfCandidates(product).filter((shelfId) => {
      const shelf = shelvesById.get(shelfId);
      if (!shelf?.footprint || !shelf.reachable || !shelf.accessPoints || !Object.keys(shelf.accessPoints).length) return false;
      if (!(shelf.allowedDisplayGroups || []).includes(group)) return false;
      const storage = String(product.storageCondition || '');
      if (storage === 'chilled-confirmed' && shelf.kind !== 'chiller') return false;
      if (storage === 'frozen-confirmed' && shelf.kind !== 'freezer') return false;
      if (storage === 'chilled-or-frozen-confirmed' && shelf.kind !== 'chiller' && shelf.kind !== 'freezer') return false;
      if (storage === 'ambient-likely' && (shelf.kind === 'chiller' || shelf.kind === 'freezer')) return false;
      const category = mainClass(product);
      if (category && nonFoodCategories.has(category) && !nonFoodSections.has(shelf.sectionId)) return false;
      if (category && !nonFoodCategories.has(category) && nonFoodSections.has(shelf.sectionId)) return false;
      return true;
    });
  };

  type CapacityPool = {
    key: string;
    shelfIds: string[];
    countByCategory: Map<string, number>;
    targetByCategory: Map<string, number>;
    futureTargetByCategory: Map<string, number>;
  };
  const capacityPools = new Map<string, CapacityPool>();
  const capOrdinalByCategory = new Map<string, number>();
  for (const product of sortedSam) {
    const category = mainClass(product);
    if (!category) continue;
    const ordinal = (capOrdinalByCategory.get(category) || 0) + 1;
    capOrdinalByCategory.set(category, ordinal);
    if (ordinal > categoryLimit || !isKnownStorage(product.storageCondition) || rawMeatDisplayConflict(product)) continue;
    const shelfIds = compatibleCandidates(product);
    if (!shelfIds.length) continue;
    const normalizedIds = [...new Set(shelfIds)].sort();
    const key = normalizedIds.join('|');
    let pool = capacityPools.get(key);
    if (!pool) {
      pool = { key, shelfIds: normalizedIds, countByCategory: new Map(), targetByCategory: new Map(), futureTargetByCategory: new Map() };
      capacityPools.set(key, pool);
    }
    pool.countByCategory.set(category, (pool.countByCategory.get(category) || 0) + 1);
  }

  for (const category of targetCategories) {
    const rows = [...capacityPools.values()]
      .map((pool) => ({ pool, count: pool.countByCategory.get(category) || 0 }))
      .filter((row) => row.count > 0);
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    if (!total) continue;
    const allocate = (goal: number, targetField: 'targetByCategory' | 'futureTargetByCategory') => {
      const shares = rows.map((row) => {
        const exact = goal * row.count / total;
        return { ...row, assigned: Math.floor(exact), remainder: exact - Math.floor(exact) };
      });
      let left = goal - shares.reduce((sum, row) => sum + row.assigned, 0);
      shares.sort((a, b) => b.remainder - a.remainder || a.pool.key.localeCompare(b.pool.key));
      for (let i = 0; i < left; i++) shares[i % shares.length].assigned++;
      for (const share of shares) share.pool[targetField].set(category, share.assigned);
    };
    const projected = Math.min(categoryLimit, total + Math.ceil(total * growthHeadroom));
    allocate(projected, 'targetByCategory');
    allocate(categoryLimit, 'futureTargetByCategory');
  }

  const slotsPerShelf = (shelfId: string): number => {
    const shelf = shelvesById.get(shelfId);
    return shelf ? Object.keys(shelf.accessPoints || {}).length * (shelf.levels || 1) : 0;
  };
  const distributePoolDemand = (pool: CapacityPool, demandByCategory: 'targetByCategory' | 'futureTargetByCategory') => {
    const demand = [...pool[demandByCategory].values()].reduce((sum, count) => sum + count, 0);
    const weighted = pool.shelfIds.map((shelfId) => ({ shelfId, slots: slotsPerShelf(shelfId) })).filter((row) => row.slots > 0);
    const totalSlots = weighted.reduce((sum, row) => sum + row.slots, 0);
    if (!totalSlots) return { demand, totalSlots, shares: [] as Array<{ shelfId: string; count: number }> };
    const shares = weighted.map((row) => {
      const exact = demand * row.slots / totalSlots;
      return { shelfId: row.shelfId, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
    });
    let left = demand - shares.reduce((sum, row) => sum + row.count, 0);
    shares.sort((a, b) => b.remainder - a.remainder || a.shelfId.localeCompare(b.shelfId));
    for (let i = 0; i < left; i++) shares[i % shares.length].count++;
    return { demand, totalSlots, shares: shares.map(({ shelfId, count }) => ({ shelfId, count })) };
  };
  const currentDemandByShelf = new Map<string, number>();
  const futureDemandByShelf = new Map<string, number>();
  const capacityPoolReport: Array<Record<string, unknown>> = [];
  for (const pool of capacityPools.values()) {
    const current = distributePoolDemand(pool, 'targetByCategory');
    const future = distributePoolDemand(pool, 'futureTargetByCategory');
    for (const share of current.shares) currentDemandByShelf.set(share.shelfId, (currentDemandByShelf.get(share.shelfId) || 0) + share.count);
    for (const share of future.shares) futureDemandByShelf.set(share.shelfId, (futureDemandByShelf.get(share.shelfId) || 0) + share.count);
    capacityPoolReport.push({
      shelfIds: pool.shelfIds,
      currentEligible: [...pool.countByCategory.values()].reduce((sum, count) => sum + count, 0),
      projectedDemand: current.demand,
      projectedByCategory: Object.fromEntries(pool.targetByCategory),
      futureDemandAt100ByCategory: Object.fromEntries(pool.futureTargetByCategory),
      accessibleSlots: current.totalSlots,
      maxCapacityAt20PerSlot: current.totalSlots * MAX_CAPACITY_PER_SLOT,
    });
  }

  const dynamicCapacityShortfalls: Array<Record<string, unknown>> = [];
  for (const [shelfId, targetDemand] of currentDemandByShelf) {
    const shelf = shelvesById.get(shelfId)!;
    const slots = slotsPerShelf(shelfId);
    const required = slots ? Math.ceil(targetDemand / slots) : MAX_CAPACITY_PER_SLOT + 1;
    if (required > MAX_CAPACITY_PER_SLOT)
      dynamicCapacityShortfalls.push({ shelfId, targetDemand, slots, requiredPerSlot: required, maximum: MAX_CAPACITY_PER_SLOT });
    shelf.capacityPerSlot = Math.min(MAX_CAPACITY_PER_SLOT, Math.max(shelfSlotCapacity(shelf), required));
    shelfPatches.set(shelfId, shelf);
  }
  const futureCapacityShortfalls = [...futureDemandByShelf.entries()].flatMap(([shelfId, futureDemand]) => {
    const slots = slotsPerShelf(shelfId);
    const required = slots ? Math.ceil(futureDemand / slots) : MAX_CAPACITY_PER_SLOT + 1;
    return required > MAX_CAPACITY_PER_SLOT
      ? [{ shelfId, futureDemandAt100: futureDemand, slots, requiredPerSlot: required, maximum: MAX_CAPACITY_PER_SLOT }]
      : [];
  });
  const futureCapacityByCategory = Object.fromEntries(targetCategories.map((category) => {
    const rows = [...capacityPools.values()].filter((pool) => (pool.futureTargetByCategory.get(category) || 0) > 0);
    const capacity = rows.reduce((sum, pool) => sum + pool.shelfIds.reduce((poolSum, shelfId) => poolSum + slotsPerShelf(shelfId) * MAX_CAPACITY_PER_SLOT, 0), 0);
    const target = rows.reduce((sum, pool) => sum + (pool.futureTargetByCategory.get(category) || 0), 0);
    const assigned = rows.every((pool) => {
      const poolSlots = pool.shelfIds.reduce((sum, shelfId) => sum + slotsPerShelf(shelfId), 0);
      return poolSlots * MAX_CAPACITY_PER_SLOT >= (pool.futureTargetByCategory.get(category) || 0);
    });
    return [category, { knownEligible: rows.reduce((sum, pool) => sum + (pool.countByCategory.get(category) || 0), 0), targetAt100: target, independentlySupported: rows.length > 0 && assigned, candidateCapacityAt20: capacity }];
  }));
  const seenPerCategory = new Map<string, number>();
  const overflowIds = new Set<string>();
  const placementReasons = new Map<string, string>();
  const assignments: Array<{ productId: string; shelfId: string; side: string; level: number }> = [];
  const plannedShelfUsage = new Map<string, number>();
  for (const product of plannedProducts.filter((item) => item.status !== 'archived' && item.shelfId))
    plannedShelfUsage.set(product.shelfId!, (plannedShelfUsage.get(product.shelfId!) || 0) + 1);
  const chooseSlot = (product: AnyProduct): { shelf: Shelf; side: string; level: number } | null => {
    const candidates = compatibleCandidates(product).sort((leftId, rightId) => {
      const left = shelvesById.get(leftId)!;
      const right = shelvesById.get(rightId)!;
      const leftTotal = Math.max(1, slotsPerShelf(leftId) * shelfSlotCapacity(left));
      const rightTotal = Math.max(1, slotsPerShelf(rightId) * shelfSlotCapacity(right));
      const leftLoad = (plannedShelfUsage.get(leftId) || 0) / leftTotal;
      const rightLoad = (plannedShelfUsage.get(rightId) || 0) / rightTotal;
      return leftLoad - rightLoad || leftId.localeCompare(rightId);
    });
    for (const shelfId of candidates) {
      const shelf = shelvesById.get(shelfId);
      if (!shelf?.footprint || !shelf.accessPoints || !shelf.reachable) continue;
      for (const [side, point] of Object.entries(shelf.accessPoints)) {
        if (!point || !canReachAccessPoint(point)) continue;
        for (let level = 1; level <= (shelf.levels || 1); level++) {
          const reason = shelfSlotPlacementError(shelf, product, plannedProducts, side as NonNullable<Product['shelfSide']>, level);
          if (!reason) return { shelf, side, level };
        }
      }
    }
    return null;
  };

  for (const sourceProduct of sortedSam) {
    const product = plannedProducts[plannedById.get(sourceProduct.id)!];
    const category = mainClass(product);
    if (!category) {
      placementReasons.set(product.id, 'category-not-in-approved-19-main-classes');
      product.merchandisingState = 'pending-review';
      continue;
    }
    const ordinal = (seenPerCategory.get(category) || 0) + 1;
    seenPerCategory.set(category, ordinal);
    if (ordinal > categoryLimit) {
      overflowIds.add(product.id);
      placementReasons.set(product.id, 'main-category-cap-100');
      product.merchandisingState = 'pending-review';
      continue;
    }
    // This PDP says Caesar salad, while its inherited source group says raw meat.
    // Keep it reviewable rather than placing a ready-to-eat meal in a raw-meat case.
    if (rawMeatDisplayConflict(product)) {
      placementReasons.set(product.id, 'product-title-conflicts-with-raw-meat-display-group-review');
      product.merchandisingState = 'pending-review';
      continue;
    }
    if (!isKnownStorage(product.storageCondition)) {
      placementReasons.set(product.id, 'storage-condition-unknown');
      product.merchandisingState = 'pending-review';
      continue;
    }
    const slot = chooseSlot(product);
    if (!slot) {
      placementReasons.set(product.id, compatibleCandidates(product).length ? 'no-compatible-reachable-capacity' : 'no-compatible-fixture-for-display-group-or-storage');
      product.merchandisingState = 'unplaced';
      continue;
    }
    Object.assign(product, {
      shelf: slot.shelf.name,
      shelfId: slot.shelf.id,
      shelfSide: slot.side,
      shelfLevel: slot.level,
      merchandisingState: 'placed',
    });
    plannedShelfUsage.set(slot.shelf.id, (plannedShelfUsage.get(slot.shelf.id) || 0) + 1);
    assignments.push({ productId: product.id, shelfId: slot.shelf.id, side: slot.side, level: slot.level });
  }

  const productChanges = activeSam.flatMap((before) => {
    const after = plannedProducts[plannedById.get(before.id)!];
    const beforeLayout = beforeSlot(before); const afterLayout = afterSlot(after);
    if (JSON.stringify(beforeLayout) === JSON.stringify(afterLayout)) return [];
    return [{
      productId: before.id,
      itemId: before.sourceSku || before.id.replace(/^samsclub-/, ''),
      name: before.name,
      category: before.category,
      storageCondition: before.storageCondition || 'unknown',
      displayGroup: before.displayGroup || 'unclassified-review',
      reason: placementReasons.get(before.id) || 'reassigned-by-main-category-and-storage',
      before: beforeLayout,
      after: afterLayout,
    }];
  });
  const unplacedPlan = activeSam.flatMap((sourceProduct) => {
    const product = plannedProducts[plannedById.get(sourceProduct.id)!];
    if (product.merchandisingState !== 'unplaced') return [];
    return [{
      productId: product.id,
      itemId: product.sourceSku || product.id.replace(/^samsclub-/, ''),
      name: product.name,
      category: product.category,
      storageCondition: product.storageCondition || 'unknown',
      displayGroup: product.displayGroup || 'unclassified-review',
      reason: placementReasons.get(product.id) || 'unplaced',
      candidates: shelfCandidates(product),
    }];
  });
  const shelfChanges = [...shelfPatches.entries()].flatMap(([id, after]) => {
    const before = shelves.find((shelf) => shelf.id === id)!;
    const beforeValues = Object.fromEntries(shelfChangeFields.map((field) => [field, before[field] ?? null]));
    const afterValues = Object.fromEntries(shelfChangeFields.map((field) => [field, after[field] ?? null]));
    if (JSON.stringify(beforeValues) === JSON.stringify(afterValues)) return [];
    return [{ shelfId: id, sectionId: after.sectionId, before: beforeValues, after: afterValues }];
  });

  const slotCounts = new Map<string, number>();
  for (const product of plannedProducts.filter((item) => item.status !== 'archived' && item.shelfId && item.shelfSide)) {
    const key = `${product.shelfId}|${product.shelfSide}|${product.shelfLevel || 1}`;
    slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
  }
  const capacityErrors = [...slotCounts.entries()].flatMap(([key, count]) => {
    const shelfId = key.split('|')[0];
    const shelf = shelvesById.get(shelfId);
    return !shelf || count > shelfSlotCapacity(shelf) ? [{ slot: key, count, capacity: shelf ? shelfSlotCapacity(shelf) : 0 }] : [];
  });
  const nonFoodViolations = plannedProducts.filter((product) =>
    product.sourceRetailer === 'Sam’s Club US' && product.merchandisingState === 'placed' &&
    nonFoodCategories.has(product.category) && !nonFoodSections.has(shelvesById.get(product.shelfId || '')?.sectionId || ''),
  ).map((product) => ({ productId: product.id, category: product.category, sectionId: shelvesById.get(product.shelfId || '')?.sectionId || null }));
  const categorySectionViolations = plannedProducts.filter((product) => {
    if (product.sourceRetailer !== 'Sam’s Club US' || product.merchandisingState !== 'placed') return false;
    const sectionId = shelvesById.get(product.shelfId || '')?.sectionId;
    if (!sectionId) return true;
    if (nonFoodCategories.has(product.category)) return !nonFoodSections.has(sectionId);
    const main = mainClass(product);
    if (!main) return true;
    if (['bakery', 'deli'].includes(main) && product.storageCondition === 'frozen-confirmed')
      return !['openprices-frozen', 'snack-zone'].includes(sectionId);
    if (
      ['chilled-confirmed', 'chilled-or-frozen-confirmed'].includes(String(product.storageCondition || '')) &&
      sectionId === 'deli-service' &&
      [
        'chilled-seasoning', 'review-seasoning', 'chilled-sauces', 'chilled-pantry', 'chilled-frozen',
        'chilled-seafood-prepared', 'review-seafood-prepared', 'chilled-bakery', 'chilled-beverages', 'review-beverages',
      ].includes(String(product.displayGroup || ''))
    ) return false;
    const allowed = main === 'meat' && product.storageCondition === 'frozen-confirmed'
      ? ['meat', 'openprices-frozen']
      : ['seafood', 'fruit', 'vegetables'].includes(main) && product.storageCondition === 'frozen-confirmed'
        ? [foodSectionByCategory[main][0], 'openprices-frozen']
        : foodSectionByCategory[main] || [];
    return !allowed.includes(sectionId);
  }).map((product) => ({ productId: product.id, category: product.category, sectionId: shelvesById.get(product.shelfId || '')?.sectionId || null }));
  const unknownPlaced = plannedProducts.filter((product) =>
    product.sourceRetailer === 'Sam’s Club US' && product.merchandisingState === 'placed' && !isKnownStorage(product.storageCondition),
  ).map((product) => ({ productId: product.id, name: product.name }));
  const coldProduceInDairy = plannedProducts.filter((product) =>
    product.sourceRetailer === 'Sam’s Club US' && product.merchandisingState === 'placed' &&
    ['fruit', 'vegetables'].includes(product.category) && product.storageCondition !== 'ambient-likely' &&
    shelvesById.get(product.shelfId || '')?.sectionId === 'dairy',
  ).map((product) => ({ productId: product.id, category: product.category }));
  const rawPreparedSameFixture = plannedProducts.filter((product) => product.sourceRetailer === 'Sam’s Club US' && product.merchandisingState === 'placed' && product.category === 'meat')
    .reduce((acc, product) => {
      const role = /prepared/.test(String(product.displayGroup || '')) ? 'prepared' : 'raw';
      const shelfId = String(product.shelfId || '');
      const prev = acc.get(shelfId) || new Set<string>(); prev.add(role); acc.set(shelfId, prev); return acc;
    }, new Map<string, Set<string>>());
  const meatSeparationViolations = [...rawPreparedSameFixture.entries()].filter(([, roles]) => roles.size > 1).map(([shelfId]) => ({ shelfId }));
  const placedByCategory = new Map<string, number>();
  const pendingUnknownByCategory = new Map<string, number>();
  for (const product of activeSam) {
    const category = mainClass(product); if (!category) continue;
    const plan = plannedProducts[plannedById.get(product.id)!];
    if (plan.merchandisingState === 'placed') placedByCategory.set(category, (placedByCategory.get(category) || 0) + 1);
    else if (plan.storageCondition === 'unknown') pendingUnknownByCategory.set(category, (pendingUnknownByCategory.get(category) || 0) + 1);
  }
  for (const shelf of shelfChanges.map((change) => shelvesById.get(change.shelfId)!).filter(Boolean)) {
    const capacity = Object.keys(shelf.accessPoints || {}).length * (shelf.levels || 1) * shelfSlotCapacity(shelf);
    const usage = [...slotCounts.entries()].filter(([key]) => key.startsWith(`${shelf.id}|`)).reduce((sum, [, count]) => sum + count, 0);
  }
  const shelfCapacity = shelfChanges.map(({ shelfId, sectionId }) => {
    const shelf = shelvesById.get(shelfId)!;
    const capacity = Object.keys(shelf.accessPoints || {}).length * (shelf.levels || 1) * shelfSlotCapacity(shelf);
    const occupied = [...slotCounts.entries()].filter(([key]) => key.startsWith(`${shelfId}|`)).reduce((sum, [, count]) => sum + count, 0);
    return { shelfId, sectionId, kind: shelf.kind, capacityPerSlot: shelfSlotCapacity(shelf), totalSlots: capacity, occupied, reserve: capacity - occupied };
  });
  const categoryReport = Object.fromEntries(targetCategories.map((category) => [category, {
    count: counts.get(category) || 0,
    cap: categoryLimit,
    plannedPlaced: placedByCategory.get(category) || 0,
    unknownStoragePending: pendingUnknownByCategory.get(category) || 0,
    overflowPending: Math.max(0, (counts.get(category) || 0) - categoryLimit),
  }]));
  const report: Record<string, any> = {
    generatedAt: new Date().toISOString(),
    mode: applyMode ? 'apply-transaction' : 'dry-run-read-only',
    databaseFile,
    databaseOpenedReadOnly: !applyMode,
    databaseWrites: 0,
    backupFile,
    sourceJsonWrites: 0,
    scope: 'Existing Sam’s Club products only; layout and slot fields only. Prices, stock, history, product categories, storage facts, and source data are preserved.',
    current: {
      totalProducts: products.length,
      activeSamProducts: activeSam.length,
      sections: sections.length,
      shelves: shelves.length,
      targetCategoryCounts: Object.fromEntries(counts),
      merchandisingStates: Object.fromEntries([...new Set(activeSam.map((p) => p.merchandisingState || 'unset'))].map((state) => [state, activeSam.filter((p) => (p.merchandisingState || 'unset') === state).length])),
    },
    plan: {
      sectionChanges: [],
      modifiedShelfCount: shelfChanges.length,
      productLayoutChangeCount: productChanges.length,
      plannedPlacedCount: assignments.length,
      plannedPendingReviewCount: activeSam.filter((p) => plannedProducts[plannedById.get(p.id)!].merchandisingState === 'pending-review').length,
      plannedUnplacedCount: activeSam.filter((p) => plannedProducts[plannedById.get(p.id)!].merchandisingState === 'unplaced').length,
      additionalFixturesCreated: 0,
      unapprovedMainCategoryProductsRemainUnplaced: activeSam.filter((p) => !mainClass(p)).length,
      categoryCap: categoryLimit,
      categoriesOverCap: overCap,
      reserveCapacityByModifiedShelf: shelfCapacity,
    },
    growthCapacity: {
      headroomRatio: growthHeadroom,
      maxCapacityPerSlot: MAX_CAPACITY_PER_SLOT,
      dynamicallySizedPools: capacityPoolReport,
      dynamicallySizedShelfShortfalls: dynamicCapacityShortfalls,
      futureAt100ShelfShortfalls: futureCapacityShortfalls,
      futureAt100ByCategory: futureCapacityByCategory,
    },
    checks: {
      geometryErrors,
      capacityErrors,
      nonFoodViolations,
      categorySectionViolations,
      unknownStoragePlaced: unknownPlaced,
      chilledProduceInDairy: coldProduceInDairy,
      meatRawPreparedSharingFixture: meatSeparationViolations,
      dynamicCapacityShortfalls,
      modifiedFixturesReachable: [...shelfPatches.values()].filter((shelf) => shelf.reachable).length,
      modifiedFixtureCount: shelfPatches.size,
      plannedAssignmentsWithoutSharedCapacityErrors: assignments.length - capacityErrors.length,
    },
    categories: categoryReport,
    shelfChanges,
    productChanges,
    unplacedPlan,
    placementReasons: Object.fromEntries([...new Set(placementReasons.values())].map((reason) => [reason, [...placementReasons.values()].filter((value) => value === reason).length])),
  };

  const plannedUnplacedCount = report.plan.plannedUnplacedCount as number;
  const applyFailures = [
    ['geometryErrors', geometryErrors.length],
    ['capacityErrors', capacityErrors.length],
    ['nonFoodViolations', nonFoodViolations.length],
    ['categorySectionViolations', categorySectionViolations.length],
    ['unknownStoragePlaced', unknownPlaced.length],
    ['chilledProduceInDairy', coldProduceInDairy.length],
    ['meatRawPreparedSharingFixture', meatSeparationViolations.length],
    ['dynamicCapacityShortfalls', dynamicCapacityShortfalls.length],
    ['categoriesOverCap', overCap.length],
    ['plannedUnplacedCount', plannedUnplacedCount],
  ].filter(([, count]) => count !== 0);

  let appliedShelfCount = 0;
  let appliedProductCount = 0;
  if (applyMode) {
    if (applyFailures.length) throw new Error(`Layout plan failed safety checks: ${JSON.stringify(applyFailures)}`);

    const selectShelf = db.prepare('SELECT id, data FROM shelves WHERE id = ?');
    const updateShelf = db.prepare('UPDATE shelves SET data = ? WHERE id = ? AND data = ?');
    for (const change of shelfChanges) {
      const row = selectShelf.get(change.shelfId) as JsonRow | undefined;
      if (!row) throw new Error(`Stale layout plan: shelf ${change.shelfId} disappeared during apply.`);
      const current = JSON.parse(row.data) as Record<string, any>;
      const currentFields = Object.fromEntries(shelfChangeFields.map((field) => [field, current[field] ?? null]));
      if (JSON.stringify(currentFields) !== JSON.stringify(change.before))
        throw new Error(`Stale layout plan: shelf ${change.shelfId} changed after the plan was built.`);
      const merged = { ...current };
      for (const field of shelfChangeFields) merged[field] = change.after[field];
      const result = updateShelf.run(JSON.stringify(merged), change.shelfId, row.data) as { changes: number | bigint };
      if (Number(result.changes) !== 1) throw new Error(`Stale layout plan: shelf ${change.shelfId} could not be conditionally updated.`);
      appliedShelfCount++;
    }

    const selectProduct = db.prepare('SELECT id, data FROM products WHERE id = ?');
    const updateProduct = db.prepare('UPDATE products SET data = ? WHERE id = ? AND data = ?');
    for (const change of productChanges) {
      const row = selectProduct.get(change.productId) as JsonRow | undefined;
      if (!row) throw new Error(`Stale layout plan: product ${change.productId} disappeared during apply.`);
      const current = JSON.parse(row.data) as AnyProduct;
      if (current.sourceRetailer !== 'Sam’s Club US' || String(current.sourceSku || '') !== String(change.itemId))
        throw new Error(`Refusing to update non-Sam’s Club or mismatched product ${change.productId}.`);
      if (JSON.stringify(beforeSlot(current)) !== JSON.stringify(change.before))
        throw new Error(`Stale layout plan: product ${change.productId} slot changed after the plan was built.`);
      const merged: AnyProduct = { ...current };
      const mergedRecord = merged as Record<string, any>;
      for (const field of slotFields) {
        const value = change.after[field];
        if (value === null) delete mergedRecord[field];
        else mergedRecord[field] = value;
      }
      const result = updateProduct.run(JSON.stringify(merged), change.productId, row.data) as { changes: number | bigint };
      if (Number(result.changes) !== 1) throw new Error(`Stale layout plan: product ${change.productId} could not be conditionally updated.`);
      appliedProductCount++;
    }

    db.exec('COMMIT');
    transactionStarted = false;
    report.databaseWrites = appliedShelfCount + appliedProductCount;
    report.applied = { shelfRows: appliedShelfCount, productRows: appliedProductCount, backupFile };
  }

  const reportFile = applyMode ? appliedReportFile : dryRunReportFile;
  await mkdir(path.dirname(reportFile), { recursive: true });
  const temporary = `${reportFile}.tmp-${process.pid}`;
  await writeFile(temporary, JSON.stringify(report, null, 2) + '\n');
  await rename(temporary, reportFile);
  console.log(JSON.stringify({
    reportFile,
    mode: report.mode,
    databaseWrites: report.databaseWrites,
    backupFile,
    appliedShelfCount,
    appliedProductCount,
    activeSamProducts: activeSam.length,
    plannedPlaced: assignments.length,
    pendingReview: report.plan.plannedPendingReviewCount,
    unplaced: report.plan.plannedUnplacedCount,
    changedShelves: shelfChanges.length,
    changedProducts: productChanges.length,
    geometryErrors: geometryErrors.length,
    capacityErrors: capacityErrors.length,
    nonFoodViolations: nonFoodViolations.length,
    unknownStoragePlaced: unknownPlaced.length,
    chilledProduceInDairy: coldProduceInDairy.length,
    rawPreparedSameFixture: meatSeparationViolations.length,
    dynamicCapacityShortfalls: dynamicCapacityShortfalls.length,
    futureCapacityShortfalls: futureCapacityShortfalls.length,
  }, null, 2));
  } catch (error) {
    if (transactionStarted) {
      try { db.exec('ROLLBACK'); } catch { /* retain the original error */ }
      transactionStarted = false;
    }
    throw error;
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
