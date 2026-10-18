import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getCategories, getProducts, getShelves, saveProductsAtomically } from './db';
import { entrance } from '../shared/catalog';
import { findPath } from '../shared/navigation';
import { getSections } from './db';
import { unitGrams } from '../shared/shopping';
import { validProductImage } from '../shared/product-image';
import { shelfSlotPlacementError } from '../shared/shelf-capacity';
import type { Product } from '../shared/types';
import type { Currency } from '../shared/types';
import type { SkuRow, SkuImportResult } from '../shared/sku-file';

const numberValue = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? undefined : Number(value)),
  z.number().finite().nonnegative().optional(),
);
const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().trim().max(max).optional(),
  );
const optionalBoolean = z.preprocess(
  (value) =>
    value === '' || value === null || value === undefined
      ? undefined
      : value === true || value === 'true'
        ? true
        : value === false || value === 'false'
          ? false
          : value,
  z.boolean().optional(),
);
const url = optionalText(1000).refine(
  (value) => !value || /^https?:\/\//.test(value),
  '来源链接必须是 HTTP/HTTPS 地址',
);
const schema = z.object({
  id: optionalText(80),
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(40),
  brand: optionalText(80),
  barcode: optionalText(40),
  catalogOrigin: optionalText(20),
  merchandisingFamily: optionalText(80),
  processingForm: optionalText(30),
  storageCondition: optionalText(30),
  classificationConfidence: optionalText(30),
  merchandisingState: optionalText(30),
  displayGroup: optionalText(80),
  price: numberValue,
  stock: numberValue,
  inventoryMode: optionalText(20),
  priceOrigin: optionalText(20), currency: optionalText(3), priceSourceUrl: url, priceCheckedAt: optionalText(40),
  pricePer: optionalText(20), priceIsDiscounted: optionalBoolean,
  priceRecordId: numberValue,
  priceWithoutDiscount: numberValue, priceLocationId: numberValue, priceLocationOsmId: numberValue,
  priceLocationOsmType: optionalText(20), priceProofId: numberValue,
  priceLocationName: optionalText(100), priceLocationDisplayName: optionalText(300),
  priceLocationCity: optionalText(100), priceLocationCountry: optionalText(100),
  sourceImageUrl: optionalText(200), priceNote: optionalText(200),
  shelfId: optionalText(80),
  shelf: optionalText(30),
  shelfSide: optionalText(10),
  shelfLevel: numberValue,
  saleMode: optionalText(10),
  status: optionalText(10),
  description: optionalText(200),
  image: optionalText(200),
  sourceRetailer: optionalText(80),
  sourceUrl: url,
  sourceSku: optionalText(80),
  sourceListingUrl: url,
  sourceCheckedAt: optionalText(40),
});
export function importSkus(
  rows: SkuRow[],
  mode: 'create' | 'upsert',
  apply: boolean,
): SkuImportResult {
  const existing = getProducts();
  const categories = getCategories();
  const shelves = getShelves();
  const stagedProducts = [...existing];
  const result: SkuImportResult = {
    created: 0,
    updated: 0,
    errors: [],
    preview: [],
    applied: false,
  };
  const changes: Product[] = [];
  const seen = new Set<string>();
  for (const [index, row] of rows.entries()) {
    try {
      const input = schema.parse(row);
      const skuMatch = existing.find((p) => (p.sku || p.id) === input.sku);
      const idMatch = input.id ? existing.find((p) => p.id === input.id) : undefined;
      const barcodeMatch = input.barcode ? existing.find((p) => p.barcode === input.barcode) : undefined;
      if (input.id && !idMatch) throw new Error('指定的 id 不存在；新增商品请留空 id。');
      if (idMatch && skuMatch && idMatch.id !== skuMatch.id)
        throw new Error('id 与 sku 指向不同商品。');
      const previous = idMatch || skuMatch;
      if (barcodeMatch && barcodeMatch.id !== previous?.id)
        throw new Error('该条码已属于另一商品，不能重复创建。');
      const targetKey = previous?.id || input.sku;
      if (seen.has(targetKey) || seen.has(`sku:${input.sku}`))
        throw new Error('文件中重复 SKU 或同一商品出现多次。');
      seen.add(targetKey);
      seen.add(`sku:${input.sku}`);
      if (previous && mode === 'create')
        throw new Error('该 SKU 已存在；需要更新时请选择新增并更新模式。');
      const categoryMatches = categories.filter(
        (c) => c.active && (c.id === input.category || c.name === input.category),
      );
      if (categoryMatches.length !== 1)
        throw new Error('分类不存在、已停用或名称不唯一，请先在门店管理中创建分类。');
      const price = input.price ?? previous?.price ?? 0;
      const stock = input.stock ?? previous?.stock ?? 100;
      const inventoryMode = input.inventoryMode || previous?.inventoryMode || 'tracked';
      if (!['tracked', 'untracked'].includes(inventoryMode)) throw new Error('inventoryMode 需为 tracked 或 untracked。');
      if (price > 100000 || stock > 1000000 || !Number.isInteger(stock))
        throw new Error('价格需0–100000；库存需0–1000000的整数。');
      const currency = input.currency || previous?.currency || 'CNY';
      if (!['USD', 'CNY'].includes(currency)) throw new Error('币种仅支持 USD 或 CNY。');
      const sourceUrl = input.sourceUrl || previous?.sourceUrl;
      const priceOrigin =
        input.priceOrigin ||
        (input.price !== undefined && input.price !== previous?.price ? 'manual' : previous?.priceOrigin);
      if (priceOrigin && !['jd-retail', 'manual', 'open-prices', 'samsclub'].includes(priceOrigin))
        throw new Error('priceOrigin 无效。');
      const catalogOrigin =
        (input.catalogOrigin as Product['catalogOrigin']) ||
        (previous?.catalogOrigin === 'legacy-demo'
          ? 'manual'
          : previous?.catalogOrigin || (sourceUrl ? 'retailer' : 'manual'));
      if (catalogOrigin && !['retailer', 'manual', 'legacy-demo', 'open-prices'].includes(catalogOrigin))
        throw new Error('catalogOrigin 无效。');
      const processingForms = [
        'fresh-whole', 'canned', 'dried', 'smoked', 'marinated', 'fermented', 'frozen',
        'prepared', 'pickled', 'preserved', 'instant-ready', 'packaged', 'unknown',
      ];
      const storageConditions = ['ambient-likely', 'chilled-confirmed', 'frozen-confirmed', 'unknown'];
      const classificationConfidences = [
        'taxonomy-confirmed', 'manual-name-review', 'candidate', 'needs-review',
      ];
      const merchandisingStates = ['placed', 'pending-review', 'unplaced'];
      if (input.processingForm && !processingForms.includes(input.processingForm))
        throw new Error('processingForm 无效。');
      if (input.storageCondition && !storageConditions.includes(input.storageCondition))
        throw new Error('storageCondition 无效。');
      if (input.classificationConfidence && !classificationConfidences.includes(input.classificationConfidence))
        throw new Error('classificationConfidence 无效。');
      if (input.merchandisingState && !merchandisingStates.includes(input.merchandisingState))
        throw new Error('merchandisingState 无效。');
      if (input.priceLocationId !== undefined && !Number.isInteger(input.priceLocationId))
        throw new Error('priceLocationId 必须为整数。');
      if (input.priceRecordId !== undefined && !Number.isInteger(input.priceRecordId))
        throw new Error('priceRecordId 必须为整数。');
      if (input.priceLocationOsmId !== undefined && !Number.isInteger(input.priceLocationOsmId))
        throw new Error('priceLocationOsmId 必须为整数。');
      if (input.priceProofId !== undefined && !Number.isInteger(input.priceProofId))
        throw new Error('priceProofId 必须为整数。');
      const status =
        input.status ||
        previous?.status ||
        (price > 0 ? 'active' : 'draft');
      if (!['draft', 'active', 'archived'].includes(status))
        throw new Error('status 仅支持 draft、active、archived。');
      const saleMode = input.saleMode || previous?.saleMode || 'pack';
      if (
        !['weight', 'pack'].includes(saleMode) ||
        (saleMode === 'weight' && !unitGrams(input.unit))
      )
        throw new Error('售卖方式或称重单位无效。');
      const shelfId = input.shelfId || previous?.shelfId;
      const shelfName = input.shelf || previous?.shelf;
      const matches = shelfId
        ? shelves.filter((s) => s.id === shelfId)
        : shelves.filter((s) => s.name === shelfName);
      if ((shelfId || shelfName) && matches.length !== 1)
        throw new Error('设施不存在或编号不唯一。');
      const shelf = matches[0];
      const side =
        input.shelfSide ||
        (shelf?.id === previous?.shelfId ? previous?.shelfSide : undefined) ||
        Object.keys(shelf?.accessPoints || {})[0];
      const level =
        input.shelfLevel ??
        (shelf?.id === previous?.shelfId ? previous?.shelfLevel : undefined) ??
        1;
      if (
        shelf &&
        (!Number.isInteger(level) ||
          level < 1 ||
          level > (shelf.levels || 1) ||
          !side ||
          !shelf.accessPoints?.[side as NonNullable<Product['shelfSide']>])
      )
        throw new Error('设施侧面或层位无效。');
      if (status === 'active') {
        if (price <= 0) throw new Error('上架 SKU 需要确认大于0的本店售价。');
        const point = shelf?.accessPoints?.[side as NonNullable<Product['shelfSide']>];
        if (
          !shelf?.reachable ||
          !point ||
          !findPath(entrance, point, getSections(), shelves).length
        )
          throw new Error('上架 SKU 需要有效、可达的陈列位置。');
      }
      if (
        input.image &&
        !validProductImage(input.image)
      )
        throw new Error('图片路径必须为本地商品图片或已上传图片。');
      const changedPrice = !previous || previous.price !== price || previous.unit !== input.unit;
      const next: Product = {
        ...(previous || {
          id: randomUUID(),
          createdAt: new Date().toISOString(),
          tags: [],
          aliases: [input.name],
          history: [],
          image: '/images/market.jpg',
          description: '',
        }),
        sku: input.sku,
        name: input.name,
        brand: input.brand ?? previous?.brand,
        barcode: input.barcode ?? previous?.barcode,
        category: categoryMatches[0].id,
        unit: input.unit,
        price,
        stock,
        inventoryMode: inventoryMode as Product['inventoryMode'],
        priceOrigin: priceOrigin as Product['priceOrigin'],
        currency: currency as Currency,
        priceSourceUrl: input.priceSourceUrl || previous?.priceSourceUrl,
        priceCheckedAt: input.priceCheckedAt || previous?.priceCheckedAt,
        priceNote: input.priceNote || previous?.priceNote,
        pricePer: input.pricePer ?? previous?.pricePer,
        priceRecordId: input.priceRecordId ?? previous?.priceRecordId,
        priceIsDiscounted: input.priceIsDiscounted ?? previous?.priceIsDiscounted,
        priceWithoutDiscount: input.priceWithoutDiscount ?? previous?.priceWithoutDiscount,
        priceLocationId: input.priceLocationId ?? previous?.priceLocationId,
        priceLocationOsmId: input.priceLocationOsmId ?? previous?.priceLocationOsmId,
        priceLocationOsmType: input.priceLocationOsmType ?? previous?.priceLocationOsmType,
        priceLocationName: input.priceLocationName ?? previous?.priceLocationName,
        priceLocationDisplayName: input.priceLocationDisplayName ?? previous?.priceLocationDisplayName,
        priceLocationCity: input.priceLocationCity ?? previous?.priceLocationCity,
        priceLocationCountry: input.priceLocationCountry ?? previous?.priceLocationCountry,
        priceProofId: input.priceProofId ?? previous?.priceProofId,
        sourceImageUrl: input.sourceImageUrl || previous?.sourceImageUrl,
        status: status as Product['status'],
        saleMode: saleMode as Product['saleMode'],
        shelfId: shelf?.id,
        shelf: shelf?.name || '',
        shelfSide: shelf ? (side as Product['shelfSide']) : undefined,
        shelfLevel: shelf ? level : undefined,
        sourceUrl,
        sourceRetailer: input.sourceRetailer ?? previous?.sourceRetailer,
        sourceSku: input.sourceSku ?? previous?.sourceSku,
        sourceListingUrl: input.sourceListingUrl ?? previous?.sourceListingUrl,
        sourceCheckedAt: input.sourceCheckedAt ?? previous?.sourceCheckedAt,
        catalogOrigin: catalogOrigin as Product['catalogOrigin'],
        merchandisingFamily: input.merchandisingFamily ?? previous?.merchandisingFamily,
        processingForm: (input.processingForm ?? previous?.processingForm) as Product['processingForm'],
        storageCondition: (input.storageCondition ?? previous?.storageCondition) as Product['storageCondition'],
        classificationConfidence: (input.classificationConfidence ?? previous?.classificationConfidence) as Product['classificationConfidence'],
        merchandisingState: (input.merchandisingState ?? previous?.merchandisingState) as Product['merchandisingState'],
        displayGroup: input.displayGroup ?? previous?.displayGroup,
        description: input.description ?? previous?.description ?? '',
        image: input.image || previous?.image || '/images/market.jpg',
        history:
          changedPrice && price > 0
            ? [
                ...(previous?.history || []),
                {
                  price,
                  unit: input.unit,
                  date: new Date().toISOString().slice(0, 10),
                  source: 'manual' as const,
                },
              ].slice(-120)
            : previous?.history || [],
        ...(previous && previous.unit !== input.unit
          ? {
              marketPrice: undefined,
              marketDate: undefined,
              marketSource: undefined,
              marketReference: undefined,
            }
          : {}),
      };
      if (shelf && status !== 'archived') {
        const placementError = shelfSlotPlacementError(shelf, next, stagedProducts, side as NonNullable<Product['shelfSide']>, level);
        if (placementError) throw new Error(placementError);
      }
      changes.push(next);
      const stagedIndex = stagedProducts.findIndex((product) => product.id === next.id);
      if (stagedIndex >= 0) stagedProducts[stagedIndex] = next;
      else stagedProducts.push(next);
      previous ? result.updated++ : result.created++;
      result.preview.push({
        sku: input.sku,
        name: input.name,
        action: previous ? '更新' : '新增',
        status,
      });
    } catch (error) {
      result.errors.push({
        row: index + 2,
        sku: String(row.sku || ''),
        message:
          error instanceof z.ZodError
            ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('；')
            : error instanceof Error
              ? error.message
              : '数据无效',
      });
    }
  }
  if (apply && !result.errors.length) {
    saveProductsAtomically(changes);
    result.applied = true;
  }
  return result;
}
