import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUp,
  Camera,
  Check,
  Leaf,
  LoaderCircle,
  Mic,
  RotateCcw,
  Send,
  Sprout,
  X,
} from 'lucide-react';
import type {
  GuideResponse,
  MealPlan,
  Product,
  QueryFilters,
  ShoppingAction,
  ShoppingContext,
  VisionResponse,
} from '../../shared/types';
import { categoryLabels } from '../../shared/catalog';
import { api, money, post, useSpeech } from '../lib';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  products?: Product[];
  image?: string;
  vision?: VisionResponse;
  warning?: string;
  trace?: string[];
  meal?: boolean;
  receipt?: boolean;
};
const welcome: Message = {
  id: 0,
  role: 'assistant',
  text: '你好呀，我是小禾。\n想吃点什么，或准备做什么菜？告诉我你的预算，我来帮你挑，还能带你找到货架。',
};
interface Props {
  products: Product[];
  onResults: (products: Product[], label: string) => void;
  onNavigate: (p: Product) => void;
  onAdd: (p: Product) => void;
  onToast: (text: string) => void;
  ai: boolean;
  context: ShoppingContext;
  onPlan: (plan: MealPlan | null) => void;
  onAction: (action: ShoppingAction) => Promise<string>;
  onBusy: (busy: boolean) => void;
  request: { id: number; text: string } | null;
  onRequestConsumed: () => void;
  visible: boolean;
}
export default function ChatPanel({
  products,
  onResults,
  onNavigate,
  onAdd,
  onToast,
  ai,
  context,
  onPlan,
  onAction,
  onBusy,
  request,
  onRequestConsumed,
  visible,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState<QueryFilters>({ categories: [] });
  const uploadRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sequence = useRef(1);
  const busyRef = useRef(false);
  const { listening, toggle } = useSpeech((text) => setInput(text), onToast);
  useEffect(() => {
    onBusy(busy);
  }, [busy]);
  useEffect(() => {
    if (request) {
      onRequestConsumed();
      void send(request.text);
    }
  }, [request?.id]);
  useEffect(() => {
    if (visible && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy, visible]);
  const send = async (text: string) => {
    text = text.trim();
    if (!text || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setInput('');
    setMessages((previous) => [...previous, { id: sequence.current++, role: 'user', text }]);
    try {
      const result = await api<GuideResponse>(
        '/assistant',
        post({ message: text, previous: filters, context }),
      );
      let responseText = result.text;
      let actionSucceeded = false;
      if (result.mealPlan) onPlan(result.mealPlan);
      if (result.action) {
        try {
          responseText = await onAction(result.action);
          actionSucceeded = true;
        } catch (error) {
          responseText = error instanceof Error ? error.message : '操作未完成，请重试。';
        }
      }
      setFilters(result.filters);
      setMessages((previous) => [
        ...previous,
        {
          id: sequence.current++,
          role: 'assistant',
          text: responseText,
          products: result.mealPlan || result.action ? [] : result.products,
          warning: result.fallback,
          trace: result.action && !actionSucceeded ? ['核对最新商品数据', '操作未完成，原清单保留'] : result.trace,
          meal: !!result.mealPlan,
          receipt: actionSucceeded && !!result.action && ['add', 'remove', 'apply_plan'].includes(result.action.type),
        },
      ]);
      if (!result.action || result.mealPlan)
        onResults(result.products, `“${text.length > 20 ? text.slice(0, 20) + '…' : text}”的推荐`);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: sequence.current++,
          role: 'assistant',
          text: error instanceof Error ? error.message : '导购暂时不可用，请再试一次。',
        },
      ]);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  };
  const identify = async (file: File) => {
    if (busyRef.current) return;
    if (file.size > 6 * 1024 * 1024) {
      onToast('图片超过 6MB，请压缩后上传。');
      return;
    }
    const preview = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    busyRef.current = true;
    setBusy(true);
    setMessages((previous) => [
      ...previous,
      { id: sequence.current++, role: 'user', text: '帮我找找图片里的商品', image: preview },
    ]);
    const data = new FormData();
    data.append('image', file);
    try {
      const result = await api<VisionResponse>('/vision', { method: 'POST', body: data });
      setMessages((previous) => [
        ...previous,
        {
          id: sequence.current++,
          role: 'assistant',
          text: result.candidates.length
            ? result.notice
            : '没能确定图片中的商品。请上传一张光线充足、主体清晰的商品照片，或直接告诉我名称。',
          vision: result,
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: sequence.current++,
          role: 'assistant',
          text: error instanceof Error ? error.message : '识别失败，请重试。',
        },
      ]);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  };
  const chooseCandidate = (candidate: VisionResponse['candidates'][number]) => {
    const matches = products.filter(
      (p) =>
        p.stock > 0 &&
        (candidate.productId ? p.id === candidate.productId : p.category === candidate.category),
    );
    onResults(matches, `${candidate.name} · 图片找货`);
    setMessages((previous) => [
      ...previous,
      {
        id: sequence.current++,
        role: 'assistant',
        text: matches.length
          ? `可以到${categoryLabels[candidate.category]}看看。${candidate.productId ? '这里是匹配的商品。' : '本店暂无完全同名的商品，下面是这个分区可选的商品。'}`
          : '该分区暂时没有在售商品，换个商品再试试吧。',
        products: matches.slice(0, 3),
      },
    ]);
  };
  return (
    <section className="chat-panel" aria-label="智能导购对话">
      <div className="panel-heading">
        <div>
          <span className="assistant-mark">
            <Sprout size={20} />
          </span>
          <div>
            <h2>小禾导购</h2>
            <p className="chat-status">
              <span className="status-dot" />
              {ai ? '大模型已配置' : '规则导购可用'}
            </p>
          </div>
        </div>
        <button
          className="icon-button"
          aria-label="重新开始对话"
          disabled={busy}
          onClick={() => {
            setMessages([welcome]);
            setFilters({ categories: [] });
            onPlan(null);
            onResults([], '');
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <div
        className="chat-history"
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="对话记录"
      >
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            {message.role === 'assistant' && (
              <span className="message-avatar">
                <Leaf size={15} />
              </span>
            )}
            <div className="message-content">
              <div className="message-bubble">
                {message.image && (
                  <img className="chat-upload" src={message.image} alt="上传的待查找商品" />
                )}
                <p>{message.text}</p>
              </div>
              {message.warning && <p className="message-warning">{message.warning}</p>}
              {message.meal && (
                <button
                  className="text-button"
                  onClick={() =>
                    document
                      .getElementById('meal-plan')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                >
                  查看菜谱与整单预算
                  <ArrowRight size={14} />
                </button>
              )}
              {message.receipt && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => void send('撤销上一步')}
                >
                  撤销上一次清单操作
                  <RotateCcw size={13} />
                </button>
              )}
              {!!message.trace?.length && (
                <details className="agent-trace">
                  <summary>本次处理过程</summary>
                  <ol>
                    {message.trace.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </details>
              )}
              {message.vision && (
                <div className="vision-candidates">
                  {message.vision.candidates.map((candidate, i) => (
                    <button key={i} onClick={() => chooseCandidate(candidate)}>
                      <span>
                        <strong>{candidate.name}</strong>
                        <small>
                          {categoryLabels[candidate.category]} · {i === 0 ? '首选匹配' : '其他可能'}
                        </small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                </div>
              )}
              {!!message.products?.length && (
                <div className="chat-products">
                  {message.products.slice(0, 3).map((product) => (
                    <div key={product.id} className="chat-product">
                      <img src={product.image} alt="" />
                      <div>
                        <strong>{product.name}</strong>
                        <span>
                          ¥{money(product.price)} / {product.unit}
                        </span>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`带我去${product.name}`}
                        onClick={() => onNavigate(product)}
                      >
                        <ArrowUp size={16} />
                      </button>
                    </div>
                  ))}
                  {message.products.length > 3 && (
                    <button
                      className="text-button more-results"
                      onClick={() => {
                        onResults(message.products!, '小禾为你推荐');
                        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      查看全部 {message.products.length} 款<ArrowRight size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {messages.length === 1 && (
          <div className="starter-questions">
            <p>不知道怎么问？试试这些</p>
            {[
              '两个人吃，预算50元，想吃鱼和绿叶菜，家里有葱姜',
              '推荐 10 元以内的绿叶蔬菜',
              '想买 20 到 40 元的鱼',
            ].map((text) => (
              <button key={text} onClick={() => void send(text)}>
                <span>{text}</span>
                <ArrowUp size={14} />
              </button>
            ))}
          </div>
        )}
        {busy && (
          <div className="thinking" role="status">
            <span />
            <span />
            <span />
            <span className="sr-only">小禾正在查找商品</span>
          </div>
        )}
      </div>
      <form
        className="chat-compose"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <label className="sr-only" htmlFor="chat-input">
          告诉小禾想买什么
        </label>
        <textarea
          id="chat-input"
          placeholder={listening ? '正在听，请说出你想买的商品…' : '想买什么？说说你的需求…'}
          value={input}
          maxLength={800}
          rows={2}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void send(input);
            }
          }}
        />
        <div className="compose-tools">
          <div>
            <input
              ref={uploadRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="上传图片找商品"
              onChange={(event) => {
                if (event.target.files?.[0]) void identify(event.target.files[0]);
                event.target.value = '';
              }}
            />
            <button
              className="tool-button"
              type="button"
              disabled={busy}
              onClick={() => uploadRef.current?.click()}
            >
              <Camera size={17} />
              <span>图片找货</span>
            </button>
            <button
              className={`tool-button ${listening ? 'listening' : ''}`}
              type="button"
              disabled={busy}
              onClick={toggle}
              aria-pressed={listening}
            >
              <Mic size={17} />
              <span>{listening ? '结束录音' : '语音'}</span>
            </button>
          </div>
          <button
            className="send-button"
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="发送消息"
          >
            {busy ? <LoaderCircle size={17} className="spin" /> : <ArrowUp size={19} />}
          </button>
        </div>
      </form>
      <p className="chat-footnote">
        {ai ? '图片将发送至你配置的模型服务商' : '图片识别需配置 API · 文字导购可直接体验'}
      </p>
    </section>
  );
}
