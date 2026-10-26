import { mapBounds } from '../shared/map-config';
import 'dotenv/config';
import { configureNetworkProxy } from './network-proxy';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdirSync, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { aiConfigured, AiError, guide, identifyImage } from './ai';
import {
  getModelSettings,
  modelProviderReadiness,
  modelSettingsSchema,
  saveModelSettings,
} from './model-settings';
import {
  getCategories,
  getProduct,
  getProducts,
  getSections,
  getShelves,
  saveCategory,
  saveProduct,
  saveProductsAtomically,
  saveShelfAndProductsAtomically,
  saveShelvesAndProductsAtomically,
  saveSection,
  saveShelf,
} from './db';
import { recommendPrice } from '../shared/pricing';
import { entrance, zones } from '../shared/catalog';
import { findPath, isWalkable } from '../shared/navigation';
import { DEFAULT_CAPACITY_PER_SLOT, MAX_CAPACITY_PER_SLOT, shelfSlotPlacementError } from '../shared/shelf-capacity';
import type { Currency, GuideResponse, Point, Product, StoreSection, Shelf } from '../shared/types';
import {
  defaultFixture,
  fixtureAccessPoints,
  fixtureSideLabels,
  fixtureSupportsLevels,
  fixedFixtures,
  mainAisles,
} from '../shared/layout';
import { lookupMarket, MarketError } from './market';
import { shoppingAgent, shoppingContextSchema } from './shopping-agent';
import { convertMarketPrice, isValidMarketDate, XINFADI_SOURCE_URL } from '../shared/market';
import { unitGrams } from '../shared/shopping';
import { importSkus } from './sku-import';
import { productToSkuRow, writeSkuCsv } from '../shared/sku-file';
import { availableForSale } from '../shared/catalog-status';
import { validProductImage } from '../shared/product-image';
import { currencyMismatchMessage, productCurrency } from '../shared/currency';
import { registerProductImageCacheRoute } from './product-image-cache';
import { productDetail } from './samsclub-catalog';
import { mealPlanningVersion } from '../shared/recipes';
import { applyPlacement, placementOf, samePlacement, invertPlacementChanges } from '../shared/placement';
import { shelfGeometry, shelfMoveError, translatedShelf, rotatedShelf, resizedShelf, restoreShelfGeometry, rotateShelfSide } from '../shared/shelf-move';
import { shelfSlotCapacity } from '../shared/shelf-capacity';
import { shelfCells, unplaced } from '../shared/placement';
import { expandShelfSelection, shelfVersion, shelfTarget, shelfBatchPlacementError, translateShelfSelection } from '../shared/shelf-batch';

