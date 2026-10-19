// Re-applies storage evidence, package-size parsing and reviewer decisions to the Sam’s Club
// source catalog. Default mode only prints a summary; --write updates the catalog and the review
// report. Re-run after every ingest or reclassification; results depend only on source text.
import { readFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SamsClubCatalogRecord } from '../shared/types';
import {
  categoryNames,
  isNonFoodCategory,
  reviewCatalogRecord,
  type ReviewFile,
} from '../shared/catalog-review';
import { resolveStorage, storageFindings } from '../shared/storage-evidence';
import { packageSizeReliable } from '../shared/package-size';

const root = process.cwd();
const catalogFile = path.join(root, 'shared/samsclub-catalog.json');
const reviewFile = path.join(root, 'shared/samsclub-review.json');
const reportFile = path.join(root, 'docs/review/samsclub-catalog-review.md');
const mainCategories = Object.keys(categoryNames).filter((id) => id !== 'floral');
const categoryLimit = 100;

const storageLabels: Record<string, string> = {
  'ambient-likely': '常温',
  'chilled-confirmed': '冷藏',
  'frozen-confirmed': '冷冻',
  'chilled-or-frozen-confirmed': '冷藏或冷冻',
  unknown: '待确认',
};

async function writeAtomic(file: string, text: string) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.review-${process.pid}.tmp`;
  await writeFile(temporary, text);
  await rename(temporary, file);
}

const cell = (text: string | undefined) =>
  String(text ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim();

function main() {
  const records = JSON.parse(readFileSync(catalogFile, 'utf8')) as SamsClubCatalogRecord[];
  const review = JSON.parse(readFileSync(reviewFile, 'utf8')) as ReviewFile;
  const byId = new Map(records.map((record) => [record.itemId, record]));
  const unknownDecisions = Object.keys(review.decisions).filter((id) => !byId.has(id));
  if (unknownDecisions.length)
    throw new Error(`Review decisions reference unknown Item #: ${unknownDecisions.join(', ')}`);
  for (const [id, decision] of Object.entries(review.decisions))
    if (decision.category && !categoryNames[decision.category])
      throw new Error(`Review decision ${id} uses an unknown category: ${decision.category}`);

  const reviewed = records.map((record) =>
    reviewCatalogRecord(record, review.decisions[record.itemId]),
  );
  const before = records.map((record) => ({ ...record, ...record.reviewPrevious }));
  const active = reviewed.filter((record) => record.status !== 'archived');
  const counts = new Map<string, number>();
  for (const record of active) counts.set(record.category, (counts.get(record.category) || 0) + 1);
  // The 100-item limit governs collection. Food moved between main categories by the review
  // stays on sale (user decision 2026-10-19), so only records collected under a category count.
  const collected = new Map<string, number>();
  for (const [index, record] of reviewed.entries())
    if (record.status !== 'archived' && record.category === before[index].category)
      collected.set(record.category, (collected.get(record.category) || 0) + 1);
  const overLimit = [...collected].filter(
    ([category, count]) => mainCategories.includes(category) && count > categoryLimit,
  );
  if (overLimit.length)
    throw new Error(
      `Category limit exceeded: ${overLimit.map(([id, n]) => `${id}=${n}`).join(', ')}`,
    );
  const reviewOverflow = [...counts]
    .filter(([category, count]) => mainCategories.includes(category) && count > categoryLimit)
    .map(([category, count]) => ({ category, count }));
  const outside = active.filter((record) => !mainCategories.includes(record.category));
  if (outside.length)
    throw new Error(
      `Active records outside the main categories: ${outside.map((r) => r.itemId).join(', ')}`,
    );

  // Decisions that the source text already settles are reported, not silently applied.
  const ignoredStorage = Object.entries(review.decisions)
    .filter(([id, decision]) => {
      const record = reviewed.find((item) => item.itemId === id)!;
      return decision.storageCondition && record.storageBasis?.kind !== 'manual-review';
    })
    .map(([id]) => id);

  const wasPending = before.filter((record) => record.storageCondition === 'unknown');
  const sourceConfirmed = reviewed.filter(
    (record, index) =>
      before[index].storageCondition === 'unknown' &&
      record.status !== 'archived' &&
      record.storageBasis?.kind === 'source-text',
  );
  const manual = reviewed.filter(
    (record) => record.status !== 'archived' && record.storageBasis?.kind === 'manual-review',
  );
  const archived = reviewed.filter((record) => record.status === 'archived');
  const pending = active.filter((record) => record.storageCondition === 'unknown');
  const recategorized = reviewed.filter(
    (record, index) => record.category !== before[index].category && record.status !== 'archived',
  );
  const food = active.filter((record) => !isNonFoodCategory(record.category));
  const reliable = food.filter((record) => packageSizeReliable(record.packageSize || undefined));
  const estimated = reliable.filter((record) => record.packageSize?.estimated);
  const packageChanged = food.filter(
    (record) =>
      record.reviewPrevious?.packageSize &&
      (record.reviewPrevious.packageSize.quantity !== record.packageSize?.quantity ||
        record.reviewPrevious.packageSize.unit !== record.packageSize?.unit),
  );
  const unresolvedPackages = food.filter(
    (record) => !packageSizeReliable(record.packageSize || undefined),
  );

  const summary = {
    records: reviewed.length,
    active: active.length,
    archived: archived.length,
    previouslyPending: wasPending.length,
    sourceConfirmed: sourceConfirmed.length,
    manualReview: manual.length,
    recategorized: recategorized.length,
    stillPending: pending.length,
    foodProducts: food.length,
    reliablePackage: reliable.length,
    estimatedWeight: estimated.length,
    packageSizesChanged: packageChanged.length,
    ignoredStorageDecisions: ignoredStorage,
    reviewOverflow,
    categories: Object.fromEntries([...counts].sort()),
  };

  const label = (record: SamsClubCatalogRecord) => `${record.itemId} ${cell(record.originalName)}`;
  const lines = [
    '# 山姆目录复核记录',
    '',
    `复核日期：${review.reviewedAt}。由 \`npm run catalog:samsclub:review -- --write\` 根据 \`shared/samsclub-review.json\` 与商品自身来源文字生成；请勿手工修改本文件。`,
    '',
    '“来源原文证实”只采用商品页面中的储存说明原句；“人工复核”是来源页没有写明时按品类常识作出的判断，逐条注明理由，可在复核文件中修改或删除后重新生成。',
    '',
    '## 汇总',
    '',
    '| 项目 | 数量 |',
    '| --- | ---: |',
    `| 本轮前储存条件待确认 | ${wasPending.length} |`,
    `| 来源原文证实储存条件 | ${sourceConfirmed.length} |`,
    `| 人工复核储存条件 | ${manual.length} |`,
    `| 修正分类（继续销售） | ${recategorized.length} |`,
    `| 修正分类后归档 | ${archived.length} |`,
    `| 仍待确认 | ${pending.length} |`,
    `| 在售食品 | ${food.length} |`,
    `| 净含量可用于采购换算 | ${reliable.length} |`,
    `| 其中称重商品按估重换算 | ${estimated.length} |`,
    `| 本轮修正净含量 | ${packageChanged.length} |`,
    '',
    ...(reviewOverflow.length
      ? [
          `分类修正后超过 ${categoryLimit} 件的主类：${reviewOverflow.map(({ category, count }) => `${categoryNames[category]} ${count}`).join('、')}。超出部分均为本轮从其他主类改正过来的食品，按 2026-10-19 决定继续销售；采集时每类仍不超过 ${categoryLimit} 件。`,
          '',
        ]
      : []),
    '## 来源原文证实',
    '',
    '| 商品 | 储存条件 | 来源原句 |',
    '| --- | --- | --- |',
    ...sourceConfirmed.map(
      (record) =>
        `| ${label(record)} | ${storageLabels[record.storageCondition]} | ${cell(record.storageBasis?.text)} |`,
    ),
    '',
    '## 人工复核',
    '',
    '| 商品 | 储存条件 | 理由 |',
    '| --- | --- | --- |',
    ...manual.map(
      (record) =>
        `| ${label(record)} | ${storageLabels[record.storageCondition]} | ${cell(record.storageBasis?.text)} |`,
    ),
    '',
    '## 分类修正',
    '',
    '| 商品 | 原分类 | 新分类 | 理由 |',
    '| --- | --- | --- | --- |',
    ...recategorized.map(
      (record) =>
        `| ${label(record)} | ${cell(record.reviewPrevious?.categoryName || record.reviewPrevious?.category)} | ${cell(record.categoryName)} | ${cell(record.categoryNote)} |`,
    ),
    '',
    '## 归档（不在顾客端展示，不占货架）',
    '',
    '| 商品 | 修正后分类 | 理由 |',
    '| --- | --- | --- |',
    ...archived.map(
      (record) =>
        `| ${label(record)} | ${cell(record.categoryName)} | ${cell(record.archiveReason)} |`,
    ),
    '',
    '## 仍待确认',
    '',
    '| 商品 | 分类 | 原因 |',
    '| --- | --- | --- |',
    ...pending.map((record) => {
      const conflict = resolveStorage(storageFindings(record), record.category).conflict;
      const reason =
        review.decisions[record.itemId]?.note ||
        (conflict ? `来源说法不一致：${conflict.join(' / ')}` : '来源页未写明储存条件');
      return `| ${label(record)} | ${cell(record.categoryName)} | ${cell(reason)} |`;
    }),
    '',
    '## 净含量仍无法换算的食品',
    '',
    '| 商品 | 原因 |',
    '| --- | --- |',
    ...unresolvedPackages.map(
      (record) => `| ${label(record)} | ${cell(record.packageSize?.basis)} |`,
    ),
    '',
  ];

  console.log(JSON.stringify(summary, null, 2));
  return { reviewed, report: lines.join('\n') };
}

const { reviewed, report } = main();
if (process.argv.includes('--write')) {
  await writeAtomic(catalogFile, `${JSON.stringify(reviewed, null, 2)}\n`);
  await writeAtomic(reportFile, report);
  console.log(
    `Updated ${path.relative(root, catalogFile)} and ${path.relative(root, reportFile)}.`,
  );
} else console.log('Dry run only; pass --write to update the catalog and report.');
