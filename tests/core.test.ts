import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSeedProducts, zones, entrance } from '../shared/catalog';
import { filterProducts, parseQuery, respondToQuery } from '../shared/guide';
import { buildRoute, buildShelfRoute, findPath, isWalkable } from '../shared/navigation';
import { recommendPrice } from '../shared/pricing';
import { parseSpokenPrice } from '../src/lib';

const products = makeSeedProducts();
test('绿叶蔬菜按价格筛选，不混入其他蔬菜', () => {
  const result = respondToQuery('帮我推荐几种绿叶蔬菜，价格在 3 到 6 元', products);
  assert.deepEqual(
    result.products.map((p) => p.id),
    ['spinach', 'bokchoy', 'lettuce'],
  );
  assert.ok(result.products.every((p) => p.price >= 3 && p.price <= 6));
});
test('鱼类范围查询排除虾，新类别不继承旧预算', () => {
  const result = respondToQuery('20 到 40 元的鱼', products);
  assert.deepEqual(
    result.products.map((p) => p.id),
    ['seabass', 'salmon'],
  );
  const next = parseQuery('蔬菜有什么', result.filters, products);
  assert.equal(next.min, undefined);
  assert.equal(next.max, undefined);
  assert.equal(next.term, undefined);
});
test('中文数字预算与上下文缩小预算', () => {
  const result = respondToQuery('推荐十元以内的绿叶蔬菜', products);
  assert.equal(result.filters.max, 10);
  const next = respondToQuery('只要五元以下的', products, result.filters);
  assert.deepEqual(
    next.products.map((p) => p.id),
    ['spinach', 'bokchoy'],
  );
});
test('空结果不虚构商品，售罄商品不会推荐', () => {
  assert.equal(respondToQuery('1 元以内的鱼', products).products.length, 0);
  assert.equal(
    filterProducts(
      products.map((p) => ({ ...p, stock: 0 })),
      { categories: [] },
    ).length,
    0,
  );
});
test('定价使用同商品历史中位数和有效参考价', () => {
  const product = products[0];
  const advice = recommendPrice(product);
  assert.equal(advice.sampleCount, 5);
  assert.equal(advice.historyMedian, 4.8);
  assert.equal(advice.price, 4.89);
  const withoutReference = recommendPrice({ ...product, marketDate: '2020-01-01' });
  assert.equal(withoutReference.marketPrice, null);
  assert.equal(withoutReference.price, 4.8);
});
test('缺少有效价格记录时要求人工输入，不套用其他商品的售价', () => {
  assert.equal(recommendPrice().price, 0);
  const old = {
    ...products[0],
    history: [{ price: 999, date: '2020-01-01', source: 'manual' as const }],
    marketPrice: undefined,
  };
  assert.equal(recommendPrice(old).price, 0);
});
test('所有分区之间的路径都位于通道并连续', () => {
  const locations = [entrance, ...zones.map((z) => z.location)];
  for (const start of locations)
    for (const end of locations) {
      const path = findPath(start, end);
      assert.ok(path.length > 0);
      assert.deepEqual(path[0], start);
      assert.deepEqual(path.at(-1), end);
      path.forEach((p, i) => {
        assert.ok(isWalkable(p));
        if (i) assert.equal(Math.abs(p.x - path[i - 1].x) + Math.abs(p.y - path[i - 1].y), 1);
      });
    }
});
test('购物清单路线去重并覆盖全部分区', () => {
  const route = buildRoute([...zones.map((z) => z.id), 'vegetables']);
  assert.equal(route.stops.length, 7);
  assert.equal(route.distance, (route.points.length - 1) * 2);
  assert.equal(findPath({ x: 3, y: 3 }, entrance).length, 0);
});
test('货架路线按不同货架终点区分，并明确标记不可达位置', () => {
  const first = {
    id: 'shelf-a',
    sectionId: 'pantry',
    name: 'G-01',
    position: { x: 12, y: 10 },
    reachable: true,
  };
  const second = {
    id: 'shelf-b',
    sectionId: 'pantry',
    name: 'G-02',
    position: { x: 19, y: 16 },
    reachable: true,
  };
  const route = buildShelfRoute([first, first, second]);
  assert.equal(new Set(route.shelfStops?.map((shelf) => shelf.id)).size, 2);
  assert.equal(route.stops.length, 2);
  assert.notDeepEqual(
    buildShelfRoute([first]).points.at(-1),
    buildShelfRoute([second]).points.at(-1),
  );
  const unavailable = buildShelfRoute([{ ...first, reachable: false }]);
  assert.equal(unavailable.stops.length, 0);
  assert.match(unavailable.unreachable?.[0] || '', /G-01/);
});
test('中文语音价格解析', () => {
  assert.equal(parseSpokenPrice('售价八块五'), 8.5);
  assert.equal(parseSpokenPrice('十二元'), 12);
  assert.equal(parseSpokenPrice('售价 12.80 元'), 12.8);
  assert.equal(parseSpokenPrice('没听清'), null);
});

test('改变计价单位后，旧单位的历史不参与新建议', () => {
  const product = {
    ...products[0],
    unit: '1kg',
    marketPrice: undefined,
    history: [
      {
        price: 5,
        date: new Date().toISOString().slice(0, 10),
        unit: '500g',
        source: 'manual' as const,
      },
      {
        price: 10,
        date: new Date().toISOString().slice(0, 10),
        unit: '1kg',
        source: 'manual' as const,
      },
    ],
  };
  const advice = recommendPrice(product);
  assert.equal(advice.sampleCount, 1);
  assert.equal(advice.price, 10);
});