configureNetworkProxy();
const app = express();
registerProductImageCacheRoute(app);
const uploads = path.resolve(process.env.DATA_DIR || 'data', 'uploads');
mkdirSync(uploads, { recursive: true });
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(uploads));
// Serve newly collected galleries immediately, including between catalog batches.
app.use('/images/samsclub', express.static(path.resolve('public/images/samsclub')));
app.get('/api/model-settings', (_req, res) => res.json(getModelSettings()));
app.put('/api/model-settings', (req, res) => {
  const settings = modelSettingsSchema.parse(req.body);
  res.json(saveModelSettings(settings));
});
app.get('/api/status', (_req, res) =>
  res.json({
    ai: aiConfigured(),
    mode: aiConfigured() ? '大模型导购' : '规则导购',
    demo: true,
    mealPlanner: mealPlanningVersion,
    providers: modelProviderReadiness(),
  }),
);
app.get('/api/products', (_req, res) => res.json(getProducts()));
app.get('/api/products/:id', (req, res) => {
  const product = getProduct(req.params.id);
  if (!product || product.status === 'archived') return res.status(404).json({ error: '这件商品暂不可查看。' });
  return res.json(productDetail(product));
});
app.get('/api/categories', (_req, res) => res.json(getCategories()));
app.get('/api/sections', (_req, res) => res.json(getSections()));
app.get('/api/shelves', (_req, res) => res.json(getShelves()));
app.get('/api/sku/export', (req, res) => {
  const scope = req.query.scope || 'current';
  const products = getProducts().filter((p) => scope === 'all' || p.status !== 'archived');
  const rows = products.map(productToSkuRow);
  if (req.query.format === 'csv') {
    res.setHeader('Content-Disposition', 'attachment; filename="qinghe-skus.csv"');
    res.type('text/csv; charset=utf-8').send(writeSkuCsv(rows));
  } else {
    res.setHeader('Content-Disposition', 'attachment; filename="qinghe-skus.json"');
    res.json({ version: 1, exportedAt: new Date().toISOString(), rows });
  }
});
app.post('/api/sku/import', (req, res) => {
  const input = z
    .object({
      rows: z
        .array(z.record(z.string(), z.union([z.string(), z.number()])))
        .min(1)
        .max(2000),
      mode: z.enum(['create', 'upsert']),
      apply: z.boolean().default(false),
    })
    .strict()
    .parse(req.body);
  const result = importSkus(input.rows, input.mode, input.apply);
  res.status(input.apply && result.errors.length ? 422 : 200).json(result);
});
const placementSchema = z.object({
  shelfId: z.string().min(1).max(80).nullable(),
  shelfSide: z.enum(['left', 'right', 'front', 'back']).nullable(),
  shelfLevel: z.number().int().min(1).max(8).nullable(),
  shelfSlot: z.number().int().min(0).max(19).nullable(),
}).strict();
app.post('/api/merchandising/placements', (req, res) => {
  const { changes } = z.object({ changes: z.array(z.object({
    id: z.string().min(1).max(80), expected: placementSchema, target: placementSchema,
  }).strict()).min(1).max(100) }).strict().parse(req.body);
  if (new Set(changes.map((change) => change.id)).size !== changes.length)
    return res.status(400).json({ error: '同一商品不能重复提交。' });
  const products = getProducts(), shelves = getShelves();
  for (const change of changes) {
    const product = products.find((item) => item.id === change.id);
    if (!product || product.status === 'archived') return res.status(409).json({ error: '商品不存在或已归档，请刷新。' });
    if (!samePlacement(placementOf(product), change.expected))
      return res.status(409).json({ error: '商品位置已被其他操作更新，请刷新后重试。' });
    if (!change.target.shelfId && Object.values(change.target).some((value) => value !== null))
      return res.status(400).json({ error: '移回待摆放时必须清除完整陈列位置。' });
  }
  const staged = products.map((product) => {
    const change = changes.find((item) => item.id === product.id);
    return change ? applyPlacement(product, change.target, shelves) : product;
  });
  for (const change of changes) {
    if (!change.target.shelfId) continue;
    const shelf = shelves.find((item) => item.id === change.target.shelfId);
    if (!shelf) return res.status(409).json({ error: '目标货架已不存在。' });
    const position = resolveProductShelfPosition(shelf, change.target.shelfSide ?? undefined, change.target.shelfLevel ?? undefined);
    if ('error' in position) return res.status(409).json({ error: position.error });
    const product = staged.find((item) => item.id === change.id)!;
    const capacityError = shelfSlotPlacementError(shelf, product, staged, position.shelfSide, position.shelfLevel);
    if (capacityError) return res.status(409).json({ error: capacityError });
    if (change.target.shelfSlot !== null) {
      if (change.target.shelfSlot >= shelfSlotCapacity(shelf)) return res.status(409).json({ error: '目标格位超出货架容量。' });
      if (staged.some((other) => other.status !== 'archived' && other.id !== product.id &&
        other.shelfId === shelf.id && other.shelfSide === position.shelfSide &&
        (other.shelfLevel || 1) === position.shelfLevel && other.shelfSlot === product.shelfSlot))
        return res.status(409).json({ error: '目标格位已被占用，请刷新后重试。' });
    }
  }
  const updated = staged.filter((product) => changes.some((change) => change.id === product.id));
  saveProductsAtomically(updated);
  res.json({ products: updated, undo: invertPlacementChanges(changes) });
});
app.patch('/api/products/:id/placement', (req, res) => {
  const input = z
    .object({
      shelfId: z.string().min(1).max(80),
      shelfSide: z.enum(['left', 'right', 'front', 'back']),
      shelfLevel: z.number().int().min(1).max(8),
      expected: z
        .object({
          shelfId: z.string().optional(),
          shelfSide: z.string().optional(),
          shelfLevel: z.number().optional(),
        })
        .optional(),
    })
    .strict()
    .parse(req.body);
  const product = getProduct(req.params.id);
  if (!product) return res.status(404).json({ error: '商品不存在，请刷新。' });
  if (
    input.expected &&
    (input.expected.shelfId !== product.shelfId ||
      input.expected.shelfSide !== product.shelfSide ||
      input.expected.shelfLevel !== product.shelfLevel)
  )
    return res.status(409).json({ error: '商品陈列位置已被其他操作更新，请刷新后重试。' });
  const shelf = getShelves().find((s) => s.id === input.shelfId);
  if (!shelf) return res.status(400).json({ error: '目标设施不存在。' });
  const position = resolveProductShelfPosition(shelf, input.shelfSide, input.shelfLevel);
  if ('error' in position) return res.status(400).json({ error: position.error });
  const capacityError = shelfSlotPlacementError(
    shelf,
    product,
    getProducts(),
    input.shelfSide,
    input.shelfLevel,
  );
  if (capacityError) return res.status(409).json({ error: capacityError });
  const sameLayer = product.shelfId === shelf.id && product.shelfSide === position.shelfSide && (product.shelfLevel || 1) === position.shelfLevel;
  res.json(saveProduct({ ...product, shelfId: shelf.id, shelf: shelf.name, ...position,
    shelfSlot: sameLayer ? product.shelfSlot : undefined }));
});
function rectsOverlap(
  first: { x: number; y: number; w: number; h: number },
  second: { x: number; y: number; w: number; h: number },
) {
  return (
    first.x < second.x + second.w &&
    first.x + first.w > second.x &&
    first.y < second.y + second.h &&
    first.y + first.h > second.y
  );
}
function sectionPlacementError(section: StoreSection, current: StoreSection[] = getSections()) {
  const { rect } = section;
  if (
    rect.x < 1 ||
    rect.y < 1 ||
    rect.w < 2 ||
    rect.h < 2 ||
    rect.w > 12 ||
    rect.h > 10 ||
    rect.x + rect.w > mapBounds.maxX + 1 ||
    rect.y + rect.h > mapBounds.maxY + 1
  )
    return '区域矩形超出地图边界，或面积需至少 2×2 格、最多 12×10 格。';
  if (fixedFixtures.some((fixture) => rectsOverlap(rect, fixture.rect)))
    return '区域不能覆盖主通道设施或固定障碍。';
  const activeOthers = current.filter((item) => item.active && item.id !== section.id);
  if (activeOthers.some((item) => rectsOverlap(rect, item.rect)))
    return '区域矩形与现有启用区域重叠，请调整位置。';
  const routeSections = [...activeOthers, { ...section, active: true }];
  const fixtures = getShelves();
  if (!isWalkable(section.location, routeSections, fixtures))
    return '通道到达点必须落在可通行格，不能放在设施占地内。';
  if (!findPath(entrance, section.location, routeSections, fixtures).length)
    return '通道到达点目前无法从入口步行到达，请换一个相邻通道格。';
  return '';
}
type AccessSide = 'left' | 'right' | 'front' | 'back';
const fixtureKinds = [
  'gondola',
  'produce-table',
  'display-table',
  'service-counter',
  'seafood-tank',
  'chiller',
  'freezer',
  'hanging-rack',
] as const;
function shelfSideMatches(point: Point, side: AccessSide, rect: NonNullable<Shelf['footprint']>) {
  if (side === 'left')
    return point.x === rect.x - 1 && point.y >= rect.y && point.y < rect.y + rect.h;
  if (side === 'right')
    return point.x === rect.x + rect.w && point.y >= rect.y && point.y < rect.y + rect.h;
  if (side === 'front')
    return point.y === rect.y + rect.h && point.x >= rect.x && point.x < rect.x + rect.w;
  return point.y === rect.y - 1 && point.x >= rect.x && point.x < rect.x + rect.w;
}
function fixturePlacementError(input: Shelf, currentShelves = getShelves(), ignoreId?: string) {
  const section = getSections().find((item) => item.id === input.sectionId && item.active);
  if (!section) return '请为设施选择一个启用中的所属区域。';
  if (
    currentShelves.some(
      (item) =>
        item.id !== ignoreId &&
        item.sectionId === input.sectionId &&
        item.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
    )
  )
    return '该区域已存在同名设施，请换一个编号。';
  const { footprint } = input;
  if (!footprint || !input.kind || input.levels === undefined || !input.accessPoints)
    return '请补充设施类型、占地、层数及侧面到达点。';
  if (
    footprint.x < 1 ||
    footprint.y < 1 ||
    footprint.w < 1 ||
    footprint.h < 1 ||
    footprint.x + footprint.w > mapBounds.maxX + 1 ||
    footprint.y + footprint.h > mapBounds.maxY + 1
  )
    return '设施占地超出地图边界。';
  if (input.levels < 1 || input.levels > 8) return '设施层数需在 1–8 层之间。';
  if (!fixtureSupportsLevels(input.kind) && input.levels !== 1)
    return '生鲜台、展示台、柜台和海鲜池只能设置 1 层。';
  if (fixedFixtures.some((fixture) => rectsOverlap(footprint, fixture.rect)))
    return '设施占地与固定收银/服务设施重叠。';
  if (mainAisles.some((aisle) => rectsOverlap(footprint, aisle))) return '设施占地不能侵占主通道。';
  if (
    currentShelves.some(
      (item) => item.id !== ignoreId && item.footprint && rectsOverlap(footprint, item.footprint),
    )
  )
    return '设施占地与已有货架或柜台重叠。';
  const entries = Object.entries(input.accessPoints) as [AccessSide, Point][];
  if (input.reachable && !entries.length) return '可导航设施至少需要一个侧面到达点。';
  for (const [side, point] of entries)
    if (!shelfSideMatches(point, side, footprint))
      return `${fixtureSideLabels[side]}到达点需紧邻设施对应的边。`;
  const fixtures = [...currentShelves.filter((item) => item.id !== ignoreId), input];
  for (const [, point] of entries) {
    if (!isWalkable(point, getSections(), fixtures))
      return '顾客到达点不能落在设施占地或固定设施内。';
    if (input.reachable && !findPath(entrance, point, getSections(), fixtures).length)
      return '顾客到达点无法从入口沿通道到达。';
  }
  return '';
}
function productsInvalidatedByFixture(shelfId: string, next: Shelf) {
  const invalid = getProducts().filter((product) => {
    if (product.status === 'archived' || product.shelfId !== shelfId) return false;
    const side = product.shelfSide;
    const level = product.shelfLevel || 1;
    return (
      (side !== undefined && !next.accessPoints?.[side]) ||
      level > (next.levels || 1) ||
      (product.shelfSlot !== undefined && product.shelfSlot >= shelfSlotCapacity(next)) ||
      (!fixtureSupportsLevels(next.kind) && level !== 1) ||
      (!!side && !!shelfSlotPlacementError(next, product, getProducts(), side, level))
    );
  });
  return invalid;
}
function resolveProductShelfPosition(shelf: Shelf, side?: AccessSide, level?: number) {
  const accessPoints = shelf.accessPoints || (shelf.position ? { front: shelf.position } : {});
  const selectedSide = side || (Object.keys(accessPoints)[0] as AccessSide | undefined);
  if (!shelf.reachable || !selectedSide || !accessPoints[selectedSide])
    return { error: '请选择货架上的有效顾客到达侧面。' };
  const selectedLevel = level || 1;
  const maxLevels = shelf.levels || 1;
  if (!Number.isInteger(selectedLevel) || selectedLevel < 1 || selectedLevel > maxLevels)
    return { error: `该设施有 ${maxLevels} 层，请填写 1–${maxLevels} 层。` };
  if (!fixtureSupportsLevels(shelf.kind) && selectedLevel !== 1)
    return { error: '该设施为单层，商品层位必须为 1。' };
  const point = accessPoints[selectedSide];
  if (
    !point ||
    !isWalkable(point, getSections(), getShelves()) ||
    !findPath(entrance, point, getSections(), getShelves()).length
  )
    return { error: '货架所选侧面当前无法从入口到达，请更新设施通道点。' };
  return { shelfSide: selectedSide, shelfLevel: selectedLevel };
}
const mapPointSchema = z.object({
  x: z.number().int().min(1).max(mapBounds.maxX),
  y: z.number().int().min(1).max(mapBounds.maxY),
});
const shelfFootprintSchema = z.object({
  x: z.number().int().min(1).max(mapBounds.maxX),
  y: z.number().int().min(1).max(mapBounds.maxY),
  w: z.number().int().min(1).max(16),
  h: z.number().int().min(1).max(16),
});
const shelfAccessSchema = z
  .object({
    left: mapPointSchema.optional(),
    right: mapPointSchema.optional(),
    front: mapPointSchema.optional(),
    back: mapPointSchema.optional(),
  })
  .strict();
const shelfFixtureInputSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  sectionId: z.string().min(1).max(60),
  name: z.string().trim().min(1).max(30),
  kind: z.enum(fixtureKinds).optional(),
  footprint: shelfFootprintSchema.optional(),
  levels: z.number().int().min(1).max(8).optional(),
  capacityPerSlot: z.number().int().min(1).max(MAX_CAPACITY_PER_SLOT).optional(),
  allowedDisplayGroups: z
    .array(z.string().trim().min(1).max(80))
    .max(30)
    .refine((groups) => new Set(groups).size === groups.length, '陈列分组不能重复。')
    .optional(),
  accessPoints: shelfAccessSchema.optional(),
  position: mapPointSchema.nullable().optional(),
  reachable: z.boolean().default(true),
});

function normalizeShelfInput(
  input: z.infer<typeof shelfFixtureInputSchema>,
  section: StoreSection,
  existingShelves: Shelf[],
): Shelf {
  const fallback = defaultFixture(
    section,
    existingShelves.filter((item) => item.sectionId === section.id).length,
  );
  const kind = input.kind || fallback.kind;
  const footprint = input.footprint || fallback.footprint;
  const levels = input.levels ?? fallback.levels;
  let accessPoints = input.accessPoints;
  if (!accessPoints) {
    if (input.position) {
      const defaults = input.footprint ? fixtureAccessPoints(footprint) : fallback.accessPoints;
      const matchingSide = (Object.entries(defaults) as [AccessSide, Point][]).find(
        ([, point]) => point.x === input.position!.x && point.y === input.position!.y,
      )?.[0];
      accessPoints = matchingSide ? { [matchingSide]: input.position } : defaults;
    } else accessPoints = fallback.accessPoints;
  }
  const primary =
    accessPoints.front || accessPoints.right || accessPoints.back || accessPoints.left || null;
  return {
    id: input.id || randomUUID(),
    sectionId: section.id,
    name: input.name,
    kind,
    footprint,
    levels,
    capacityPerSlot: input.capacityPerSlot ?? DEFAULT_CAPACITY_PER_SLOT,
    allowedDisplayGroups: input.allowedDisplayGroups ?? [],
    accessPoints,
    position: primary,
    reachable: input.reachable && !!primary,
  };
}
app.post('/api/categories', (req, res) => {
  const input = z
    .object({
      id: z
        .string()
        .trim()
        .min(2)
        .max(40)
        .regex(/^[a-z0-9-]+$/),
      name: z.string().trim().min(1).max(40),
      sectionId: z.string().nullable().optional(),
      kind: z.enum(['food', 'non_food']),
    })
    .parse(req.body);
  if (getCategories().some((item) => item.id === input.id))
    return res.status(409).json({ error: '分类编号已存在。' });
  if (
    input.sectionId &&
    !getSections().some((section) => section.id === input.sectionId && section.active)
  )
    return res.status(400).json({ error: '所选分区不存在或已停用。' });
  res
    .status(201)
    .json(saveCategory({ ...input, sectionId: input.sectionId || null, active: true }));
});
app.patch('/api/categories/:id', (req, res) => {
  const existing = getCategories().find((item) => item.id === req.params.id);
  if (!existing) return res.status(404).json({ error: '分类不存在。' });
  const input = z
    .object({
      name: z.string().trim().min(1).max(40),
      sectionId: z.string().nullable(),
      active: z.boolean(),
      kind: z.enum(['food', 'non_food']),
    })
    .parse(req.body);
  if (
    input.sectionId &&
    !getSections().some((section) => section.id === input.sectionId && section.active)
  )
    return res.status(400).json({ error: '所选分区不存在或已停用。' });
  res.json(saveCategory({ ...existing, ...input }));
});
app.post('/api/sections', (req, res) => {
  const input = z
    .object({
      id: z
        .string()
        .trim()
        .min(2)
        .max(40)
        .regex(/^[a-z0-9-]+$/),
      name: z.string().trim().min(1).max(40),
      code: z
        .string()
        .trim()
        .min(1)
        .max(8)
        .regex(/^[A-Za-z0-9-]+$/, '区域编号只能使用字母、数字或连字符。'),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      tint: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      location: z.object({
        x: z.number().int().min(1).max(mapBounds.maxX),
        y: z.number().int().min(1).max(mapBounds.maxY),
      }),
      rect: z.object({
        x: z.number().int().min(1).max(mapBounds.maxX),
        y: z.number().int().min(1).max(mapBounds.maxY),
        w: z.number().int().min(2).max(12),
        h: z.number().int().min(2).max(10),
      }),
    })
    .parse(req.body);
  if (getSections().some((section) => section.id === input.id))
    return res.status(409).json({ error: '分区编号已存在。' });
  const existingSections = getSections();
  if (existingSections.some((section) => section.code.toLowerCase() === input.code.toLowerCase()))
    return res.status(409).json({ error: '区域编号已存在，请换一个编号。' });
  if (
    existingSections.some(
      (section) => section.name.trim().toLowerCase() === input.name.toLowerCase(),
    )
  )
    return res.status(409).json({ error: '区域名称已存在，请换一个名称。' });
  const proposed = { ...input, active: true };
  const placementError = sectionPlacementError(proposed, existingSections);
  if (placementError) return res.status(400).json({ error: placementError });
  res.status(201).json(saveSection(proposed));
});
app.patch('/api/sections/:id', (req, res) => {
  const existing = getSections().find((item) => item.id === req.params.id);
  if (!existing) return res.status(404).json({ error: '门店分区不存在。' });
  const input = z
    .object({
      name: z.string().trim().min(1).max(40),
      active: z.boolean(),
      location: z.object({
        x: z.number().int().min(1).max(mapBounds.maxX),
        y: z.number().int().min(1).max(mapBounds.maxY),
      }),
    })
    .parse(req.body);
  const rect = {
    ...existing.rect,
    x: existing.rect.x + input.location.x - existing.location.x,
    y: existing.rect.y + input.location.y - existing.location.y,
  };
  const proposed = { ...existing, ...input, rect };
  const placementChanged =
    input.active !== existing.active ||
    input.location.x !== existing.location.x ||
    input.location.y !== existing.location.y;
  if (proposed.active && placementChanged) {
    const placementError = sectionPlacementError(proposed);
    if (placementError) return res.status(400).json({ error: placementError });
  }
  res.json(saveSection(proposed));
});
app.post('/api/shelves', (req, res) => {
  const raw = shelfFixtureInputSchema.parse(req.body);
  const section = getSections().find((item) => item.id === raw.sectionId && item.active);
  if (!section) return res.status(400).json({ error: '请选择启用中的所属区域。' });
  const input = normalizeShelfInput(raw, section, getShelves());
  if (getShelves(true).some((shelf) => shelf.id === input.id))
    return res.status(409).json({ error: '货架编号已存在。' });
  const placementError = fixturePlacementError(input);
  if (placementError) return res.status(400).json({ error: placementError });
  res.status(201).json(saveShelf(input));
});
app.patch('/api/shelves/:id/position', (req, res) => {
  const input = z.object({ x: z.number().int(), y: z.number().int(), expected: z.object({
    footprint: shelfFootprintSchema, sectionId: z.string(), accessPoints: shelfAccessSchema, layoutRevision: z.number().int().nonnegative().optional(),
  }).strict() }).strict().parse(req.body);
  const shelves = getShelves();
  const existing = shelves.find((item) => item.id === req.params.id);
  if (!existing?.footprint) return res.status(404).json({ error: '实体货架不存在，请刷新。' });
  if (existing.groupId && shelves.filter((item) => item.groupId === existing.groupId).length > 1) return res.status(409).json({ error:'该货架属于组合，请整体移动或先分拆。' });
  const moved = ['x', 'y', 'w', 'h'].some((key) => existing.footprint![key as keyof NonNullable<Shelf['footprint']>] !== input.expected.footprint[key as keyof NonNullable<Shelf['footprint']>]);
  const sides = ['left', 'right', 'front', 'back'] as const;
  if (moved || (input.expected.layoutRevision !== undefined && input.expected.layoutRevision !== (existing.layoutRevision || 0)) || existing.sectionId !== input.expected.sectionId || sides.some((side) =>
    existing.accessPoints?.[side]?.x !== input.expected.accessPoints[side]?.x ||
    existing.accessPoints?.[side]?.y !== input.expected.accessPoints[side]?.y))
    return res.status(409).json({ error: '货架布局已被其他操作更新，请刷新后重试。' });
  const next = translatedShelf(existing, input.x, input.y);
  const error = shelfMoveError(next, shelves, getSections()) || fixturePlacementError(next, shelves, existing.id);
  if (error) return res.status(409).json({ error });
  res.json(saveShelf({ ...next, layoutRevision: (existing.layoutRevision || 0) + 1 }));
});
const rotationSchema = z.number().int().min(-360000).max(360000).refine((value) => value % 90 === 0, '旋转角度必须是90度的整数倍');
const geometrySchema = z.object({ footprint: shelfFootprintSchema, accessPoints: shelfAccessSchema,
  accessOrder: z.array(z.enum(['left', 'right', 'front', 'back'])).max(4), position: mapPointSchema.nullable(), rotation: rotationSchema,
}).strict().refine((value) => new Set(value.accessOrder).size === value.accessOrder.length &&
  value.accessOrder.length === Object.keys(value.accessPoints).length && value.accessOrder.every((side) => !!value.accessPoints[side]), '到达侧顺序与坐标不一致');
