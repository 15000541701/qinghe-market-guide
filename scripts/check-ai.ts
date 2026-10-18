import 'dotenv/config';
import { configureNetworkProxy } from '../server/network-proxy';
import sharp from 'sharp';
import { aiConfigured, guide, identifyImage } from '../server/ai';
import { makeSeedProducts } from '../shared/catalog';

configureNetworkProxy();
if (!aiConfigured()) {
  console.error('请先在 .env 填写所选服务商的 GEMINI_* 或 DEEPSEEK_* 配置，并检查模型设置。');
  process.exitCode = 1;
} else {
  const products = makeSeedProducts();
  try {
    const result = await guide('推荐 10 元以内的绿叶蔬菜', products);
    if (result.engine !== 'model') throw new Error(result.fallback || '模型对话未成功');
    console.log(`对话连接成功：${result.products.map((p) => p.name).join('、')}`);
    const image = await sharp('public/images/spinach.jpg').resize(800).jpeg().toBuffer();
    const vision = await identifyImage(image, products);
    if (!vision.candidates.length) throw new Error('图片接口已响应，但没有返回商品候选');
    console.log(
      `图片识别成功：${vision.candidates.map((p) => `${p.name}（${p.category}）`).join('、')}`,
    );
    console.log('实际模型对话与图片输入均已验证。');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'API 检查失败');
    process.exitCode = 1;
  }
}
