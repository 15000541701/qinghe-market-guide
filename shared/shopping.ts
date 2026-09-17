import type { ListItem, Product, ShoppingAction } from './types';

const legacyWeighed = new Set([
  'spinach',
  'bokchoy',
  'lettuce',
  'broccoli',
  'tomato',
  'carrot',
  'apple',
  'banana',
  'orange',
  'seabass',
  'carp',
  'shrimp',
  'chicken',
  'pork',
]);
export function unitGrams(unit: string): number | null {
  const match = unit
    .trim()
    .toLowerCase()
    .match(/^(\d+(?:\.\d+)?)\s*(kg|g|克|千克|公斤|斤)$/);
  if (!match || +match[1] <= 0) return null;
  return (
    +match[1] * (['kg', '千克', '公斤'].includes(match[2]) ? 1000 : match[2] === '斤' ? 500 : 1)
  );
}
export function isWeighed(product: Product) {
  return (
    !!unitGrams(product.unit) &&
    (product.saleMode ? product.saleMode === 'weight' : legacyWeighed.has(product.id))
  );
}
export function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}
export function quantityStep(product: Product) {
  return isWeighed(product) ? roundQuantity(100 / unitGrams(product.unit)!) : 1;
}
export function quantityForGrams(product: Product, grams: number) {
  const unit = unitGrams(product.unit);
  if (!unit) return 1;
  return isWeighed(product)
    ? roundQuantity((Math.ceil(grams / 50) * 50) / unit)
    : Math.ceil(grams / unit);
}
export function amountLabel(product: Product, quantity: number) {
  return isWeighed(product)
    ? `预计 ${Math.round(unitGrams(product.unit)! * quantity)}g`
    : `${quantity} 份 × ${product.unit}`;
}
export function lineCents(product: Product, quantity: number) {
  return Math.round(Math.round(product.price * 100) * quantity);
}
export function cartTotal(list: ListItem[], products: Product[], pendingOnly = true) {
  return (
    list.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return (
        sum + (product && (!pendingOnly || !item.checked) ? lineCents(product, item.quantity) : 0)
      );
    }, 0) / 100
  );
}
export function purchasedQuantity(item?: ListItem) {
  return item ? (item.purchasedQuantity || 0) + (item.checked ? item.quantity : 0) : 0;
}

/** Merge recipe needs into pending purchases; previously purchased quantities count as owned. */
export function mergeMealItems(
  list: ListItem[],
  needs: { productId: string; quantity: number }[],
): ListItem[] {
  const result = list.map((item) => ({ ...item }));
  for (const need of needs) {
    const index = result.findIndex((item) => item.productId === need.productId);
    if (index < 0) result.push({ ...need, checked: false });
    else if (!result[index].checked)
      result[index].quantity = Math.max(result[index].quantity, need.quantity);
    else
      result[index] = {
        ...need,
        checked: false,
        purchasedQuantity: purchasedQuantity(result[index]),
      };
  }
  return result;
}

export function mutateShoppingList(
  list: ListItem[],
  products: Product[],
  action: ShoppingAction,
): { list: ListItem[]; text: string; changed: boolean } {
  let next = list.map((item) => ({ ...item }));
  if (action.type === 'remove') {
    next = next.filter((item) => !action.productIds.includes(item.productId));
  } else if (action.type === 'add' || action.type === 'apply_plan') {
    for (const item of action.items) {
      const product = products.find((p) => p.id === item.productId);
      if (
        !product ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 99 ||
        (!isWeighed(product) && !Number.isInteger(item.quantity))
      )
        throw new Error('商品或数量已变化，请重新生成采购方案。');
    }
    if (action.type === 'apply_plan') next = mergeMealItems(next, action.items);
    else
      for (const item of action.items) {
        const existing = next.find((entry) => entry.productId === item.productId);
        if (existing) {
          if (existing.checked) existing.purchasedQuantity = purchasedQuantity(existing);
          existing.quantity = roundQuantity(
            (existing.checked ? 0 : existing.quantity) + item.quantity,
          );
          existing.checked = false;
        } else next.push({ ...item, checked: false });
      }
    for (const item of next.filter((item) => !item.checked)) {
      const product = products.find((p) => p.id === item.productId);
      if (!product || item.quantity > Math.min(99, product.stock))
        throw new Error(`${product?.name || '商品'}库存不足，清单未更改。`);
    }
    if (
      action.type === 'apply_plan' &&
      action.budget !== null &&
      cartTotal(next, products) > action.budget
    )
      throw new Error('当前价格或清单有变化，合计超过预算。请重新生成方案后确认。');
  } else return { list, text: '无需更改购物清单。', changed: false };
  const changed = JSON.stringify(next) !== JSON.stringify(list);
  const names = (
    action.type === 'remove' ? action.productIds : action.items.map((i) => i.productId)
  )
    .map((id) => products.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join('、');
  return {
    list: next,
    changed,
    text: changed
      ? `${action.type === 'remove' ? '已移除' : action.type === 'apply_plan' ? '已补齐采购清单' : '已加入'}：${names}。待购合计 ¥${cartTotal(next, products).toFixed(2)}。可以撤销。`
      : '这些食材已在清单中，未重复添加。',
  };
}
