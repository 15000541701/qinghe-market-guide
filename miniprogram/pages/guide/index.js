const api = require('../../utils/api');
const view = require('../../utils/view');
// Budgets in the catalog currency: a request in 元 against the USD catalog is answered with a
// currency reminder instead of goods.
function starters(currency) {
  const unit = currency === 'USD' ? '美元' : '元';
  return [
    '两个人吃，预算50' + unit + '，想搭配西式鱼餐和沙拉',
    '推荐10' + unit + '以内的绿叶蔬菜',
    '20到40' + unit + '的鱼',
  ];
}
Page({
  data: {
    messages: [],
    input: '',
    busy: false,
    loading: false,
    ai: false,
    error: '',
    scrollTo: '',
    chatHeight: 320,
    pageHeight: 671,
    hasPlan: false,
    starters: starters('USD'),
  },
  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      pageHeight: info.windowHeight,
      chatHeight: Math.max(180, info.windowHeight - 320),
    });
    this.off = getApp().subscribe(() => this.sync());
    this.sync();
  },
  onShow() {
    this.sync();
  },
  onUnload() {
    if (this.off) this.off();
  },
  sync() {
    const state = getApp().globalData;
    this.setData({
      messages: state.messages.map((m) => ({
        ...m,
        products: (m.products || []).map(view.product),
        imageUrl: api.image(m.image || ''),
        candidates: (m.candidates || []).map((c) => ({
          ...c,
          categoryName: view.categoryName(c.category),
        })),
      })),
      busy: state.busy,
      ai: state.ai,
      loading: state.loading,
      error: state.error,
      hasPlan: !!state.meal,
      starters: starters(state.currency),
      scrollTo: 'chat-bottom',
    });
  },
  input(event) {
    this.setData({ input: event.detail.value });
  },
  async send() {
    const text = this.data.input.trim();
    if (!text || this.data.busy) return;
    this.setData({ input: '' });
    try {
      const result = await getApp().send(text);
      view.navigate(result && result.performed);
    } catch (error) {
      view.alert(error);
    }
  },
  starter(event) {
    this.setData({ input: event.currentTarget.dataset.text });
    return this.send();
  },
  async undo() {
    this.setData({ input: '撤销上一步' });
    return this.send();
  },
  openPlan() {
    wx.navigateTo({ url: '/pages/meal/index' });
  },
  settings() {
    wx.navigateTo({ url: '/pages/settings/index' });
  },
  store() {
    wx.navigateTo({ url: '/pages/store/index' });
  },
  retry() {
    getApp().refresh().catch(view.alert);
  },
  reset() {
    wx.showModal({
      title: '重新开始对话',
      content: '清除本次对话和菜谱方案，购物清单保留。',
      success: (result) => {
        if (result.confirm) getApp().clearConversation();
      },
    });
  },
  async go(event) {
    const product = getApp().globalData.products.find(
      (p) => p.id === event.currentTarget.dataset.id,
    );
    if (!product) return view.alert('商品信息已更新，请重新查询。');
    try {
      await getApp().execute({ type: 'navigate', category: product.category });
      wx.switchTab({ url: '/pages/map/index' });
    } catch (error) {
      view.alert(error);
    }
  },
  async add(event) {
    try {
      await getApp().execute({
        type: 'add',
        items: [{ productId: event.currentTarget.dataset.id, quantity: 1 }],
      });
      view.toast('已加入购物清单');
    } catch (error) {
      view.alert(error);
    }
  },
  async photo() {
    const app = getApp();
    if (app.globalData.busy) return;
    app.globalData.busy = true;
    app.notify();
    try {
      const file = await api.chooseImage();
      app.globalData.messages.push({
        id: 'photo-' + Date.now(),
        role: 'user',
        text: '帮我找图片里的商品',
        image: file,
      });
      app.notify();
      const result = await api.upload(file, app.globalData.currency);
      app.globalData.messages.push({
        id: 'vision-' + Date.now(),
        role: 'assistant',
        text: result.notice || '请确认图片里的商品。',
        candidates: result.candidates || [],
      });
    } catch (error) {
      if (error.message !== '已取消选择图片')
        app.globalData.messages.push({
          id: 'error-' + Date.now(),
          role: 'assistant',
          text: error.message,
        });
    } finally {
      app.globalData.busy = false;
      app.notify();
    }
  },
  async chooseCandidate(event) {
    const state = getApp().globalData;
    const message = state.messages.find((m) => m.id === event.currentTarget.dataset.message);
    const candidate = message && message.candidates[event.currentTarget.dataset.index];
    if (!candidate) return;
    const products = getApp()
      .saleProducts()
      .filter((p) =>
        candidate.productId ? p.id === candidate.productId : p.category === candidate.category,
      );
    state.messages.push({
      id: 'match-' + Date.now(),
      role: 'assistant',
      text: products.length
        ? '在' +
          (view.categoryName(candidate.category) || '该分类') +
          '找到以下在售商品，点击“带我去”查看路线。'
        : '当前分区没有匹配的在售商品，可以换个名称查询。',
      products: products.slice(0, 5),
    });
    getApp().notify();
  },
});
