// Isolated HTTP fixture: the parent test always supplies a fresh DATA_DIR.
import { db, saveProduct, saveSection, saveShelf } from '../../server/db';
import { makeSeedProducts } from '../../shared/catalog';
import type { Shelf } from '../../shared/types';
if (!process.env.DATA_DIR?.includes('qinghe-placement-http-'))
  throw new Error('Temporary test database required');
db.exec('DELETE FROM products; DELETE FROM shelves; DELETE FROM store_sections;');
saveSection({
  id: 'test-zone',
  name: '陈列测试区',
  code: 'T',
  active: true,
  color: '#315443',
  tint: '#f5f7ef',
  location: { x: 2, y: 9 },
  rect: { x: 1, y: 1, w: 8, h: 8 },
});
saveSection({
  id: 'other-zone',
  name: '另一个分区',
  code: 'O',
  active: true,
  color: '#536488',
  tint: '#eef1f8',
  location: { x: 22, y: 9 },
  rect: { x: 22, y: 2, w: 8, h: 7 },
});
const first: Shelf = {
  id: 'rack-a',
  name: 'A货架',
  sectionId: 'test-zone',
  kind: 'gondola',
  footprint: { x: 2, y: 2, w: 2, h: 2 },
  levels: 2,
  capacityPerSlot: 2,
  reachable: true,
  accessPoints: { front: { x: 2, y: 4 } },
  position: { x: 2, y: 4 },
};
const second: Shelf = {
  ...first,
  id: 'rack-b',
  name: 'B货架',
  footprint: { x: 6, y: 2, w: 2, h: 2 },
  accessPoints: { front: { x: 6, y: 4 } },
  position: { x: 6, y: 4 },
};
const freezer: Shelf = {
  ...first,
  id: 'cold-rack',
  name: '冷冻柜',
  kind: 'freezer',
  levels: 2,
  footprint: { x: 2, y: 6, w: 2, h: 1 },
  accessPoints: { front: { x: 2, y: 7 } },
  position: { x: 2, y: 7 },
};
[first, second, freezer].forEach(saveShelf);
for (const [id, shelf, slot] of [
  ['a', first, 0],
  ['b', first, 1],
  ['c', second, 0],
  ['d', second, 1],
  ['new', undefined, undefined],
  ['frozen', undefined, undefined],
] as const)
  saveProduct({
    ...makeSeedProducts()[0],
    id,
    name: `测试商品${id}`,
    status: 'active',
    price: 12,
    stock: 7,
    storageCondition: id === 'frozen' ? 'frozen-confirmed' : 'ambient-likely',
    merchandisingState: shelf ? 'placed' : 'unplaced',
    shelf: shelf?.name || '',
    shelfId: shelf?.id,
    shelfSide: shelf ? 'front' : undefined,
    shelfLevel: shelf ? 1 : undefined,
    shelfSlot: slot,
    catalogOrigin: 'manual',
  });
await import('../../server/index');
