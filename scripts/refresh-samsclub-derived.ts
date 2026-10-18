import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

type SourceRecord = {
  itemId: string;
  sourcePageId?: string;
  sourceUrl: string;
  category: string;
  storageCondition: string;
  displayGroup: string;
  packageSize?: unknown;
  unit: string;
};

type ProductData = Record<string, any>;

const root = process.cwd();
const sourceFile = path.join(root, 'shared/samsclub-catalog.json');
const progressFile = path.join(root, '.cache/samsclub-bulk/ingest-progress.json');
const reportFile = path.join(root, '.cache/samsclub-bulk/derived-refresh-report.json');
const dataDirectory = path.resolve(process.env.DATA_DIR || 'data');
const databaseFile = path.join(dataDirectory, 'market.sqlite');
const manualSampleItemId = '66846';

function manualSpecificationReason(product: ProductData): string | null {
  if (product.priceOrigin === 'manual') return 'priceOrigin-manual';
  if (product.catalogOrigin === 'manual') return 'catalogOrigin-manual';
  if (Array.isArray(product.history) && product.history.some((entry) => ['manual', 'suggested'].includes(entry?.source)))
    return 'manual-price-history';
  if (
    product.manualSpecifications === true ||
    product.specificationsEditedByUser === true ||
    product.specificationOrigin === 'manual' ||
    product.specificationsOrigin === 'manual' ||
    product.unitOrigin === 'manual' ||
    product.packageSizeOrigin === 'manual'
  )
    return 'manual-specification-marker';

  const packageSize = product.packageSize;
  if (
    packageSize &&
    typeof packageSize === 'object' &&
    ['manual'].includes(String(packageSize.source || packageSize.origin || '').toLowerCase())
  )
    return 'manual-package-size-marker';
  return null;
}

function uniqueBackupPath(directory: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let candidate = path.join(directory, `market-derived-refresh-${stamp}.sqlite`);
  let suffix = 1;
  while (existsSync(candidate)) {
    candidate = path.join(directory, `market-derived-refresh-${stamp}-${suffix}.sqlite`);
    suffix += 1;
  }
  return candidate;
}

async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, file);
}

