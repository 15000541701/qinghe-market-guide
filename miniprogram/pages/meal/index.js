const domain = require('../../lib/domain');
const view = require('../../utils/view');
Page({
  data: {
    plan: null,
    busy: false,
    expanded: {},
    pantry: '',
    canConfirm: false,
    existing: '',
    added: '',
    total: '',
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
  sync() {
    const plan = getApp().plan();
    if (!plan) {
      this.setData({ plan: null });
      return;
    }
    this.setData({
      plan: {
        ...plan,
        items: plan.items.map((i) => ({
          ...i,
          id: i.product.id,
          product: view.product(i.product),
          costText: view.money(i.cost),
        })),
      },
      busy: getApp().globalData.busy,
      pantry: plan.pendingPantry.map((key) => domain.ingredientNames[key] || key).join('、'),
      total: view.money(plan.total),
      existing: view.money(plan.existingCost),
      added: view.money(plan.addedCost),
      budget: plan.preferences.budget == null ? '' : view.money(plan.preferences.budget),
      remaining: plan.remaining == null ? '' : view.money(Math.abs(plan.remaining)),
      over: plan.remaining != null && plan.remaining < 0,
      canConfirm:
        plan.recipes.length > 0 &&
        !plan.missing.length &&
        (plan.remaining == null || plan.remaining >= 0),
    });
  },
  toggle(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expanded: { ...this.data.expanded, [id]: !this.data.expanded[id] } });
  },
  async send(text) {
    if (this.data.busy) return;
    try {
      const result = await getApp().send(text);
      view.navigate(result && result.performed);
      if (result && result.performed && result.performed.type === 'apply_plan')
        view.toast('采购清单已补齐');
    } catch (error) {
      view.alert(error);
    }
  },
  cheaper() {
    return this.send('换便宜一点，保持人数和份量');
  },
  confirm() {
    return this.send(this.data.pantry ? this.data.pantry + '也有，确认清单' : '确认清单');
  },
  route() {
    return this.send('按购物清单规划采购路线');
  },
  guide() {
    wx.switchTab({ url: '/pages/guide/index' });
  },
});
