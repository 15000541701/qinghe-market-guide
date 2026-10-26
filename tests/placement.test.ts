import test from 'node:test';
import assert from 'node:assert/strict';
import { shelfUsableFloorCells, placementRegionPaths } from '../shared/placement-regions';
import {
  expandShelfSelection,
  toggleShelfSelection,
  translateShelfSelection,
  shelfBatchPlacementError,
  shelfSelectionBounds,
} from '../shared/shelf-batch';
import { makeSeedProducts } from '../shared/catalog';
import {
  applyPlacement,
  rankShelfCandidates,
  assessProductDrop,
  invertPlacementChanges,
  placementOf,
  planProductDrop,
  shelfCells,
  unplaced,
  type Placement,
} from '../shared/placement';
import {
  shelfMoveError,
  createShelfMoveValidator,
  translatedShelf,
  rotatedShelf,
  resizedShelf,
  footprintFromCorners,
  shelfGeometry,
  restoreShelfGeometry,
  rotateShelfSide,
} from '../shared/shelf-move';
import { fixtureKindLabels, fixtureOperationFootprint, fixtureSupportsLevels } from '../shared/layout';
import samsclubLayout from '../shared/samsclub-layout.json';
import { isWalkable } from '../shared/navigation';
import { shelfSlotPlacementError } from '../shared/shelf-capacity';
import type { Product, Shelf, StoreSection } from '../shared/types';
const section: StoreSection = {
  id: 'test-zone',
  name: '测试区',
  code: 'T',
  color: '#315443',
  tint: '#eef4e8',
  active: true,
  location: { x: 2, y: 9 },
  rect: { x: 1, y: 1, w: 18, h: 18 },
};
const first: Shelf = {
  id: 'rack-a',
  sectionId: section.id,
  name: 'A货架',
  reachable: true,
  kind: 'gondola',
  footprint: { x: 2, y: 2, w: 2, h: 2 },
  accessPoints: { front: { x: 2, y: 4 } },
  position: { x: 2, y: 4 },
  levels: 2,
  capacityPerSlot: 2,
};
const second: Shelf = {
  ...first,
  id: 'rack-b',
  name: 'B货架',
  footprint: { x: 6, y: 2, w: 2, h: 2 },
  accessPoints: { front: { x: 6, y: 4 } },
  position: { x: 6, y: 4 },
};
const shelves = [first, second];
const at = (shelfId: string, shelfSlot: number, shelfLevel = 1): Placement => ({
  shelfId,
  shelfSide: 'front',
  shelfLevel,
  shelfSlot,
});
const product = (id: string, place = unplaced()): Product =>
  applyPlacement(
    {
      ...makeSeedProducts()[0],
      id,
      name: id,
      status: 'active',
      storageCondition: 'ambient-likely',
      price: 12,
      stock: 7,
    },
    place,
    shelves,
  );
const apply = (products: Product[], changes: ReturnType<typeof planProductDrop>) =>
  products.map((item) => {
    const change = changes.find((c) => c.id === item.id);
    return change ? applyPlacement(item, change.target, shelves) : item;
  });

