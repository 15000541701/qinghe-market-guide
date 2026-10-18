export const modelProviders = [
  { id: 'gemini', label: 'Gemini' },
  { id: 'deepseek', label: 'DeepSeek' },
] as const;

export type ModelProvider = (typeof modelProviders)[number]['id'];

export const modelOptions = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini', vision: true },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', provider: 'gemini', vision: true },
  {
    id: 'gemini-3.1-flash-lite-preview',
    label: 'Gemini 3.1 Flash Lite Preview',
    provider: 'gemini',
    vision: true,
  },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', provider: 'gemini', vision: true },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', provider: 'gemini', vision: true },
  { id: 'deepseek-flash', label: 'DeepSeek Flash（支持图片）', provider: 'deepseek', vision: true },
  {
    id: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro（仅文字）',
    provider: 'deepseek',
    vision: false,
  },
] as const;

export type ModelSettings = { provider: ModelProvider; model: string };

export const defaultModels: Record<ModelProvider, string> = {
  gemini: 'gemini-2.5-flash',
  deepseek: 'deepseek-flash',
};

export function providerForModel(model: string): ModelProvider {
  return model.startsWith('deepseek-') ? 'deepseek' : 'gemini';
}
