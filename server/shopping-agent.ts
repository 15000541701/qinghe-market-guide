import { z } from 'zod';
import { completion, aiConfigured, guide } from './ai';
import { buildMealPlan, createMealPreferences, describeMealPlan } from '../shared/meal-planner';
import {
  defaultHomePantry,
  ingredientKey,
  ingredientKeys,
  ingredientNames,
  recipes,
} from '../shared/recipes';
import { normalizeChineseNumbers } from '../shared/guide';
import { mutateShoppingList, quantityForMeasure } from '../shared/shopping';
import { categoryLabels, zones } from '../shared/catalog';
import type {
  GuideResponse,
  MealPreferences,
  MealWant,
  Product,
  QueryFilters,
  ShoppingContext,
  StoreCategory,
  GeneratedMeal,
} from '../shared/types';

const wants = ['fish', 'greens', 'vegetables', 'meat', 'shrimp', 'egg', 'breakfast'] as const;
const modelWants: Record<string, MealWant> = {
  fish: 'fish',
  鱼: 'fish',
  鱼类: 'fish',
  greens: 'greens',
  绿叶菜: 'greens',
  绿叶蔬菜: 'greens',
  vegetables: 'vegetables',
  蔬菜: 'vegetables',
  meat: 'meat',
  肉: 'meat',
  肉类: 'meat',
  shrimp: 'shrimp',
  虾: 'shrimp',
  egg: 'egg',
  鸡蛋: 'egg',
  breakfast: 'breakfast',
  早餐: 'breakfast',
};
export const mealPreferencesSchema = z.object({
  people: z.number().int().min(1).max(8),
  budget: z.number().nonnegative().max(10000).nullable(),
  wants: z.array(z.enum(wants)).max(3),
  owned: z.array(z.string().max(30)).max(30),
  excluded: z.array(z.string().max(30)).max(30),
  buyPantry: z.array(z.string().max(30)).max(20),
  dishIds: z.array(z.string().max(50)).max(3),
  cheaper: z.boolean(),
  includeRice: z.boolean(),
  days: z.number().int().min(1).max(14).default(1),
  mealsPerDay: z.number().int().min(1).max(4).default(2),
  homePantry: z.array(z.string().max(30)).max(40).default([...defaultHomePantry]),
  generatedMeals: z
    .array(
      z.object({
        id: z.string().max(100),
        day: z.number().int().min(1).max(14),
        meal: z.enum(['早餐', '午餐', '晚餐', '加餐']),
        dishes: z
          .array(
            z
              .object({
                id: z.string().max(100),
                title: z.string().min(1).max(80),
                kind: z.enum(['staple', 'protein', 'vegetable', 'mixed']),
                minutes: z.number().int().min(1).max(600),
                steps: z.array(z.string().max(500)).min(1).max(10),
                ingredients: z
                  .array(
                    z
                      .object({
                        ingredient: z.string().trim().min(1).max(60).optional(),
                        productId: z.string().max(80).optional(),
                        grams: z.number().positive().max(2500).optional(),
                        milliliters: z.number().positive().max(500).optional(),
                        pieces: z.number().positive().max(40).optional(),
                        units: z.number().positive().max(99).optional(),
                      })
                      .refine((item) => {
                        const amountKinds = [item.grams, item.milliliters, item.pieces, item.units].filter(
                          (value) => value !== undefined,
                        ).length;
                        return amountKinds === 1 && (!!item.ingredient || !!item.productId);
                      }),
                  )
                  .min(1)
                  .max(20),
              })
              .superRefine((dish, context) => {
                for (const item of dish.ingredients) {
                  const key = item.ingredient ? ingredientKey(item.ingredient) : item.productId;
                  if (key === 'oil' && item.milliliters !== undefined && item.milliliters > 80)
                    context.addIssue({ code: 'custom', message: '单道菜用油量明显异常。' });
                  if (key === 'salt' && item.grams !== undefined && item.grams > 15)
                    context.addIssue({ code: 'custom', message: '单道菜用盐量明显异常。' });
                }
              }),
          )
          .min(1)
          .max(5),
      }),
    )
    .max(56)
    .superRefine((meals, context) => {
      for (const meal of meals) {
        const kinds = new Set(meal.dishes.map((dish) => dish.kind));
        if (
          meal.meal === '早餐' &&
          (meal.dishes.length < 2 || !kinds.has('staple') || !kinds.has('protein'))
        )
          context.addIssue({ code: 'custom', message: `第${meal.day}天早餐缺少主食或蛋白质搭配。` });
        if (
          ['午餐', '晚餐'].includes(meal.meal) &&
          (meal.dishes.length < 3 || !kinds.has('staple') || !kinds.has('protein') || !kinds.has('vegetable'))
        )
          context.addIssue({ code: 'custom', message: `第${meal.day}天${meal.meal}需包含主食、蛋白质和蔬菜。` });
      }
    })
    .optional(),
});
export const shoppingContextSchema = z.object({
  cart: z
    .array(
      z.object({
        productId: z.string().max(80),
        quantity: z.number().positive().max(99),
        checked: z.boolean(),
        purchasedQuantity: z.number().nonnegative().max(999).optional(),
      }),
    )
    .max(100),
  meal: mealPreferencesSchema.optional(),
  recipeIds: z.array(z.string().max(80)).max(100).optional(),
  homePantry: z.array(z.string().max(30)).max(40).optional(),
});