test('移动后保留明确空位，刷新顺序不会把其他商品挤回空格', () => {
  const products = [product('a', at(first.id, 0)), product('b', at(first.id, 1))];
  const next = apply(products, planProductDrop('a', at(first.id, 1, 2), products, shelves));
  assert.deepEqual(
    shelfCells(next, first, 'front', 1).map((p) => p?.id),
    [undefined, 'b'],
  );
  assert.deepEqual(
    shelfCells(next, first, 'front', 2).map((p) => p?.id),
    [undefined, 'a'],
  );
});
test('满层之间可以交换，不按先移入再移出误判超容量；商品价格库存不变', () => {
  const products = [
    product('a', at(first.id, 0)),
    product('b', at(first.id, 1)),
    product('c', at(second.id, 0)),
    product('d', at(second.id, 1)),
  ];
  const changes = planProductDrop('a', at(second.id, 0), products, shelves);
  const next = apply(products, changes);
  assert.equal(next.find((p) => p.id === 'c')?.shelfId, first.id);
  assert.equal(next.find((p) => p.id === 'a')?.shelfId, second.id);
  assert.equal(shelfSlotPlacementError(second, next[0], next, 'front', 1), undefined);
  for (const item of next) {
    assert.equal(item.price, 12);
    assert.equal(item.stock, 7);
  }
  assert.deepEqual(apply(next, invertPlacementChanges(changes)), products);
});
test('待摆放替换已摆放商品，原商品返回待摆放且可以完整撤销', () => {
  const products = [product('new'), product('old', at(first.id, 0))];
  const changes = planProductDrop('new', at(first.id, 0), products, shelves);
  const next = apply(products, changes);
  assert.deepEqual(placementOf(next[1]), unplaced());
  assert.equal(next[1].shelf, '');
  assert.deepEqual(apply(next, invertPlacementChanges(changes)), products);
});
test('旧记录首次移动时固定层内其他商品的位置，撤销可恢复原始记录', () => {
  const a = product('a', at(first.id, 0)),
    b = product('b', at(first.id, 1));
  delete a.shelfSlot;
  delete b.shelfSlot;
  const products = [a, b];
  const changes = planProductDrop('a', at(second.id, 1), products, shelves);
  const next = apply(products, changes);
  assert.equal(next[1].shelfSlot, 1);
  assert.equal(shelfCells(next, first, 'front', 1)[0], undefined);
  assert.deepEqual(
    JSON.parse(JSON.stringify(apply(next, invertPlacementChanges(changes)))),
    JSON.parse(JSON.stringify(products)),
  );
});
test('原格放回不产生写入；移回待摆放会清除全部陈列字段', () => {
  const products = [product('a', at(first.id, 0))];
  assert.deepEqual(planProductDrop('a', at(first.id, 0), products, shelves), []);
  const next = apply(products, planProductDrop('a', unplaced(), products, shelves));
  assert.deepEqual(placementOf(next[0]), unplaced());
});
test('旧记录填充保留显式空位，归档商品不占格', () => {
  const a = product('a', at(first.id, 1));
  const b = product('b', at(first.id, 0));
  delete b.shelfSlot;
  const archived = { ...product('archived', at(first.id, 0)), status: 'archived' as const };
  assert.deepEqual(
    shelfCells([a, archived, b], first, 'front', 1).map((p) => p?.id),
    ['b', 'a'],
  );
});
test('安放或移回待摆放不会替商品完成待复核审批', () => {
  const original = {
    ...product('review'),
    merchandisingState: 'pending-review' as const,
    status: 'draft' as const,
  };
  const placed = applyPlacement(original, at(first.id, 0), shelves);
  assert.equal(placed.merchandisingState, 'pending-review');
  assert.equal(placed.status, 'draft');
  assert.equal(applyPlacement(placed, unplaced(), shelves).merchandisingState, 'pending-review');
});
test('货架平移同时移动全部到达点，商品仍引用原货架', () => {
  const next = translatedShelf(first, 3, 3);
  assert.deepEqual(next.accessPoints?.front, { x: 3, y: 5 });
  assert.deepEqual(next.position, { x: 3, y: 5 });
  assert.equal(next.id, first.id);
  assert.equal(shelfMoveError(next, shelves, [section]), undefined);
});
test('货架移动拒绝重叠、主通道、超界和挡住其他货架取货点', () => {
  assert.match(shelfMoveError(translatedShelf(first, 6, 2), shelves, [section])!, /重叠/);
  assert.match(shelfMoveError(translatedShelf(first, 10, 2), shelves, [section])!, /主通道/);
  assert.match(shelfMoveError(translatedShelf(first, 67, 2), shelves, [section])!, /边界/);
  assert.match(shelfMoveError(translatedShelf(first, 5, 4), shelves, [section])!, /通道/);
  assert.equal(shelfMoveError(translatedShelf(first, 4, 2), shelves, [section]), undefined);
});

