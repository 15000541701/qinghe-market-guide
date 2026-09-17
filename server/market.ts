import { z } from 'zod';
import {
  isValidMarketDate,
  marketToday,
  XINFADI_SOURCE,
  XINFADI_SOURCE_URL,
} from '../shared/market';
import type { MarketQuote, MarketSearchResult } from '../shared/types';

export class MarketError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
const textValue = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => (value == null ? '' : String(value)));
const priceValue = z
  .union([
    z
      .string()
      .trim()
      .regex(/^\d+(?:\.\d+)?$/),
    z.number(),
  ])
  .transform(Number)
  .pipe(z.number().positive().max(1000000));
const rowSchema = z.object({
  id: textValue,
  prodName: z.string().trim().min(1).max(80),
  prodCat: textValue,
  prodPcat: textValue,
  place: textValue,
  specInfo: textValue,
  unitInfo: z.string().trim().min(1).max(30),
  lowPrice: priceValue,
  avgPrice: priceValue,
  highPrice: priceValue,
  pubDate: z.string(),
});

export function parseMarketResponse(payload: unknown, now = new Date()): MarketQuote[] {
  const envelope = z.object({ list: z.array(z.unknown()).max(200) }).safeParse(payload);
  if (!envelope.success)
    throw new MarketError('新发地返回的行情格式有变化，请稍后重试，或手动填写参考价。');
  const parsed = envelope.data.list.flatMap((raw, index) => {
    const result = rowSchema.safeParse(raw);
    if (!result.success) return [];
    const row = result.data;
    const date = row.pubDate.slice(0, 10);
    if (
      !isValidMarketDate(date) ||
      date > marketToday(now) ||
      row.lowPrice > row.avgPrice ||
      row.avgPrice > row.highPrice
    )
      return [];
    return [
      {
        id: row.id || `${date}-${index}`,
        name: row.prodName,
        category: [row.prodCat, row.prodPcat].filter(Boolean).join(' / ').slice(0, 80),
        origin: row.place.slice(0, 100),
        spec: row.specInfo.slice(0, 120),
        low: row.lowPrice,
        average: row.avgPrice,
        high: row.highPrice,
        unit: row.unitInfo,
        date,
      },
    ];
  });
  if (envelope.data.list.length && !parsed.length)
    throw new MarketError('新发地报价缺少有效价格、单位或日期，未用于计算。可以手动补充参考价。');
  const latest = parsed
    .map((row) => row.date)
    .sort()
    .at(-1);
  const seen = new Set<string>();
  return parsed.filter((row) => {
    const key = [row.name, row.origin, row.spec, row.unit, row.low, row.average, row.high].join(
      '|',
    );
    if (row.date !== latest || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Called only by an explicit user lookup. No startup job, polling, or cached quote reuse. */
export async function lookupMarket(
  query: string,
  options: { fetcher?: typeof fetch; now?: Date } = {},
): Promise<MarketSearchResult> {
  const now = options.now || new Date();
  const endpoint = new URL(
    '/getPriceData.html',
    process.env.XINFADI_BASE_URL || 'http://www.xinfadi.com.cn',
  );
  const fetcher = options.fetcher || fetch;
  let response: Response;
  let raw: string;
  try {
    response = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json',
        Referer: XINFADI_SOURCE_URL,
      },
      body: new URLSearchParams({
        limit: '20',
        current: '1',
        prodName: query,
        pubDateStartTime: '',
        pubDateEndTime: '',
        prodPcatid: '',
        prodCatid: '',
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok)
      throw new MarketError(`新发地暂时未能提供行情（${response.status}），可稍后重试或手动填写。`);
    if (Number(response.headers.get('content-length') || 0) > 1000000)
      throw new MarketError('新发地响应异常，未使用本次报价。');
    raw = await response.text();
  } catch (error) {
    if (error instanceof MarketError) throw error;
    throw new MarketError('暂时无法连接新发地，请检查网络后重试；已有商品售价不会改变。', 504);
  }
  let payload: unknown;
  try {
    if (raw.length > 1000000) throw new Error();
    payload = JSON.parse(raw);
  } catch {
    throw new MarketError('新发地没有返回可读取的行情，请稍后重试或手动填写。');
  }
  const quotes = parseMarketResponse(payload, now);
  return {
    query,
    source: XINFADI_SOURCE,
    sourceUrl: XINFADI_SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    quotes,
    latestDate: quotes[0]?.date || null,
    notice: quotes.length
      ? '显示本次返回记录中最新日期的报价，请核对品名、产地与规格。批发价不等于门店零售价。'
      : '没有找到该名称的报价。试试通用品名，例如“菠菜”“鲈鱼”，或手动补充参考价。',
  };
}
