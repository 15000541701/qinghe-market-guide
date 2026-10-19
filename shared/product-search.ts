import type { Product } from './types';
import { ingredientEnglishTerms, ingredientKeys } from './recipes';
import { isMealFood, matchesMealIngredient } from './meal-catalog';

/**
 * Chinese grocery words → English words used in the Sam’s Club catalog names, so the catalog
 * search box works for Chinese input. Recipe ingredients are added from `ingredientKeys`.
 */
const chineseTerms: Record<string, string[]> = {
  牛奶: ['milk'],
  奶酪: ['cheese'],
  芝士: ['cheese'],
  黄油: ['butter'],
  奶油: ['cream'],
  鸡蛋: ['eggs'],
  面包: ['bread', 'buns', 'bagels', 'croissants', 'rolls'],
  蛋糕: ['cake', 'cakes'],
  饼干: ['cookies', 'crackers'],
  松饼: ['muffins'],
  咖啡: ['coffee'],
  茶: ['tea'],
  果汁: ['juice'],
  矿泉水: ['water'],
  饮用水: ['water'],
  苏打水: ['sparkling water', 'soda'],
  可乐: ['cola', 'coca-cola'],
  巧克力: ['chocolate'],
  糖果: ['candy'],
  薯片: ['chips'],
  坚果: ['nuts', 'almonds', 'cashews', 'pistachios', 'walnuts', 'pecans'],
  鸡肉: ['chicken'],
  鸡翅: ['chicken wings', 'wings'],
  牛肉: ['beef'],
  牛排: ['steak', 'steaks'],
  猪肉: ['pork'],
  培根: ['bacon'],
  香肠: ['sausage', 'sausages'],
  火腿: ['ham'],
  火鸡: ['turkey'],
  鱼: ['fish', 'salmon', 'cod', 'tilapia', 'tuna', 'pollock'],
  三文鱼: ['salmon'],
  虾: ['shrimp'],
  蟹: ['crab'],
  龙虾: ['lobster'],
  苹果: ['apples'],
  香蕉: ['bananas'],
  橙子: ['oranges'],
  葡萄: ['grapes'],
  草莓: ['strawberries'],
  蓝莓: ['blueberries'],
  牛油果: ['avocados'],
  柠檬: ['lemons'],
  西瓜: ['watermelon'],
  菠萝: ['pineapple'],
  猕猴桃: ['kiwi', 'kiwis'],
  桃子: ['peaches'],
  梨: ['pears'],
  土豆: ['potatoes'],
  洋葱: ['onions'],
  番茄: ['tomatoes'],
  西红柿: ['tomatoes'],
  蘑菇: ['mushrooms', 'mushroom'],
  玉米: ['corn'],
  沙拉: ['salad'],
  大米: ['rice'],
  意面: ['pasta', 'spaghetti'],
  燕麦: ['oats', 'oatmeal'],
  麦片: ['cereal', 'oats'],
  面粉: ['flour'],
  橄榄油: ['olive oil'],
  食用油: ['oil'],
  番茄酱: ['ketchup'],
  蛋黄酱: ['mayonnaise'],
  芥末: ['mustard'],
  沙拉酱: ['dressing'],
  莎莎酱: ['salsa'],
  蜂蜜: ['honey'],
  披萨: ['pizza'],
  冰淇淋: ['ice cream'],
  汤: ['soup'],
  纸巾: ['tissues', 'paper towels', 'napkins'],
  卫生纸: ['toilet paper', 'bath tissue'],
  湿巾: ['wipes'],
  洗衣液: ['laundry detergent', 'detergent'],
  洗洁精: ['dish soap'],
  垃圾袋: ['trash bags'],
  洗发水: ['shampoo'],
  沐浴露: ['body wash'],
  纸尿裤: ['diapers'],
  尿布: ['diapers'],
  奶粉: ['formula'],
  狗粮: ['dog food'],
  猫砂: ['cat litter', 'litter'],
};

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export type ProductSearch = { matchers: RegExp[]; ingredients: string[] };

/** Matchers for a catalog query: the typed text plus English words for Chinese input. */
export function productSearch(query: string): ProductSearch | null {
  const typed = query.trim().toLowerCase();
  if (!typed) return null;
  // Typed Latin text matches word starts so “chick” finds “Chicken” while typing.
  const matchers = [
    /\p{Script=Han}/u.test(typed) ? new RegExp(escape(typed)) : new RegExp(`\\b${escape(typed)}`),
  ];
  const ingredients = ingredientKeys(typed);
  const english = new Set<string>();
  for (const [word, terms] of Object.entries(chineseTerms))
    if (typed.includes(word)) terms.forEach((term) => english.add(term));
  for (const key of ingredients)
    for (const term of ingredientEnglishTerms[key] || []) english.add(term);
  for (const term of english) matchers.push(new RegExp(`\\b${escape(term)}(?:s|es)?\\b`));
  return { matchers, ingredients };
}

/**
 * 0 when the product does not match. Plain ingredients (“牛奶” → milk, not milk chocolate) rank
 * above other matches, reusing the meal planner's ingredient compatibility rules.
 */
export function productSearchScore(product: Product, search: ProductSearch, categoryName = '') {
  const text = [
    product.name,
    product.brand,
    product.sku,
    product.sourceSku,
    categoryName,
    ...product.aliases,
    ...product.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!search.matchers.some((matcher) => matcher.test(text))) return 0;
  return isMealFood(product) &&
    search.ingredients.some((key) => matchesMealIngredient(product, key))
    ? 2
    : 1;
}