test('未选商品时已有格位显示占用，空格不承诺可放置', () => {
  const products = [product('milk', at(first.id, 0))];
  assert.equal(assessProductDrop(undefined, at(first.id, 0), products, shelves).kind, 'occupied');
  assert.equal(assessProductDrop(undefined, at(first.id, 0), products, shelves).label, '已陈列');
  assert.equal(assessProductDrop(undefined, at(first.id, 1), products, shelves).kind, 'empty');
  assert.match(
    assessProductDrop(undefined, at(first.id, 1), products, shelves).reason,
    /先选择商品/,
  );
  assert.equal(shelfCells(products, first, 'front', 1)[0]?.name, 'milk');
});
test('冷冻商品选中后所有普通货架格位都预先禁用并说明原因', () => {
  const frozen = { ...product('fish'), storageCondition: 'frozen-confirmed' as const };
  for (const shelf of shelves)
    for (let level = 1; level <= 2; level++)
      for (let slot = 0; slot < 2; slot++) {
        const assessment = assessProductDrop(frozen, at(shelf.id, slot, level), [frozen], shelves);
        assert.equal(assessment.kind, 'blocked');
        assert.equal(assessment.shortReason, '需放入冷冻柜');
      }
});
test('已选商品可放入空格，原位置、可交换和可替换各自区分', () => {
  const a = product('a', at(first.id, 0)),
    b = product('b', at(second.id, 0)),
    incoming = product('incoming');
  const products = [a, b, incoming];
  assert.equal(assessProductDrop(a, at(first.id, 0), products, shelves).kind, 'same');
  assert.equal(assessProductDrop(a, at(second.id, 1), products, shelves).kind, 'move');
  assert.equal(assessProductDrop(a, at(second.id, 0), products, shelves).kind, 'swap');
  assert.equal(assessProductDrop(incoming, at(second.id, 0), products, shelves).kind, 'replace');
});
test('交换预检检查原商品的回放位置，而非只检查新商品能否移入', () => {
  const freezer: Shelf = { ...second, id: 'freezer', kind: 'freezer' };
  const allShelves = [...shelves, freezer];
  const a = product('a', at(first.id, 0));
  const fish = {
    ...product('fish'),
    shelfId: freezer.id,
    shelf: freezer.name,
    shelfSide: 'front' as const,
    shelfLevel: 1,
    shelfSlot: 0,
    storageCondition: 'frozen-confirmed' as const,
  };
  const assessment = assessProductDrop(a, at(freezer.id, 0), [a, fish], allShelves);
  assert.equal(assessment.kind, 'blocked');
  assert.match(assessment.reason, /fish/);
  assert.equal(shelfCells([a, fish], freezer, 'front', 1)[0]?.id, 'fish');
});
test('分组、不可达侧面和超出容量都有明确的预检原因', () => {
  const a = { ...product('a'), displayGroup: 'ambient-snacks' };
  const restricted = { ...first, allowedDisplayGroups: ['ambient-tea-coffee'] };
  const mismatch = assessProductDrop(a, at(first.id, 0), [a], [restricted, second]);
  assert.equal(mismatch.kind, 'blocked');
  assert.equal(mismatch.shortReason, '陈列分组不匹配');
  const unreachable = assessProductDrop(
    a,
    at(first.id, 0),
    [a],
    [{ ...first, reachable: false }, second],
  );
  assert.equal(unreachable.kind, 'blocked');
  assert.match(unreachable.shortReason, /不可达/);
  const overflow = assessProductDrop(a, at(first.id, 3), [a], shelves);
  assert.equal(overflow.kind, 'blocked');
  assert.match(overflow.reason, /容量/);
});

