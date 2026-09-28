import { build } from 'esbuild';
import sharp from 'sharp';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
await mkdir('miniprogram/lib', { recursive: true });
await mkdir('miniprogram/assets', { recursive: true });
await build({ entryPoints: ['scripts/miniprogram-shared.ts'], outfile: 'miniprogram/lib/domain.js', bundle: true, platform: 'neutral', format: 'cjs', target: 'es2018', minify: true, legalComments: 'none' });
const icons = {
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
  products: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
  bag: '<path d="M5 8h14l1 13H4L5 8Zm3 0V6a4 4 0 0 1 8 0v2"/>',
  leaf: '<path d="M12 22V10m0 7C4 18 2 12 3 7c6-1 10 3 9 10Zm0-6c-1-6 3-9 9-9 1 6-3 10-9 9Z"/>',
};
for (const [name, shape] of Object.entries(icons)) for (const active of [false, true]) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="' + (active ? '#315443' : '#697467') + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + shape + '</svg>';
  await sharp(Buffer.from(svg)).png().toFile('miniprogram/assets/' + name + (active ? '-active' : '') + '.png');
  await writeFile('miniprogram/assets/' + name + (active ? '-active' : '') + '.png.json', JSON.stringify({prompt:'Source: scripts/build-miniprogram.mjs. Geometric navigation icon rendered from the SVG paths in that source with sharp.'}));
}
const app = JSON.parse(await readFile('miniprogram/app.json', 'utf8'));
for (const page of app.pages) for (const extension of ['js', 'json', 'wxml', 'wxss']) await stat(path.join('miniprogram', page + '.' + extension));
console.log('小程序构建完成：' + app.pages.length + ' 个原生页面，共享预算、清单和导航逻辑已打包。');
console.log('请在微信开发者工具导入项目根目录，后端地址可在小程序“连接设置”修改。');
