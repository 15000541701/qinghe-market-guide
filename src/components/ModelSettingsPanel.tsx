import { useEffect, useState } from 'react';
import {
  defaultModels,
  modelOptions,
  modelProviders,
  type ModelProvider,
  type ModelSettings,
} from '../../shared/model-options';
import { api } from '../lib';

export default function ModelSettingsPanel() {
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [saved, setSaved] = useState<ModelSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const options = modelOptions.filter((option) => option.provider === settings?.provider);
  const load = async () => {
    setError('');
    try {
      const value = await api<ModelSettings>('/model-settings');
      setSettings(value);
      setSaved(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取模型设置失败');
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const save = async () => {
    if (!settings || busy) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const value = await api<ModelSettings>('/model-settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSettings(value);
      setSaved(value);
      setMessage('已保存，后续请求使用新模型；正在进行的请求不受影响。');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };
  return (
    <details style={{ margin: '12px auto', padding: '0 20px', maxWidth: 1280 }}>
      <summary style={{ cursor: 'pointer' }}>模型设置 · {saved?.model || '未配置'}</summary>
      <div
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 12, alignItems: 'end' }}
      >
        {settings && (
          <>
            <label className="field" style={{ flex: '1 1 160px', minWidth: 0 }}>
              模型服务商
              <select
                value={settings.provider}
                disabled={busy}
                onChange={(event) => {
                  const provider = event.target.value as ModelProvider;
                  setSettings({
                    provider,
                    model: saved?.provider === provider ? saved.model : defaultModels[provider],
                  });
                  setMessage('');
                  setError('');
                }}
              >
                {modelProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" style={{ flex: '1 1 220px', minWidth: 0 }}>
              模型
              <select
                value={settings.model}
                disabled={busy}
                onChange={(event) => {
                  setSettings({ ...settings, model: event.target.value });
                  setMessage('');
                }}
              >
                {!options.some((option) => option.id === settings.model) && (
                  <option value={settings.model} disabled>
                    {settings.model || '请选择模型'}（当前配置）
                  </option>
                )}
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {settings ? (
          <button
            className="button secondary small"
            disabled={busy || JSON.stringify(settings) === JSON.stringify(saved)}
            onClick={() => void save()}
          >
            {busy ? '保存中…' : '保存模型'}
          </button>
        ) : (
          <button className="button secondary small" onClick={() => void load()}>
            重新读取
          </button>
        )}
      </div>
      <p className="field-note">
        使用所选服务商在服务端配置的地址与密钥，应用于对话、餐食规划和图片识别。DeepSeek V4 Pro
        仅支持文字，图片识别请选择 Flash 或 Gemini。设置在当前服务中共享并保存；保存不调用模型。修改
        .env 后请重启后端。
      </p>
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </details>
  );
}
