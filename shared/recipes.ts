import type { MealWant } from './types';

export type RecipeIngredient = {
  key: string;
  productId?: string;
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
  kind?: 'staple' | 'protein' | 'vegetable' | 'mixed';
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
  potato: '土豆',
  carrot: '胡萝卜',
  pasta: '意面',
  yogurt: '酸奶',
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
  potato: ['土豆', '马铃薯'],
  carrot: ['胡萝卜', '红萝卜'],
  pasta: ['意面', '意大利面'],
  yogurt: ['酸奶', '希腊酸奶'],
};
// Input aliases translate the request; catalog matching uses only English terms.
export const ingredientEnglishTerms: Record<string, string[]> = {
  seabass: ['sea bass', 'bass'],
  carp: ['carp'],
  salmon: ['salmon'],
  fish: [
    'fish',
    'salmon',
    'cod',
    'pollock',
    'tilapia',
    'trout',
    'tuna',
    'flounder',
    'haddock',
    'sardines',
    'anchovies',
    'mahi',
  ],
  seafood: [
    'fish',
    'salmon',
    'cod',
    'pollock',
    'tilapia',
    'trout',
    'tuna',
    'flounder',
    'shrimp',
    'crab',
    'lobster',
    'scallops',
    'clams',
    'mussels',
    'oysters',
  ],
  spinach: ['spinach'],
  bokchoy: ['bok choy'],
  lettuce: ['romaine', 'lettuce'],
  broccoli: ['broccoli'],
  tomato: ['tomatoes', 'tomato'],
  chicken: ['chicken breast', 'chicken breasts'],
  beef: ['beef', 'steak'],
  pork: ['pork'],
  shrimp: ['shrimp'],
  egg: ['eggs', 'egg'],
  bread: ['bread', 'baguette', 'bagel', 'bagels', 'croissant', 'croissants', 'tortillas'],
  milk: ['milk'],
  rice: ['rice'],
  oats: ['oats', 'oatmeal'],
  noodles: ['noodles'],
  oil: ['olive oil', 'canola oil', 'vegetable oil', 'cooking oil'],
  salt: ['salt'],
  sugar: ['sugar'],
  'soy-sauce': ['soy sauce'],
  'dark-soy': ['dark soy sauce'],
  vinegar: ['vinegar'],
  'cooking-wine': ['cooking wine'],
  'char-siu-sauce': ['char siu sauce'],
  'red-fermented-tofu': ['fermented bean curd'],
  'rose-wine': ['rose wine'],
  ginger: ['ginger'],
  scallion: ['green onions', 'scallions'],
  garlic: ['garlic'],
  onion: ['onions', 'onion'],
  tofu: ['tofu'],
  chili: ['chili peppers', 'jalapeno', 'jalapenos'],
  'black-pepper': ['black pepper'],
  cumin: ['cumin'],
  potato: ['potatoes', 'potato'],
  carrot: ['carrots', 'carrot'],
  pasta: ['spaghetti', 'penne', 'rotini', 'fettuccine', 'pasta'],
  yogurt: ['yogurt'],
};
export const defaultHomePantry = ['oil', 'salt'];
export const mealPlanningVersion = 'western-en-v1' as const;
export function ingredientKey(name: string) {
  if (Array.isArray(ingredientEnglishTerms[name])) return name;
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[\s·、，,]/g, '');
  const found = Object.entries(ingredientAliases).find(([, aliases]) =>
    aliases.some((alias) => alias.toLowerCase().replace(/[\s·、，,]/g, '') === normalized),
  );
  if (found) return found[0];
  return Object.entries(ingredientEnglishTerms).find(
    ([key, terms]) =>
      key === normalized ||
      (!['fish', 'seafood'].includes(key) &&
        terms.some((term) => term.replace(/\s/g, '') === normalized)),
  )?.[0];
}
export const recipes: Recipe[] = [
  {
    id: 'roasted-potatoes',
    title: '烤土豆',
    kind: 'staple',
    wants: [],
    minutes: 25,
    ingredients: [
      {
        key: 'potato',
        grams: 350,
      },
      {
        key: 'oil',
        milliliters: 8,
      },
      {
        key: 'salt',
        grams: 2,
      },
    ],
    steps: ['土豆洗净切块，拌入食用油和盐。', '烤至内部绵软、表面上色，按设备调整时间。'],
  },
  {
    id: 'toasted-bread',
    title: '烤面包',
    kind: 'staple',
    wants: [],
    minutes: 5,
    ingredients: [
      {
        key: 'bread',
        grams: 160,
      },
    ],
    steps: ['面包按包装说明加热，分成两人份。'],
  },
  {
    id: 'plain-pasta',
    title: '橄榄油意面',
    kind: 'staple',
    wants: [],
    minutes: 15,
    ingredients: [
      {
        key: 'pasta',
        grams: 180,
      },
      {
        key: 'oil',
        milliliters: 8,
      },
      {
        key: 'salt',
        grams: 2,
      },
    ],
    steps: ['意面按包装说明煮熟沥水。', '拌入食用油和盐，分成两人份。'],
  },
  {
    id: 'pan-salmon',
    title: '香煎三文鱼',
    kind: 'protein',
    wants: ['fish'],
    minutes: 20,
    ingredients: [
      {
        key: 'salmon',
        grams: 350,
      },
      {
        key: 'oil',
        milliliters: 8,
      },
      {
        key: 'salt',
        grams: 2,
      },
    ],
    steps: ['未调味三文鱼按包装说明解冻并擦干，撒盐。', '少量油煎至中心熟透，按鱼块厚度调整时间。'],
  },
  {
    id: 'baked-chicken',
    title: '烤鸡胸肉',
    kind: 'protein',
    wants: ['meat'],
    minutes: 25,
    ingredients: [
      {
        key: 'chicken',
        grams: 350,
      },
      {
        key: 'oil',
        milliliters: 8,
      },
      {
        key: 'salt',
        grams: 2,
      },
    ],
    steps: ['生鸡胸肉按包装说明解冻，拌入食用油和盐。', '烤至中心完全熟透，按厚度和设备调整时间。'],
  },
  {
    id: 'garlic-shrimp',
    title: '蒜香煎虾',
    kind: 'protein',
    wants: ['shrimp'],
    minutes: 15,
    ingredients: [
      {
        key: 'shrimp',
        grams: 300,
      },
      {
        key: 'garlic',
        grams: 6,
      },
      {
        key: 'oil',
        milliliters: 8,
      },
      {
        key: 'salt',
        grams: 2,
      },
    ],
    steps: ['生虾按包装说明解冻处理，大蒜切碎。', '少量油炒香蒜，加入虾煎至完全熟透，加盐。'],
  },
  {
    id: 'boiled-eggs',
    title: '水煮蛋',
    kind: 'protein',
    wants: ['egg', 'breakfast'],
    minutes: 12,
    ingredients: [
      {
        key: 'egg',
        pieces: 4,
      },
    ],
    steps: ['鸡蛋放入水中煮至蛋白和蛋黄凝固，分成两人份。'],
  },
  {
    id: 'roasted-broccoli',
    title: '烤西兰花',
    kind: 'vegetable',
    wants: ['vegetables'],
    minutes: 20,
    ingredients: [
      {
        key: 'broccoli',
        grams: 350,
      },
      {
        key: 'oil',
        milliliters: 8,
      },
      {
        key: 'salt',
        grams: 2,
      },
    ],
    steps: ['西兰花按包装说明处理，拌食用油和盐。', '烤至熟透，冷冻西兰花按包装说明调整时间。'],
  },
  {
    id: 'spinach-salad',
    title: '菠菜番茄沙拉',
    kind: 'vegetable',
    wants: ['greens', 'vegetables'],
    minutes: 10,
    ingredients: [
      {
        key: 'spinach',
        grams: 160,
      },
      {
        key: 'tomato',
        grams: 200,
      },
      {
        key: 'oil',
        milliliters: 6,
      },
      {
        key: 'salt',
        grams: 1,
      },
    ],
    steps: ['新鲜菠菜和番茄洗净沥干，番茄切块。', '拌入少量食用油和盐，现做现吃。'],
  },
  {
    id: 'romaine-salad',
    title: '罗马生菜沙拉',
    kind: 'vegetable',
    wants: ['greens', 'vegetables'],
    minutes: 10,
    ingredients: [
      {
        key: 'lettuce',
        grams: 250,
      },
      {
        key: 'tomato',
        grams: 150,
      },
      {
        key: 'oil',
        milliliters: 6,
      },
      {
        key: 'salt',
        grams: 1,
      },
    ],
    steps: ['新鲜生菜和番茄洗净沥干、切成适口大小。', '拌入少量食用油和盐。'],
  },
  {
    id: 'roasted-carrots',
    title: '烤胡萝卜',
    kind: 'vegetable',
    wants: ['vegetables'],
    minutes: 25,
    ingredients: [
      {
        key: 'carrot',
        grams: 350,
      },
      {
        key: 'oil',
        milliliters: 8,
      },
      {
        key: 'salt',
        grams: 2,
      },
    ],
    steps: ['胡萝卜洗净切条，拌食用油和盐。', '烤至内部变软，按设备调整时间。'],
  },
  {
    id: 'oatmeal',
    title: '原味燕麦粥',
    kind: 'staple',
    wants: ['breakfast'],
    minutes: 10,
    ingredients: [
      {
        key: 'oats',
        grams: 100,
      },
    ],
    steps: ['燕麦加水，按包装说明煮熟，分成两人份。'],
  },
  {
    id: 'yogurt-bowl',
    title: '原味酸奶碗',
    kind: 'protein',
    wants: ['breakfast'],
    minutes: 5,
    ingredients: [
      {
        key: 'yogurt',
        grams: 300,
      },
    ],
    steps: ['按包装要求冷藏保存，取两人份酸奶食用。'],
  },
];

export function ingredientKeys(text: string) {
  const lower = text.toLowerCase();
  return Object.entries(ingredientAliases)
    .filter(
      ([key, aliases]) =>
        aliases.some((alias) => lower.includes(alias)) ||
        (ingredientEnglishTerms[key] || []).some((term) =>
          new RegExp(`\\b${term}\\b`, 'i').test(lower),
        ),
    )
    .map(([key]) => key);
}