const placedSnapshotSchema = z.object({ id: z.string().min(1).max(80), placement: placementSchema }).strict();
const shelfVersionSchema = z.object({ id: z.string().min(1).max(80), revision: z.number().int().nonnegative(), groupId: z.string().max(80).nullable(), deleted: z.boolean() }).strict();
const shelfTargetSchema = z.object({ id: z.string().min(1).max(80), geometry: geometrySchema, groupId: z.string().max(80).nullable(), deleted: z.boolean() }).strict();
app.post('/api/shelves/batch', (req, res) => {
  const input = z.object({ expected: z.array(shelfVersionSchema).min(1).max(200), expectedProducts: z.array(placedSnapshotSchema).max(5000),
    action: z.discriminatedUnion('type', [
      z.object({ type: z.literal('move'), dx: z.number().int().min(-67).max(67), dy: z.number().int().min(-23).max(23) }).strict(),
      z.object({ type: z.literal('group') }).strict(), z.object({ type: z.literal('ungroup') }).strict(), z.object({ type: z.literal('delete') }).strict(),
      z.object({ type: z.literal('restore'), shelves: z.array(shelfTargetSchema).min(1).max(200), products: z.array(placedSnapshotSchema).max(5000) }).strict(),
    ]),
  }).strict().parse(req.body);
  const all = getShelves(true), active = all.filter((shelf) => !shelf.deleted), products = getProducts();
  const ids = input.expected.map((item) => item.id);
  if (new Set(ids).size !== ids.length) return res.status(400).json({ error: '同一货架不能重复选择。' });
  const selected = all.filter((shelf) => ids.includes(shelf.id));
  if (selected.length !== ids.length || selected.some((shelf) => {
    const expected = input.expected.find((item) => item.id === shelf.id)!; const current = shelfVersion(shelf);
    return !shelf.footprint || current.revision !== expected.revision || current.groupId !== expected.groupId || current.deleted !== expected.deleted;
  })) return res.status(409).json({ error: '所选货架已被其他操作更新，请刷新后重试。' });
  const action = input.action;
  if (action.type !== 'restore' && (selected.some((shelf) => shelf.deleted) || expandShelfSelection(ids,active).some((id) => !ids.includes(id))))
    return res.status(409).json({ error: '请选择完整组合，或先分拆组合。' });
  if (action.type === 'group' && selected.length < 2) return res.status(400).json({ error: '至少选择两个货架才能组合。' });
  const installed = products.filter((product) => product.status !== 'archived' && product.shelfId && ids.includes(product.shelfId));
  const productIds = input.expectedProducts.map((item) => item.id);
  if (new Set(productIds).size !== productIds.length || installed.some((product) => !productIds.includes(product.id)) ||
    (action.type !== 'restore' && installed.length !== productIds.length) || input.expectedProducts.some((item) => {
      const product = products.find((product) => product.id === item.id);
      return !product || product.status === 'archived' || !samePlacement(placementOf(product), item.placement);
    })) return res.status(409).json({ error: '所选货架的商品位置已变化，请刷新后重试。' });
  if (action.type === 'restore' && (action.shelves.length !== ids.length || new Set(action.shelves.map((item) => item.id)).size !== ids.length ||
    action.shelves.some((item) => !ids.includes(item.id)) || action.products.length !== productIds.length || new Set(action.products.map((item) => item.id)).size !== productIds.length ||
    action.products.some((item) => !productIds.includes(item.id) || !!item.placement.shelfId && !ids.includes(item.placement.shelfId))))
    return res.status(409).json({ error: '撤销记录不完整，操作未保存。' });
  const groupId = action.type === 'group' ? `shelf-group-${randomUUID()}` : undefined;
  const moved = action.type === 'move' ? translateShelfSelection(ids, action.dx, action.dy, selected) : [];
  const updates = selected.map((shelf) => {
    const target = action.type === 'restore' ? action.shelves.find((item) => item.id === shelf.id)! : undefined;
    const next = action.type === 'move' ? moved.find((item) => item.id === shelf.id)!
      : action.type === 'restore' ? { ...restoreShelfGeometry(shelf,target!.geometry), groupId: target!.groupId || undefined, deleted: target!.deleted }
      : action.type === 'delete' ? { ...shelf, deleted: true }
      : { ...shelf, groupId: action.type === 'group' ? groupId : undefined };
    return { ...next, layoutRevision: (shelf.layoutRevision || 0) + 1 };
  });
  if (action.type === 'move' || action.type === 'restore') {
    const reason = shelfBatchPlacementError(updates, active, getSections());
    if (reason) return res.status(409).json({ error: reason });
  }
  const stagedShelves = [...active.filter((shelf) => !ids.includes(shelf.id)), ...updates.filter((shelf) => !shelf.deleted)];
  const affected = products.filter((product) => productIds.includes(product.id));
  const updatedProducts = affected.map((product) => action.type === 'delete' ? { ...applyPlacement(product,unplaced(),stagedShelves), manualPlacement:true }
    : action.type === 'restore' ? { ...applyPlacement(product,action.products.find((item) => item.id === product.id)!.placement,stagedShelves), manualPlacement:true } : product);
  if (action.type === 'restore') {
    const stagedProducts = products.map((product) => updatedProducts.find((item) => item.id === product.id) || product);
    for (const product of updatedProducts) {
      if (!product.shelfId) continue;
      const shelf = stagedShelves.find((shelf) => shelf.id === product.shelfId);
      const side = product.shelfSide || Object.keys(shelf?.accessPoints || {})[0] as AccessSide;
      if (!shelf || !side || !shelf.accessPoints?.[side] || (product.shelfLevel || 1) > (shelf.levels || 1) ||
        (product.shelfSlot !== undefined && product.shelfSlot >= shelfSlotCapacity(shelf))) return res.status(409).json({ error:'恢复后商品位置无效，操作未保存。' });
      const reason = shelfSlotPlacementError(shelf,product,stagedProducts,side,product.shelfLevel || 1);
      if (reason) return res.status(409).json({error:reason});
    }
  }
  saveShelvesAndProductsAtomically(updates, action.type === 'delete' || action.type === 'restore' ? updatedProducts : []);
  res.json({ shelves: updates, products: updatedProducts, undo: { expected: updates.map(shelfVersion),
    expectedProducts: updatedProducts.map((product) => ({ id:product.id, placement:placementOf(product) })),
    action: { type:'restore', shelves:selected.map(shelfTarget), products:affected.map((product) => ({id:product.id,placement:placementOf(product)})) } } });
});
app.patch('/api/shelves/:id/layout', (req, res) => {
  const input = z.object({ expected: z.object({ geometry: geometrySchema, revision: z.number().int().nonnegative() }).strict(),
    expectedProducts: z.array(placedSnapshotSchema).max(2000),
    action: z.discriminatedUnion('type', [
      z.object({ type: z.literal('rotate'), direction: z.enum(['cw', 'ccw']) }).strict(),
      z.object({ type: z.literal('resize'), footprint: shelfFootprintSchema }).strict(),
      z.object({ type: z.literal('restore'), geometry: geometrySchema, placements: z.array(placedSnapshotSchema).max(2000) }).strict(),
    ]),
  }).strict().parse(req.body);
  const shelves = getShelves(), products = getProducts();
  const existing = shelves.find((shelf) => shelf.id === req.params.id);
  if (!existing?.footprint) return res.status(409).json({ error: '请先补全货架占地资料。' });
  if (existing.groupId && shelves.filter((item) => item.groupId === existing.groupId).length > 1) return res.status(409).json({ error:'请先分拆组合，再旋转或调整单个货架占地。' });
  const before = shelfGeometry(existing), expected = input.expected.geometry;
  const different = (['x', 'y', 'w', 'h'] as const).some((key) => before.footprint[key] !== expected.footprint[key]) ||
    before.rotation !== expected.rotation || before.accessOrder.join() !== expected.accessOrder.join() ||
    before.position?.x !== expected.position?.x || before.position?.y !== expected.position?.y ||
    (['left', 'right', 'front', 'back'] as const).some((side) => before.accessPoints[side]?.x !== expected.accessPoints[side]?.x || before.accessPoints[side]?.y !== expected.accessPoints[side]?.y);
  if ((existing.layoutRevision || 0) !== input.expected.revision || different)
    return res.status(409).json({ error: '货架布局已更新，请刷新后再操作。' });
  const installed = products.filter((product) => product.status !== 'archived' && product.shelfId === existing.id);
  if (installed.length !== input.expectedProducts.length || new Set(input.expectedProducts.map((item) => item.id)).size !== installed.length ||
    installed.some((product) => !input.expectedProducts.some((item) => item.id === product.id && samePlacement(item.placement, placementOf(product)))))
    return res.status(409).json({ error: '货架上的商品位置已变更，请刷新后再操作。' });
  const action = input.action;
  let next = action.type === 'rotate' ? rotatedShelf(existing, action.direction) : action.type === 'resize' ? resizedShelf(existing, action.footprint) : restoreShelfGeometry(existing, action.geometry);
  const error = shelfMoveError(next, shelves, getSections()) || fixturePlacementError(next, shelves, existing.id);
  if (error) return res.status(409).json({ error });
  if (action.type === 'restore' && (action.placements.length !== installed.length || new Set(action.placements.map((item) => item.id)).size !== installed.length ||
    action.placements.some((item) => item.placement.shelfId !== existing.id || !installed.some((product) => product.id === item.id))))
    return res.status(409).json({ error: '待恢复的商品位置不完整，请刷新。' });
  const updated = installed.map((product) => action.type === 'rotate'
    ? { ...product, shelfSide: product.shelfSide ? rotateShelfSide(product.shelfSide, action.direction) : undefined }
    : action.type === 'restore' ? applyPlacement(product, action.placements.find((item) => item.id === product.id)!.placement, [next]) : product);
  const staged = products.map((product) => updated.find((item) => item.id === product.id) || product);
  for (const product of updated) {
    const side = product.shelfSide || Object.keys(next.accessPoints || {})[0] as NonNullable<Product['shelfSide']>;
    if (!side || !next.accessPoints?.[side] || (product.shelfLevel || 1) > (next.levels || 1) || (product.shelfSlot !== undefined && product.shelfSlot >= shelfSlotCapacity(next)))
      return res.status(409).json({ error: `“${product.name}”的位置会失效，操作未保存。` });
    const reason = shelfSlotPlacementError(next, product, staged, side, product.shelfLevel || 1);
    if (reason) return res.status(409).json({ error: reason });
    if (shelfCells(staged, next, side, product.shelfLevel || 1).filter(Boolean).length > shelfSlotCapacity(next))
      return res.status(409).json({ error: '变更后商品数量超出层位容量。' });
  }
  next = { ...next, layoutRevision: (existing.layoutRevision || 0) + 1 };
  saveShelfAndProductsAtomically(next, updated);
  res.json({ shelf: next, products: updated,
    expectedProducts: updated.map((product) => ({ id: product.id, placement: placementOf(product) })),
    undo: { geometry: before, placements: installed.map((product) => ({ id: product.id, placement: placementOf(product) })) } });
});
app.patch('/api/shelves/:id', (req, res) => {
  const existing = getShelves().find((item) => item.id === req.params.id);
  if (!existing) return res.status(404).json({ error: '货架不存在。' });
  const raw = shelfFixtureInputSchema.omit({ id: true }).parse(req.body);
  const section = getSections().find((item) => item.id === raw.sectionId && item.active);
  if (!section) return res.status(400).json({ error: '请选择启用中的所属区域。' });
  const normalized = normalizeShelfInput(
    { ...existing, ...raw, id: existing.id },
    section,
    getShelves(),
  );
  const input = { ...existing, ...normalized, id: existing.id, layoutRevision: (existing.layoutRevision || 0) + 1 };
  const placementError = fixturePlacementError(input, getShelves(), existing.id);
  if (placementError) return res.status(400).json({ error: placementError });
  const invalidProducts = productsInvalidatedByFixture(existing.id, input);
  if (invalidProducts.length)
    return res.status(409).json({
      error: `设施变更会使商品位置失效：${invalidProducts.map((product) => product.name).join('、')}。请先调整这些商品的侧面或层位。`,
    });
  res.json(saveShelf(input));
});

