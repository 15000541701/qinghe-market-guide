const api = require('../../utils/api');
const view = require('../../utils/view');
Page({
  data: { base: '', busy: false, connected: false, error: '', ai: false },
  onLoad() {
    this.setData({ base: api.base() });
    this.off = getApp().subscribe(() => this.sync());
    this.sync();
  },
  onUnload() {
    if (this.off) this.off();
  },
  sync() {
    const state = getApp().globalData;
    this.setData({ connected: state.connected, error: state.error, ai: state.ai });
  },
  input(e) {
    this.setData({ base: e.detail.value });
  },
  async connect() {
    if (this.data.busy || getApp().globalData.busy) return;
    this.setData({ busy: true });
    try {
      api.setBase(this.data.base);
      await getApp().refresh();
      view.toast('门店连接成功');
    } catch (error) {
      view.alert(error);
    } finally {
      this.setData({ busy: false });
    }
  },
  store() {
    wx.navigateTo({ url: '/pages/store/index' });
  },
  guide() {
    wx.switchTab({ url: '/pages/guide/index' });
  },
  clear() {
    wx.showModal({
      title: '清空购物清单',
      content: '仅清空当前微信设备上的清单，不修改门店商品与库存。',
      success: (result) => {
        if (result.confirm) {
          getApp().replaceCart([]);
          view.toast('清单已清空，可撤销');
        }
      },
    });
  },
});