export function parseMealPreferences(message: string, previous?: MealPreferences): MealPreferences {
  const preferences = {
    ...(previous || createMealPreferences()),
    owned: [...(previous?.owned || [])],
    excluded: [...(previous?.excluded || [])],
    buyPantry: [...(previous?.buyPantry || [])],
    wants: [...(previous?.wants || [])],
    dishIds: [...(previous?.dishIds || [])],
    homePantry: [...(previous?.homePantry || defaultHomePantry)],
  };
  const normalized = normalizeChineseNumbers(message);
  if (/一周|一星期|7\s*天|七天/.test(message)) preferences.days = 7;
  if (preferences.days > 1 && !/(?:每天|每日)\s*\d+\s*(?:餐|顿)|三餐|三顿|两餐|两顿/.test(message))
    preferences.mealsPerDay = 3;
  const dayCount = normalized.match(/(\d+)\s*天/);
  if (dayCount) preferences.days = Math.min(14, +dayCount[1]);
  const meals = normalized.match(/(?:每天|每日)\s*(\d+)\s*(?:餐|顿)/);
  if (meals) preferences.mealsPerDay = Math.min(4, Math.max(1, +meals[1]));
  else if (/三餐|三顿/.test(message)) preferences.mealsPerDay = 3;
  else if (/两餐|两顿/.test(message)) preferences.mealsPerDay = 2;
  const people = normalized.match(/(\d+)\s*(?:个)?人/);
  if (people) preferences.people = +people[1];
  const budget =
    normalized.match(
      /(?:预算|总共|一共|总价|总额|花费|最多花|不超过)\s*(?:改为|改成|调整为|是|为|在|只有)?\s*[¥￥]?\s*(\d+(?:\.\d+)?)/,
    ) || normalized.match(/(\d+(?:\.\d+)?)\s*(?:元|块钱?)(?:以内|以下|买|做|的晚饭|的晚餐)/);
  if (budget) preferences.budget = +budget[1];
  if (/不限预算|预算不限|不用管预算/.test(message)) preferences.budget = null;
  const negative =
    message.match(/(?:不吃|不能吃|不要吃|不要|不想吃|过敏[:：]?|不放)([^，。；！？]*)/g) || [];
  const excluded = negative.flatMap((clause) => {
    const keys = ingredientKeys(clause);
    if (/鱼|海鲜/.test(clause)) keys.push('seabass', 'carp', 'salmon');
    if (/海鲜/.test(clause)) keys.push('shrimp');
    if (/肉/.test(clause)) keys.push('chicken');
    return keys;
  });
  preferences.excluded = [...new Set([...preferences.excluded, ...excluded])];
  const positive = negative.reduce((text, clause) => text.replace(clause, ''), message);
  const foundWants: MealWant[] = [];
  if (/鱼/.test(positive)) foundWants.push('fish');
  if (/绿叶|叶菜|青菜|菠菜|上海青|生菜/.test(positive)) foundWants.push('greens');
  else if (/蔬菜/.test(positive)) foundWants.push('vegetables');
  if (/鸡胸|鸡肉|肉菜/.test(positive)) foundWants.push('meat');
  if (/虾/.test(positive)) foundWants.push('shrimp');
  if (/早餐/.test(positive)) {
    foundWants.length = 0;
    foundWants.push('breakfast');
  }
  if (foundWants.length) preferences.wants = foundWants.slice(0, 3);
  const ownedClauses =
    positive.match(/(?:家里(?:已经|还|也)?有|已有|已经有|备有|还剩)([^。；！？]*)/g) || [];
  const reverseOwned = positive.match(/([^，。；！？]*?)(?:都有|也有|已备齐|已备好|备齐了)/g) || [];
  const directOwned = positive
    .split(/[，。；！？\s]+/)
    .filter((clause) => clause.startsWith('有') && clause.length > 1);
  const owned = [...new Set([...ownedClauses, ...reverseOwned, ...directOwned].flatMap(ingredientKeys))];
  if (/家里只有/.test(positive)) {
    const only = ingredientKeys(positive.split('家里只有')[1].split(/[，。；]/)[0]);
    preferences.owned = only.filter((key) => !defaultHomePantry.includes(key));
    preferences.homePantry = preferences.homePantry.filter((key) => only.includes(key));
  } else {
    preferences.homePantry = [...new Set([...preferences.homePantry, ...owned.filter((key) => defaultHomePantry.includes(key))])];
    preferences.owned = [...new Set([...preferences.owned, ...owned.filter((key) => !defaultHomePantry.includes(key))])];
  }
  const notOwned = (message.match(/(?:家里没有|家里没|没有|缺少|缺|(?:^|[，。；！？\s])没)([^，。；！？]*)/g) || []).flatMap(
    ingredientKeys,
  );
  const buying = [
    ...(message.match(/([^，。；！？]*?)(?:也要买|需要买|要购买)/g) || []),
    ...(message.match(/(?:也要买|需要买|要购买)([^，。；！？]*)/g) || []),
  ].flatMap(ingredientKeys);
  const explicitlyBuying = [...new Set([...notOwned, ...buying])];
  preferences.homePantry = preferences.homePantry.filter((key) => !explicitlyBuying.includes(key));
  preferences.buyPantry = [...new Set([...preferences.buyPantry, ...explicitlyBuying])];
  preferences.owned = preferences.owned.filter(
    (key) => !explicitlyBuying.includes(key),
  );
  const confirmedPresent = owned.filter((key) => !notOwned.includes(key) && !buying.includes(key));
  preferences.buyPantry = preferences.buyPantry.filter((key) => !confirmedPresent.includes(key));
  if (/也要买米|买米|带上主食|包含主食|加.*米饭/.test(message)) preferences.includeRice = true;
  if (/不买米|不含主食|不要主食|米饭自备/.test(message)) preferences.includeRice = false;
  const dishMatches = recipes.filter(
    (recipe) =>
      positive.includes(recipe.title) ||
      (recipe.id === 'steamed-bass' && /清蒸鲈鱼/.test(positive)) ||
      (recipe.id === 'braised-carp' && /换.*草鱼/.test(positive)) ||
      (recipe.id === 'tomato-eggs' && /番茄炒蛋|西红柿炒鸡蛋/.test(positive)),
  );
  if (dishMatches.length) preferences.dishIds = dishMatches.map((recipe) => recipe.id).slice(0, 3);
  if (/便宜|省钱|省一点/.test(message)) {
    preferences.cheaper = true;
    if (!dishMatches.length) preferences.dishIds = [];
  }
  return preferences;
}

