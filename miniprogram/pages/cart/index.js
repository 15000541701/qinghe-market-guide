const domain = require('../../lib/domain');
const view = require('../../utils/view');
Page({
  data: {
    items: [],
    hasItems: false,
    total: '0.00',
    count: 0,
    busy: false,
    canUndo: false,
    canRoute: false,
    budget: '',
    remaining: '',
    over: false,
  },
  onLoad() {
    this.off = getApp().subscribe(() => this.sync());
    this.sync();
  },
  onShow() {
    this.sync();
  },
  onUnload() {
    if (this.off) this.off();
  },
  onPullDownRefresh() {
    getApp()
      .refresh()
      .catch(view.alert)
      .finally(() => wx.stopPullDownRefresh());
  },
  sync() {
    const state = getApp().globalData;
    const items = state.cart.flatMap((i) => {
      const p = state.products.find((p) => p.id === i.productId);
      return p
        ? [
            {
              ...i,
              product: view.product(p),
              amount: domain.amountLabel(p, i.quantity),
              total: view.money(domain.lineCents(p, i.quantity) / 100),
              previous: i.purchasedQuantity ? domain.amountLabel(p, i.purchasedQuantity) : '',
              canMinus: i.quantity > domain.quantityStep(p),
              canPlus: i.quantity + domain.quantityStep(p) <= Math.min(99, p.stock),
            },
          ]
        : [];
    });
    const total = domain.cartTotal(state.cart, state.products);
    const plan = getApp().plan();
    const budget = plan && plan.preferences.budget;
    this.setData({
      items,
      hasItems: items.length > 0,
      count: items.length,
      total: view.money(total),
      canUndo: !!state.undo.length,
      canRoute: items.some((i) => !i.checked && i.product.stock > 0),
      busy: state.busy || !!getApp().mutating,
      budget: budget == null ? '' : view.money(budget),
      remaining: budget == null ? '' : view.money(Math.abs(budget - total)),
      over: budget != null && total > budget,
    });
  },
  changeQuantity(e) {
    const state = getApp().globalData;
    const id = e.currentTarget.dataset.id;
    const p = state.products.find((p) => p.id === id);
    if (!p || state.busy) return;
    const delta = Number(e.currentTarget.dataset.delta);
    const current = state.cart.find((i) => i.productId === id);
    const quantity = domain.roundQuantity(current.quantity + delta * domain.quantityStep(p));
    if (quantity <= 0 || quantity > Math.min(99, p.stock)) return;
    getApp().replaceCart(state.cart.map((i) => (i.productId === id ? { ...i, quantity } : i)));
  },
  check(e) {
    if (this.data.busy) return;
    const id = e.currentTarget.dataset.id;
    getApp().replaceCart(
      getApp().globalData.cart.map((i) =>
        i.productId === id ? { ...i, checked: e.detail.value.length > 0 } : i,
      ),
    );
  },
  async remove(e) {
    try {
      await getApp().execute({ type: 'remove', productIds: [e.currentTarget.dataset.id] });
    } catch (error) {
      view.alert(error);
    }
  },
  clearPurchased() {
    getApp().replaceCart(getApp().globalData.cart.filter((i) => !i.checked));
  },
  async undo() {
    view.toast(await getApp().execute({ type: 'undo' }));
  },
  async route() {
    try {
      await getApp().execute({ type: 'navigate' });
      wx.switchTab({ url: '/pages/map/index' });
    } catch (error) {
      view.alert(error);
    }
  },
  async go(e) {
    const p = getApp().globalData.products.find((p) => p.id === e.currentTarget.dataset.id);
    if (!p) return;
    await getApp().execute({ type: 'navigate', category: p.category });
    wx.switchTab({ url: '/pages/map/index' });
  },
  browse() {
    wx.switchTab({ url: '/pages/products/index' });
  },
});
