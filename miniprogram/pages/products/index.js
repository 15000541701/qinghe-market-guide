const view = require('../../utils/view');
const domain = require('../../lib/domain');
Page({
  data: {
    items: [],
    categories: [{ id: 'all', name: '全部' }].concat(domain.zones),
    category: 'all',
    query: '',
    sort: 0,
    sorts: ['默认排序', '价格从低到高', '价格从高到低'],
    error: '',
    loading: false,
    busy: false,
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
    const items = state.products
      .filter(
        (p) =>
          p.stock > 0 &&
          (this.data.category === 'all' || p.category === this.data.category) &&
          [p.name]
            .concat(p.aliases || [])
            .concat(p.tags || [])
            .join(' ')
            .includes(this.data.query),
      )
      .map((p) => ({ ...view.product(p), added: state.cart.some((i) => i.productId === p.id) }));
    if (this.data.sort)
      items.sort((a, b) => (this.data.sort === 1 ? a.price - b.price : b.price - a.price));
    this.setData({ items, error: state.error, loading: state.loading });
  },
  search(e) {
    this.setData({ query: e.detail.value });
    this.sync();
  },
  category(e) {
    this.setData({ category: e.currentTarget.dataset.id });
    this.sync();
  },
  sort(e) {
    this.setData({ sort: Number(e.detail.value) });
    this.sync();
  },
  async add(e) {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try {
      await getApp().execute({
        type: 'add',
        items: [{ productId: e.currentTarget.dataset.id, quantity: 1 }],
      });
      view.toast('已加入购物清单');
    } catch (error) {
      view.alert(error);
    } finally {
      this.setData({ busy: false });
    }
  },
  async go(e) {
    const item = getApp().globalData.products.find((p) => p.id === e.currentTarget.dataset.id);
    if (!item) return;
    await getApp().execute({ type: 'navigate', category: item.category });
    wx.switchTab({ url: '/pages/map/index' });
  },
  settings() {
    wx.navigateTo({ url: '/pages/settings/index' });
  },
});
