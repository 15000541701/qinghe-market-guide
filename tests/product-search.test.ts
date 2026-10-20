import test from 'node:test';
import assert from 'node:assert/strict';
import { productSearch, productSearchScore } from '../shared/product-search';
import type { Product } from '../shared/types';

const product = (id: string, name: string, category: string) =>
  ({ id, name, category, aliases: [name], tags: [], status: 'active' }) as unknown as Product;
const catalog = [
  product('milk', 'Member’s Mark 2% Reduced Fat Milk 1 gal.', 'dairy'),
  product('candy', "REESE'S Snack Size Milk Chocolate Peanut Butter Cups", 'snacks'),
  product('treat', 'Milk-Bone Original Dog Biscuits, 15 lbs.', 'pet'),
  product('chicken', "Member's Mark Boneless Skinless Chicken Breasts, priced per pound", 'meat'),
  product('tissue', 'Kleenex Ultra Soft Tissues Combo Pack', 'paper-goods'),
];
const search = (query: string) => {
  const parsed = productSearch(query);
  if (!parsed) return catalog.map((item) => item.id);
  return catalog
    .map((item) => ({ id: item.id, score: productSearchScore(item, parsed) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.id);
};

test('中文搜索映射到英文商品名，原料排在含该词的其他商品之前', () => {
  assert.deepEqual(search('牛奶'), ['milk', 'candy', 'treat']);
  assert.deepEqual(search('鸡肉'), ['chicken']);
  assert.deepEqual(search('纸巾'), ['tissue']);
  assert.deepEqual(search('  '), catalog.map((item) => item.id));
});

test('英文搜索不区分大小写，并按词首匹配输入中的半个单词', () => {
  assert.deepEqual(search('Chick'), ['chicken']);
  assert.deepEqual(search('MILK'), ['milk', 'candy', 'treat']);
  assert.deepEqual(search('ilk'), []);
});
