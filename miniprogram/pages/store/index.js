const api = require('../../utils/api');
const view = require('../../utils/view');
const domain = require('../../lib/domain');
const emptyForm = () => ({
  name: '',
  category: 'vegetables',
  unit: '500g',
  stock: '50',
  shelf: 'A-01',
  price: '',
  image: '',
});
Page({
  data: {
    form: emptyForm(),
    editingId: '',
    categories: domain.zones,
    categoryIndex: 0,
    baselines: ['新商品 / 暂无历史'],
    baselineIndex: 0,
    inventory: [],
    search: '',
    photo: '',
    candidates: [],
    recognizing: false,
    saving: false,
    pricing: false,
    error: '',
    advice: null,
    marketQuery: '',
    marketBusy: false,
    marketError: '',
    marketResult: null,
    quotes: [],
    selectedId: '',
    markup: '30',
    retail: '',
    applied: '',
    manualPrice: '',
    manualSource: '',
    manualDate: domain.marketToday(),
    today: domain.marketToday(),
  },
  onLoad() {
    this.active = true;
    this.off = getApp().subscribe(() => this.syncInventory());
    this.syncInventory();
  },
  onShow() {
    this.syncInventory();
  },
  onUnload() {
    this.active = false;
    if (this.off) this.off();
  },
  onPullDownRefresh() {
    getApp()
      .refresh()
      .catch(view.alert)
      .finally(() => wx.stopPullDownRefresh());
  },
  syncInventory() {
    this.products = getApp().globalData.products;
    this.setData({
      inventory: this.products
        .filter((p) => (p.name + ' ' + p.shelf).includes(this.data.search))
        .map(view.product),
      baselines: ['新商品 / 暂无历史'].concat(this.products.map((p) => p.name + ' · ' + p.unit)),
    });
  },
  search(e) {
    this.setData({ search: e.detail.value });
    this.syncInventory();
  },
  field(e) {
    const key = e.currentTarget.dataset.field;
    if (!['name', 'unit', 'stock', 'shelf', 'price'].includes(key)) return;
    this.setData({ ['form.' + key]: e.detail.value });
    if (key === 'name' || key === 'unit') {
      this.invalidateReference();
      if (key === 'name')
        this.setData({ marketQuery: domain.suggestMarketKeyword(e.detail.value) });
      this.loadAdvice();
    }
  },
  category(e) {
    const index = Number(e.detail.value);
    const zone = domain.zones[index];
    this.setData({
      categoryIndex: index,
      'form.category': zone.id,
      'form.shelf': zone.code + '-01',
    });
  },
  invalidateReference() {
    this.reference = null;
    this.rawQuotes = [];
    this.marketEpoch = (this.marketEpoch || 0) + 1;
    this.priceEpoch = (this.priceEpoch || 0) + 1;
    this.setData({
      marketResult: null,
      quotes: [],
      selectedId: '',
      retail: '',
      applied: '',
      manualPrice: '',
      manualSource: '',
      advice: null,
      marketBusy: false,
      pricing: false,
    });
  },
  reset() {
    this.baselineId = '';
    this.invalidateReference();
    this.priceEpoch = (this.priceEpoch || 0) + 1;
    this.setData({
      form: emptyForm(),
      editingId: '',
      categoryIndex: 0,
      baselineIndex: 0,
      photo: '',
      candidates: [],
      error: '',
      marketQuery: '',
      pricing: false,
      marketError: '',
      manualDate: domain.marketToday(),
    });
  },
  baseline(e) {
    const index = Number(e.detail.value);
    const p = this.products[index - 1];
    this.baselineId = p ? p.id : '';
    this.invalidateReference();
    const change = { baselineIndex: index };
    if (p) {
      change['form.unit'] = p.unit;
      if (!this.data.form.name) {
        change['form.name'] = p.name;
        change.marketQuery = domain.suggestMarketKeyword(p.name, p);
      }
    }
    this.setData(change);
    this.loadAdvice();
  },
  edit(e) {
    const p = this.products.find((p) => p.id === e.currentTarget.dataset.id);
    if (!p) return;
    this.reset();
    this.baselineId = p.id;
    this.reference = p.marketReference || null;
    this.setData({
      editingId: p.id,
      form: {
        name: p.name,
        category: p.category,
        unit: p.unit,
        stock: String(p.stock),
        shelf: p.shelf,
        price: String(p.price),
        image: p.image,
      },
      photo: api.image(p.image),
      categoryIndex: domain.zones.findIndex((z) => z.id === p.category),
      baselineIndex: this.products.findIndex((x) => x.id === p.id) + 1,
      marketQuery: domain.suggestMarketKeyword(p.name, p),
      applied: this.reference
        ? '已保存参考：' + this.reference.source + ' · ' + this.reference.date
        : '',
    });
    this.loadAdvice();
    wx.pageScrollTo({ scrollTop: 0, duration: 200 });
  },
  async loadAdvice() {
    const p = this.products.find((p) => p.id === this.baselineId);
    const id = p && p.unit === this.data.form.unit ? p.id : undefined;
    if (!id && !this.reference) {
      this.setData({ advice: null, pricing: false });
      return;
    }
    const epoch = (this.priceEpoch || 0) + 1;
    this.priceEpoch = epoch;
    this.setData({ pricing: true, advice: null });
    try {
      const a = await api.request('/pricing', {
        productId: id,
        reference: this.reference || undefined,
      });
      if (this.active && epoch === this.priceEpoch)
        this.setData({
          advice: {
            ...a,
            priceText: view.money(a.price),
            lowText: view.money(a.low),
            highText: view.money(a.high),
            historyText: a.historyMedian == null ? '暂无' : view.money(a.historyMedian),
            marketText: a.marketPrice == null ? '暂无' : view.money(a.marketPrice),
            history: a.history.map((h) => ({
              ...h,
              priceText: view.money(h.price),
              sourceText:
                h.source === 'seed'
                  ? '演示记录'
                  : h.source === 'suggested'
                    ? '采纳建议'
                    : '人工定价',
            })),
          },
        });
    } catch (error) {
      if (this.active && epoch === this.priceEpoch) this.setData({ error: error.message });
    } finally {
      if (this.active && epoch === this.priceEpoch) this.setData({ pricing: false });
    }
  },
  adopt() {
    if (this.data.advice && this.data.advice.price > 0) {
      this.setData({ 'form.price': String(this.data.advice.price) });
      view.toast('建议价已填入，保存后生效');
    }
  },
  async photo() {
    if (this.data.recognizing || this.data.saving) return;
    this.setData({ recognizing: true, error: '', candidates: [] });
    try {
      const file = await api.chooseImage();
      this.setData({ photo: file });
      const result = await api.upload(file);
      if (!this.active) return;
      this.setData({
        'form.image': result.image,
        candidates: (result.candidates || []).map((c) => ({
          ...c,
          categoryName: domain.categoryLabels[c.category],
        })),
        error: result.uncertain ? result.notice : '',
      });
      if (result.candidates.length) this.applyCandidate(result.candidates[0]);
    } catch (error) {
      if (error.data && error.data.image) this.setData({ 'form.image': error.data.image });
      if (error.message !== '已取消选择图片') this.setData({ error: error.message });
    } finally {
      if (this.active) this.setData({ recognizing: false });
    }
  },
  candidate(e) {
    this.applyCandidate(this.data.candidates[Number(e.currentTarget.dataset.index)]);
  },
  applyCandidate(c) {
    if (!c) return;
    this.invalidateReference();
    const p = this.products.find((p) => p.id === c.productId);
    const zone = domain.zones.find((z) => z.id === c.category);
    this.baselineId = p ? p.id : '';
    this.setData({
      'form.name': p ? p.name : c.name,
      'form.category': c.category,
      'form.unit': p ? p.unit : this.data.form.unit,
      'form.shelf': zone.code + '-01',
      categoryIndex: domain.zones.indexOf(zone),
      baselineIndex: p ? this.products.indexOf(p) + 1 : 0,
      marketQuery: domain.suggestMarketKeyword(p ? p.name : c.name, p),
    });
    this.loadAdvice();
  },
  marketInput(e) {
    this.marketEpoch = (this.marketEpoch || 0) + 1;
    this.setData({
      marketQuery: e.detail.value,
      marketResult: null,
      quotes: [],
      selectedId: '',
      marketBusy: false,
    });
  },
  async lookup() {
    if (this.data.marketBusy || !this.data.marketQuery.trim()) return;
    const epoch = (this.marketEpoch || 0) + 1;
    this.marketEpoch = epoch;
    this.setData({
      marketBusy: true,
      marketError: '',
      marketResult: null,
      quotes: [],
      selectedId: '',
      retail: '',
    });
    try {
      const result = await api.request('/market-prices', { query: this.data.marketQuery.trim() });
      if (!this.active || epoch !== this.marketEpoch) return;
      this.rawQuotes = result.quotes;
      this.setData({
        marketResult: result,
        quotes: result.quotes.map((q) => {
          const value = domain.convertMarketPrice(q.average, q.unit, this.data.form.unit);
          const fresh = domain.isFreshMarketDate(q.date);
          return {
            ...q,
            averageText: view.money(q.average),
            lowText: view.money(q.low),
            highText: view.money(q.high),
            converted: value == null ? '' : view.money(value),
            unavailable: value == null || value <= 0 || !fresh,
            warning: !fresh
              ? '报价超过7天，不参与建议'
              : value == null
                ? '计价单位无法可靠换算，请手动核对'
                : '',
          };
        }),
      });
    } catch (error) {
      if (this.active && epoch === this.marketEpoch) this.setData({ marketError: error.message });
    } finally {
      if (this.active && epoch === this.marketEpoch) this.setData({ marketBusy: false });
    }
  },
  selectQuote(e) {
    this.setData({ selectedId: e.detail.value });
    this.previewPrice();
  },
  markup(e) {
    this.setData({ markup: e.detail.value });
    this.previewPrice();
  },
  previewPrice() {
    const q = (this.rawQuotes || []).find((q) => q.id === this.data.selectedId);
    const n = Number(this.data.markup);
    const value = q ? domain.convertMarketPrice(q.average, q.unit, this.data.form.unit) : null;
    this.setData({
      retail:
        value !== null && this.data.markup.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 300
          ? view.money(value * (1 + n / 100))
          : '',
    });
  },
  applyQuote() {
    const q = (this.rawQuotes || []).find((q) => q.id === this.data.selectedId);
    if (!q || !this.data.retail || !domain.isFreshMarketDate(q.date))
      return view.alert('请选择有效报价和加价率。');
    const value = domain.convertMarketPrice(q.average, q.unit, this.data.form.unit);
    this.reference = {
      price: value,
      source: ('北京新发地 · 批发行情 · ' + q.name + (q.origin ? ' · ' + q.origin : '')).slice(
        0,
        100,
      ),
      date: q.date,
      unit: this.data.form.unit,
      kind: 'wholesale',
      markupPercent: Number(this.data.markup),
      quote: q,
      sourceUrl: this.data.marketResult.sourceUrl,
      fetchedAt: this.data.marketResult.fetchedAt,
    };
    this.setData({
      applied:
        '已选 ' +
        q.name +
        ' · ' +
        q.date +
        ' · 批发 ¥' +
        view.money(value) +
        '/' +
        this.data.form.unit +
        ' · 加价 ' +
        this.data.markup +
        '%',
      manualPrice: '',
      manualSource: '',
      error: '',
    });
    this.loadAdvice();
  },
  copySource() {
    wx.setClipboardData({ data: 'http://www.xinfadi.com.cn/priceDetail.html' });
  },
  manual(e) {
    const key = e.currentTarget.dataset.field;
    if (!['manualPrice', 'manualSource'].includes(key)) return;
    this.reference = null;
    this.priceEpoch = (this.priceEpoch || 0) + 1;
    this.setData({ [key]: e.detail.value, applied: '', advice: null, pricing: false });
  },
  date(e) {
    this.reference = null;
    this.priceEpoch = (this.priceEpoch || 0) + 1;
    this.setData({ manualDate: e.detail.value, applied: '', advice: null, pricing: false });
  },
  manualReference() {
    const price = Number(this.data.manualPrice);
    if (!(price > 0) || !this.data.manualSource.trim() || !this.data.manualDate)
      throw new Error('请填写有效参考价、来源和日期。');
    return {
      price,
      source: this.data.manualSource.trim(),
      date: this.data.manualDate,
      unit: this.data.form.unit,
      kind: 'retail',
    };
  },
  applyManual() {
    try {
      this.reference = this.manualReference();
      this.setData({
        error: '',
        applied: '手动零售参考：' + this.reference.source + ' · ' + this.reference.date,
      });
      this.loadAdvice();
    } catch (error) {
      view.alert(error);
    }
  },
  async save() {
    if (this.data.saving || this.data.recognizing) return;
    const f = this.data.form;
    if (
      !f.name.trim() ||
      !f.unit.trim() ||
      !f.shelf.trim() ||
      !(Number(f.price) > 0) ||
      !Number.isInteger(Number(f.stock)) ||
      Number(f.stock) < 0
    )
      return view.alert('请检查商品名称、单位、货架、正数售价和整数库存。');
    this.setData({ saving: true, error: '' });
    try {
      if (this.data.manualPrice) this.reference = this.manualReference();
      await api.request(
        this.data.editingId ? '/products/' + this.data.editingId : '/products',
        {
          name: f.name.trim(),
          category: f.category,
          unit: f.unit.trim(),
          shelf: f.shelf.trim(),
          price: Number(f.price),
          stock: Number(f.stock),
          image: f.image || undefined,
          source:
            this.data.advice && this.data.advice.price === Number(f.price) ? 'suggested' : 'manual',
          reference: this.reference || undefined,
        },
        this.data.editingId ? 'PATCH' : 'POST',
      );
      await getApp().refresh();
      this.reset();
      view.toast('商品已保存，顾客端已同步');
    } catch (error) {
      this.setData({ error: error.message });
    } finally {
      if (this.active) this.setData({ saving: false });
    }
  },
});
