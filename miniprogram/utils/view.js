const api = require('./api');
const domain = require('../lib/domain');
const money = (value) => Number(value || 0).toFixed(2);
// Names of the store's own categories (from /api/categories); the static zones only cover the
// original seven departments.
let categoryNames = new Map();
function setCategories(categories) {
  categoryNames = new Map(
    (Array.isArray(categories) ? categories : [])
      .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
      .map((c) => [c.id, c.name]),
  );
}
function categoryName(id) {
  return categoryNames.get(id) || domain.categoryLabels[id] || '';
}
function symbol(currency) {
  return domain.currencySymbol(currency === 'USD' ? 'USD' : 'CNY');
}
// Catalog descriptions run to a thousand characters; page data must stay well under the
// mini program's 1 MB setData limit.
function excerpt(text, length) {
  const value = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  return value.length > length ? value.slice(0, length - 1) + '…' : value;
}
// Idempotent: products saved in chat history are mapped again when the page renders.
function product(item) {
  const currency = domain.productCurrency(item);
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    currency,
    price: item.price,
    unit: item.unit,
    image: item.image,
    description: excerpt(item.description, 60),
    stock: item.stock,
    shelf: item.shelf,
    tags: item.tags || [],
    imageUrl: api.image(item.image),
    priceText: money(item.price),
    priceSymbol: symbol(currency),
    categoryName: categoryName(item.category),
  };
}
function alert(error) {
  wx.showModal({
    title: '操作提示',
    content: typeof error === 'string' ? error : error.message || '操作未完成，请重试。',
    showCancel: false,
  });
}
function toast(text) {
  wx.showToast({ title: text, icon: 'none', duration: 2200 });
}
function navigate(action) {
  if (action && ['navigate', 'next'].includes(action.type))
    wx.switchTab({ url: '/pages/map/index' });
}
module.exports = { money, symbol, product, setCategories, categoryName, alert, toast, navigate };