const categories = z
  .string()
  .refine(
    (id) => getCategories().some((category) => category.id === id && category.active),
    '请选择有效在用分类',
  );
const querySchema = z.object({
  message: z.string().trim().min(1).max(800),
  currency: z.enum(['USD', 'CNY']).optional(),
  previous: z
    .object({
      categories: z.array(z.string().max(80)).max(100),
      min: z.number().nonnegative().optional(),
      max: z.number().nonnegative().optional(),
      term: z.string().max(200).optional(),
      sort: z.enum(['price', 'default']).optional(),
    })
    .optional(),
});
app.post('/api/chat', async (req, res) => {
  const input = querySchema.parse(req.body);
  const currency = input.currency || 'CNY';
  const mismatch = currencyMismatchMessage(input.message, currency);
  if (mismatch)
    return res.json({ text: mismatch, products: [], filters: input.previous || { categories: [] }, engine: 'rules' } satisfies GuideResponse);
  res.json(
    await guide(
      input.message,
      getProducts().filter((product) => availableForSale(product) && productCurrency(product) === currency),
      input.previous,
      getCategories(),
    ),
  );
});
app.post('/api/assistant', async (req, res) => {
  const input = querySchema.extend({ context: shoppingContextSchema }).parse(req.body);
  const currency = input.currency || 'CNY';
  const mismatch = currencyMismatchMessage(input.message, currency);
  if (mismatch)
    return res.json({ text: mismatch, products: [], filters: input.previous || { categories: [] }, engine: 'rules',clearMealPlan:true } satisfies GuideResponse);
  res.json(
    await shoppingAgent(
      input.message,
      getProducts().filter((product) => availableForSale(product) && productCurrency(product) === currency),
      input.context,
      input.previous,
      getCategories(),
    ),
  );
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) =>
    callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
});
app.post('/api/vision', upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: '请上传 JPG、PNG 或 WebP 图片，最大 6MB。' });
    return;
  }
  let bytes: Buffer;
  try {
    bytes = await sharp(req.file.buffer, { limitInputPixels: 25000000 })
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    res.status(400).json({ error: '图片无法读取或像素过大，请换一张小于 2500 万像素的图片。' });
    return;
  }
  const filename = `${randomUUID()}.jpg`;
  await writeFile(path.join(uploads, filename), bytes);
  const image = `/uploads/${filename}`;
  try {
    const currency: Currency = req.body.currency === 'USD' ? 'USD' : 'CNY';
    const result = await identifyImage(
      bytes,
      getProducts().filter((product) => product.status !== 'archived' && productCurrency(product) === currency),
      getCategories(),
    );
    res.json({
      ...result,
      image,
      engine: 'model',
      notice: result.uncertain
        ? '图片主体不够明确，请确认候选商品，或重新拍摄一件商品。'
        : '已根据图片推荐分区，请确认商品名称。',
    });
  } catch (error) {
    res.status(error instanceof AiError ? error.status : 502).json({
      error: error instanceof AiError ? error.message : '识别服务暂时不可用，请稍后重试。',
      image,
    });
  }
});