async function main(): Promise<void> {
  // Take one immutable source-catalog snapshot before opening the database.
  const sourceRecords = JSON.parse(readFileSync(sourceFile, 'utf8')) as SourceRecord[];
  const progress = JSON.parse(readFileSync(progressFile, 'utf8')) as {
    ingested?: Array<{ status?: string; item_id?: string | number }>;
  };
  if (!existsSync(databaseFile)) throw new Error(`SQLite database not found: ${databaseFile}`);

  const sourceByItemId = new Map<string, SourceRecord>();
  const duplicateSourceIds = new Set<string>();
  for (const record of sourceRecords) {
    const itemId = String(record.itemId);
    if (sourceByItemId.has(itemId)) duplicateSourceIds.add(itemId);
    else sourceByItemId.set(itemId, record);
  }

  const autoItemIds = new Set(
    (progress.ingested || [])
      .filter((entry) => entry.status === 'added' && entry.item_id != null)
      .map((entry) => String(entry.item_id)),
  );
  autoItemIds.delete(manualSampleItemId);

  const report: Record<string, any> = {
    startedAt: new Date().toISOString(),
    databaseFile,
    sourceRecordSnapshotCount: sourceRecords.length,
    autoItemIdCount: autoItemIds.size,
    manualSampleItemId,
    backupFile: '',
    updated: [] as Array<Record<string, unknown>>,
    unchanged: [] as Array<Record<string, unknown>>,
    skipped: [] as Array<Record<string, unknown>>,
    totals: {
      updatedRecords: 0,
      autoRecordsUpdated: 0,
      manualSampleStorageOnlyUpdated: 0,
      unitPackageUpdated: 0,
      manualUnitPackageSkipped: 0,
    },
  };

  for (const itemId of duplicateSourceIds)
    report.skipped.push({ itemId, reason: 'duplicate-source-Item-number' });

  const db = new DatabaseSync(databaseFile);
  try {
    db.exec('PRAGMA busy_timeout = 10000');
    const backupDirectory = path.join(root, '.cache/samsclub-bulk/backups');
    await mkdir(backupDirectory, { recursive: true });
    report.backupFile = uniqueBackupPath(backupDirectory);
    await backup(db, report.backupFile);

    const selectProduct = db.prepare('SELECT id, data FROM products WHERE id = ?');
    const updateProduct = db.prepare('UPDATE products SET data = ? WHERE id = ?');
    const targets = [...autoItemIds].sort();
    const specialIds = [manualSampleItemId];

    db.exec('BEGIN IMMEDIATE');
    try {
      for (const itemId of [...targets, ...specialIds]) {
        if (duplicateSourceIds.has(itemId)) continue;
        const source = sourceByItemId.get(itemId);
        if (!source) {
          report.skipped.push({ itemId, reason: 'missing-source-record' });
          continue;
        }
        const dbId = `samsclub-${itemId}`;
        const row = selectProduct.get(dbId) as { id: string; data: string } | undefined;
        if (!row) {
          report.skipped.push({ itemId, reason: 'not-yet-imported' });
          continue;
        }
        const product = JSON.parse(row.data) as ProductData;
        if (
          product.sourceRetailer !== 'Sam’s Club US' ||
          String(product.sourceSku || '') !== itemId ||
          (product.sourceUrl && source.sourceUrl && product.sourceUrl !== source.sourceUrl)
        ) {
          report.skipped.push({ itemId, reason: 'database-product-identity-mismatch' });
          continue;
        }

        if (itemId === manualSampleItemId) {
          const before = product.storageCondition;
          const next = { ...product, storageCondition: source.storageCondition };
          if (before === next.storageCondition) {
            report.unchanged.push({ itemId, fields: ['storageCondition'] });
            continue;
          }
          updateProduct.run(JSON.stringify(next), row.id);
          report.updated.push({
            itemId,
            fields: ['storageCondition'],
            before: { storageCondition: before },
            after: { storageCondition: next.storageCondition },
          });
          report.totals.manualSampleStorageOnlyUpdated += 1;
          report.totals.updatedRecords += 1;
          continue;
        }

        const next: ProductData = {
          ...product,
          sourcePageId: source.sourcePageId,
          category: source.category,
          storageCondition: source.storageCondition,
          displayGroup: source.displayGroup,
        };
        const fields = ['sourcePageId', 'category', 'storageCondition', 'displayGroup'];
        const manualReason = manualSpecificationReason(product);
        if (manualReason) {
          report.totals.manualUnitPackageSkipped += 1;
        } else {
          next.unit = source.unit;
          if (Object.prototype.hasOwnProperty.call(source, 'packageSize'))
            next.packageSize = source.packageSize;
          else delete next.packageSize;
          fields.push('unit', 'packageSize');
          report.totals.unitPackageUpdated += 1;
        }

        const changedFields = fields.filter(
          (field) => JSON.stringify(product[field]) !== JSON.stringify(next[field]),
        );
        if (!changedFields.length) {
          report.unchanged.push({
            itemId,
            fields,
            ...(manualReason ? { skippedUnitPackageReason: manualReason } : {}),
          });
          continue;
        }

        updateProduct.run(JSON.stringify(next), row.id);
        report.updated.push({
          itemId,
          fields: changedFields,
          ...(manualReason ? { skippedUnitPackageReason: manualReason } : {}),
          before: Object.fromEntries(changedFields.map((field) => [field, product[field]])),
          after: Object.fromEntries(changedFields.map((field) => [field, next[field]])),
        });
        report.totals.updatedRecords += 1;
        report.totals.autoRecordsUpdated += 1;
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } finally {
    db.close();
  }

  report.completedAt = new Date().toISOString();
  await writeJsonAtomic(reportFile, report);
  console.log(JSON.stringify({ reportFile, ...report.totals, skipped: report.skipped.length, backupFile: report.backupFile }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
