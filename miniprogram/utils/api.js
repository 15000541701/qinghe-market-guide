const defaults = require('../config');
function base() {
  return String(wx.getStorageSync('qinghe-api-base') || defaults.apiBase).replace(/\/+$/, '');
}
function setBase(value) {
  const normalized = String(value).trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[a-zA-Z0-9.\[\]:-]+$/.test(normalized))
    throw new Error('请输入完整的 http(s)://主机:端口，不要附带路径或密钥。');
  wx.setStorageSync('qinghe-api-base', normalized);
  return normalized;
}
function failure(error, address) {
  const msg = String((error && error.errMsg) || '').slice(0, 160);
  const raw = msg ? '（微信返回：' + msg + '）' : '';
  if (/domain|域名/.test(msg))
    return new Error(
      '请求域名未通过校验。开发者工具请检查本地调试设置；手机请在右上角“…”中打开开发调试后重新进入。' +
        raw,
    );
  if (/time[d]?[_ ]?out|超时|unreachable|disconnected|断开/i.test(msg))
    return new Error(
      '连接不到门店服务 ' +
        address +
        '：等待超时或网络不通。手机与电脑需在同一网络，且网络允许设备互访（校园网常见限制）。可先用手机浏览器打开该地址确认。' +
        raw,
    );
  if (/refused|未能连接|拒绝/i.test(msg))
    return new Error(
      '连接不到门店服务 ' +
        address +
        '：连接被拒绝。请确认电脑上的后端已启动，端口填写正确。' +
        raw,
    );
  return new Error(
    '连接不到门店服务 ' +
      address +
      '。请确认后端已启动、地址正确，可先用手机浏览器打开该地址确认。' +
      raw,
  );
}
function request(endpoint, data, method, options) {
  return new Promise((resolve, reject) =>
    wx.request({
      url: base() + '/api' + endpoint,
      method: method || (data ? 'POST' : 'GET'),
      data,
      timeout: (options && options.timeout) || 55000,
      header: { 'Content-Type': 'application/json' },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else {
          const error = new Error((res.data && res.data.error) || '门店服务请求失败，请重试。');
          error.data = res.data;
          reject(error);
        }
      },
      fail(error) {
        reject(failure(error, base()));
      },
    }),
  );
}
function image(value) {
  return /^https?:\/\//.test(value || '')
    ? value
    : value && value.startsWith('/')
      ? base() + value
      : value || '';
}
function chooseImage() {
  return new Promise((resolve, reject) =>
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success(result) {
        const file = result.tempFiles[0];
        if (!file || file.size > 6 * 1024 * 1024) reject(new Error('请选择不超过 6MB 的图片。'));
        else resolve(file.tempFilePath);
      },
      fail(error) {
        reject(
          new Error(
            /cancel/.test(error.errMsg || '')
              ? '已取消选择图片'
              : '无法读取图片，请检查相册或相机权限。',
          ),
        );
      },
    }),
  );
}
function upload(filePath) {
  return new Promise((resolve, reject) =>
    wx.uploadFile({
      url: base() + '/api/vision',
      filePath,
      name: 'image',
      timeout: 55000,
      success(res) {
        let data;
        try {
          data = JSON.parse(res.data);
        } catch (_) {
          reject(new Error('图片服务返回异常，请重试。'));
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else {
          const error = new Error(data.error || '图片识别失败。');
          error.data = data;
          reject(error);
        }
      },
      fail(error) {
        reject(failure(error, base()));
      },
    }),
  );
}
module.exports = { base, setBase, request, image, chooseImage, upload };
