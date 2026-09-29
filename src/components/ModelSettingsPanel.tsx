import { useEffect, useState } from 'react';
import { modelOptions, type ModelSettings } from '../../shared/model-options';
import { api } from '../lib';

export default function ModelSettingsPanel() {
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [saved, setSaved] = useState<ModelSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    setError('');
    try {
      const value = await api<ModelSettings>('/model-settings');
      setSettings(value);
      setSaved(value);
    } catch (e) { setError(e instanceof Error ? e.message : '读取模型设置失败'); }
  };
  useEffect(() => { void load(); }, []);
  const save = async () => {
    if (!settings || busy) return;
    setBusy(true); setMessage(''); setError('');
    try {
      const value = await api<ModelSettings>('/model-settings', {
        method: 'PUT', body: JSON.stringify(settings),
      });
      setSettings(value); setSaved(value);
      setMessage('已保存，后续请求使用新模型；正在进行的请求不受影响。');
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败'); }
    finally { setBusy(false); }
  };
  return (
    <details style={{ margin: '12px auto', padding: '0 20px', maxWidth: 1280 }}>
      <summary style={{ cursor: 'pointer' }}>模型设置 · {saved?.model || '未配置'}</summary>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 12, alignItems: 'end' }}>
        {settings && (
          <label className="field" style={{ flex: '1 1 220px', minWidth: 0 }}>
            统一模型（对话、餐食规划与图片识别）
            <select value={settings.model} disabled={busy} onChange={(event) => {
              setSettings({ model: event.target.value }); setMessage('');
            }}>
              {!modelOptions.some((option) => option.id === settings.model) && (
                <option value={settings.model} disabled>{settings.model || '请选择模型'}（当前配置）</option>
              )}
              {modelOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        )}
        {settings ? <button className="button secondary small" disabled={busy || JSON.stringify(settings) === JSON.stringify(saved)} onClick={() => void save()}>{busy ? '保存中…' : '保存模型'}</button>
          : <button className="button secondary small" onClick={() => void load()}>重新读取</button>}
      </div>
      <p className="field-note">使用服务端现有接口与密钥。设置在当前服务中共享并保存；切换不调用模型，也不验证模型权限。</p>
      {message && <p role="status">{message}</p>}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </details>
  );
}