async function generateWeeklyMeals(
  message: string,
  preferences: MealPreferences,
): Promise<GeneratedMeal[]> {
  const mealNames =
    preferences.mealsPerDay === 1
      ? ['晚餐']
      : preferences.mealsPerDay === 2
        ? ['午餐', '晚餐']
        : preferences.mealsPerDay === 3
          ? ['早餐', '午餐', '晚餐']
          : ['早餐', '午餐', '晚餐', '加餐'];
  const ingredient = z
    .object({
      ingredient: z.string().trim().min(1).max(60),
      grams: z.number().positive().max(2500).optional(),
      milliliters: z.number().positive().max(500).optional(),
      pieces: z.number().positive().max(40).optional(),
    })
    .refine((value) => [value.grams, value.milliliters, value.pieces].filter((item) => item !== undefined).length === 1);
  const dish = z
    .object({
      title: z.string().trim().min(1).max(80),
      kind: z.enum(['staple', 'protein', 'vegetable', 'mixed']),
      minutes: z.number().int().min(1).max(600),
      steps: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
      ingredients: z.array(ingredient).min(1).max(15),
    })
    .superRefine((value, context) => {
      for (const item of value.ingredients) {
        const key = ingredientKey(item.ingredient);
        if (key === 'oil' && item.milliliters !== undefined && item.milliliters > 80)
          context.addIssue({ code: 'custom', message: '单道菜的食用油用量超过80mL。' });
        if (key === 'salt' && item.grams !== undefined && item.grams > 15)
          context.addIssue({ code: 'custom', message: '单道菜的食盐用量超过15g。' });
      }
    });
  const schema = z
    .object({
      meals: z
        .array(
          z.object({
            day: z.number().int().min(1).max(preferences.days),
            meal: z.enum(['早餐', '午餐', '晚餐', '加餐']),
            dishes: z.array(dish).min(1).max(5),
          }),
        )
        .max(56),
    })
    .superRefine((result, context) => {
      const slots = new Set(result.meals.map((item) => `${item.day}-${item.meal}`));
      if (
        result.meals.length !== preferences.days * preferences.mealsPerDay ||
        slots.size !== result.meals.length
      )
        context.addIssue({ code: 'custom', message: '生成的餐次数量或日期重复。' });
      const dishTitles = result.meals.flatMap((item) =>
        item.dishes.filter((dish) => dish.kind !== 'staple').map((dish) => dish.title),
      );
      if (new Set(dishTitles).size < Math.max(preferences.days, Math.ceil(preferences.days * preferences.mealsPerDay * 0.5)))
        context.addIssue({ code: 'custom', message: '菜谱重复过多。' });
      const titleCounts = dishTitles.reduce<Record<string, number>>((counts, title) => {
        counts[title] = (counts[title] || 0) + 1;
        return counts;
      }, {});
      if (Object.values(titleCounts).some((count) => count > Math.max(2, Math.ceil(preferences.days * preferences.mealsPerDay * 0.4))))
        context.addIssue({ code: 'custom', message: '同一道非主食菜重复过多。' });
      for (const item of result.meals) {
        const kinds = new Set(item.dishes.map((entry) => entry.kind));
        if (item.meal === '早餐' && (item.dishes.length < 2 || !kinds.has('staple') || !kinds.has('protein')))
          context.addIssue({ code: 'custom', message: `第${item.day}天早餐需搭配主食和蛋白质。` });
        if (['午餐', '晚餐'].includes(item.meal) && (
          item.dishes.length < 3 || !kinds.has('staple') || !kinds.has('protein') || !kinds.has('vegetable')
        ))
          context.addIssue({ code: 'custom', message: `第${item.day}天${item.meal}需包含主食、蛋白质和蔬菜。` });
      }
      for (let day = 1; day <= preferences.days; day++)
        for (const meal of mealNames)
          if (!slots.has(`${day}-${meal}`))
            context.addIssue({ code: 'custom', message: `第${day}天缺少${meal}。` });
    });
  const system = `你先规划正常饭菜，采购商品稍后由程序按食材别名、分类和包装规格匹配。不要查看或猜测SKU、售价和包装数。生成恰好 ${preferences.days} 天、每天 ${preferences.mealsPerDay} 餐，餐次为：${mealNames.join('、')}。早餐至少有2道，包含主食和蛋白质；午餐和晚餐各至少3道，必须分别包含主食、蛋白质、蔬菜。每道菜独立给出标题、做法、食材名称与每道菜2人份的实际用量。用 grams、milliliters 或 pieces 表示需求，绝不写包装数、瓶数或价格。可以使用目录外常见食材；程序会标出本店没有或单位不能换算的项目。不同日期更换菜式，同一道非主食菜最多出现 ${Math.max(2, Math.ceil(preferences.days * preferences.mealsPerDay * 0.4))} 次。基础调味油、盐、糖、生抽、老抽、醋、料酒若在做法中使用，也需在用料中写出合理克数或毫升数；葱姜蒜、辣椒、香料和特色酱料都按实际食材处理，不能默认家中已有。避开忌口：${preferences.excluded.map((key) => ingredientNames[key] || key).join('、') || '无'}。偏好：${preferences.wants.join('、') || '家常多样'}。用户补充：${message}。不要提供营养精确值、卡路里、医疗建议或减重承诺。仅返回 JSON：{"meals":[{"day":1,"meal":"早餐","dishes":[{"title":"燕麦牛奶和水煮蛋","kind":"staple","minutes":15,"steps":["..."],"ingredients":[{"ingredient":"燕麦片","grams":80}]},{"title":"水煮蛋","kind":"protein","minutes":10,"steps":["..."],"ingredients":[{"ingredient":"鸡蛋","pieces":2}]}]}]}。kind 只能是 staple、protein、vegetable、mixed。`;
  const user = `人数 ${preferences.people} 人；${preferences.days} 天；每天 ${preferences.mealsPerDay} 餐；预算 ${preferences.budget ?? '未设置'}；偏好 ${preferences.wants.join('、') || '家常多样'}；忌口 ${preferences.excluded.map((key) => ingredientNames[key] || key).join('、') || '无'}；明确自备食材 ${preferences.owned.map((key) => ingredientNames[key] || key).join('、') || '无'}；基础常备调味 ${preferences.homePantry.map((key) => ingredientNames[key] || key).join('、') || '无'}。`;
  let parsed: z.infer<typeof schema> | undefined;
  let feedback = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await completion(
      [
        { role: 'system', content: system },
        { role: 'user', content: `${user}${feedback}` },
      ],
      false,
      Math.min(18000, Math.max(6000, preferences.days * preferences.mealsPerDay * 700)),
      0.65,
    );
    const result = schema.safeParse(raw);
    if (result.success) {
      parsed = result.data;
      break;
    }
    feedback = ` 上次结果存在这些问题，请按要求重写整个JSON：${result.error.issues.slice(0, 8).map((issue) => issue.message).join('；')}`;
  }
  if (!parsed) throw new Error('周期菜谱完整性、搭配或份量检查未通过。');
  const sorted = parsed.meals.sort(
    (a, b) => a.day - b.day || mealNames.indexOf(a.meal) - mealNames.indexOf(b.meal),
  );
  for (const meal of sorted)
    for (const dish of meal.dishes)
      for (const item of dish.ingredients) {
        const key = ingredientKey(item.ingredient) || '';
        if (preferences.excluded.some((excluded) => key === excluded || ingredientKeys(item.ingredient).includes(excluded)))
          throw new Error('菜谱包含已排除食材。');
      }
  return sorted.map((meal) => ({
    ...meal,
    id: `generated-${meal.day}-${meal.meal}`,
    dishes: meal.dishes.map((dish, index) => ({ ...dish, id: `generated-${meal.day}-${meal.meal}-${index + 1}` })),
  }));
}