test('选货架后适配且待摆放商品优先，已摆放次之，不适配商品保留在末尾', () => {
  const eligible = { ...product('new'), displayGroup: 'ambient-snacks' };
  const placed = { ...product('placed', at(first.id, 0)), displayGroup: 'ambient-snacks' };
  const bad = {
    ...product('fish'),
    displayGroup: 'frozen-savory',
    storageCondition: 'frozen-confirmed' as const,
  };
  const rack = { ...first, allowedDisplayGroups: ['ambient-snacks'] };
  const ranked = rankShelfCandidates([bad, placed, eligible], rack, [rack, second]);
  assert.deepEqual(
    ranked.map((item) => item.product.id),
    ['new', 'placed', 'fish'],
  );
  assert.equal(ranked[0].pending, true);
  assert.equal(ranked[2].canPlace, false);
  assert.ok(ranked[2].shortReason);
});
test('换成冷冻柜会重排推荐，未知位置不能显示为可放商品', () => {
  const bread = { ...product('bread'), displayGroup: 'ambient-snacks' };
  const fish = {
    ...product('fish'),
    displayGroup: 'frozen-savory',
    storageCondition: 'frozen-confirmed' as const,
  };
  const freezer: Shelf = { ...first, kind: 'freezer', allowedDisplayGroups: ['frozen-savory'] };
  const ranked = rankShelfCandidates([bread, fish], freezer, [freezer]);
  assert.equal(ranked[0].product.id, 'fish');
  assert.equal(ranked[0].canPlace, true);
  assert.equal(ranked[1].canPlace, false);
  assert.ok(
    rankShelfCandidates([bread, fish], { ...first, footprint: undefined }, [first]).every(
      (item) => !item.canPlace,
    ),
  );
});
test('货架已满仍可通过替换安放兼容待摆放商品，不因满层把推荐全部屏蔽', () => {
  const incoming = product('incoming');
  const rows = [product('a', at(first.id, 0)), product('b', at(first.id, 1)), incoming];
  const ranked = rankShelfCandidates(rows, first, shelves);
  assert.equal(ranked[0].product.id, 'incoming');
  assert.equal(ranked[0].canPlace, true);
  assert.equal(assessProductDrop(incoming, at(first.id, 0), rows, shelves).kind, 'replace');
});
test('非方形货架顺逆时针互逆，四次旋转恢复全部到达点和占地', () => {
  const original: Shelf = {
    ...first,
    footprint: { x: 2, y: 2, w: 1, h: 3 },
    accessPoints: { left: { x: 1, y: 3 }, right: { x: 3, y: 3 } },
    position: { x: 1, y: 3 },
  };
  const clockwise = rotatedShelf(original, 'cw');
  assert.deepEqual(clockwise.footprint, { x: 2, y: 2, w: 3, h: 1 });
  assert.deepEqual(clockwise.accessPoints, { back: { x: 3, y: 1 }, front: { x: 3, y: 3 } });
  const inverse = rotatedShelf(clockwise, 'ccw');
  assert.deepEqual(inverse.footprint, original.footprint);
  assert.deepEqual(inverse.accessPoints, original.accessPoints);
  let result = original;
  for (let i = 0; i < 4; i++) result = rotatedShelf(result, 'cw');
  assert.deepEqual(result.footprint, original.footprint);
  assert.deepEqual(result.position, original.position);
  assert.deepEqual(result.accessPoints, original.accessPoints);
  assert.equal(result.rotation, 360);
  assert.equal(rotateShelfSide('front', 'cw'), 'left');
  assert.equal(rotateShelfSide('left', 'ccw'), 'front');
});
test('对角拖动的起终点生成矩形，调整占地后到达点仍在边上，撤销还原', () => {
  const rect = footprintFromCorners({ x: 5, y: 5 }, { x: 3, y: 2 });
  assert.deepEqual(rect, { x: 3, y: 2, w: 2, h: 3 });
  const resized = resizedShelf(first, rect);
  assert.deepEqual(resized.accessPoints?.front, { x: 3, y: 5 });
  assert.equal(resized.levels, first.levels);
  assert.equal(resized.capacityPerSlot, first.capacityPerSlot);
  assert.equal(shelfMoveError(resized, shelves, [section]), undefined);
  const restored = restoreShelfGeometry(resized, shelfGeometry(first));
  assert.deepEqual(restored.footprint, first.footprint);
  assert.deepEqual(restored.accessPoints, first.accessPoints);
  assert.equal('accessOrder' in restored, false);
});
test('零面积和过大占地无效，旋转后的服务柜台操作带随方向一起旋转', () => {
  assert.ok(
    shelfMoveError(
      resizedShelf(first, footprintFromCorners({ x: 2, y: 2 }, { x: 2, y: 4 })),
      shelves,
      [section],
    ),
  );
  assert.ok(shelfMoveError(resizedShelf(first, { x: 2, y: 2, w: 17, h: 1 }), shelves, [section]));
  const counter: Shelf = { ...first, kind: 'service-counter' };
  assert.deepEqual(fixtureOperationFootprint(counter), { x: 2, y: 1, w: 2, h: 1 });
  const turned = rotatedShelf(counter, 'cw');
  assert.deepEqual(fixtureOperationFootprint(turned), { x: 4, y: 2, w: 1, h: 2 });
  assert.equal(isWalkable({ x: 4, y: 2 }, [section], [turned]), false);
});

