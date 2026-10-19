import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  defaultModels,
  modelOptions,
  modelProviders,
  providerForModel,
  type ModelProvider,
  type ModelSettings,
} from '../shared/model-options';

const directory = path.resolve(process.env.DATA_DIR || 'data');
const filename = path.join(directory, 'model-settings.json');

export const modelSettingsSchema = z
  .object({
    provider: z.enum(['gemini', 'deepseek']).optional(),
    model: z.string().min(1),
  })
  .strict()
  .transform((settings) => ({
    provider: settings.provider ?? providerForModel(settings.model),
    model: settings.model,
  }))
  .refine(
    (settings) =>
      modelOptions.some(
        (option) => option.id === settings.model && option.provider === settings.provider,
      ),
    '请选择该服务商支持的模型',
  );

function defaultSettings(): ModelSettings {
  const provider: ModelProvider = process.env.AI_PROVIDER === 'deepseek' ? 'deepseek' : 'gemini';
  return {
    provider,
    model:
      provider === 'deepseek'
        ? process.env.DEEPSEEK_MODEL || defaultModels.deepseek
        : process.env.GEMINI_MODEL || process.env.AI_MODEL || '',
  };
}

export function getModelSettings(): ModelSettings {
  if (existsSync(filename)) {
    const saved = JSON.parse(readFileSync(filename, 'utf8')) as Partial<ModelSettings>;
    // On first migration, an explicit default provider may replace the old single-model selection.
    // Once the UI saves a provider, that selection takes precedence over the environment default.
    if (
      !saved.provider &&
      process.env.AI_PROVIDER &&
      saved.model &&
      providerForModel(saved.model) !== defaultSettings().provider
    )
      return defaultSettings();
    const parsed = modelSettingsSchema.safeParse({ provider: saved.provider, model: saved.model });
    if (parsed.success) return parsed.data;
    throw new Error('模型配置无效，请重新保存模型设置。');
  }
  return defaultSettings();
}
export function saveModelSettings(settings: ModelSettings): ModelSettings {
  const validated = modelSettingsSchema.parse(settings);
  mkdirSync(directory, { recursive: true });
  writeFileSync(`${filename}.tmp`, JSON.stringify(validated, null, 2), { mode: 0o600 });
  renameSync(`${filename}.tmp`, filename);
  return validated;
}

/** Whether each provider has an address and key in .env; booleans only, never the values. */
export function modelProviderReadiness(): Record<ModelProvider, boolean> {
  return Object.fromEntries(
    modelProviders.map(({ id }) => {
      const connection = getModelConnection({ provider: id, model: defaultModels[id] });
      return [id, !!(connection.baseUrl && connection.apiKey)];
    }),
  ) as Record<ModelProvider, boolean>;
}

export function getModelConnection(settings = getModelSettings()) {
  if (settings.provider === 'deepseek')
    return {
      ...settings,
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
    };
  // Resolve credentials as a group so a partial new configuration cannot use an old provider's key.
  const named =
    process.env.GEMINI_BASE_URL !== undefined || process.env.GEMINI_API_KEY !== undefined;
  return {
    ...settings,
    baseUrl: (named ? process.env.GEMINI_BASE_URL : process.env.AI_BASE_URL) || '',
    apiKey: (named ? process.env.GEMINI_API_KEY : process.env.AI_API_KEY) || '',
  };
}
