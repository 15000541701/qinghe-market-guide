import type { MealWant } from './types';

export type RecipeIngredient = {
  key: string;
  grams?: number;
  milliliters?: number;
  pieces?: number;
  units?: number;
  pantry?: boolean;
  pantryType?: 'basic' | 'specialty';
};
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
  beef: '牛肉',
  pork: '猪肉',
  shrimp: '虾',
  egg: '鸡蛋',
  bread: '面包',
  milk: '牛奶',
  rice: '米',
  oats: '燕麦片',
  noodles: '挂面',
  oil: '食用油',
  salt: '盐',
  sugar: '糖',
  'soy-sauce': '生抽',
  'dark-soy': '老抽',
  vinegar: '醋',
  'cooking-wine': '料酒',
  'char-siu-sauce': '叉烧酱',
  'red-fermented-tofu': '红腐乳',
  'rose-wine': '玫瑰露酒',
  ginger: '姜',
  scallion: '葱',
  garlic: '蒜',
  onion: '洋葱',
  tofu: '豆腐',
  chili: '辣椒',
  'black-pepper': '黑胡椒',
  cumin: '孜然',
};
export const ingredientAliases: Record<string, string[]> = {
  oil: ['食用油', '植物油', '菜籽油', '油'],
  salt: ['食盐', '盐'],
  sugar: ['白砂糖', '白糖', '糖'],
  'soy-sauce': ['生抽', '酱油'],
  'dark-soy': ['老抽'],
  vinegar: ['米醋', '香醋', '醋'],
  'cooking-wine': ['料酒'],
  'char-siu-sauce': ['叉烧酱'],
  'red-fermented-tofu': ['红腐乳', '腐乳'],
  'rose-wine': ['玫瑰露酒'],
  ginger: ['生姜', '姜'],
  scallion: ['小葱', '大葱', '葱'],
  garlic: ['大蒜', '蒜'],
  rice: ['大米', '米', '主食'],
  oats: ['燕麦', '燕麦片'],
  noodles: ['面条', '挂面'],
  egg: ['鸡蛋'],
  tomato: ['番茄', '西红柿'],
  spinach: ['菠菜'],
  bokchoy: ['上海青', '青菜', '油菜'],
  lettuce: ['生菜'],
  broccoli: ['西兰花', '西蓝花'],
  chicken: ['鸡胸肉', '鸡肉'],
  beef: ['牛肉', '牛排', '牛腩'],
  pork: ['猪肉', '猪里脊', '里脊', '五花肉'],
  shrimp: ['虾', '虾仁'],
  seabass: ['鲈鱼'],
  carp: ['草鱼'],
  salmon: ['三文鱼'],
  bread: ['面包', '吐司', '全麦面包', '全麦吐司'],
  milk: ['牛奶'],
  onion: ['洋葱'],
  tofu: ['豆腐', '北豆腐', '豆制品'],
  chili: ['辣椒', '小米辣', '青椒'],
  'black-pepper': ['黑胡椒', '胡椒粉'],
  cumin: ['孜然', '孜然粉'],
};
export const defaultHomePantry = [
  'oil',
  'salt',
  'sugar',
  'soy-sauce',
  'dark-soy',
  'vinegar',
  'cooking-wine',
];
export function ingredientKey(name: string) {
  const normalized = name.trim().toLowerCase().replace(/[\s·、，,]/g, '');
  const found = Object.entries(ingredientAliases).find(([, aliases]) =>
    aliases.some((alias) => alias.toLowerCase().replace(/[\s·、，,]/g, '') === normalized),
  );
  return found?.[0];
}
export const recipes: Recipe[] = [
  {
    id: 'steamed-bass',
    title: '葱姜清蒸鲈鱼',
    wants: ['fish'],
    minutes: 20,
    ingredients: [
      { key: 'seabass', grams: 750 },
      { key: 'ginger', grams: 10 },
      { key: 'scallion', grams: 20 },
      { key: 'salt', grams: 2, pantryType: 'basic' },
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
      { key: 'ginger', grams: 10 },
      { key: 'scallion', grams: 20 },
      { key: 'oil', milliliters: 10, pantryType: 'basic' },
      { key: 'salt', grams: 2, pantryType: 'basic' },
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
      { key: 'oil', milliliters: 8, pantryType: 'basic' },
      { key: 'salt', grams: 2, pantryType: 'basic' },
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
      { key: 'oil', milliliters: 8, pantryType: 'basic' },
      { key: 'salt', grams: 2, pantryType: 'basic' },
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
      { key: 'oil', milliliters: 8, pantryType: 'basic' },
      { key: 'salt', grams: 2, pantryType: 'basic' },
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
      { key: 'oil', milliliters: 8, pantryType: 'basic' },
      { key: 'salt', grams: 2, pantryType: 'basic' },
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
      { key: 'egg', pieces: 3 },
      { key: 'oil', milliliters: 10, pantryType: 'basic' },
      { key: 'salt', grams: 2, pantryType: 'basic' },
    ],
    steps: [
      '番茄切块，鸡蛋打散。',
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
      { key: 'oil', milliliters: 10, pantryType: 'basic' },
      { key: 'salt', grams: 2, pantryType: 'basic' },
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
      { key: 'ginger', grams: 10 },
      { key: 'scallion', grams: 20 },
      { key: 'salt', grams: 2, pantryType: 'basic' },
    ],
    steps: ['虾洗净，挑去虾线。', '水中放葱姜和少量盐，煮开后放虾。', '煮至虾肉熟透即可。'],
  },
  {
    id: 'breakfast-toast',
    title: '全麦鸡蛋吐司配牛奶',
    wants: ['breakfast', 'egg'],
    minutes: 15,
    ingredients: [
      { key: 'bread', grams: 120 },
      { key: 'egg', pieces: 2 },
      { key: 'milk', milliliters: 250 },
    ],
    steps: ['鸡蛋煮至熟透，吐司按喜好加热。', '每人搭配吐司、鸡蛋和牛奶；整包剩余食材妥善保存。'],
  },
  {
    id: 'steamed-rice',
    title: '米饭',
    wants: ['vegetables'],
    minutes: 35,
    ingredients: [{ key: 'rice', grams: 180 }],
    steps: ['大米淘洗后加适量水。', '按电饭锅说明蒸煮至熟，焖几分钟后盛出。'],
  },
  {
    id: 'tofu-broccoli',
    title: '西兰花烧豆腐',
    wants: ['vegetables'],
    minutes: 20,
    ingredients: [
      { key: 'tofu', grams: 300 },
      { key: 'broccoli', grams: 250 },
      { key: 'oil', milliliters: 8, pantryType: 'basic' },
      { key: 'soy-sauce', milliliters: 8, pantryType: 'basic' },
    ],
    steps: ['豆腐切块，西兰花洗净切小朵。', '少量油煎香豆腐，加水和生抽焖煮。', '放入西兰花烧熟即可。'],
  },
  {
    id: 'onion-pork',
    title: '洋葱炒猪肉',
    wants: ['meat'],
    minutes: 18,
    ingredients: [
      { key: 'pork', grams: 250 },
      { key: 'onion', grams: 180 },
      { key: 'oil', milliliters: 8, pantryType: 'basic' },
      { key: 'soy-sauce', milliliters: 8, pantryType: 'basic' },
    ],
    steps: ['猪肉切薄片，洋葱切丝。', '少量油炒熟猪肉，加入洋葱炒软。', '以生抽调味并确认猪肉完全熟透。'],
  },
  {
    id: 'oat-egg-breakfast',
    title: '燕麦牛奶配水煮蛋',
    wants: ['breakfast', 'egg'],
    minutes: 12,
    ingredients: [
      { key: 'oats', grams: 80 },
      { key: 'milk', milliliters: 300 },
      { key: 'egg', pieces: 2 },
    ],
    steps: ['鸡蛋煮至熟透。', '燕麦按包装说明用牛奶冲泡或煮熟。'],
  },
  {
    id: 'special-char-siu',
    title: '叉烧风味烤鸡腿',
    wants: ['meat'],
    minutes: 35,
    ingredients: [
      { key: 'chicken', grams: 350 },
      { key: 'char-siu-sauce', grams: 25 },
      { key: 'cooking-wine', milliliters: 10, pantryType: 'basic' },
    ],
    steps: ['鸡肉与料酒、叉烧酱拌匀腌制片刻。', '烤至中心熟透，按设备功率调整时间。'],
  },
];

export function ingredientKeys(text: string) {
  return Object.entries(ingredientAliases)
    .filter(([, aliases]) => aliases.some((alias) => text.includes(alias)))
    .map(([key]) => key);
}
