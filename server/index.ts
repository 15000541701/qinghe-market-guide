import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdirSync, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { aiConfigured, AiError, guide, identifyImage } from './ai';
import { modelOptions } from '../shared/model-options';
import { getModelSettings, saveModelSettings } from './model-settings';
import {
  getCategories,
  getProduct,
  getProducts,
  getSections,
  getShelves,
  saveCategory,
  saveProduct,
  saveSection,
  saveShelf,
} from './db';
import { recommendPrice } from '../shared/pricing';
import { entrance, zones } from '../shared/catalog';
import { findPath, isWalkable } from '../shared/navigation';
import type { Point, Product, StoreSection, Shelf } from '../shared/types';
import {
  defaultFixture,
  fixtureAccessPoints,
  fixtureSideLabels,
  fixedFixtures,
  mainAisles,
} from '../shared/layout';
import { lookupMarket, MarketError } from './market';
import { shoppingAgent, shoppingContextSchema } from './shopping-agent';
import { convertMarketPrice, isValidMarketDate, XINFADI_SOURCE_URL } from '../shared/market';
import { unitGrams } from '../shared/shopping';

const app = express();
const uploads = path.resolve(process.env.DATA_DIR || 'data', 'uploads');
mkdirSync(uploads, { recursive: true });
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.use(express.json({ limit: '512kb' }));
app.use('/uploads', express.static(uploads));
app.get('/api/model-settings', (_req, res) => res.json(getModelSettings()));
app.put('/api/model-settings', (req, res) => {
  const model = z
    .string()
    .refine((id) => modelOptions.some((option) => option.id === id), '请选择支持的模型');
  const settings = z.object({ model }).strict().parse(req.body);
  res.json(saveModelSettings(settings));
});
app.get('/api/status', (_req, res) =>
  res.json({ ai: aiConfigured(), mode: aiConfigured() ? '大模型导购' : '规则导购', demo: true }),
);
app.get('/api/products', (_req, res) => res.json(getProducts()));
app.get('/api/categories', (_req, res) => res.json(getCategories()));
app.get('/api/sections', (_req, res) => res.json(getSections()));
app.get('/api/shelves', (_req, res) => res.json(getShelves()));
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
    rect.x + rect.w > 32 ||
    rect.y + rect.h > 24
  )
    return '区域矩形超出地图边界，或面积需至少 2×2 格、最多 12×10 格。';
  if (fixedFixtures.some((fixture) => rectsOverlap(rect, fixture.rect)))
    return '区域不能覆盖主通道设施或固定障碍。';
  const activeOthers = current.filter((item) => item.active && item.id !== section.id);
  if (activeOthers.some((item) => rectsOverlap(rect, item.rect)))
    return '区域矩形与现有启用区域重叠，请调整位置。';
  const misplacedFixture = getShelves().find(
    (shelf) =>
      shelf.sectionId === section.id &&
      shelf.footprint &&
      (shelf.footprint.x < rect.x ||
        shelf.footprint.y < rect.y ||
        shelf.footprint.x + shelf.footprint.w > rect.x + rect.w ||
        shelf.footprint.y + shelf.footprint.h > rect.y + rect.h),
  );
  if (misplacedFixture)
    return `调整区域会把设施“${misplacedFixture.name}”移出所属地面，请先调整设施位置。`;
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
    footprint.x + footprint.w > 32 ||
    footprint.y + footprint.h > 24
  )
    return '设施占地超出地图边界。';
  if (
    footprint.x < section.rect.x ||
    footprint.y < section.rect.y ||
    footprint.x + footprint.w > section.rect.x + section.rect.w ||
    footprint.y + footprint.h > section.rect.y + section.rect.h
  )
    return '设施占地需完整位于所属区域内。';
  if (input.levels < 1 || input.levels > 8) return '设施层数需在 1–8 层之间。';
  if (!['gondola', 'chiller'].includes(input.kind) && input.levels !== 1)
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
    if (product.shelfId !== shelfId) return false;
    const side = product.shelfSide;
    const level = product.shelfLevel || 1;
    return (
      (side !== undefined && !next.accessPoints?.[side]) ||
      level > (next.levels || 1) ||
      (!['gondola', 'chiller'].includes(next.kind || 'gondola') && level !== 1)
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
  if (!['gondola', 'chiller'].includes(shelf.kind || 'gondola') && selectedLevel !== 1)
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
  x: z.number().int().min(1).max(31),
  y: z.number().int().min(1).max(23),
});
const shelfFootprintSchema = z.object({
  x: z.number().int().min(1).max(31),
  y: z.number().int().min(1).max(23),
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
        x: z.number().int().min(1).max(31),
        y: z.number().int().min(1).max(23),
      }),
      rect: z.object({
        x: z.number().int().min(1).max(31),
        y: z.number().int().min(1).max(23),
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
        x: z.number().int().min(1).max(31),
        y: z.number().int().min(1).max(23),
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
  if (getShelves().some((shelf) => shelf.id === input.id))
    return res.status(409).json({ error: '货架编号已存在。' });
  const placementError = fixturePlacementError(input);
  if (placementError) return res.status(400).json({ error: placementError });
  res.status(201).json(saveShelf(input));
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
  const input = { ...existing, ...normalized, id: existing.id };
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
  res.json(await guide(input.message, getProducts(), input.previous, getCategories()));
});
app.post('/api/assistant', async (req, res) => {
  const input = querySchema.extend({ context: shoppingContextSchema }).parse(req.body);
  res.json(
    await shoppingAgent(
      input.message,
      getProducts(),
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
    const result = await identifyImage(bytes, getProducts(), getCategories());
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
    shelf: z.string().trim().min(1).max(30),
    shelfId: z.string().max(60).optional(),
    shelfSide: z.enum(['left', 'right', 'front', 'back']).optional(),
    shelfLevel: z.number().int().min(1).max(8).optional(),
    saleMode: z.enum(['weight', 'pack']).optional(),
    image: z
      .string()
      .max(200)
      .regex(/^\/(?:images\/[a-z0-9-]+\.jpg|uploads\/[a-f0-9-]+\.jpg)$/)
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
  const product: Product = {
    id: randomUUID(),
    name: input.name,
    category: input.category,
    price: Math.round(input.price * 100) / 100,
    unit: input.unit,
    image:
      input.image ||
      `/images/${input.category === 'vegetables' ? 'spinach' : input.category === 'seafood' ? 'fish' : input.category === 'fruit' ? 'apple' : input.category === 'meat' ? 'beef' : input.category === 'dairy' ? 'milk' : input.category === 'bakery' ? 'bread' : input.category === 'pantry' ? 'rice' : 'market'}.jpg`,
    stock: input.stock,
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
        },
      ].slice(-120)
    : previous.history;
  const { source: _source, reference, ...fields } = input;
  res.json(
    saveProduct({
      ...previous,
      ...fields,
      shelf: shelf.name,
      shelfId: shelf?.id,
      shelfSide: shelfPosition.shelfSide,
      shelfLevel: shelfPosition.shelfLevel,
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
