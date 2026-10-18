import http from 'node:http';

// Node fetch does not automatically follow the macOS system proxy.
// Enable only when explicitly configured, leaving direct connections as the default.
export function configureNetworkProxy() {
  const proxy = process.env.AI_PROXY_URL?.trim();
  if (!proxy) return () => {};
  let url: URL;
  try {
    url = new URL(proxy);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error('AI_PROXY_URL 格式无效，请填写 HTTP(S) 代理地址。');
  }
  const configure = (
    http as typeof http & {
      setGlobalProxyFromEnv?: (env: NodeJS.ProcessEnv) => () => void;
    }
  ).setGlobalProxyFromEnv;
  if (!configure)
    throw new Error(
      '当前 Node.js 不支持内置代理，请升级到 Node.js 26 或更新版本后使用 AI_PROXY_URL。',
    );
  return configure({
    HTTP_PROXY: proxy,
    HTTPS_PROXY: proxy,
    NO_PROXY: [
      'localhost',
      '127.0.0.1',
      '::1',
      process.env.NO_PROXY || process.env.no_proxy || '',
    ].join(','),
  });
}