test('所属分区不限制货架坐标，跨区移动、旋转和占地调整仍检查重叠及通道', () => {
  const zone = { ...section, rect: { x: 2, y: 2, w: 2, h: 2 } };
  assert.equal(shelfMoveError(translatedShelf(first, 23, 3), shelves, [zone]), undefined);
  assert.equal(
    shelfMoveError(resizedShelf(first, { x: 23, y: 3, w: 3, h: 2 }), shelves, [zone]),
    undefined,
  );
  const thin: Shelf = {
    ...first,
    footprint: { x: 2, y: 2, w: 1, h: 3 },
    accessPoints: { front: { x: 2, y: 5 } },
    position: { x: 2, y: 5 },
  };
  assert.equal(shelfMoveError(rotatedShelf(thin, 'cw'), [thin, second], [zone]), undefined);
  assert.match(shelfMoveError(translatedShelf(first, 10, 2), shelves, [zone])!, /主通道/);
  assert.match(shelfMoveError(translatedShelf(first, 6, 2), shelves, [zone])!, /重叠/);
});

test('整体摆放范围包含空地和已占用货架，不按当前货架左上角或尺寸裁切', () => {
  const area = new Set(shelfUsableFloorCells().map(({ x, y }) => `${x},${y}`));
  assert.ok(area.has('2,2') && area.has('3,3'), '当前货架的整个占地都在范围内');
  assert.ok(area.has('6,2') && area.has('7,3'), '其他货架占用的整个区域也保留');
  assert.ok(area.has('12,2') && area.has('23,3'), '分区外空地同样属于范围');
  assert.ok(area.has('5,4'), '当前不能落柜的取货位置仍属于整体地面');
  assert.match(
    shelfMoveError(translatedShelf(first, 6, 2), shelves, [section])!,
    /重叠/,
    '底色范围不代表能与现有柜体重叠',
  );
});
test('整体摆放范围仍排除主通道、固定设施及地图边界外区域', () => {
  const area = new Set(shelfUsableFloorCells().map(({ x, y }) => `${x},${y}`));
  assert.ok(!area.has('10,2') && !area.has('23,10'), '主通道不属于摆柜地面');
  assert.ok(!area.has('3,22') && !area.has('25,22'), '收银和固定服务台排除');
  assert.ok(!area.has('0,2') && !area.has('68,2') && !area.has('2,24'));
  assert.ok(area.has('67,23'), '空闲边缘格不因货架尺寸而被裁掉');
});
test('相连区域只绘外侧虚线，不在相邻格之间绘边框；没有可放位置时不绘区域', () => {
  const paths = placementRegionPaths([
    { x: 2, y: 2 },
    { x: 3, y: 2 },
    { x: 2, y: 2 },
  ]);
  assert.equal(paths.fill, 'M2 2h2v1h-2Z');
  assert.equal((paths.outline.match(/M/g) || []).length, 6);
  assert.ok(!paths.outline.includes('M3 2v1'));
  assert.deepEqual(placementRegionPaths([]), { fill: '', outline: '' });
});

test('两层冷冻柜与地图可安放提示规则一致，单层设施仍不能配置多层', () => {
  const freezer: Shelf = { ...first, kind: 'freezer', levels: 2 };
  assert.equal(fixtureSupportsLevels('freezer'), true);
  const moved = translatedShelf(freezer, 2, 1);
  assert.equal(shelfMoveError(moved, [freezer, second], [section]), undefined);
  assert.equal(
    shelfMoveError({ ...first, kind: 'produce-table', levels: 2 }, shelves, [section])?.includes(
      '仅支持1层',
    ),
    true,
  );
});

