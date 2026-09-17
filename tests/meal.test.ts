import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSeedProducts } from '../shared/catalog';
import { buildMealPlan } from '../shared/meal-planner';
import { parseMealPreferences, shoppingAgent } from '../server/shopping-agent';
import { cartTotal, mutateShoppingList, quantityForGrams } from '../shared/shopping';

const products = makeSeedProducts();
const request = '两个人吃，预算50元，想吃鱼和绿叶菜，家里有葱姜';
test('课程场景解析为两人整单50元，已备葱姜', () => {
  const prefs = parseMealPreferences(request);
  assert.equal(prefs.people, 2);
  assert.equal(prefs.budget, 50);
  assert.deepEqual(prefs.wants, ['fish', 'greens']);
  assert.ok(prefs.owned.includes('scallion') && prefs.owned.includes('ginger'));
  const plan = buildMealPlan(prefs, products, []);
  assert.equal(plan.total, 39);
  assert.equal(plan.items.find((item) => item.product.id === 'seabass')?.quantity, 1.5);
  assert.equal(plan.canApply, false);
  assert.deepEqual(plan.pendingPantry.sort(), ['oil', 'salt']);
});
test('确认家中调味后，菜谱清单的金额和购买量一致', () => {
  const prefs = parseMealPreferences('食用油、盐也有，确认清单', parseMealPreferences(request));
  const plan = buildMealPlan(prefs, products, []);
  assert.equal(plan.canApply, true);
  const action = {
    type: 'apply_plan' as const,
    items: plan.items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
    budget: 50,
  };
  const result = mutateShoppingList([], products, action);
  assert.equal(cartTotal(result.list, products), plan.total);
  assert.equal(mutateShoppingList(result.list, products, action).changed, false);
});
test('省钱替换不缩减人数和鱼的重量', () => {
  const previous = parseMealPreferences(request);
  const cheap = buildMealPlan(
    parseMealPreferences('换便宜一点，保持人数和份量', previous),
    products,
    [],
  );
  assert.equal(cheap.preferences.people, 2);
  assert.equal(cheap.total, 22.7);
  assert.equal(cheap.items.find((item) => item.product.id === 'carp')?.amount, '预计 750g');
});
test('整单预算包含已有清单；无法满足时不谎报预算内', () => {
  const prefs = parseMealPreferences(request);
  const plan = buildMealPlan(prefs, products, [{ productId: 'oil', quantity: 1, checked: false }]);
  assert.ok(plan.total > 50);
  assert.equal(plan.canApply, false);
  assert.ok(plan.remaining! < 0);
  assert.ok(buildMealPlan(parseMealPreferences('预算10元', prefs), products, []).total > 10);
  assert.equal(parseMealPreferences('预算改为10元', prefs).budget, 10);
});
test('家中无油盐时不能漏掉成本，缺失商品显示未满足', () => {
  const prefs = parseMealPreferences('家里没有油盐', parseMealPreferences(request));
  const plan = buildMealPlan(prefs, products, []);
  assert.ok(plan.items.some((item) => item.product.id === 'oil'));
  assert.ok(plan.missing.some((item) => item.includes('盐')));
  assert.equal(plan.canApply, false);
});
test('已买食材只补差额；称重与整包计价分别处理', () => {
  const plan = buildMealPlan(parseMealPreferences(request), products, [
    { productId: 'seabass', quantity: 1, checked: true },
  ]);
  assert.equal(plan.items.find((item) => item.product.id === 'seabass')?.quantity, 0.5);
  assert.equal(plan.total, 16.2);
  const changed = mutateShoppingList(
    [{ productId: 'seabass', quantity: 1, checked: true }],
    products,
    {
      type: 'apply_plan',
      budget: 50,
      items: plan.items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
    },
  );
  const again = buildMealPlan(plan.preferences, products, changed.list);
  assert.equal(again.total, plan.total);
  assert.equal(again.items.find((item) => item.product.id === 'seabass')?.quantity, 0.5);
  assert.equal(
    quantityForGrams(
      products.find((p) => p.id === 'salmon')!,
      250,
    ),
    2,
  );
  assert.equal(
    quantityForGrams(
      products.find((p) => p.id === 'spinach')!,
      250,
    ),
    0.5,
  );
  const allBought = buildMealPlan(parseMealPreferences(request), products, [
    { productId: 'seabass', quantity: 2, checked: true },
  ]);
  assert.equal(allBought.total, 4.8);
});
test('缺货鱼会选择其他可用菜谱；排除鱼不会暗中加入', () => {
  const plan = buildMealPlan(
    parseMealPreferences(request),
    products.map((p) => (p.id === 'seabass' ? { ...p, stock: 0 } : p)),
    [],
  );
  assert.ok(plan.items.some((item) => item.product.id === 'carp'));
  const excluded = buildMealPlan(
    parseMealPreferences('不吃鱼', parseMealPreferences(request)),
    products,
    [],
  );
  assert.ok(!excluded.items.some((item) => item.product.category === 'seafood'));
});
test('清单操作库存不足是原子的，超预算方案不能合并', () => {
  assert.throws(
    () =>
      mutateShoppingList([], products, {
        type: 'add',
        items: [{ productId: 'spinach', quantity: 99 }],
      }),
    /库存/,
  );
  assert.throws(
    () =>
      mutateShoppingList([], products, {
        type: 'apply_plan',
        items: [{ productId: 'spinach', quantity: 2 }],
        budget: 5,
      }),
    /预算/,
  );
});
test('对话动作能加入称重商品、移除、撤销和推进导航', async () => {
  assert.deepEqual((await shoppingAgent('把菠菜750克加入清单', products, { cart: [] })).action, {
    type: 'add',
    items: [{ productId: 'spinach', quantity: 1.5 }],
  });
  assert.equal((await shoppingAgent('撤销', products, { cart: [] })).action?.type, 'undo');
  assert.equal((await shoppingAgent('去下一站', products, { cart: [] })).action?.type, 'next');
  assert.equal(
    (await shoppingAgent('带我去水产区', products, { cart: [] })).action?.type,
    'navigate',
  );
  assert.equal((await shoppingAgent('不要加入清单', products, { cart: [] })).action, undefined);
  const prefs = parseMealPreferences(request);
  const confirmation = await shoppingAgent('家里有油盐，确认加入清单', products, {
    cart: [],
    meal: prefs,
    recipeIds: ['steamed-bass', 'spinach-greens'],
  });
  assert.equal(confirmation.action?.type, 'apply_plan');
  assert.ok(confirmation.mealPlan?.canApply);
});
