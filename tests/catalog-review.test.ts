import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveStorage, storageFindings, type StorageText } from '../shared/storage-evidence';
import { packageSizeFromSource, packageSizeReliable } from '../shared/package-size';
import { reviewCatalogRecord, type ReviewFile } from '../shared/catalog-review';
import type { SamsClubCatalogRecord } from '../shared/types';

const storage = (text: StorageText, family = 'dairy') =>
  resolveStorage(storageFindings(text), family);

test('储存条件只采信来源原句，兼容拼写错误并区分开封前后', () => {
  assert.equal(storage({ specifications: ['Keep Refridgerated'] }).condition, 'chilled-confirmed');
  assert.equal(storage({ specifications: ['Keeprefrigerated.'] }).condition, 'chilled-confirmed');
  assert.equal(
    storage({ specifications: ['Keep Refrigated'] }, 'produce').condition,
    'chilled-confirmed',
  );
  assert.equal(storage({ highlights: ['Refrigerate after opening.'] }).condition, 'ambient-likely');
  assert.equal(
    storage(
      {
        specifications: [
          'Keep Refridgerated',
          'Shelf-stable: No refrigeration needed before opening',
        ],
      },
      'meat',
    ).condition,
    'ambient-likely',
  );
  assert.equal(
    storage({ introduction: 'Isadora refried beans are RTE and do not require refrigeration.' })
      .condition,
    'ambient-likely',
  );
  assert.equal(
    storage({ specifications: ['Storage: Keep refrigerated or frozen'] }).condition,
    'chilled-or-frozen-confirmed',
  );
  assert.equal(
    storage({ specifications: ['Keep frozen until ready to prepare'] }).condition,
    'frozen-confirmed',
  );
});

test('果蔬“常温至成熟后冷藏”按常温陈列，问句、建议和其他商品的贴士不作依据', () => {
  assert.equal(
    storage(
      {
        introduction:
          'Once ripe, store it in the refrigerator to keep it fresh. Store at room temperature until ripe, then refrigerate.',
      },
      'produce',
    ).condition,
    'ambient-likely',
  );
  assert.equal(
    storage({ highlights: ['Store ambient or refrigerate'] }, 'produce').condition,
    'ambient-likely',
  );
  // The spec table outranks a marketing tip about other fruit.
  assert.equal(
    storage(
      {
        specifications: ['Keep Refrigated'],
        introduction:
          'Bananas, pineapples and melons: these are meant to be stored at room temperature.',
      },
      'produce',
    ).condition,
    'chilled-confirmed',
  );
  assert.equal(storage({ introduction: 'Is This Kept in the Refrigerator?' }).condition, null);
  assert.equal(
    storage(
      { introduction: 'You can keep them in your fridge for a cool refreshment.' },
      'beverages',
    ).condition,
    null,
  );
  const conflict = storage({ specifications: ['Keep refrigerated', 'Store at room temperature'] });
  assert.equal(conflict.condition, null);
  assert.equal(conflict.conflict?.length, 2);
});

test('弱提示只在相应品类生效：生鲜肉 Fresh, never frozen、奶酪冰袋配送', () => {
  assert.equal(
    storage({ highlights: ['Always fresh, never frozen'] }, 'meat').condition,
    'chilled-confirmed',
  );
  assert.equal(storage({ highlights: ['Always fresh, never frozen'] }, 'bakery').condition, null);
  assert.equal(
    storage({
      introduction:
        'Your cheese wheel is carefully packed in a sealed, insulated, disposable cooler with ice packs to arrive cold.',
    }).condition,
    'chilled-confirmed',
  );
});

