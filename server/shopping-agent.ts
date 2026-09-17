import { z } from 'zod';
import { completion, aiConfigured, guide } from './ai';
import { buildMealPlan, createMealPreferences, describeMealPlan } from '../shared/meal-planner';
import { ingredientKeys, ingredientNames, recipes } from '../shared/recipes';
import { normalizeChineseNumbers } from '../shared/guide';
import { amountLabel, isWeighed, mutateShoppingList, quantityForGrams } from '../shared/shopping';
import { zones } from '../shared/catalog';
import type {
  GuideResponse,
  MealPreferences,
  MealWant,
  Product,
  QueryFilters,
  ShoppingContext,
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
  recipeIds: z.array(z.string().max(50)).max(5).optional(),
});

export function parseMealPreferences(message: string, previous?: MealPreferences): MealPreferences {
  const preferences = {
    ...(previous || createMealPreferences()),
    owned: [...(previous?.owned || [])],
    excluded: [...(previous?.excluded || [])],
    buyPantry: [...(previous?.buyPantry || [])],
    wants: [...(previous?.wants || [])],
    dishIds: [...(previous?.dishIds || [])],
  };
  const normalized = normalizeChineseNumbers(message);
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
  const owned = [...ownedClauses, ...reverseOwned].flatMap(ingredientKeys);
  if (/家里只有/.test(positive)) {
    preferences.owned = ingredientKeys(positive.split('家里只有')[1].split(/[，。；]/)[0]);
  } else preferences.owned = [...new Set([...preferences.owned, ...owned])];
  const notOwned = (message.match(/(?:家里没有|没有|缺少|缺)([^，。；！？]*)/g) || []).flatMap(
    ingredientKeys,
  );
  const buying = [
    ...(message.match(/([^，。；！？]*?)(?:也要买|需要买|要购买)/g) || []),
    ...(message.match(/(?:也要买|需要买|要购买)([^，。；！？]*)/g) || []),
  ].flatMap(ingredientKeys);
  preferences.buyPantry = [...new Set([...preferences.buyPantry, ...notOwned, ...buying])].filter(
    (key) => !owned.includes(key),
  );
  preferences.owned = preferences.owned.filter(
    (key) => !notOwned.includes(key) && !buying.includes(key),
  );
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

export async function shoppingAgent(
  message: string,
  products: Product[],
  context: ShoppingContext,
  previous?: QueryFilters,
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
    const items = deduplicated.map((product) => ({
      productId: product.id,
      quantity: weight
        ? quantityForGrams(
            product,
            +weight[1] * (/公斤|千克|kg/i.test(weight[2]) ? 1000 : weight[2] === '斤' ? 500 : 1),
          )
        : count
          ? +count[1]
          : 1,
    }));
    if (weight && deduplicated.some((product) => !isWeighed(product)))
      return reply('这款商品按整份售卖，请说明要几份、几盒或几袋。');
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
    const category = named[0]?.category || zones.find((zone) => message.includes(zone.name))?.id;
    return {
      ...reply(
        category
          ? `为你规划前往${zones.find((zone) => zone.id === category)!.name}的路线。`
          : '按待购清单规划采购路线。',
      ),
      action: { type: 'navigate', category },
    };
  }
  const mealTrigger =
    /\d\s*(?:个)?人|[一二两三四五六七八]个人|[一二两三四五六七八]人|一顿|晚饭|晚餐|午餐|菜谱|做.*菜|做.*鱼|搭配.*餐|清蒸鲈鱼|番茄炒蛋|西红柿炒鸡蛋|鸡蛋三明治/.test(
      message,
    );
  const followup =
    context.meal &&
    /便宜|省钱|预算|家里|已有|也有|都有|不吃|不要|过敏|主食|买米|也要买|改成|换成|人份|个人/.test(
      message,
    );
  if (!confirm && !mealTrigger && !followup) return guide(message, products, previous);
  if (confirm && !context.meal)
    return reply('还没有可确认的采购方案。告诉我人数、预算和想吃什么，我先给你搭配。');
  let preferences = parseMealPreferences(message, context.meal);
  const valid = mealPreferencesSchema.safeParse(preferences);
  if (!valid.success)
    return reply('目前支持 1–8 人、0–10000 元预算的采购方案，请调整人数或预算后重试。');
  let engine: 'model' | 'rules' = 'rules';
  let fallback: string | undefined;
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
        people: parsed.people ?? preferences.people,
        budget: parsed.budget ?? preferences.budget,
        wants: preferences.wants.length ? preferences.wants : parsed.wants,
        dishIds: preferences.dishIds.length
          ? preferences.dishIds
          : parsed.dishIds.filter((id) => recipes.some((r) => r.id === id)),
      };
      // Ownership, exclusions and prices are never inferred by the model.
      engine = 'model';
    } catch {
      fallback = '模型暂时不可用，已按课程内置菜谱与本店价格生成方案。';
    }
  }
  const previousPlan =
    context.meal && context.recipeIds?.length
      ? buildMealPlan(context.meal, products, context.cart, context.recipeIds)
      : undefined;
  const preserveRecipes =
    context.recipeIds?.length && !/便宜|换|改.*菜|不吃|过敏/.test(message) && !mealTrigger;
  const plan = buildMealPlan(
    preferences,
    products,
    context.cart,
    preserveRecipes ? context.recipeIds : undefined,
  );
  const result: GuideResponse = {
    ...base,
    engine,
    fallback,
    text: describeMealPlan(plan, previousPlan?.total),
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
      items: plan.items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      budget: preferences.budget,
    };
  return result;
}
