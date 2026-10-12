import type { Product } from './types';
export function availableForSale(product: Product) {
  return (
    product.status !== 'draft' &&
    product.status !== 'archived' &&
    (product.inventoryMode === 'untracked' || product.stock > 0) &&
    product.price > 0
  );
}
// This is the existing per-SKU purchase limit, not an invented stock count.
export function purchaseLimit(product: Product) { return product.inventoryMode === 'untracked' ? 99 : Math.min(99, product.stock); }
export function inventoryLabel(product: Product) { return product.inventoryMode === 'untracked' ? '未管理库存' : product.status === 'draft' ? '待确认' : product.stock > 0 ? String(product.stock) : '已售罄'; }