const quoteSchema = z
  .object({
    id: z.string().max(100),
    name: z.string().min(1).max(80),
    category: z.string().max(80),
    origin: z.string().max(100),
    spec: z.string().max(120),
    unit: z.string().min(1).max(30),
    low: z.number().positive().max(1000000),
    average: z.number().positive().max(1000000),
    high: z.number().positive().max(1000000),
    date: z.string().refine(isValidMarketDate, '报价日期无效'),
  })
  .refine((quote) => quote.low <= quote.average && quote.average <= quote.high, '报价范围不正确');
const marketSchema = z
  .object({
    price: z.number().positive().max(100000),
    source: z.string().trim().min(1).max(100),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(isValidMarketDate, '参考日期无效'),
    unit: z.string().min(1).max(20).optional(),
    kind: z.enum(['retail', 'wholesale']).optional(),
    markupPercent: z.number().min(0).max(300).optional(),
    quote: quoteSchema.optional(),
    sourceUrl: z.literal(XINFADI_SOURCE_URL).optional(),
    fetchedAt: z.iso.datetime().optional(),
  })
  .superRefine((reference, context) => {
    if (
      reference.quote &&
      (reference.kind !== 'wholesale' ||
        !reference.unit ||
        reference.date !== reference.quote.date ||
        convertMarketPrice(reference.quote.average, reference.quote.unit, reference.unit) !==
          reference.price)
    ) {
      context.addIssue({ code: 'custom', message: '批发报价的日期、单位或换算金额不一致。' });
    }
  });
