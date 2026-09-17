import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Check, LoaderCircle, Search } from 'lucide-react';
import type { MarketReference, MarketSearchResult, Product } from '../../shared/types';
import {
  convertMarketPrice,
  isFreshMarketDate,
  roundPrice,
  suggestMarketKeyword,
  XINFADI_SOURCE_URL,
} from '../../shared/market';
import { api, money, post } from '../lib';

interface Props {
  name: string;
  unit: string;
  product?: Product;
  applied?: MarketReference;
  onApply: (reference: MarketReference) => void;
}

export default function MarketLookup({ name, unit, product, applied, onApply }: Props) {
  const [query, setQuery] = useState(() => suggestMarketKeyword(name, product));
  const [result, setResult] = useState<MarketSearchResult | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [markup, setMarkup] = useState(String(applied?.markupPercent ?? 30));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const radioId = useId();
  useEffect(() => () => controller.current?.abort(), []);
  const selected = result?.quotes.find((quote) => quote.id === selectedId);
  const converted = selected ? convertMarketPrice(selected.average, selected.unit, unit) : null;
  const validMarkup =
    markup.trim() !== '' &&
    Number.isFinite(Number(markup)) &&
    Number(markup) >= 0 &&
    Number(markup) <= 300;
  const retail =
    converted !== null && validMarkup ? roundPrice(converted * (1 + Number(markup) / 100)) : null;
  const canApply =
    !!selected &&
    converted !== null &&
    converted > 0 &&
    retail !== null &&
    retail <= 100000 &&
    isFreshMarketDate(selected.date);

  const lookup = async () => {
    if (!query.trim() || busy) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError('');
    setResult(null);
    setSelectedId('');
    try {
      const data = await api<MarketSearchResult>('/market-prices', {
        ...post({ query: query.trim() }),
        signal: request.signal,
      });
      if (!request.signal.aborted) setResult(data);
    } catch (error) {
      if (!request.signal.aborted)
        setError(error instanceof Error ? error.message : '查询失败，请稍后重试。');
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  };
  const apply = () => {
    if (!canApply || !selected || !result || converted === null) return;
    onApply({
      price: converted,
      source:
        `${result.source} · ${selected.name}${selected.origin ? ` · ${selected.origin}` : ''}`.slice(
          0,
          100,
        ),
      date: selected.date,
      unit,
      kind: 'wholesale',
      markupPercent: Number(markup),
      quote: selected,
      sourceUrl: result.sourceUrl,
      fetchedAt: result.fetchedAt,
    });
  };

  return (
    <section className="market-lookup" aria-label="新发地行情查询">
      <div className="market-heading">
        <h3>新发地批发行情</h3>
        <a href={XINFADI_SOURCE_URL} target="_blank" rel="noreferrer">
          查看来源
          <ArrowUpRight size={13} />
        </a>
      </div>
      <p className="field-note">点击时查询最新发布的报价，不会自动定时更新。</p>
      <div className="market-search-row">
        <label className="field" htmlFor={`${radioId}-query`}>
          行情商品名
          <input
            id={`${radioId}-query`}
            value={query}
            maxLength={40}
            placeholder="输入通用品名，如菠菜、鲈鱼"
            onChange={(event) => {
              controller.current?.abort();
              setBusy(false);
              setQuery(event.target.value);
              setResult(null);
              setSelectedId('');
              setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void lookup();
              }
            }}
          />
        </label>
        <button
          type="button"
          className="button secondary small"
          disabled={busy || !query.trim()}
          onClick={() => void lookup()}
        >
          {busy ? <LoaderCircle className="spin" size={15} /> : <Search size={15} />}
          {busy ? '正在查询' : '查询新发地行情'}
        </button>
      </div>
      {busy && (
        <div className="market-loading" role="status">
          <div className="skeleton" />
          <span>正在读取新发地发布的报价…</span>
        </div>
      )}
      {error && (
        <p className="inline-error market-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="market-results" aria-live="polite">
          <p className="market-result-status">
            {result.quotes.length
              ? `${result.latestDate} · ${result.quotes.length} 条报价，请选择匹配的一条`
              : '暂未找到报价'}
          </p>
          <p className="field-note">{result.notice}</p>
          {!!result.quotes.length && (
            <div className="market-quote-list" role="radiogroup" aria-label="选择新发地报价">
              {result.quotes.map((quote) => {
                const value = convertMarketPrice(quote.average, quote.unit, unit);
                const stale = !isFreshMarketDate(quote.date);
                const disabled = value === null || value <= 0 || stale;
                return (
                  <label
                    key={quote.id}
                    className={`market-quote ${selectedId === quote.id ? 'selected' : ''} ${disabled ? 'unavailable' : ''}`}
                  >
                    <input
                      type="radio"
                      name={radioId}
                      value={quote.id}
                      checked={selectedId === quote.id}
                      disabled={disabled}
                      onChange={() => setSelectedId(quote.id)}
                      aria-label={`${quote.name}，产地${quote.origin || '未注明'}，均价${quote.average}元每${quote.unit}`}
                    />
                    <span className="quote-description">
                      <strong>
                        {quote.name}
                        <span>{quote.category}</span>
                      </strong>
                      <span>
                        产地：{quote.origin || '未注明'} · 规格：{quote.spec || '未注明'}
                      </span>
                      <span>
                        最低 ¥{money(quote.low)} · 最高 ¥{money(quote.high)} / {quote.unit}
                      </span>
                      {disabled && (
                        <span className="quote-warning">
                          {stale
                            ? '报价超过 7 天，暂不参与建议'
                            : `无法将“${quote.unit}”可靠换算为“${unit}”，请手动核对`}
                        </span>
                      )}
                    </span>
                    <span className="quote-price">
                      <small>批发均价</small>
                      <strong>¥{money(quote.average)}</strong>
                      <span>/{quote.unit}</span>
                      {value !== null && (
                        <small>
                          折合 ¥{money(value)}/{unit}
                        </small>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {selected && (
            <div className="market-conversion">
              <label className="field" htmlFor={`${radioId}-markup`}>
                试算加价率（%）
                <input
                  id={`${radioId}-markup`}
                  type="number"
                  min="0"
                  max="300"
                  step="0.1"
                  value={markup}
                  onChange={(event) => setMarkup(event.target.value)}
                />
              </label>
              <div>
                <span>加价后的零售参考</span>
                <strong>
                  {retail === null ? '请填写有效加价率' : `¥${money(retail)} / ${unit}`}
                </strong>
              </div>
              <p className="field-note">
                默认 30% 是可调整的试算参数，不是市场给出的利润率。批发均价 ×（1 +
                加价率），未另计运输、损耗等费用。
              </p>
              <button
                type="button"
                className="button primary small"
                disabled={!canApply}
                onClick={apply}
              >
                用所选报价计算建议
                <Check size={15} />
              </button>
            </div>
          )}
          <p className="market-fetched">
            本次查询：{new Date(result.fetchedAt).toLocaleString('zh-CN', { hour12: false })}
          </p>
        </div>
      )}
      {applied?.kind === 'wholesale' && (
        <p className="market-applied">
          <Check size={14} />
          <span>
            当前参考：{applied.quote?.name || '已选报价'} · {applied.date} · ¥{money(applied.price)}
            /{applied.unit || unit} · 加价 {applied.markupPercent ?? '未设'}%。
            {isFreshMarketDate(applied.date) ? '保存商品后留存来源。' : '已过期，请重新查询。'}
          </span>
        </p>
      )}
    </section>
  );
}
