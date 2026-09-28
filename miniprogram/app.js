require('./utils/polyfills');
const api = require('./utils/api');
const domain = require('./lib/domain');
const view = require('./utils/view');
const clone = (value) => JSON.parse(JSON.stringify(value));
const welcome = {
  id: 'welcome',
  role: 'assistant',
  text: '你好，我是小禾。说说想买什么，也可以告诉我人数、整单预算和家中已有的食材。',
};
App({
  globalData: {
    products: [],
    ai: false,
    connected: false,
    loading: false,
    error: '',
    busy: false,
    cart: [],
    messages: [welcome],
    filters: { categories: [] },
    meal: null,
    current: 'entrance',
    route: null,
    undo: [],
  },
  onLaunch() {
    this.listeners = new Set();
    try {
      const saved = wx.getStorageSync('qinghe-mini-state');
      if (saved && saved.version === 1) {
        if (Array.isArray(saved.cart))
          this.globalData.cart = saved.cart.filter(
            (i) =>
              typeof i.productId === 'string' &&
              Number.isFinite(i.quantity) &&
              i.quantity > 0 &&
              i.quantity <= 99 &&
              typeof i.checked === 'boolean' &&
              (i.purchasedQuantity === undefined ||
                (Number.isFinite(i.purchasedQuantity) &&
                  i.purchasedQuantity >= 0 &&
                  i.purchasedQuantity <= 999)),
          );
        if (Array.isArray(saved.messages) && saved.messages.length)
          this.globalData.messages = saved.messages
            .filter(
              (m) => m && typeof m.text === 'string' && ['user', 'assistant'].includes(m.role),
            )
            .slice(-30)
            .map((m) => ({
              ...m,
              products: Array.isArray(m.products)
                ? m.products.filter((p) => p && typeof p.id === 'string').map(view.product)
                : [],
              candidates: Array.isArray(m.candidates) ? m.candidates : [],
              trace: Array.isArray(m.trace) ? m.trace : [],
            }));
        const p = saved.meal && saved.meal.preferences;
        if (
          p &&
          Number.isInteger(p.people) &&
          p.people >= 1 &&
          p.people <= 8 &&
          (p.budget === null ||
            (Number.isFinite(p.budget) && p.budget >= 0 && p.budget <= 10000)) &&
          ['wants', 'owned', 'excluded', 'buyPantry', 'dishIds'].every(
            (key) =>
              Array.isArray(p[key]) &&
              p[key].length <= 30 &&
              p[key].every((value) => typeof value === 'string'),
          ) &&
          Array.isArray(saved.meal.recipeIds)
        )
          this.globalData.meal = clone(saved.meal);
      }
    } catch (_) {}
    this.refresh().catch(() => {});
  },
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  notify() {
    try {
      wx.setStorageSync('qinghe-mini-state', {
        version: 1,
        cart: this.globalData.cart,
        messages: this.globalData.messages.slice(-30),
        meal: this.globalData.meal,
      });
    } catch (_) {}
    const count = this.globalData.cart.length;
    if (count) wx.setTabBarBadge({ index: 3, text: String(count), fail() {} });
    else wx.removeTabBarBadge({ index: 3, fail() {} });
    for (const listener of this.listeners) listener();
  },
  refresh() {
    if (this.refreshing) return this.refreshing;
    this.globalData.loading = true;
    this.globalData.error = '';
    this.notify();
    this.refreshing = Promise.all([api.request('/products'), api.request('/status')])
      .then(([products, status]) => {
        if (!Array.isArray(products)) throw new Error('商品数据格式异常，请检查后端地址。');
        this.globalData.products = products;
        this.globalData.ai = !!status.ai;
        this.globalData.connected = true;
      })
      .catch((error) => {
        this.globalData.error = error.message;
        this.globalData.connected = false;
        throw error;
      })
      .finally(() => {
        this.globalData.loading = false;
        this.refreshing = null;
        this.notify();
      });
    return this.refreshing;
  },
  plan() {
    const state = this.globalData;
    if (!state.meal || !state.products.length) return null;
    return domain.buildMealPlan(
      state.meal.preferences,
      state.products,
      state.cart,
      state.meal.recipeIds,
    );
  },
  replaceCart(next) {
    if (JSON.stringify(next) === JSON.stringify(this.globalData.cart)) return false;
    this.globalData.undo = [...this.globalData.undo.slice(-9), clone(this.globalData.cart)];
    this.globalData.cart = next;
    this.notify();
    return true;
  },
  async execute(action) {
    const state = this.globalData;
    if (action.type === 'undo') {
      const before = state.undo.pop();
      if (!before) return '没有可以撤销的清单操作。';
      state.cart = before;
      this.notify();
      return '已撤销上一次清单操作。';
    }
    if (action.type === 'navigate') {
      const targets = action.category
        ? [action.category]
        : state.cart
            .filter((i) => !i.checked)
            .flatMap((i) => {
              const p = state.products.find((p) => p.id === i.productId && p.stock > 0);
              return p ? [p.category] : [];
            });
      if (!targets.length) throw new Error('请先将商品加入购物清单。');
      if (targets.some((id) => !domain.zones.some((z) => z.id === id)))
        throw new Error('商品分区不存在，请刷新门店数据。');
      state.route = domain.buildRoute(
        targets,
        state.current === 'entrance'
          ? domain.entrance
          : domain.zones.find((z) => z.id === state.current).location,
      );
      this.notify();
      return (
        '已规划 ' + state.route.stops.length + ' 个分区的路线，约 ' + state.route.distance + ' 米。'
      );
    }
    if (action.type === 'next') {
      if (!state.route || !state.route.stops.length) throw new Error('请先规划采购路线。');
      const reached = state.route.stops[0];
      const remaining = state.route.stops.slice(1);
      state.current = reached;
      state.route = remaining.length
        ? domain.buildRoute(remaining, domain.zones.find((z) => z.id === reached).location)
        : null;
      this.notify();
      return (
        '已模拟到达' +
        domain.categoryLabels[reached] +
        (state.route ? '，继续前往下一站。' : '，本次路线完成。')
      );
    }
    if (this.mutating) throw new Error('正在更新清单，请稍候。');
    this.mutating = true;
    this.notify();
    try {
      const products = await api.request('/products');
      state.products = products;
      const result = domain.mutateShoppingList(state.cart, products, action);
      if (result.changed) this.replaceCart(result.list);
      return result.text;
    } finally {
      this.mutating = false;
      this.notify();
    }
  },
  async send(text) {
    const state = this.globalData;
    text = String(text).trim();
    if (!text || state.busy) return null;
    if (text.length > 800) throw new Error('消息请控制在 800 字以内。');
    state.busy = true;
    state.messages.push({ id: 'u-' + Date.now(), role: 'user', text });
    this.notify();
    let performed = null;
    try {
      const result = await api.request('/assistant', {
        message: text,
        previous: state.filters,
        context: {
          cart: state.cart,
          meal: state.meal ? state.meal.preferences : undefined,
          recipeIds: state.meal ? state.meal.recipeIds : undefined,
        },
      });
      state.filters = result.filters;
      if (result.mealPlan)
        state.meal = {
          preferences: result.mealPlan.preferences,
          recipeIds: result.mealPlan.recipes.map((r) => r.id),
        };
      let answer = result.text;
      if (result.action) {
        try {
          answer = await this.execute(result.action);
          performed = result.action;
        } catch (error) {
          answer = error.message;
        }
      }
      state.messages.push({
        id: 'a-' + Date.now(),
        role: 'assistant',
        text: answer,
        warning: result.fallback || '',
        products: result.mealPlan || result.action ? [] : (result.products || []).map(view.product),
        meal: !!result.mealPlan,
        receipt: !!performed && ['add', 'remove', 'apply_plan'].includes(performed.type),
        trace: result.trace || [],
      });
      return { ...result, performed };
    } catch (error) {
      state.messages.push({ id: 'e-' + Date.now(), role: 'assistant', text: error.message });
      return null;
    } finally {
      state.busy = false;
      state.messages = state.messages.slice(-30);
      this.notify();
    }
  },
  clearConversation() {
    if (this.globalData.busy) return;
    this.globalData.messages = [clone(welcome)];
    this.globalData.filters = { categories: [] };
    this.globalData.meal = null;
    this.notify();
  },
});