app.post('/api/market-prices', async (req, res) => {
  const input = z
    .object({
      query: z
        .string()
        .trim()
        .min(1)
        .max(40)
        .regex(/^[\p{L}\p{N}\s()（）·-]+$/u, '请使用商品名称查询'),
    })
    .parse(req.body);
  res.setHeader('Cache-Control', 'no-store');
  res.json(await lookupMarket(input.query));
});
app.post('/api/pricing', (req, res) => {
  const input = z
    .object({ productId: z.string().max(80).optional(), reference: marketSchema.optional() })
    .parse(req.body);
  const product = input.productId ? getProduct(input.productId) : undefined;
  if (product && input.reference?.unit && input.reference.unit !== product.unit) {
    res.status(400).json({ error: '参考价单位与历史商品不一致，请换算后重试。' });
    return;
  }
  res.json(recommendPrice(product, input.reference));
});
const productSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    category: categories,
    price: z.number().positive().max(100000),
    unit: z.string().trim().min(1).max(20),
    stock: z.number().int().min(0).max(1000000),
    inventoryMode: z.enum(['tracked', 'untracked']).optional(),
    shelf: z.string().trim().min(1).max(30),
    shelfId: z.string().max(60).optional(),
    shelfSide: z.enum(['left', 'right', 'front', 'back']).optional(),
    shelfLevel: z.number().int().min(1).max(8).optional(),
    saleMode: z.enum(['weight', 'pack']).optional(),
    image: z
      .string()
      .max(200)
      .refine(validProductImage, '图片需为本地图片、Open Food Facts 或京东商品图地址')
      .optional(),
    description: z.string().max(200).optional(),
    source: z.enum(['manual', 'suggested']),
    reference: marketSchema.optional(),
  })
  .refine(
    (input) => !input.reference?.unit || input.reference.unit === input.unit,
    '商品与参考价的计价单位不一致',
  )
  .refine(
    (input) => input.saleMode !== 'weight' || !!unitGrams(input.unit),
    '称重商品需要明确的质量计价单位，例如 500g 或 1kg。',
  );
