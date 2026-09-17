import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertMarketPrice,
  isFreshMarketDate,
  isValidMarketDate,
  marketToday,
  suggestMarketKeyword,
} from '../shared/market';
import { lookupMarket, parseMarketResponse } from '../server/market';
import { recommendPrice } from '../shared/pricing';
import { makeSeedProducts } from '../shared/catalog';

const now = new Date('2026-09-17T10:00:00Z');
const row = {
  id: 1,
  prodName: '菠菜',
  prodCat: '蔬菜',
  place: '河北',
  specInfo: '',
  lowPrice: '3.5',
  avgPrice: '3.75',
  highPrice: '4',
  unitInfo: '斤',
  pubDate: '2026-09-17 00:00:00',
};
test('报价按质量或体积换算，不能猜测每盒重量或每枚鸡蛋重量', () => {
  assert.equal(convertMarketPrice(3.75, '斤', '500g'), 3.75);
  assert.equal(convertMarketPrice(3.75, '元/斤', '1kg'), 7.5);
  assert.equal(convertMarketPrice(10, '公斤', '200g'), 2);
  assert.equal(convertMarketPrice(20, 'kg', '2.5kg'), 50);
  assert.equal(convertMarketPrice(12, '升', '250ml'), 3);
  for (const [from, to] of [
    ['斤', '6枚'],
    ['斤', '500ml'],
    ['箱', '500g'],
    ['盒', '盒'],
    ['斤', '500g/盒'],
  ])
    assert.equal(convertMarketPrice(5, from, to), null);
});
test('日期按上海时区判断，拒绝未来、过期和不存在的日期', () => {
  assert.equal(marketToday(new Date('2026-09-16T17:00:00Z')), '2026-09-17');
  assert.equal(isValidMarketDate('2026-02-30'), false);
  assert.equal(isFreshMarketDate('2026-09-17', now), true);
  assert.equal(isFreshMarketDate('2026-09-18', now), false);
  assert.equal(isFreshMarketDate('2026-09-09', now), false);
});
test('同日不同产地保留，旧日记录不混入最新报价', () => {
  const quotes = parseMarketResponse(
    {
      list: [
        row,
        { ...row, id: 2, place: '内蒙古', avgPrice: '3.8' },
        { ...row, id: 3, pubDate: '2026-09-16' },
        row,
      ],
    },
    now,
  );
  assert.equal(quotes.length, 2);
  assert.deepEqual(
    quotes.map((q) => q.origin),
    ['河北', '内蒙古'],
  );
  assert.equal('userIdCreate' in quotes[0], false);
});
test('异常和空返回有明确区分，非法数值不能进入定价', () => {
  assert.deepEqual(parseMarketResponse({ list: [] }, now), []);
  assert.throws(() => parseMarketResponse({ message: 'blocked' }, now), /格式/);
  for (const patch of [
    { avgPrice: '-1' },
    { avgPrice: '100' },
    { pubDate: '2026-02-30' },
    { unitInfo: '' },
  ])
    assert.throws(() => parseMarketResponse({ list: [{ ...row, ...patch }] }, now));
});
test('两次查询分别请求上游，空查询结果不会伪造示例报价', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async (_url, options) => {
    calls++;
    assert.equal(new URLSearchParams(String(options?.body)).get('prodName'), '菠菜');
    return Response.json({ list: calls === 1 ? [row] : [] });
  };
  assert.equal((await lookupMarket('菠菜', { fetcher, now })).quotes.length, 1);
  assert.equal((await lookupMarket('菠菜', { fetcher, now })).quotes.length, 0);
  assert.equal(calls, 2);
  const broken: typeof fetch = async () => {
    throw new Error('offline');
  };
  await assert.rejects(lookupMarket('菠菜', { fetcher: broken, now }), /无法连接/);
});
test('批发报价必须先设加价率，换算后才作为零售参考', () => {
  const reference = {
    price: 3.75,
    source: '北京新发地',
    date: '2026-09-17',
    unit: '500g',
    kind: 'wholesale' as const,
  };
  assert.equal(recommendPrice(undefined, reference, now).price, 0);
  const result = recommendPrice(undefined, { ...reference, markupPercent: 30 }, now);
  assert.equal(result.wholesalePrice, 3.75);
  assert.equal(result.marketPrice, 4.88);
  assert.equal(result.price, 4.88);
  assert.match(result.explanation, /30%/);
  assert.equal(recommendPrice(undefined, { ...reference, markupPercent: 0 }, now).price, 3.75);
  assert.equal(
    recommendPrice(undefined, { ...reference, markupPercent: 30, date: '2026-09-01' }, now).price,
    0,
  );
});
test('保存的批发来源在再次编辑时仍按加价率计算，单位不一致不能使用', () => {
  const reference = {
    price: 3.75,
    source: '北京新发地',
    date: '2026-09-17',
    unit: '500g',
    kind: 'wholesale' as const,
    markupPercent: 30,
  };
  const product = { ...makeSeedProducts()[0], history: [], marketReference: reference };
  assert.equal(recommendPrice(product, undefined, now).marketPrice, 4.88);
  assert.equal(recommendPrice({ ...product, unit: '1kg' }, undefined, now).marketPrice, null);
});
test('检索词取通用品名，保留让用户改词的能力', () => {
  const products = makeSeedProducts();
  assert.equal(suggestMarketKeyword('鲜嫩菠菜', products[0]), '菠菜');
  assert.equal(suggestMarketKeyword('上海青'), '油菜');
  assert.equal(suggestMarketKeyword('新鲜鲈鱼'), '鲈鱼');
});
