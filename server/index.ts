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
import { zones } from '../shared/catalog';
import type { Product } from '../shared/types';
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
  const model = z.string().refine((id) => modelOptions.some((option) => option.id === id), '请选择支持的模型');
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
      code: z.string().trim().min(1).max(8),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      tint: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      location: z.object({
        x: z.number().int().min(1).max(31),
        y: z.number().int().min(1).max(23),
      }),
      rect: z.object({
        x: z.number().int(),
        y: z.number().int(),
        w: z.number().int().positive(),
        h: z.number().int().positive(),
      }),
    })
    .parse(req.body);
  if (getSections().some((section) => section.id === input.id))
    return res.status(409).json({ error: '分区编号已存在。' });
  res.status(201).json(saveSection({ ...input, active: true }));
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
  if (rect.x < 1 || rect.y < 1 || rect.x + rect.w > 32 || rect.y + rect.h > 24)
    return res.status(400).json({ error: '分区移动后会超出地图边界。' });
  res.json(saveSection({ ...existing, ...input, rect }));
});
app.post('/api/shelves', (req, res) => {
  const input = z
    .object({
      id: z
        .string()
        .trim()
        .min(2)
        .max(60)
        .regex(/^[a-z0-9-]+$/),
      sectionId: z.string(),
      name: z.string().trim().min(1).max(30),
      position: z
        .object({ x: z.number().int().min(1).max(31), y: z.number().int().min(1).max(23) })
        .nullable(),
      reachable: z.boolean(),
    })
    .parse(req.body);
  if (getShelves().some((shelf) => shelf.id === input.id))
    return res.status(409).json({ error: '货架编号已存在。' });
  if (!getSections().some((section) => section.id === input.sectionId && section.active))
    return res.status(400).json({ error: '所选分区不存在或已停用。' });
  res.status(201).json(saveShelf(input));
});
app.patch('/api/shelves/:id', (req, res) => {
  const existing = getShelves().find((item) => item.id === req.params.id);
  if (!existing) return res.status(404).json({ error: '货架不存在。' });
  const input = z
    .object({
      sectionId: z.string(),
      name: z.string().trim().min(1).max(30),
      position: z
        .object({ x: z.number().int().min(1).max(31), y: z.number().int().min(1).max(23) })
        .nullable(),
      reachable: z.boolean(),
    })
    .parse(req.body);
  if (!getSections().some((section) => section.id === input.sectionId))
    return res.status(400).json({ error: '所选分区不存在。' });
  res.json(saveShelf({ ...existing, ...input }));
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
  if (input.shelfId && (!shelf || !shelf.reachable)) {
    res.status(400).json({ error: '请为商品选择有效且可达的货架。' });
    return;
  }
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
    shelf: input.shelf,
    shelfId: shelf?.id,
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
  if (input.shelfId && (!shelf || !shelf.reachable)) {
    res.status(400).json({ error: '请为商品选择有效且可达的货架。' });
    return;
  }
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
      shelfId: shelf?.id,
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
