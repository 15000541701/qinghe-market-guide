import type { Category, GuideResponse, Product, QueryFilters } from './types';
import { categoryLabels } from './catalog';

const groups: [Category, RegExp][] = [
  ['vegetables', /蔬菜|青菜|绿叶|叶菜|素菜/],
  ['fruit', /水果/],
  ['seafood', /鱼|虾|海鲜|水产/],
  ['meat', /肉|牛排|鸡胸/],
  ['dairy', /奶|鸡蛋|乳品/],
  ['bakery', /面包|吐司|可颂|烘焙/],
  ['pantry', /粮油|大米|食用油|菜籽油/],
];

function normalizeChineseNumbers(input: string) {
  const digits: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  return input.replace(/[零一二两三四五六七八九十百]+/g, (token) => {
    let value = 0;
    let current = 0;
    for (const char of token) {
      if (char === '百') {
        value += (current || 1) * 100;
        current = 0;
      } else if (char === '十') {
        value += (current || 1) * 10;
        current = 0;
      } else current = digits[char];
    }
    return String(value + current);
  });
}

export function parseQuery(
  message: string,
  previous: QueryFilters = { categories: [] },
  catalog: Product[] = [],
): QueryFilters {
  const text = normalizeChineseNumbers(message.trim().toLowerCase());
  const categories = groups.filter(([, regex]) => regex.test(text)).map(([id]) => id);
  const exact = catalog.filter((p) =>
    [p.name, ...p.aliases].some((a) => a.length >= 2 && text.includes(a.toLowerCase())),
  );
  const foundCategories = [...new Set([...categories, ...exact.map((p) => p.category)])];
  const filters: QueryFilters = {
    categories: foundCategories.length ? foundCategories : previous.categories,
    sort: /便宜|低价|从低到高/.test(text) ? 'price' : 'default',
  };
  if (!foundCategories.length && previous.term) filters.term = previous.term;
  if (/绿叶|叶菜/.test(text)) filters.term = '绿叶蔬菜';
  else if (/鱼/.test(text) && !/虾|海鲜|水产/.test(text)) filters.term = '鱼类';
  if (exact.length) filters.term = exact.map((p) => p.id).join('|');
  const range = text.match(
    /(\d+(?:\.\d+)?)\s*(?:块钱?|元|rmb|¥|￥)?\s*(?:到|至|[-~～—])\s*(\d+(?:\.\d+)?)/,
  );
  const maximum =
    text.match(
      /(?:不超过|最多|低于|少于|小于|预算(?:是|在|为)?|上限|以内)\s*[¥￥]?\s*(\d+(?:\.\d+)?)/,
    ) || text.match(/(\d+(?:\.\d+)?)\s*(?:元|块钱?)?\s*(?:以内|以下|之内)/);
  const minimum =
    text.match(/(?:不低于|至少|高于|大于|最低)\s*[¥￥]?\s*(\d+(?:\.\d+)?)/) ||
    text.match(/(\d+(?:\.\d+)?)\s*(?:元|块钱?)?\s*(?:以上|起)/);
  if (range) {
    filters.min = Math.min(+range[1], +range[2]);
    filters.max = Math.max(+range[1], +range[2]);
  } else {
    if (maximum) filters.max = +maximum[1];
    if (minimum) filters.min = +minimum[1];
  }
  if (/不限|取消.*价格|所有价位/.test(text)) {
    delete filters.min;
    delete filters.max;
  } else if (!range && !maximum && !minimum && !foundCategories.length) {
    filters.min = previous.min;
    filters.max = previous.max;
  }
  if (/再便宜|更便宜/.test(text) && !maximum && previous.max !== undefined)
    filters.max = +(previous.max * 0.75).toFixed(2);
  if (/所有商品|全部商品|随便逛|有什么商品/.test(text)) {
    filters.categories = [];
    delete filters.term;
  }
  if (/早餐/.test(text) && !foundCategories.length) {
    filters.categories = ['dairy', 'bakery'];
    delete filters.term;
  }
  return filters;
}

export function filterProducts(products: Product[], filters: QueryFilters): Product[] {
  return products
    .filter(
      (p) =>
        p.stock > 0 &&
        (!filters.categories.length || filters.categories.includes(p.category)) &&
        (filters.min === undefined || p.price >= filters.min) &&
        (filters.max === undefined || p.price <= filters.max) &&
        (!filters.term ||
          filters.term
            .split('|')
            .some(
              (t) =>
                p.id === t || p.name.includes(t) || p.tags.includes(t) || p.aliases.includes(t),
            )),
    )
    .sort((a, b) => (filters.sort === 'price' ? a.price - b.price : 0));
}

export function respondToQuery(
  message: string,
  products: Product[],
  previous?: QueryFilters,
): GuideResponse {
  const filters = parseQuery(message, previous, products);
  const hasIntent =
    filters.categories.length > 0 ||
    !!filters.term ||
    filters.min !== undefined ||
    filters.max !== undefined ||
    /推荐|商品|逛|买|便宜|吃|早餐|晚餐/.test(message);
  if (!hasIntent)
    return {
      text: '我可以帮你找商品、按价格挑选，再带你到对应货架。试试说“推荐 10 元以内的绿叶蔬菜”或“20 到 40 元的鱼”。也可以点相机上传商品图片。',
      products: [],
      filters,
      engine: 'rules',
    };
  const matches = filterProducts(products, filters);
  const subject =
    filters.term === '绿叶蔬菜'
      ? '绿叶蔬菜'
      : filters.term === '鱼类'
        ? '鱼类'
        : filters.categories.map((c) => categoryLabels[c]).join('、') || '商品';
  const range =
    filters.min !== undefined && filters.max !== undefined
      ? `${filters.min}–${filters.max} 元`
      : filters.max !== undefined
        ? `${filters.max} 元以内`
        : filters.min !== undefined
          ? `${filters.min} 元以上`
          : '';
  const text = matches.length
    ? `为你找到 ${matches.length} 款${range ? ` ${range}的` : ''}${subject}。${filters.sort === 'price' ? '已按价格从低到高排列。' : ''}点击“带我去”就能查看路线，也可以加入清单一起逛。价格按每件商品标注的计价单位筛选。`
    : `暂时没有符合${range ? ` ${range}价格要求的` : ''}${subject}。可以试试提高预算，或告诉我其他想买的商品，我会重新帮你找。`;
  return { text, products: matches.slice(0, 8), filters, engine: 'rules' };
}
