import type { Point, Product, Shelf, StoreSection } from './types';

export const fixtureKindLabels = {
  gondola: '双面货架',
  'produce-table': '生鲜岛台',
  'display-table': '堆头展示台',
  'service-counter': '熟食服务柜台',
  'seafood-tank': '活鲜池',
  chiller: '冷藏展示柜',
};
export const fixtureSideLabels = { left: '左侧', right: '右侧', front: '前侧', back: '后侧' };
export const fixedFixtures = [
  { id: 'checkout-1', name: '人工收银', kind: 'checkout', rect: { x: 3, y: 22, w: 3, h: 1 } },
  { id: 'checkout-2', name: '自助收银', kind: 'checkout', rect: { x: 8, y: 22, w: 3, h: 1 } },
  { id: 'service', name: '服务台', kind: 'service', rect: { x: 25, y: 22, w: 4, h: 1 } },
];
export const mainAisles = [
  { x: 10, y: 1, w: 2, h: 20 },
  { x: 20, y: 1, w: 2, h: 20 },
  { x: 1, y: 10, w: 30, h: 2 },
  { x: 1, y: 20, w: 30, h: 2 },
];
// Original department footprints used only to identify untouched demo layouts during migration.
export const legacyDefaultRects: Record<string, StoreSection['rect']> = {
  vegetables: { x: 2, y: 2, w: 8, h: 6 },
  fruit: { x: 2, y: 11, w: 8, h: 5 },
  seafood: { x: 21, y: 2, w: 9, h: 6 },
  meat: { x: 21, y: 10, w: 9, h: 5 },
  dairy: { x: 21, y: 17, w: 9, h: 4 },
  bakery: { x: 2, y: 18, w: 8, h: 4 },
  pantry: { x: 13, y: 11, w: 5, h: 6 },
};
export const realisticSections: StoreSection[] = [
  {
    id: 'vegetables',
    name: '蔬菜',
    code: 'A',
    color: '#557749',
    tint: '#f2f5ed',
    rect: { x: 2, y: 12, w: 8, h: 4 },
    location: { x: 5, y: 15 },
    active: true,
  },
  {
    id: 'fruit',
    name: '水果',
    code: 'B',
    color: '#a67b32',
    tint: '#fbf5e9',
    rect: { x: 2, y: 16, w: 8, h: 4 },
    location: { x: 5, y: 19 },
    active: true,
  },
  {
    id: 'seafood',
    name: '水产活鲜',
    code: 'C',
    color: '#397f91',
    tint: '#edf6f8',
    rect: { x: 22, y: 2, w: 8, h: 5 },
    location: { x: 24, y: 6 },
    active: true,
  },
  {
    id: 'meat',
    name: '肉禽冷鲜',
    code: 'D',
    color: '#a46e65',
    tint: '#faf0ed',
    rect: { x: 22, y: 7, w: 8, h: 5 },
    location: { x: 24, y: 11 },
    active: true,
  },
  {
    id: 'dairy',
    name: '乳品冷藏',
    code: 'E',
    color: '#6e829d',
    tint: '#f0f4fa',
    rect: { x: 22, y: 12, w: 8, h: 8 },
    location: { x: 24, y: 19 },
    active: true,
  },
  {
    id: 'bakery',
    name: '烘焙面包',
    code: 'F',
    color: '#a27d51',
    tint: '#faf4e9',
    rect: { x: 2, y: 2, w: 8, h: 4 },
    location: { x: 5, y: 5 },
    active: true,
  },
  {
    id: 'pantry',
    name: '粮油 · 调味 · 零食',
    code: 'G',
    color: '#7f8059',
    tint: '#f5f5ed',
    rect: { x: 12, y: 12, w: 8, h: 8 },
    location: { x: 14, y: 19 },
    active: true,
  },
  {
    id: 'household',
    name: '日用 · 清洁 · 家居',
    code: 'H',
    color: '#737f8d',
    tint: '#f1f3f6',
    rect: { x: 12, y: 2, w: 8, h: 8 },
    location: { x: 14, y: 9 },
    active: true,
  },
  {
    id: 'deli-service',
    name: '熟食档口',
    code: 'J',
    color: '#ad7851',
    tint: '#fbf1e8',
    rect: { x: 2, y: 6, w: 8, h: 4 },
    location: { x: 5, y: 9 },
    active: true,
  },
];
export function fixtureAccessPoints(
  r: NonNullable<Shelf['footprint']>,
): Record<'left' | 'right' | 'front' | 'back', Point> {
  return {
    left: { x: r.x - 1, y: r.y + Math.floor((r.h - 1) / 2) },
    right: { x: r.x + r.w, y: r.y + Math.floor((r.h - 1) / 2) },
    front: { x: r.x + Math.floor((r.w - 1) / 2), y: r.y + r.h },
    back: { x: r.x + Math.floor((r.w - 1) / 2), y: r.y - 1 },
  };
}
export function defaultFixture(
  section: StoreSection,
  index: number,
): Required<Pick<Shelf, 'kind' | 'footprint' | 'levels' | 'accessPoints' | 'position'>> {
  const { x, y } = section.rect;
  let kind: NonNullable<Shelf['kind']> = 'gondola';
  let footprint = { x: x + index * 3, y: y + 1, w: 1, h: Math.max(2, section.rect.h - 3) };
  if (['vegetables', 'fruit'].includes(section.id)) {
    kind = 'produce-table';
    footprint = { x: x + index * 3, y: y + 1, w: 2, h: 2 };
  }
  if (section.id === 'seafood') {
    kind = 'seafood-tank';
    footprint = { x: x + index * 3, y: y + 1, w: 2, h: 2 };
  }
  if (section.id === 'meat') {
    kind = 'chiller';
    footprint = { x: x + index * 3, y: y + 1, w: 2, h: 2 };
  }
  if (section.id === 'dairy') {
    kind = 'chiller';
    footprint = { x: x + index * 3, y: y + 1, w: 1, h: 5 };
  }
  if (section.id === 'bakery') {
    kind = 'display-table';
    footprint = { x: x + index * 3, y: y + 1, w: 2, h: 2 };
  }
  if (section.id === 'deli-service') {
    kind = 'service-counter';
    footprint = { x: x + index * 3, y: y + 1, w: 2, h: 1 };
  }
  const points = fixtureAccessPoints(footprint);
  const accessPoints =
    kind === 'gondola'
      ? { left: points.left, right: points.right }
      : kind === 'chiller' && section.id === 'dairy'
        ? { left: points.left }
        : { front: points.front };
  return {
    kind,
    footprint,
    levels: kind === 'gondola' || kind === 'chiller' ? 4 : 1,
    accessPoints,
    position: Object.values(accessPoints)[0] || null,
  };
}
export function productLocationLabel(product: Product): string {
  return [
    product.shelf,
    product.shelfSide && fixtureSideLabels[product.shelfSide],
    product.shelfLevel && `第${product.shelfLevel}层（从下往上）`,
  ]
    .filter(Boolean)
    .join(' · ');
}
export function productShelfTarget(product: Product, shelf: Shelf): Shelf {
  const point = product.shelfSide ? shelf.accessPoints?.[product.shelfSide] : undefined;
  if (
    shelf.footprint &&
    ((product.shelfSide && !point) ||
      (product.shelfLevel && product.shelfLevel > (shelf.levels || 1)))
  )
    return {
      ...shelf,
      reachable: false,
      position: null,
      name: `${productLocationLabel(product)}（陈列位置需重新配置）`,
    };
  return point
    ? {
        ...shelf,
        id: `${shelf.id}@${product.shelfSide}`,
        position: point,
        name: productLocationLabel(product),
      }
    : shelf;
}
