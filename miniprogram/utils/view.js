const api = require('./api');
const domain = require('../lib/domain');
const money = (value) => Number(value || 0).toFixed(2);
function product(item) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    unit: item.unit,
    image: item.image,
    description: item.description || '',
    stock: item.stock,
    shelf: item.shelf,
    tags: item.tags || [],
    imageUrl: api.image(item.image),
    priceText: money(item.price),
    categoryName: domain.categoryLabels[item.category],
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
module.exports = { money, product, alert, toast, navigate };
