import type { PriceAdvice, Product } from './types';

const round = (n: number) => Math.round(n * 100) / 100;
export function recommendPrice(
  product?: Product,
  reference?: { price: number; source: string; date: string },
  now = new Date(),
): PriceAdvice {
  const history = (product?.history || []).filter((h) => {
    const age = now.getTime() - new Date(h.date).getTime();
    return (
      h.price > 0 &&
      age >= -86400000 &&
      age <= 30 * 86400000 &&
      (!h.unit || h.unit === product?.unit)
    );
  });
  const prices = history.map((h) => h.price).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length
    ? prices.length % 2
      ? prices[mid]
      : (prices[mid - 1] + prices[mid]) / 2
    : null;
  const market =
    reference ||
    (product?.marketPrice
      ? {
          price: product.marketPrice,
          source: product.marketSource || '未注明来源',
          date: product.marketDate || '',
        }
      : undefined);
  const marketAge = market ? now.getTime() - new Date(market.date).getTime() : Infinity;
  const marketPrice =
    market && market.price > 0 && marketAge <= 7 * 86400000 && marketAge >= -86400000
      ? market.price
      : null;
  const price = round(
    median !== null && marketPrice !== null
      ? median * 0.7 + marketPrice * 0.3
      : (median ?? marketPrice ?? 0),
  );
  const explanation =
    median !== null && marketPrice !== null
      ? `近 30 天 ${history.length} 次价格的中位数占 70%，7 天内参考价占 30%。`
      : median !== null
        ? `依据近 30 天 ${history.length} 次价格的中位数。无有效行情参考。`
        : marketPrice !== null
          ? '暂无同商品历史，使用 7 天内的参考价。'
          : '暂无有效的同商品历史或参考价，请先手动输入售价或补充参考价。';
  return {
    price,
    low: round(price * 0.9),
    high: round(price * 1.1),
    historyMedian: median,
    marketPrice,
    sampleCount: history.length,
    source:
      history.some((h) => h.source === 'seed') || market?.source.includes('演示')
        ? '含演示价格数据'
        : '本店录入记录',
    explanation,
    history,
    marketSource: market?.source,
    marketDate: market?.date,
  };
}
