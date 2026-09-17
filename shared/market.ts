import type { Product } from './types';

export const XINFADI_SOURCE = '北京新发地 · 批发行情';
export const XINFADI_SOURCE_URL = 'http://www.xinfadi.com.cn/priceDetail.html';
export const roundPrice = (value: number) => Math.round(value * 100) / 100;

/** Calendar date in the market's timezone, independent of the server/browser timezone. */
export function marketToday(now = new Date()) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function isValidMarketDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function isFreshMarketDate(date: string, now = new Date()) {
  if (!isValidMarketDate(date)) return false;
  const age = Date.parse(`${marketToday(now)}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`);
  return age >= 0 && age <= 7 * 86400000;
}

function measure(unit: string): { dimension: string; amount: number } | null {
  const normalized = unit
    .trim()
    .toLowerCase()
    .replace(/\s/g, '')
    .replace(/^(?:元|¥|￥)[/／]/, '');
  const match = normalized.match(
    /^(\d+(?:\.\d+)?)?(千克|公斤|kg|斤|克|g|毫升|ml|升|l|枚|个|袋|盒|箱|瓶|包)$/,
  );
  if (!match) return null;
  const amount = match[1] === undefined ? 1 : Number(match[1]);
  if (!(amount > 0) || amount > 100000) return null;
  const weights: Record<string, number> = {
    千克: 1000,
    公斤: 1000,
    kg: 1000,
    斤: 500,
    克: 1,
    g: 1,
  };
  const volumes: Record<string, number> = { 毫升: 1, ml: 1, 升: 1000, l: 1000 };
  if (weights[match[2]]) return { dimension: 'mass', amount: amount * weights[match[2]] };
  if (volumes[match[2]]) return { dimension: 'volume', amount: amount * volumes[match[2]] };
  // Package size is not inferred: price per box/bag must be reviewed manually.
  if (match[2] !== '枚' && match[2] !== '个') return null;
  return { dimension: match[2], amount };
}

export function convertMarketPrice(price: number, from: string, to: string): number | null {
  if (!Number.isFinite(price) || price <= 0) return null;
  const source = measure(from);
  const target = measure(to);
  if (!source || !target || source.dimension !== target.dimension) return null;
  return roundPrice((price * target.amount) / source.amount);
}

export function suggestMarketKeyword(name: string, product?: Product) {
  if (/上海青/.test(name)) return '油菜';
  if (product?.name === name) {
    const alias = product.aliases.find((a) => /^[\u4e00-\u9fff]{2,12}$/.test(a));
    if (alias) return alias;
  }
  return name.replace(/^(?:鲜嫩|新鲜|鲜活|冷鲜|自然熟|脆甜|香甜|去皮|原切)/, '').trim();
}
