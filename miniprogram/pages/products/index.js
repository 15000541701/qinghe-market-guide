const view = require('../../utils/view');
const domain = require('../../lib/domain');
// Matches the web catalog; rendering the whole catalog at once exceeds the 1 MB setData limit.
const PAGE_SIZE = 48;
Page({
  data: {
    items: [],
    categories: [{ id: 'all', name: '全部' }],
    category: 'all',
    query: '',
    sort: 0,
    sorts: ['默认排序', '价格从低到高', '价格从高到低'],
    error: '',
    loading: false,
    busy: false,
    total: 0,
    limit: PAGE_SIZE,
    hasMore: false,
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
    const app = getApp();
    const state = app.globalData;
    const forSale = app.saleProducts();
    const counts = new Map();
    for (const p of forSale) counts.set(p.category, (counts.get(p.category) || 0) + 1);
    const ids = Array.from(counts.keys()).sort(
      (a, b) =>
        domain.categoryDisplayRank(a) - domain.categoryDisplayRank(b) ||
        view.categoryName(a).localeCompare(view.categoryName(b), 'zh'),
    );
    const categories = [{ id: 'all', name: '全部' }].concat(
      ids.map((id) => ({ id, name: view.categoryName(id) || id })),
    );
    const category = counts.has(this.data.category) ? this.data.category : 'all';
    const query = this.data.query.trim().toLowerCase();
    const matches = forSale.filter(
      (p) =>
        (category === 'all' || p.category === category) &&
        (!query ||
          [p.name, p.originalName || '']
            .concat(p.aliases || [])
            .concat(p.tags || [])
            .join(' ')
            .toLowerCase()
            .includes(query)),
    );
    if (this.data.sort)
      matches.sort((a, b) => (this.data.sort === 1 ? a.price - b.price : b.price - a.price));
    const items = matches
      .slice(0, this.data.limit)
      .map((p) => ({ ...view.product(p), added: state.cart.some((i) => i.productId === p.id) }));
    this.setData({
      items,
      categories,
      category,
      total: matches.length,
      hasMore: matches.length > items.length,
      error: state.error,
      loading: state.loading,
    });
  },
  search(e) {
    this.setData({ query: e.detail.value, limit: PAGE_SIZE });
    this.sync();
  },
  category(e) {
    this.setData({ category: e.currentTarget.dataset.id, limit: PAGE_SIZE });
    this.sync();
  },
  sort(e) {
    this.setData({ sort: Number(e.detail.value), limit: PAGE_SIZE });
    this.sync();
  },
  more() {
    this.setData({ limit: this.data.limit + PAGE_SIZE });
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
    try {
      await getApp().execute({ type: 'navigate', category: item.category });
      wx.switchTab({ url: '/pages/map/index' });
    } catch (error) {
      view.alert(error);
    }
  },
  settings() {
    wx.navigateTo({ url: '/pages/settings/index' });
  },
});
