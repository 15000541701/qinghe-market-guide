import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { modelOptions, type ModelSettings } from '../shared/model-options';

const directory = path.resolve(process.env.DATA_DIR || 'data');
const filename = path.join(directory, 'model-settings.json');
export function getModelSettings(): ModelSettings {
  if (existsSync(filename)) {
    const saved = JSON.parse(readFileSync(filename, 'utf8')) as ModelSettings;
    // Older files may contain a separate visionModel; the main model now applies to all requests.
    if (modelOptions.some((option) => option.id === saved.model)) return { model: saved.model };
    throw new Error('模型配置无效，请重新保存模型设置。');
  }
  return {
    model: process.env.AI_MODEL || '',
  };
}
export function saveModelSettings(settings: ModelSettings): ModelSettings {
  mkdirSync(directory, { recursive: true });
  writeFileSync(`${filename}.tmp`, JSON.stringify(settings, null, 2), { mode: 0o600 });
  renameSync(`${filename}.tmp`, filename);
  return settings;
}
