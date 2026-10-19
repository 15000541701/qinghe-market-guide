import { useEffect, useState } from 'react';
import {
  defaultModels,
  modelOptions,
  modelProviders,
  type ModelProvider,
  type ModelSettings,
} from '../../shared/model-options';
import { api } from '../lib';

export type ProviderReadiness = Partial<Record<ModelProvider, boolean>>;

/** Store-side model settings; addresses and keys stay in the server .env. */
export default function ModelSettingsPanel({
  providers,
  onSaved,
}: {
  providers?: ProviderReadiness;
  onSaved?: () => void | Promise<void>;
}) {
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [saved, setSaved] = useState<ModelSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const options = modelOptions.filter((option) => option.provider === settings?.provider);
  const savedOption = modelOptions.find((option) => option.id === saved?.model);
  const savedProvider = modelProviders.find((provider) => provider.id === saved?.provider);
  const ready = saved ? providers?.[saved.provider] : undefined;
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
      await onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="inventory model-settings" aria-labelledby="model-settings-title">
      <div className="section-heading">
        <div>
          <h2 id="model-settings-title">模型与服务设置</h2>
          <span className="muted compact">
            {saved
              ? `${savedProvider?.label || saved.provider} · ${savedOption?.label || saved.model || '未选择模型'}`
              : '读取中'}
          </span>
          {ready !== undefined && (
            <span className={`settings-state ${ready ? 'ready' : 'missing'}`}>
              {ready ? '密钥已配置' : '未配置密钥'}
            </span>
          )}
        </div>
      </div>
      <div className="model-settings-fields">
        {settings && (
          <>
            <label className="field">
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
                    {providers?.[provider.id] === undefined
                      ? ''
                      : providers[provider.id]
                        ? ' · 已配置'
                        : ' · 未配置密钥'}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
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
        {ready === false
          ? '所选服务商尚未在服务端 .env 配置地址和密钥：文字导购使用规则模式，图片识别不可用。填写后重启后端生效。'
          : '对话、餐食规划和图片识别共用所选模型；地址与密钥保存在服务端 .env，按服务商成组切换。'}
        保存只记录选择，不调用模型，也不检查余额。DeepSeek V4 Pro 仅支持文字，图片识别请选择 Flash
        或 Gemini。
      </p>
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
