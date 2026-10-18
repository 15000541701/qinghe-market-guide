import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { api } from '../lib';
import {
  parseSkuFile,
  writeSkuCsv,
  type SkuImportResult,
  type SkuRow,
} from '../../shared/sku-file';

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function SkuTransferPanel({
  onRefresh,
  onToast,
}: {
  onRefresh: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<SkuRow[]>([]);
  const [filename, setFilename] = useState('');
  const [mode, setMode] = useState<'create' | 'upsert'>('create');
  const [result, setResult] = useState<SkuImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const validate = async (nextRows = rows, nextMode = mode) => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(
        await api<SkuImportResult>('/sku/import', {
          method: 'POST',
          body: JSON.stringify({ rows: nextRows, mode: nextMode, apply: false }),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '预检失败');
    } finally {
      setBusy(false);
    }
  };
  const readFile = async (file?: File) => {
    if (!file) return;
    setResult(null);
    setRows([]);
    setError('');
    setFilename(file.name);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('文件不能超过5MB。');
      if (!/\.(csv|json)$/i.test(file.name)) throw new Error('请选择 UTF-8 CSV 或 JSON 文件。');
      const parsed = parseSkuFile(await file.text(), file.name);
      setRows(parsed);
      await validate(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : '文件无法解析。');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };
  const exportFile = async (format: 'csv' | 'json') => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/sku/export?format=${format}`);
      if (!response.ok) throw new Error('导出失败，请重试。');
      download(
        await response.blob(),
        `qinghe-skus-${new Date().toISOString().slice(0, 10)}.${format}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败');
    } finally {
      setBusy(false);
    }
  };
  const apply = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await api<SkuImportResult>('/sku/import', {
        method: 'POST',
        body: JSON.stringify({ rows, mode, apply: true }),
      });
      setResult(data);
      if (data.applied) {
        onToast(`已导入：新增${data.created}个，更新${data.updated}个 SKU。`);
        await onRefresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="inventory" id="sku-transfer" aria-label="SKU 批量导入导出">
      <div className="section-heading">
        <div>
          <h2>SKU 批量导入与导出</h2>
          <p className="field-note">
            CSV 可用 Excel 编辑；JSON 保留同样的档案字段。先预检，确认后整批保存。
          </p>
        </div>
      </div>
      <div className="sku-actions">
        <button
          className="button secondary small"
          disabled={busy}
          onClick={() => void exportFile('csv')}
        >
          <Download size={15} />
          导出 CSV
        </button>
        <button
          className="button secondary small"
          disabled={busy}
          onClick={() => void exportFile('json')}
        >
          <Download size={15} />
          导出 JSON
        </button>
        <button
          className="text-button"
          onClick={() =>
            download(
              new Blob([writeSkuCsv([])], { type: 'text/csv;charset=utf-8' }),
              'qinghe-sku-template.csv',
            )
          }
        >
          下载空白模板
        </button>
        <button
          className="button primary small"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={15} />
          选择导入文件
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.json"
          hidden
          onChange={(e) => void readFile(e.target.files?.[0])}
        />
        <label>
          导入方式{' '}
          <select
            disabled={busy}
            value={mode}
            onChange={(e) => {
              const next = e.target.value as typeof mode;
              setMode(next);
              setResult(null);
              if (rows.length) void validate(rows, next);
            }}
          >
            <option value="create">仅新增（同 SKU 拒绝）</option>
            <option value="upsert">新增并更新同 SKU</option>
          </select>
        </label>
      </div>
      <p className="field-note">
        必填 sku、name、category、unit。空售价/库存的新商品进入待确认；status=active
        时必须有本店售价和有效陈列位置。更新模式中，空的选填字段保留原值。来源平台商品编号与本店 SKU
        分开保存。
      </p>
      {filename && (
        <p>
          {filename} · {rows.length} 条 {busy ? '· 正在处理…' : ''}
        </p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          <p role="status">
            {result.applied ? '导入完成' : '预检结果'}：新增 {result.created}，更新 {result.updated}
            ，错误 {result.errors.length}。
          </p>
          {!!result.errors.length && (
            <div className="sku-preview">
              <ul>
                {result.errors.map((item, i) => (
                  <li key={i}>
                    数据第 {item.row - 1} 条 · {item.sku || '未填 SKU'}：{item.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="sku-preview">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>商品</th>
                  <th>操作</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {result.preview.slice(0, 100).map((item) => (
                  <tr key={item.sku}>
                    <td>{item.sku}</td>
                    <td>{item.name}</td>
                    <td>{item.action}</td>
                    <td>
                      {item.status === 'draft'
                        ? '待确认'
                        : item.status === 'active'
                          ? '上架'
                          : '归档'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.preview.length > 100 && (
            <p className="field-note">只展示前100条预览，确认会处理文件全部有效行。</p>
          )}
          {!result.applied && (
            <button
              className="button primary small"
              disabled={busy || !!result.errors.length || !result.preview.length}
              onClick={() => void apply()}
            >
              确认导入 {result.created + result.updated} 个 SKU
            </button>
          )}
          <p className="field-note">
            有错误时整批不写入。确认时重新校验当前目录、设施与 SKU，价格变更会追加历史记录。
          </p>
        </>
      )}
    </section>
  );
}
