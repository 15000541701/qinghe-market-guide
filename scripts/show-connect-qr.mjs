import qrcode from 'qrcode-terminal';

// 在启动窗口显示手机连接地址的二维码，供小程序“连接设置 → 扫码填写”使用。
const addresses = process.argv.slice(2).filter((value) => /^https?:\/\/[\w.:[\]-]+$/.test(value));
if (!addresses.length) {
  console.log('未检测到局域网地址，手机无法连接。请确认电脑已连上网络。');
  process.exit(0);
}
for (const address of addresses) {
  console.log(`\n手机扫码连接：${address}`);
  qrcode.generate(address, { small: true });
}
console.log('小程序“连接设置 → 扫码填写”可直接扫描上面的二维码。');