app.post('/api/products', (req, res) => {
  const input = productSchema.parse(req.body);
  const now = new Date().toISOString();
  const shelf = input.shelfId
    ? getShelves().find((item) => item.id === input.shelfId)
    : getShelves().find((item) => item.name === input.shelf);
  if (!shelf || !shelf.reachable) {
    res.status(400).json({ error: '请为商品选择有效且可达的货架。' });
    return;
  }
  const shelfPosition = resolveProductShelfPosition(shelf, input.shelfSide, input.shelfLevel);
  if ('error' in shelfPosition) return res.status(400).json({ error: shelfPosition.error });
  const capacityError = shelfSlotPlacementError(
    shelf,
    { id: '', name: input.name },
    getProducts(),
    shelfPosition.shelfSide,
    shelfPosition.shelfLevel,
  );
  if (capacityError) return res.status(409).json({ error: capacityError });
  const product: Product = {
    id: randomUUID(),
    sku: `QH-${randomUUID().slice(0, 8).toUpperCase()}`,
    catalogOrigin: 'manual',
    currency: 'CNY',
    status: 'active',
    name: input.name,
    category: input.category,
    price: Math.round(input.price * 100) / 100,
    unit: input.unit,
    image:
      input.image ||
      `/images/${input.category === 'vegetables' ? 'spinach' : input.category === 'seafood' ? 'fish' : input.category === 'fruit' ? 'apple' : input.category === 'meat' ? 'beef' : input.category === 'dairy' ? 'milk' : input.category === 'bakery' ? 'bread' : input.category === 'pantry' ? 'rice' : 'market'}.jpg`,
    stock: input.stock,
    inventoryMode: input.inventoryMode || 'tracked',
    priceOrigin: 'manual',
    shelf: shelf.name,
    shelfId: shelf?.id,
    shelfSide: shelfPosition.shelfSide,
    shelfLevel: shelfPosition.shelfLevel,
    saleMode:
      input.saleMode ||
      (['vegetables', 'fruit', 'seafood', 'meat'].includes(input.category) && unitGrams(input.unit)
        ? 'weight'
        : 'pack'),
    description: input.description || '门店新上架商品',
    tags: [],
    aliases: [input.name],
    createdAt: now,
    history: [
      {
        price: Math.round(input.price * 100) / 100,
        date: now.slice(0, 10),
        source: input.source,
        unit: input.unit,
        currency: 'CNY',
      },
    ],
    marketPrice: input.reference?.price,
    marketSource: input.reference?.source,
    marketDate: input.reference?.date,
    marketReference: input.reference,
  };
  res.status(201).json(saveProduct(product));
});
app.patch('/api/products/:id', (req, res) => {
  const input = productSchema.parse(req.body);
  const previous = getProduct(req.params.id);
  if (!previous) {
    res.status(404).json({ error: '商品不存在，请刷新后重试。' });
    return;
  }
  const shelf = input.shelfId
    ? getShelves().find((item) => item.id === input.shelfId)
    : getShelves().find((item) => item.name === input.shelf);
  if (!shelf || !shelf.reachable) {
    res.status(400).json({ error: '请为商品选择有效且可达的货架。' });
    return;
  }
  const sameShelf = shelf.id === previous.shelfId;
  const shelfPosition = resolveProductShelfPosition(
    shelf,
    input.shelfSide ?? (sameShelf ? previous.shelfSide : undefined),
    input.shelfLevel ?? (sameShelf ? previous.shelfLevel : undefined),
  );
  if ('error' in shelfPosition) return res.status(400).json({ error: shelfPosition.error });
  const capacityError = shelfSlotPlacementError(
    shelf,
    previous,
    getProducts(),
    shelfPosition.shelfSide,
    shelfPosition.shelfLevel,
  );
  if (capacityError) return res.status(409).json({ error: capacityError });
  const unitChanged = previous.unit !== input.unit;
  const changed = previous.price !== input.price || unitChanged;
  const history = changed
    ? [
        ...previous.history.map((record) => ({ ...record, unit: record.unit || previous.unit })),
        {
          price: Math.round(input.price * 100) / 100,
          date: new Date().toISOString().slice(0, 10),
          source: input.source,
          unit: input.unit,
          currency: previous.currency || 'CNY',
        },
      ].slice(-120)
    : previous.history;
  const { source: _source, reference, ...fields } = input;
  res.json(
    saveProduct({
      ...previous,
      ...fields,
      inventoryMode: input.inventoryMode || previous.inventoryMode || 'tracked',
      priceOrigin: changed ? 'manual' : previous.priceOrigin,
      status: 'active',
      catalogOrigin:
        previous.catalogOrigin === 'legacy-demo' ? 'manual' : previous.catalogOrigin || 'manual',
      shelf: shelf.name,
      shelfId: shelf?.id,
      shelfSide: shelfPosition.shelfSide,
      shelfLevel: shelfPosition.shelfLevel,
      shelfSlot: sameShelf && previous.shelfSide === shelfPosition.shelfSide &&
        (previous.shelfLevel || 1) === shelfPosition.shelfLevel ? previous.shelfSlot : undefined,
      saleMode: input.saleMode || previous.saleMode,
      price: Math.round(input.price * 100) / 100,
      history,
      ...(reference
        ? {
            marketPrice: reference.price,
            marketSource: reference.source,
            marketDate: reference.date,
            marketReference: reference,
          }
        : unitChanged
          ? {
              marketPrice: undefined,
              marketSource: undefined,
              marketDate: undefined,
              marketReference: undefined,
            }
          : {}),
    }),
  );
});
app.use('/api', (_req, res) => {
  res.status(404).json({ error: '接口不存在。' });
});
const dist = path.resolve('dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use(
  (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof MarketError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: `输入有误：${error.issues[0]?.path.join('.')} ${error.issues[0]?.message}`,
      });
      return;
    }
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        error:
          error.code === 'LIMIT_FILE_SIZE'
            ? '图片超过 6MB，请压缩后重试。'
            : '上传失败，请一次选择一张图片。',
      });
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: '请求格式不正确。' });
      return;
    }
    console.error('Request failed:', error instanceof Error ? error.name : 'UnknownError');
    res.status(500).json({ error: '服务暂时遇到问题，请稍后重试。' });
  },
);
const port = Number(process.env.PORT || 3001);
app.listen(port, process.env.HOST || '127.0.0.1', () =>
  console.log(
    `青禾超市已启动：http://${process.env.HOST || '127.0.0.1'}:${port} · ${aiConfigured() ? '大模型已配置' : '规则导购模式，图片识别待配置 API'}`,
  ),
);
