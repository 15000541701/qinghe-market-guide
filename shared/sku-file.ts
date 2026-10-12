import type { Product } from './types';
export const skuColumns = [
  'id',
  'sku',
  'name',
  'brand',
  'barcode',
  'catalogOrigin',
  'merchandisingFamily',
  'processingForm',
  'storageCondition',
  'classificationConfidence',
  'merchandisingState',
  'displayGroup',
  'category',
  'unit',
  'saleMode',
  'price',
  'stock',
  'inventoryMode',
  'priceOrigin',
  'currency',
  'priceSourceUrl',
  'priceCheckedAt',
  'pricePer',
  'priceRecordId',
  'priceIsDiscounted',
  'priceWithoutDiscount',
  'priceLocationId',
  'priceLocationOsmId',
  'priceLocationOsmType',
  'priceLocationName',
  'priceLocationDisplayName',
  'priceLocationCity',
  'priceLocationCountry',
  'priceProofId',
  'sourceImageUrl',
  'priceNote',
  'status',
  'shelfId',
  'shelf',
  'shelfSide',
  'shelfLevel',
  'description',
  'image',
  'sourceRetailer',
  'sourceUrl',
  'sourceSku',
  'sourceListingUrl',
  'sourceCheckedAt',
] as const;
export type SkuRow = Record<string, string | number | boolean | undefined>;
export function productToSkuRow(product: Product): SkuRow {
  return Object.fromEntries(
    skuColumns.map((key) => [
      key,
      key === 'sku'
        ? product.sku || product.id
        : key === 'status'
          ? product.status || 'active'
          : (key === 'price' || key === 'stock') && product.status === 'draft' && product[key] === 0
            ? ''
            : (product[key] ?? ''),
    ]),
  );
}
function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
export function writeSkuCsv(rows: SkuRow[]) {
  return (
    '\uFEFF' +
    [
      skuColumns.join(','),
      ...rows.map((row) => skuColumns.map((key) => csvCell(row[key])).join(',')),
    ].join('\r\n')
  );
}
export function parseSkuCsv(input: string): SkuRow[] {
  const text = input.replace(/^\uFEFF/, '');
  const table: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closed = false;
  const endCell = () => {
    row.push(cell);
    cell = '';
    closed = false;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw new Error(`CSV 第${table.length + 1}行引号格式错误。`);
      quoted = true;
    } else if (c === ',') endCell();
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      endCell();
      if (row.some((v) => v.trim())) table.push(row);
      row = [];
    } else {
      if (closed) throw new Error(`CSV 第${table.length + 1}行引号后有多余字符。`);
      cell += c;
    }
  }
  if (quoted) throw new Error('CSV 有未闭合的引号。');
  if (cell || row.length) {
    endCell();
    if (row.some((v) => v.trim())) table.push(row);
  }
  const headers = table.shift()?.map((v) => v.trim()) || [];
  if (!headers.includes('name') || !headers.includes('sku'))
    throw new Error('CSV 必须包含 sku、name 列。请下载模板。');
  if (new Set(headers).size !== headers.length) throw new Error('CSV 包含重复列名。');
  if (headers.some((h) => !skuColumns.includes(h as (typeof skuColumns)[number])))
    throw new Error('CSV 存在不支持的列，请使用导出的列名。');
  if (table.length > 2000) throw new Error('单次最多导入2000个 SKU。');
  return table.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`CSV 第${index + 2}行列数不匹配。`);
    return Object.fromEntries(
      headers.map((key, i) => [key, /^'[=+\-@\t\r]/.test(cells[i]) ? cells[i].slice(1) : cells[i]]),
    );
  });
}
export function parseSkuFile(text: string, filename: string): SkuRow[] {
  if (!filename.toLowerCase().endsWith('.json')) return parseSkuCsv(text);
  const data = JSON.parse(text.replace(/^\uFEFF/, ''));
  const rows = Array.isArray(data) ? data : data.rows;
  if (!Array.isArray(rows) || !rows.length || rows.length > 2000)
    throw new Error('JSON 必须包含1–2000条 SKU 数组或 rows 数组。');
  if (rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row)))
    throw new Error('JSON 中的每条 SKU 必须为对象。');
  return rows;
}
export type SkuImportResult = {
  created: number;
  updated: number;
  errors: { row: number; sku: string; message: string }[];
  preview: { sku: string; name: string; action: string; status: string }[];
  applied: boolean;
};
