import type { MealWant } from './types';

export type RecipeIngredient = { key: string; grams?: number; units?: number; pantry?: boolean };
export type Recipe = {
  id: string;
  title: string;
  wants: MealWant[];
  minutes: number;
  ingredients: RecipeIngredient[];
  steps: string[];
};
export const ingredientNames: Record<string, string> = {
  seabass: '鲈鱼',
  carp: '草鱼',
  salmon: '三文鱼',
  spinach: '菠菜',
  bokchoy: '上海青',
  lettuce: '生菜',
  broccoli: '西兰花',
  tomato: '番茄',
  chicken: '鸡胸肉',
  shrimp: '虾',
  egg: '鸡蛋',
  bread: '面包',
  milk: '牛奶',
  rice: '米',
  oil: '食用油',
  salt: '盐',
  ginger: '姜',
  scallion: '葱',
  garlic: '蒜',
};
export const ingredientAliases: Record<string, string[]> = {
  oil: ['食用油', '油'],
  salt: ['食盐', '盐'],
  ginger: ['生姜', '姜'],
  scallion: ['小葱', '大葱', '葱'],
  garlic: ['大蒜', '蒜'],
  rice: ['大米', '米', '主食'],
  egg: ['鸡蛋'],
  tomato: ['番茄', '西红柿'],
  spinach: ['菠菜'],
  bokchoy: ['上海青', '青菜', '油菜'],
  lettuce: ['生菜'],
  broccoli: ['西兰花', '西蓝花'],
  chicken: ['鸡胸肉', '鸡肉'],
  shrimp: ['虾', '虾仁'],
  seabass: ['鲈鱼'],
  carp: ['草鱼'],
  salmon: ['三文鱼'],
  bread: ['面包', '吐司'],
  milk: ['牛奶'],
};
export const recipes: Recipe[] = [
  {
    id: 'steamed-bass',
    title: '葱姜清蒸鲈鱼',
    wants: ['fish'],
    minutes: 20,
    ingredients: [
      { key: 'seabass', grams: 750 },
      { key: 'ginger', pantry: true },
      { key: 'scallion', pantry: true },
      { key: 'salt', pantry: true },
    ],
    steps: [
      '鲈鱼处理干净，放入姜片和少量盐。',
      '水开后入锅蒸制，按鱼的大小延长时间，确认鱼肉熟透。',
      '撒葱段再焖片刻。食用时留意鱼刺。',
    ],
  },
  {
    id: 'braised-carp',
    title: '家常葱姜焖草鱼',
    wants: ['fish'],
    minutes: 25,
    ingredients: [
      { key: 'carp', grams: 750 },
      { key: 'ginger', pantry: true },
      { key: 'scallion', pantry: true },
      { key: 'oil', pantry: true },
      { key: 'salt', pantry: true },
    ],
    steps: [
      '草鱼切段，姜切片，葱切段。',
      '少量油煎香姜片和鱼段，加适量水和盐。',
      '焖至鱼肉完全熟透，撒葱段。草鱼刺较多，食用时仔细挑刺。',
    ],
  },
  {
    id: 'pan-salmon',
    title: '香煎三文鱼',
    wants: ['fish'],
    minutes: 15,
    ingredients: [
      { key: 'salmon', grams: 400 },
      { key: 'oil', pantry: true },
      { key: 'salt', pantry: true },
    ],
    steps: ['三文鱼擦干，撒少量盐。', '锅中放少量油，两面煎制，确认中心熟透后出锅。'],
  },
  {
    id: 'spinach-greens',
    title: '清炒菠菜',
    wants: ['greens', 'vegetables'],
    minutes: 10,
    ingredients: [
      { key: 'spinach', grams: 500 },
      { key: 'oil', pantry: true },
      { key: 'salt', pantry: true },
    ],
    steps: ['菠菜洗净，切去老根。', '热锅少量油，放菠菜翻炒至熟，最后加少量盐。'],
  },
  {
    id: 'bokchoy-greens',
    title: '清炒上海青',
    wants: ['greens', 'vegetables'],
    minutes: 10,
    ingredients: [
      { key: 'bokchoy', grams: 500 },
      { key: 'oil', pantry: true },
      { key: 'salt', pantry: true },
    ],
    steps: ['上海青掰开洗净，菜梗和菜叶分开。', '少量油先炒菜梗，再放菜叶，炒熟后加盐。'],
  },
  {
    id: 'lettuce-greens',
    title: '清炒生菜',
    wants: ['greens', 'vegetables'],
    minutes: 8,
    ingredients: [
      { key: 'lettuce', grams: 500 },
      { key: 'oil', pantry: true },
      { key: 'salt', pantry: true },
    ],
    steps: ['生菜洗净并沥水。', '热锅放少量油，快速翻炒生菜至熟，加盐调味。'],
  },
  {
    id: 'tomato-eggs',
    title: '番茄炒鸡蛋',
    wants: ['egg', 'vegetables'],
    minutes: 15,
    ingredients: [
      { key: 'tomato', grams: 400 },
      { key: 'egg', units: 1 },
      { key: 'oil', pantry: true },
      { key: 'salt', pantry: true },
    ],
    steps: [
      '番茄切块，按每 2 人约 3 枚鸡蛋打散；其余鸡蛋可留作下一餐。',
      '少量油炒熟鸡蛋盛出，再炒番茄。',
      '合炒并加盐，确认鸡蛋熟透。',
    ],
  },
  {
    id: 'broccoli-chicken',
    title: '西兰花炒鸡胸肉',
    wants: ['meat', 'vegetables'],
    minutes: 20,
    ingredients: [
      { key: 'chicken', grams: 400 },
      { key: 'broccoli', grams: 400 },
      { key: 'oil', pantry: true },
      { key: 'salt', pantry: true },
    ],
    steps: [
      '鸡胸肉切块，西兰花切小朵洗净。',
      '西兰花焯水，鸡肉下锅炒至完全熟透。',
      '加入西兰花合炒，以少量盐调味。',
    ],
  },
  {
    id: 'boiled-shrimp',
    title: '姜葱白灼虾',
    wants: ['shrimp'],
    minutes: 15,
    ingredients: [
      { key: 'shrimp', grams: 500 },
      { key: 'ginger', pantry: true },
      { key: 'scallion', pantry: true },
      { key: 'salt', pantry: true },
    ],
    steps: ['虾洗净，挑去虾线。', '水中放葱姜和少量盐，煮开后放虾。', '煮至虾肉熟透即可。'],
  },
  {
    id: 'breakfast-toast',
    title: '全麦鸡蛋吐司配牛奶',
    wants: ['breakfast', 'egg'],
    minutes: 15,
    ingredients: [
      { key: 'bread', units: 1 },
      { key: 'egg', units: 1 },
      { key: 'milk', units: 1 },
    ],
    steps: ['鸡蛋煮至熟透，吐司按喜好加热。', '每人搭配吐司、鸡蛋和牛奶；整包剩余食材妥善保存。'],
  },
];

export function ingredientKeys(text: string) {
  return Object.entries(ingredientAliases)
    .filter(([, aliases]) => aliases.some((alias) => text.includes(alias)))
    .map(([key]) => key);
}