export async function shoppingAgent(
  message: string,
  products: Product[],
  context: ShoppingContext,
  previous?: QueryFilters,
  storeCategories: StoreCategory[] = [],
): Promise<GuideResponse> {
  const base = {
    products: [] as Product[],
    filters: previous || { categories: [] },
    engine: 'rules' as const,
  };
  const reply = (text: string): GuideResponse => ({ ...base, text });
  if (/^(?:请)?(?:撤销|撤回|恢复上一步)/.test(message.trim()))
    return { ...reply('正在撤销上一次清单操作。'), action: { type: 'undo' } };
  if (/^(?:带我)?去下一站|^(?:下一个分区|下一站)/.test(message.trim()))
    return { ...reply('继续前往下一站。'), action: { type: 'next' } };
  if (/不要.*加入|别.*加入|不加(?:入)?清单/.test(message))
    return reply('先保留方案，购物清单不作更改。');

  const named = products.filter((product) =>
    [product.name, ...product.aliases].some(
      (alias) => alias.length >= 2 && message.includes(alias),
    ),
  );
  const add = /加入(?:购物)?清单|放[进入](?:购物)?清单|加到(?:购物)?清单|帮我加|清单.*加/.test(
    message,
  );
  const remove = /移除|删掉|删除|从清单.*去掉/.test(message);
  const confirm = /确认(?:采购)?清单|确认.*加入|按这个买|全部加入|就按这个|加入这份方案/.test(
    message,
  );
  if ((add || remove) && named.length && !confirm) {
    const deduplicated = [...new Map(named.map((p) => [p.id, p])).values()];
    const normalized = normalizeChineseNumbers(message);
    const weight = normalized.match(/(\d+(?:\.\d+)?)\s*(公斤|千克|kg|斤|克|g)/i);
    const count = normalized.match(/(\d+)\s*(?:份|盒|袋|包|瓶)/);
    const grams = weight
      ? +weight[1] * (/公斤|千克|kg/i.test(weight[2]) ? 1000 : weight[2] === '斤' ? 500 : 1)
      : undefined;
    if (grams !== undefined && deduplicated.some((product) => quantityForMeasure(product, grams, 'g') === null))
      return reply('这款商品的包装规格不能按重量可靠换算，请说明要几份、几盒或几袋。');
    const items = deduplicated.map((product) => ({
      productId: product.id,
      quantity: grams !== undefined
        ? quantityForMeasure(product, grams, 'g')!
        : count
          ? +count[1]
          : 1,
    }));
    const action = remove
      ? { type: 'remove' as const, productIds: deduplicated.map((p) => p.id) }
      : { type: 'add' as const, items };
    try {
      const result = mutateShoppingList(context.cart, products, action);
      return {
        ...reply(result.text),
        action,
        trace: ['匹配本店商品', '核对购买数量和库存', '更改清单，可撤销'],
      };
    } catch (error) {
      return reply((error as Error).message);
    }
  }
  if (/带我去|导航|规划.*路线|开始采购|去(?:蔬菜|水果|水产|肉禽|粮油|烘焙|乳品)区/.test(message)) {
    const category =
      named[0]?.category ||
      storeCategories.find((item) => item.active && message.includes(item.name))?.id ||
      zones.find((zone) => message.includes(zone.name))?.id;
    return {
      ...reply(
        category
          ? `为你规划前往${storeCategories.find((item) => item.id === category)?.name || categoryLabels[category] || category}的路线。`
          : '按待购清单规划采购路线。',
      ),
      action: { type: 'navigate', category, productId: named[0]?.id },
    };
  }
  const mealTrigger =
    /\d\s*(?:个)?人|[一二两三四五六七八]个人|[一二两三四五六七八]人|一周|一星期|\d+\s*天|减脂餐|一顿|晚饭|晚餐|午餐|菜谱|做.*菜|做.*鱼|搭配.*餐|清蒸鲈鱼|番茄炒蛋|西红柿炒鸡蛋|鸡蛋三明治/.test(
      message,
    );
  const followup =
    context.meal &&
    /便宜|省钱|预算|家里|已有|也有|都有|不吃|不要|过敏|主食|买米|也要买|改成|换成|人份|个人|餐|天|(?:有|没)(?:食用油|油|食盐|盐|糖|生抽|老抽|醋|料酒|葱|姜|蒜|辣椒|香料)/.test(
      message,
    );
  if (!confirm && !mealTrigger && !followup)
    return guide(message, products, previous, storeCategories);
  if (confirm && !context.meal)
    return reply('还没有可确认的采购方案。告诉我人数、预算和想吃什么，我先给你搭配。');
  const priorPreferences = context.meal || (context.homePantry
    ? { ...createMealPreferences(), homePantry: [...new Set(context.homePantry.filter((key) => defaultHomePantry.includes(key)))] }
    : undefined);
  let preferences = parseMealPreferences(message, priorPreferences);
  if (preferences.generatedMeals?.length !== preferences.days * preferences.mealsPerDay)
    preferences.generatedMeals = undefined;
  const valid = mealPreferencesSchema.safeParse(preferences);
  if (!valid.success)
    return reply('目前支持 1–8 人、0–10000 元预算的采购方案，请调整人数或预算后重试。');
  if (preferences.generatedMeals) {
    const mealNames =
      preferences.mealsPerDay === 1
        ? ['晚餐']
        : preferences.mealsPerDay === 2
          ? ['午餐', '晚餐']
          : preferences.mealsPerDay === 3
            ? ['早餐', '午餐', '晚餐']
            : ['早餐', '午餐', '晚餐', '加餐'];
    const schedule = new Set(preferences.generatedMeals.map((meal) => `${meal.day}-${meal.meal}`));
    if (
      preferences.generatedMeals.length !== preferences.days * preferences.mealsPerDay ||
      schedule.size !== preferences.generatedMeals.length ||
      Array.from({ length: preferences.days }, (_, i) => i + 1).some((day) =>
        mealNames.some((meal) => !schedule.has(`${day}-${meal}`)),
      )
    )
      return reply('周期菜谱数据不完整，请重新生成后再确认。');
    for (const meal of preferences.generatedMeals)
      for (const dish of meal.dishes)
        for (const ingredient of dish.ingredients)
          if (
            preferences.excluded.some(
              (key) =>
                key === (ingredient.ingredient ? ingredientKey(ingredient.ingredient) : ingredient.productId) ||
                (ingredient.ingredient && ingredientKeys(ingredient.ingredient).includes(key)),
            )
          )
            return reply('周期菜谱包含已排除食材，请重新生成后再确认。');
  }
  let engine: 'model' | 'rules' = 'rules';
  let fallback: string | undefined;
  const requestsNewPlan = mealTrigger || /便宜|省钱|预算|换|不吃|过敏|排除|已有|家里/.test(message);
  const weeklyPreferencesChanged =
    !context.meal ||
    !preferences.generatedMeals?.length ||
    context.meal.days !== preferences.days ||
    context.meal.mealsPerDay !== preferences.mealsPerDay ||
    context.meal.people !== preferences.people ||
    context.meal.budget !== preferences.budget ||
    context.meal.cheaper !== preferences.cheaper ||
    context.meal.includeRice !== preferences.includeRice ||
    JSON.stringify(context.meal.excluded) !== JSON.stringify(preferences.excluded) ||
    JSON.stringify(context.meal.wants) !== JSON.stringify(preferences.wants) ||
    JSON.stringify(context.meal.dishIds) !== JSON.stringify(preferences.dishIds);
  const mealPlanChanged =
    weeklyPreferencesChanged || context.meal?.cheaper !== preferences.cheaper;
  const needsWeeklyGeneration = preferences.days > 1 && requestsNewPlan && mealPlanChanged;
  if (!aiConfigured() && needsWeeklyGeneration)
    fallback = '未配置生成模型，以下仅展示首日示例，不是完整周计划。';
  if (mealTrigger && !context.meal && aiConfigured()) {
    try {
      const schema = z.object({
        people: z.number().int().min(1).max(8).nullable(),
        budget: z.number().nonnegative().max(10000).nullable(),
        wants: z
          .array(z.string().max(30))
          .max(3)
          .transform((values) =>
            values.map((value) => modelWants[value]).filter((value): value is MealWant => !!value),
          ),
        dishIds: z.array(z.string()).max(3),
      });
      const parsed = schema.parse(
        await completion([
          {
            role: 'system',
            content: `你是采购需求解析器，只提取用户明确表达的人数、整单预算、食材偏好和指定菜谱。返回 JSON {"people":null,"budget":null,"wants":[],"dishIds":[]}。wants 只能为 ${wants.join(',')}。dishIds 仅在用户点名菜谱时填写，通用“鱼和蔬菜”不得锁定某一道。菜谱：${recipes.map((r) => `${r.id}=${r.title}`).join('；')}。不生成价格、不执行清单操作。`,
          },
          { role: 'user', content: message },
        ]),
      );
      preferences = {
        ...preferences,
        people: /\d+\s*(?:个)?人/.test(normalizeChineseNumbers(message))
          ? preferences.people
          : (parsed.people ?? preferences.people),
        budget: preferences.budget,
        wants: preferences.wants.length ? preferences.wants : parsed.wants,
        dishIds: preferences.dishIds.length
          ? preferences.dishIds
          : parsed.dishIds.filter((id) => recipes.some((r) => r.id === id)),
      };
      // Ownership, exclusions and prices are never inferred by the model.
      engine = 'model';
    } catch (error) {
      fallback =
        preferences.days > 1
          ? '模型暂时不可用；以下仅为首日示例，不是完整周计划。'
          : '模型暂时不可用，已按课程内置菜谱与本店价格生成方案。';
      console.warn(
        'Meal request parsing failed:',
        error instanceof Error ? error.message : 'UnknownError',
      );
    }
  }
  if (needsWeeklyGeneration && aiConfigured() && !fallback) {
    try {
      preferences.generatedMeals = await generateWeeklyMeals(
        message,
        preferences,
      );
      engine = 'model';
    } catch (error) {
      preferences.generatedMeals = undefined;
      fallback = '模型菜谱生成失败；以下仅为首日示例，不是完整周计划。';
      engine = 'rules';
      const detail = error instanceof z.ZodError
        ? error.issues.slice(0, 8).map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('；')
        : error instanceof Error ? error.message : 'UnknownError';
      console.warn('Weekly meal generation failed:', detail);
    }
  }
  const previousPlan =
    context.meal && context.recipeIds?.length
      ? buildMealPlan(context.meal, products, context.cart, context.recipeIds, storeCategories)
      : undefined;
  const preserveRecipes =
    context.recipeIds?.length && !/便宜|换|改.*菜|不吃|过敏/.test(message) && !mealTrigger;
  const planningPreferences =
    fallback && preferences.days > 1 ? { ...preferences, days: 1 } : preferences;
  const plan = buildMealPlan(
    planningPreferences,
    products,
    context.cart,
    preserveRecipes ? context.recipeIds : undefined,
    storeCategories,
  );
  const result: GuideResponse = {
    ...base,
    engine,
    fallback,
    text: `${fallback ? `${fallback} ` : ''}${describeMealPlan(plan, previousPlan?.total)}`,
    mealPlan: plan,
    products: plan.items.map((item) => item.product),
    trace: [
      '确认人数、预算和家中已有食材',
      '核对本店库存与计价单位',
      '合并已有清单并计算总价',
      plan.canApply ? '等待确认后加入清单' : '核对待确认条件',
    ],
  };
  if (confirm && plan.canApply)
    result.action = {
      type: 'apply_plan',
      items: plan.items
        .filter((item) => item.quantity > 0)
        .map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      budget: preferences.budget,
    };
  return result;
}