for (const [kind, multiLevel] of [
  ['gondola', true],
  ['chiller', true],
  ['freezer', true],
  ['hanging-rack', true],
  ['produce-table', false],
  ['display-table', false],
  ['service-counter', false],
  ['seafood-tank', false],
] as const) {
  test(`${fixtureKindLabels[kind]}：合法层数支持平移、双向旋转与占地调整，非法层数仍拦截`, () => {
    const levels = multiLevel ? [1, 2, 8] : [1];
    for (const level of levels) {
      const shelf: Shelf = { ...first, kind, levels: level };
      for (const next of [
        translatedShelf(shelf, 2, 1),
        rotatedShelf(shelf, 'cw'),
        rotatedShelf(shelf, 'ccw'),
        resizedShelf(shelf, { x: 2, y: 2, w: 3, h: 2 }),
      ]) {
        assert.equal(shelfMoveError(next, [shelf], [section]), undefined, `${kind}/${level}`);
        assert.equal(next.levels, level);
      }
    }
    for (const level of multiLevel ? [0, 9, 1.5] : [0, 2, 8, 9])
      assert.ok(shelfMoveError({ ...first, kind, levels: level }, [first], [section]));
  });
}

test('批量检查初始布局：所有设施类型和层数符合公共规则，避免默认货架无法调整', () => {
  const shelves = samsclubLayout.shelves as Shelf[];
  const validate = createShelfMoveValidator(shelves, samsclubLayout.sections as StoreSection[], shelves);
  for (const shelf of shelves) {
    const levels = shelf.levels ?? 1;
    assert.ok(Number.isInteger(levels) && levels >= 1 && levels <= 8, shelf.name);
    assert.ok(fixtureSupportsLevels(shelf.kind) || levels === 1, `${shelf.name}/${shelf.kind}/${levels}`);
    assert.equal(validate(shelf), undefined, shelf.name);
  }
});

test('Ctrl/Cmd多选切换可增减货架，组合按完整单元选取，删除项不再可选', () => {
  const grouped = [
    { ...first, groupId: 'g' },
    { ...second, groupId: 'g' },
  ];
  assert.deepEqual(expandShelfSelection([first.id], grouped), [first.id, second.id]);
  assert.deepEqual(toggleShelfSelection([], first.id, true, shelves), [first.id]);
  assert.deepEqual(toggleShelfSelection([first.id], second.id, true, shelves), [
    first.id,
    second.id,
  ]);
  assert.deepEqual(toggleShelfSelection([first.id, second.id], first.id, true, shelves), [
    second.id,
  ]);
  assert.deepEqual(toggleShelfSelection([first.id, second.id], first.id, true, grouped), []);
  assert.deepEqual(expandShelfSelection([first.id], [{ ...first, deleted: true }, second]), []);
});
test('整体移动相对距离和到达侧保持一致，并以整组新布局校验', () => {
  const updates = translateShelfSelection([first.id, second.id], 0, 1, shelves);
  assert.deepEqual(updates[0].footprint, { x: 2, y: 3, w: 2, h: 2 });
  assert.deepEqual(updates[1].footprint, { x: 6, y: 3, w: 2, h: 2 });
  assert.deepEqual(updates[0].accessPoints?.front, { x: 2, y: 5 });
  assert.equal(shelfBatchPlacementError(updates, shelves, [section]), '');
  const blocked = translateShelfSelection([first.id, second.id], 4, 0, shelves);
  assert.match(shelfBatchPlacementError(blocked, shelves, [section]), /主通道/);
  assert.deepEqual(shelfSelectionBounds(updates), { x: 2, y: 3, w: 6, h: 2 });
});
test('整组同时移走原占地不会挡住自己，但仍禁止新位置之间重叠', () => {
  const rowA = {
    ...first,
    footprint: { x: 2, y: 2, w: 1, h: 1 },
    accessPoints: { front: { x: 2, y: 3 } },
    position: { x: 2, y: 3 },
  };
  const rowB = {
    ...second,
    footprint: { x: 3, y: 2, w: 1, h: 1 },
    accessPoints: { front: { x: 3, y: 3 } },
    position: { x: 3, y: 3 },
  };
  const rows = [rowA, rowB];
  assert.equal(
    shelfBatchPlacementError(
      translateShelfSelection(
        rows.map((s) => s.id),
        1,
        0,
        rows,
      ),
      rows,
      [section],
    ),
    '',
  );
  assert.match(
    shelfBatchPlacementError(
      [
        { ...rowA, footprint: { x: 5, y: 2, w: 1, h: 1 } },
        { ...rowB, footprint: { x: 5, y: 2, w: 1, h: 1 } },
      ],
      rows,
      [section],
    ),
    /重叠/,
  );
});