test('净含量：多包装按单价印证、规格表优先、旧规格表与单价矛盾时采用名称', () => {
  const donettes = packageSizeFromSource({
    name: 'Hostess Donettes Variety Pack Donuts, Snack Size, 1.5 oz., 32 pk.',
    price: 12.98,
    unitPriceText: '$0.27/oz',
  });
  assert.deepEqual([donettes.quantity, donettes.unit, donettes.ambiguous], [1361, 'g', undefined]);
  const statedTotal = packageSizeFromSource({
    name: 'Frozen Pizza Combo, 69.60 oz., 12 pk.',
    price: 11.98,
    unitPriceText: '$0.17/oz',
  });
  assert.equal(statedTotal.quantity, 1973);
  assert.deepEqual(
    [packageSizeFromSource({ name: 'Member’s Mark Heavy Whipping Cream, 32 fl. oz.' }).quantity],
    [946],
  );
  const vinegar = packageSizeFromSource({
    name: 'Distilled White Vinegar, 1 gal., 2 pk.',
    price: 5.98,
    unitPriceText: '$0.02/foz',
  });
  assert.deepEqual([vinegar.quantity, vinegar.unit], [7571, 'ml']);
  assert.equal(packageSizeFromSource({ name: 'Sliced Ham, 1 lb. 6 oz.' }).quantity, 624);
  assert.equal(
    packageSizeFromSource({
      name: 'Worcestershire Sauce, 20 oz., 2 pk.',
      specifications: ['Net Weight: 1 qt. 8 fl. oz.'],
    }).quantity,
    1183,
  );
  const apples = packageSizeFromSource({
    name: 'Fuji Apples, 5 lbs.',
    specifications: ['Net weight: 4 lbs.'],
    price: 6.75,
    unitPriceText: '$1.35/lb',
  });
  assert.equal(apples.quantity, 2268);
  const chicken = packageSizeFromSource({
    name: 'Organic Chicken Breasts, Frozen, 16-24 ct.',
    specifications: ['Net Weight: 12 lbs.'],
  });
  assert.deepEqual([chicken.quantity, chicken.unit], [5443, 'g']);
  const shrimp = packageSizeFromSource({ name: 'Raw Shrimp, Frozen, 21-25 ct. per pound, 2 lbs.' });
  assert.deepEqual([shrimp.quantity, shrimp.unit], [907, 'g']);
});

test('净含量：鸡蛋按枚、称重商品按估价估重、无法印证的多包装不用于换算', () => {
  assert.deepEqual(
    [
      packageSizeFromSource({
        name: 'Cage Free Large White Eggs, 2 dozen',
        specifications: ['Net Weight: 3 lbs.'],
      }).quantity,
    ],
    [24],
  );
  const beef = packageSizeFromSource({
    name: "Member's Mark 80/20 Ground Beef, priced per pound",
    price: 18.94,
    unitPriceText: '$5.92/lb',
    finalCostByWeight: true,
  });
  assert.equal(beef.estimated, true);
  assert.equal(beef.quantity, Math.round((18.94 / 5.92) * 453.59237));
  assert.ok(packageSizeReliable(beef));
  const unknownWeight = packageSizeFromSource({
    name: 'Seasoned Rotisserie Chicken',
    finalCostByWeight: true,
  });
  assert.equal(unknownWeight.unit, 'package');
  assert.equal(packageSizeReliable(unknownWeight), false);
  const sauce = packageSizeFromSource({ name: 'Barbecue Sauce, 20 oz., 2 pk.' });
  assert.equal(sauce.ambiguous, true);
  assert.equal(packageSizeReliable(sauce), false);
});

test('复核可重复执行：人工复核只补来源未写明的储存条件，归档与分类修正保留原值', () => {
  const records: SamsClubCatalogRecord[] = JSON.parse(
    readFileSync('shared/samsclub-catalog.json', 'utf8'),
  );
  const review: ReviewFile = JSON.parse(readFileSync('shared/samsclub-review.json', 'utf8'));
  const ids = new Set(records.map((record) => record.itemId));
  assert.ok(Object.keys(review.decisions).every((id) => ids.has(id)));
  // The committed catalog is exactly the review output; edit the decisions file and rerun the script.
  for (const record of records)
    assert.deepEqual(
      reviewCatalogRecord(record, review.decisions[record.itemId]),
      record,
      record.itemId,
    );

  const sausage = records.find((record) => record.itemId === '85633')!;
  assert.equal(sausage.category, 'meat');
  assert.equal(sausage.displayGroup, 'frozen-meat-prepared');
  assert.equal(sausage.reviewPrevious?.category, 'seafood');
  const flowers = records.filter((record) => record.category === 'floral');
  assert.ok(
    flowers.length > 0 &&
      flowers.every((record) => record.status === 'archived' && record.archiveReason),
  );
  const cheese = records.find((record) => record.itemId === '626340')!;
  assert.deepEqual(
    [cheese.storageCondition, cheese.storageBasis?.kind],
    ['chilled-confirmed', 'manual-review'],
  );
  // A reviewer decision never overrides an explicit source sentence.
  const parmesan = records.find((record) => record.itemId === '990375852')!;
  const overridden = reviewCatalogRecord(parmesan, {
    storageCondition: 'chilled-confirmed',
    note: 'test',
  });
  assert.deepEqual(
    [overridden.storageCondition, overridden.storageBasis?.kind],
    ['ambient-likely', 'source-text'],
  );
});
