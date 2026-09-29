import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  ImagePlus,
  LoaderCircle,
  Mic,
  Pencil,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { categoryLabels } from '../../shared/catalog';
import type {
  Category,
  MarketReference,
  PriceAdvice,
  Product,
  VisionCandidate,
  VisionResponse,
  StoreCategory,
  Shelf,
  StoreSection,
} from '../../shared/types';
import { ApiError, api, money, parseSpokenPrice, post, useSpeech } from '../lib';
import MarketLookup from './MarketLookup';
import { marketToday } from '../../shared/market';
import { isWeighed } from '../../shared/shopping';

interface Props {
  products: Product[];
  onRefresh: () => Promise<void>;
  onToast: (message: string) => void;
  ai: boolean;
}
const today = marketToday;
export default function Admin({ products, onRefresh, onToast, ai }: Props) {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [sections, setSections] = useState<StoreSection[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryKind, setNewCategoryKind] = useState<'food' | 'non_food'>('food');
  const [newSection, setNewSection] = useState('pantry');
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfPosition, setNewShelfPosition] = useState('12,14');
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionPosition, setNewSectionPosition] = useState('16,10');
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('vegetables');
  const [unit, setUnit] = useState('500g');
  const [saleMode, setSaleMode] = useState<'weight' | 'pack'>('weight');
  const [stock, setStock] = useState('50');
  const [shelf, setShelf] = useState('A-01');
  const [shelfId, setShelfId] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [preview, setPreview] = useState('');
  const [baseline, setBaseline] = useState('');
  const [advice, setAdvice] = useState<PriceAdvice | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [advising, setAdvising] = useState(false);
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState<VisionCandidate[]>([]);
  const [marketPrice, setMarketPrice] = useState('');
  const [marketSource, setMarketSource] = useState('');
  const [marketDate, setMarketDate] = useState(today());
  const [liveReference, setLiveReference] = useState<{
    context: string;
    value: MarketReference;
  } | null>(null);
  const [manualContext, setManualContext] = useState('');
  const [adviceRevision, setAdviceRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const busyRef = useRef(false);
  const refreshLocations = async () => {
    const [categoryData, sectionData, shelfData] = await Promise.all([
      api<StoreCategory[]>('/categories'),
      api<StoreSection[]>('/sections'),
      api<Shelf[]>('/shelves'),
    ]);
    setCategories(categoryData);
    setSections(sectionData);
    setShelves(shelfData);
    if (!shelfId) {
      const sectionId = categoryData.find((item) => item.id === category)?.sectionId;
      const first = shelfData.find((item) => item.sectionId === sectionId && item.reachable);
      if (first) {
        setShelfId(first.id);
        setShelf(first.name);
      }
    }
  };
  useEffect(() => {
    void refreshLocations().catch((e) => setError(e.message));
  }, []);
  const referenceContext = [editing, name, unit, baseline].join('|');
  const baselineProduct = products.find((product) => product.id === baseline);
  const reference = useMemo<MarketReference | undefined>(() => {
    if (liveReference?.context === referenceContext) return liveReference.value;
    if (manualContext !== referenceContext || !marketPrice) return undefined;
    return {
      price: Number(marketPrice),
      source: marketSource.trim(),
      date: marketDate,
      unit,
      kind: 'retail',
    };
  }, [liveReference, referenceContext, manualContext, marketPrice, marketSource, marketDate, unit]);
  const { listening, toggle } = useSpeech((text) => {
    const value = parseSpokenPrice(text);
    if (value && value > 0) {
      setPrice(String(value));
      onToast(`已识别售价 ¥${money(value)}，请确认后保存。`);
    } else {
      onToast(`听到“${text}”，没有识别到有效价格，请再试一次。`);
    }
  }, onToast);

  useEffect(() => {
    const controller = new AbortController();
    setAdvice(null);
    const referenceProduct = products.find((p) => p.id === baseline);
    if (
      (referenceProduct && referenceProduct.unit !== unit) ||
      (reference && (!(reference.price > 0) || !reference.source || !reference.date))
    ) {
      setAdvice(null);
      setAdvising(false);
      return;
    }
    setAdvising(true);
    void api<PriceAdvice>('/pricing', {
      ...post({ productId: baseline || undefined, reference }),
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) setAdvice(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAdvising(false);
      });
    return () => controller.abort();
  }, [baseline, unit, products, reference, adviceRevision, referenceContext]);

  useEffect(() => {
    setMarketPrice('');
    setMarketSource('');
    setMarketDate(today());
  }, [referenceContext]);

  const reset = () => {
    const firstCategory =
      categories.find((item) => item.id === 'vegetables') || categories.find((item) => item.active);
    const firstShelf = shelves.find(
      (item) => item.sectionId === firstCategory?.sectionId && item.reachable,
    );
    setEditing(null);
    setName('');
    setCategory(firstCategory?.id || 'vegetables');
    setUnit('500g');
    setSaleMode(
      firstCategory && ['vegetables', 'fruit', 'seafood', 'meat'].includes(firstCategory.id)
        ? 'weight'
        : 'pack',
    );
    setStock('50');
    setShelf(firstShelf?.name || '');
    setShelfId(firstShelf?.id || '');
    setPrice('');
    setImage('');
    setPreview('');
    setBaseline('');
    setCandidates([]);
    setError('');
    setMarketPrice('');
    setMarketSource('');
    setMarketDate(today());
    setLiveReference(null);
  };
  const changeCategory = (id: Category) => {
    setCategory(id);
    setSaleMode(['vegetables', 'fruit', 'seafood', 'meat'].includes(id) ? 'weight' : 'pack');
    const sectionId = categories.find((item) => item.id === id)?.sectionId;
    const firstShelf = shelves.find((item) => item.sectionId === sectionId && item.reachable);
    setShelf(firstShelf?.name || '');
    setShelfId(firstShelf?.id || '');
  };
  const applyCandidate = (candidate: VisionCandidate) => {
    setName(candidate.name);
    changeCategory(candidate.category);
    const existing = products.find((p) => p.id === candidate.productId);
    setBaseline(existing?.id || '');
    if (existing) {
      setUnit(existing.unit);
      setSaleMode(existing.saleMode || (isWeighed(existing) ? 'weight' : 'pack'));
      setName(existing.name);
    }
  };
  const recognize = async (file: File) => {
    if (busyRef.current) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 6 * 1024 * 1024
    ) {
      setError('请选择小于 6MB 的 JPG、PNG 或 WebP 图片。');
      return;
    }
    busyRef.current = true;
    setRecognizing(true);
    setError('');
    setCandidates([]);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    const form = new FormData();
    form.append('image', file);
    try {
      const result = await api<VisionResponse>('/vision', { method: 'POST', body: form });
      setImage(result.image);
      setCandidates(result.candidates);
      if (result.candidates.length) applyCandidate(result.candidates[0]);
      setError(result.uncertain ? result.notice : '');
    } catch (error) {
      if (error instanceof ApiError && error.data?.image) setImage(error.data.image);
      setError(error instanceof Error ? error.message : '图片识别失败，请手动填写商品信息。');
    } finally {
      busyRef.current = false;
      setRecognizing(false);
    }
  };
  const edit = (product: Product) => {
    setEditing(product.id);
    setName(product.name);
    setCategory(product.category);
    setUnit(product.unit);
    setSaleMode(product.saleMode || (isWeighed(product) ? 'weight' : 'pack'));
    setStock(String(product.stock));
    setShelf(product.shelf);
    setShelfId(product.shelfId || shelves.find((item) => item.name === product.shelf)?.id || '');
    setPrice(String(product.price));
    setImage(product.image);
    setPreview(product.image);
    setBaseline(product.id);
    setCandidates([]);
    setError('');
    setMarketPrice('');
    setMarketSource('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const recalculate = () => {
    if (reference && (!(reference.price > 0) || !reference.source || !reference.date)) {
      setError('请同时填写有效的参考价、来源和日期。');
      return;
    }
    const historical = products.find((p) => p.id === baseline);
    if (historical && historical.unit !== unit) {
      setError('参考商品的计价单位与当前单位不一致，请重新选择参考商品。');
      return;
    }
    setError('');
    setAdviceRevision((value) => value + 1);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || recognizing) return;
    if (!(Number(price) > 0)) {
      setError('请先填写大于 0 的最终售价，或采纳价格建议。');
      return;
    }
    if (reference && (!reference.source || !reference.date || !(reference.price > 0))) {
      setError('市场参考价需要同时填写来源与日期。');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api<Product>(editing ? `/products/${editing}` : '/products', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name,
          category,
          price: Number(price),
          unit,
          saleMode,
          stock: Number(stock),
          shelf,
          shelfId: shelfId || undefined,
          image: image || undefined,
          source: advice?.price === Number(price) ? 'suggested' : 'manual',
          reference,
        }),
      });
      await onRefresh();
      onToast(editing ? '商品已更新，顾客端已同步。' : '商品已上架，顾客端已同步。');
      reset();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const filtered = products.filter(
    (p) => (filter === 'all' || p.category === filter) && `${p.name}${p.shelf}`.includes(search),
  );
  return (
    <main className="main-container admin-main">
      <div className="page-heading">
        <div>
          <h1>商品上架与定价</h1>
          <p>让商品找到分区，让每一次定价有据可依。</p>
        </div>
        <span className="store-label">
          <span className="status-dot" />
          {products.length} 件商品 · 示例门店
        </span>
      </div>
      <section className="inventory" aria-label="分类与货架管理">
        <div className="section-heading">
          <h2>分类与门店位置</h2>
          <span className="muted compact">商品分类与物理分区分别管理</span>
        </div>
        <form
          className="form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              const id = `custom-${Date.now().toString(36)}`;
              await api('/categories', {
                method: 'POST',
                body: JSON.stringify({
                  id,
                  name: newCategory,
                  sectionId: newSection || null,
                  kind: newCategoryKind,
                }),
              });
              setNewCategory('');
              await refreshLocations();
              onToast('分类已新增。');
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label className="field">
            新增商品分类
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              maxLength={40}
              required
              placeholder="例如：宠物用品"
            />
          </label>
          <label className="field">
            默认门店分区
            <select value={newSection} onChange={(e) => setNewSection(e.target.value)}>
              <option value="">暂不指定</option>
              {sections
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            分类类型
            <select
              value={newCategoryKind}
              onChange={(e) => setNewCategoryKind(e.target.value as 'food' | 'non_food')}
            >
              <option value="food">食品</option>
              <option value="non_food">非食品</option>
            </select>
          </label>
          <button className="button secondary" type="submit">
            新增分类
          </button>
        </form>
        <div className="inventory-tools" style={{ flexWrap: 'wrap', marginTop: 12 }}>
          {categories.map((item) => (
            <div key={item.id} className="candidate-pills">
              <input
                aria-label={`${item.name}分类名称`}
                value={item.name}
                maxLength={40}
                onChange={(e) =>
                  setCategories((all) =>
                    all.map((c) => (c.id === item.id ? { ...c, name: e.target.value } : c)),
                  )
                }
                onBlur={() => {
                  const updated = categories.find((c) => c.id === item.id);
                  if (updated)
                    void api(`/categories/${item.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify(updated),
                    })
                      .then(refreshLocations)
                      .catch((e) => setError(e.message));
                }}
              />
              <select
                aria-label={`${item.name}所属分区`}
                value={item.sectionId || ''}
                onChange={(e) => {
                  const next = { ...item, sectionId: e.target.value || null };
                  setCategories((all) => all.map((c) => (c.id === item.id ? next : c)));
                  void api(`/categories/${item.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(next),
                  })
                    .then(refreshLocations)
                    .catch((err) => setError(err.message));
                }}
              >
                <option value="">不关联分区</option>
                {sections
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <select
                aria-label={`${item.name}分类类型`}
                value={item.kind}
                onChange={(e) => {
                  const next = { ...item, kind: e.target.value as 'food' | 'non_food' };
                  setCategories((all) => all.map((c) => (c.id === item.id ? next : c)));
                  void api(`/categories/${item.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(next),
                  }).catch((err) => setError(err.message));
                }}
              >
                <option value="food">食品</option>
                <option value="non_food">非食品</option>
              </select>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  const next = { ...item, active: !item.active };
                  void api(`/categories/${item.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(next),
                  })
                    .then(refreshLocations)
                    .catch((e) => setError(e.message));
                }}
              >
                {item.active ? '停用' : '启用'}
              </button>
            </div>
          ))}
        </div>
        <form
          className="form-grid"
          style={{ marginTop: 16 }}
          onSubmit={async (event) => {
            event.preventDefault();
            const [x, y] = newSectionPosition.split(',').map(Number);
            try {
              await api('/sections', {
                method: 'POST',
                body: JSON.stringify({
                  id: `section-${Date.now().toString(36)}`,
                  name: newSectionName,
                  code: `S${sections.length + 1}`,
                  color: '#536488',
                  tint: '#e4e8f1',
                  location: { x, y },
                  rect: { x: x < 29 ? x + 1 : x - 3, y: Math.max(1, y - 1), w: 2, h: 2 },
                }),
              });
              setNewSectionName('');
              await refreshLocations();
              onToast('门店分区已新增。');
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label className="field">
            新增物理分区
            <input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              maxLength={40}
              required
              placeholder="例如：服饰陈列区"
            />
          </label>
          <label className="field">
            地图通道点 x,y
            <input
              value={newSectionPosition}
              onChange={(e) => setNewSectionPosition(e.target.value)}
              pattern="[0-9]+,[0-9]+"
              required
            />
          </label>
          <button className="button secondary" type="submit">
            新增门店分区
          </button>
        </form>
        <div className="inventory-tools" style={{ flexWrap: 'wrap', marginTop: 10 }}>
          {sections.map((item) => (
            <div key={item.id} className="candidate-pills">
              <input
                aria-label={`${item.name}分区名称`}
                value={item.name}
                maxLength={40}
                onChange={(e) =>
                  setSections((all) =>
                    all.map((s) => (s.id === item.id ? { ...s, name: e.target.value } : s)),
                  )
                }
                onBlur={() => {
                  const next = sections.find((s) => s.id === item.id);
                  if (next)
                    void api(`/sections/${item.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({
                        name: next.name,
                        active: next.active,
                        location: next.location,
                      }),
                    })
                      .then(refreshLocations)
                      .catch((e) => setError(e.message));
                }}
              />
              <input
                aria-label={`${item.name}通道点`}
                value={`${item.location.x},${item.location.y}`}
                pattern="[0-9]+,[0-9]+"
                onChange={(e) => {
                  const [x, y] = e.target.value.split(',').map(Number);
                  if (Number.isInteger(x) && Number.isInteger(y))
                    setSections((all) =>
                      all.map((s) => (s.id === item.id ? { ...s, location: { x, y } } : s)),
                    );
                }}
                onBlur={() => {
                  const next = sections.find((s) => s.id === item.id);
                  if (next)
                    void api(`/sections/${item.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({
                        name: next.name,
                        active: next.active,
                        location: next.location,
                      }),
                    })
                      .then(refreshLocations)
                      .catch((e) => setError(e.message));
                }}
              />
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  const next = { ...item, active: !item.active };
                  void api(`/sections/${item.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                      name: next.name,
                      active: next.active,
                      location: next.location,
                    }),
                  })
                    .then(refreshLocations)
                    .catch((e) => setError(e.message));
                }}
              >
                {item.active ? '停用' : '启用'}
              </button>
            </div>
          ))}
        </div>
        <form
          className="form-grid"
          style={{ marginTop: 16 }}
          onSubmit={async (event) => {
            event.preventDefault();
            const section = sections.find((value) => value.id === newSection);
            if (!section) {
              setError('新增货架前请选择门店分区。');
              return;
            }
            const [x, y] = newShelfPosition.split(',').map(Number);
            try {
              await api('/shelves', {
                method: 'POST',
                body: JSON.stringify({
                  id: `shelf-${Date.now().toString(36)}`,
                  sectionId: section.id,
                  name: newShelfName,
                  position: { x, y },
                  reachable: true,
                }),
              });
              setNewShelfName('');
              await refreshLocations();
              onToast('货架位置已新增。');
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label className="field">
            新增货架
            <input
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              maxLength={30}
              required
              placeholder="例如：G-02"
            />
          </label>
          <label className="field">
            通道点 x,y
            <input
              value={newShelfPosition}
              onChange={(e) => setNewShelfPosition(e.target.value)}
              pattern="[0-9]+,[0-9]+"
              required
            />
          </label>
          <button className="button secondary" type="submit">
            新增货架
          </button>
        </form>
        <div className="inventory-tools" style={{ flexWrap: 'wrap', marginTop: 10 }}>
          {shelves.map((item) => (
            <div key={item.id} className="candidate-pills">
              <input
                aria-label={`${item.name}货架名称`}
                value={item.name}
                maxLength={30}
                onChange={(e) =>
                  setShelves((all) =>
                    all.map((s) => (s.id === item.id ? { ...s, name: e.target.value } : s)),
                  )
                }
                onBlur={() => {
                  const next = shelves.find((s) => s.id === item.id);
                  if (next)
                    void api(`/shelves/${item.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify(next),
                    }).catch((e) => setError(e.message));
                }}
              />
              <select
                aria-label={`${item.name}所属分区`}
                value={item.sectionId}
                onChange={(e) => {
                  const next = { ...item, sectionId: e.target.value };
                  void api(`/shelves/${item.id}`, { method: 'PATCH', body: JSON.stringify(next) })
                    .then(refreshLocations)
                    .catch((err) => setError(err.message));
                }}
              >
                <option value="">选择分区</option>
                {sections
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <input
                aria-label={`${item.name}地图通道点`}
                value={item.position ? `${item.position.x},${item.position.y}` : ''}
                pattern="[0-9]+,[0-9]+"
                onChange={(e) => {
                  const [x, y] = e.target.value.split(',').map(Number);
                  if (Number.isInteger(x) && Number.isInteger(y))
                    setShelves((all) =>
                      all.map((s) => (s.id === item.id ? { ...s, position: { x, y } } : s)),
                    );
                }}
                onBlur={() => {
                  const next = shelves.find((s) => s.id === item.id);
                  if (next)
                    void api(`/shelves/${item.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify(next),
                    }).catch((e) => setError(e.message));
                }}
              />
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  const next = { ...item, reachable: !item.reachable };
                  void api(`/shelves/${item.id}`, { method: 'PATCH', body: JSON.stringify(next) })
                    .then(refreshLocations)
                    .catch((e) => setError(e.message));
                }}
              >
                {item.reachable ? '设为不可达' : '设为可达'}
              </button>
            </div>
          ))}
        </div>
      </section>
      <form className="admin-workspace" onSubmit={save} ref={formRef}>
        <section className="intake-panel">
          <div className="section-heading">
            <h2>{editing ? '编辑商品' : '录入新商品'}</h2>
            {editing && (
              <button className="text-button" type="button" onClick={reset}>
                取消编辑
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            className={`upload-area ${preview ? 'has-preview' : ''}`}
            disabled={recognizing}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (event.dataTransfer.files[0]) void recognize(event.dataTransfer.files[0]);
            }}
          >
            {preview ? (
              <img src={preview} alt="待上架商品" />
            ) : (
              <span className="upload-icon">
                <ImagePlus size={32} strokeWidth={1.3} />
              </span>
            )}
            <span className="upload-label">
              {recognizing ? (
                <>
                  <LoaderCircle className="spin" size={17} />
                  正在识别商品与分区…
                </>
              ) : (
                <>
                  <Upload size={16} />
                  {preview ? '更换商品图片' : '上传商品图片，自动识别分区'}
                </>
              )}
            </span>
            {!preview && <small>拖入图片或点击上传 · JPG / PNG / WebP · 6MB 以内</small>}
          </button>
          <input
            className="sr-only"
            type="file"
            ref={inputRef}
            accept="image/jpeg,image/png,image/webp"
            aria-label="上传待上架商品图片"
            onChange={(event) => {
              if (event.target.files?.[0]) void recognize(event.target.files[0]);
              event.target.value = '';
            }}
          />
          <p className="field-note">
            {ai
              ? '图片发送至配置的模型服务商，识别后请核对信息。'
              : '尚未配置 API；可先手动录入，图片会保存到本地。'}
          </p>
          {candidates.length > 0 && (
            <div className="candidate-pills">
              {candidates.map((candidate, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => applyCandidate(candidate)}
                  className={name.includes(candidate.name) ? 'selected' : ''}
                >
                  {candidate.name}
                  <span>
                    {categories.find((item) => item.id === candidate.category)?.name ||
                      categoryLabels[candidate.category] ||
                      candidate.category}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="form-grid">
            <label className="field span-two">
              商品名称
              <input
                required
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：新鲜菠菜"
              />
            </label>
            <label className="field">
              商品分区
              <select
                value={category}
                onChange={(event) => changeCategory(event.target.value as Category)}
              >
                {categories
                  .filter((item) => item.active || item.id === category)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              货架编号
              <select
                required
                value={shelfId}
                onChange={(event) => {
                  setShelfId(event.target.value);
                  setShelf(shelves.find((item) => item.id === event.target.value)?.name || '');
                }}
              >
                <option value="">选择货架</option>
                {shelves
                  .filter(
                    (item) =>
                      item.sectionId ===
                      categories.find((value) => value.id === category)?.sectionId,
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id} disabled={!item.reachable}>
                      {item.name}
                      {item.reachable ? '' : ' · 不可达'}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              计价单位
              <input
                required
                value={unit}
                maxLength={20}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="500g"
              />
            </label>
            <label className="field">
              售卖方式
              <select
                value={saleMode}
                onChange={(event) => setSaleMode(event.target.value as 'weight' | 'pack')}
              >
                <option value="weight">称重商品</option>
                <option value="pack">整包 / 整件</option>
              </select>
            </label>
            <label className="field">
              库存数量
              <input
                required
                type="number"
                min="0"
                step="1"
                max="1000000"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
              />
            </label>
          </div>
        </section>
        <section className="pricing-panel">
          <div className="section-heading">
            <h2>
              <TrendingUp size={20} />
              价格建议
            </h2>
            <span className="small-tag">可随时调整</span>
          </div>
          <p className="muted">选取同一商品、相同单位的记录，生成参考售价。</p>
          <label className="field">
            参考商品历史
            <select
              value={baseline}
              onChange={(event) => {
                setBaseline(event.target.value);
                const match = products.find((p) => p.id === event.target.value);
                if (match) setUnit(match.unit);
              }}
            >
              <option value="">新商品 / 暂无历史</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.unit}
                </option>
              ))}
            </select>
          </label>
          <MarketLookup
            key={referenceContext}
            name={name || baselineProduct?.name || ''}
            unit={unit}
            product={baselineProduct}
            applied={
              reference ||
              (baselineProduct?.unit === unit ? baselineProduct.marketReference : undefined)
            }
            onApply={(value) => {
              setLiveReference({ context: referenceContext, value });
              setMarketPrice('');
              setMarketSource('');
              setError('');
              onToast('已使用所选批发报价重新计算建议，最终售价由你确认。');
            }}
          />
          <div className="price-advice">
            <div>
              <span>建议售价</span>
              {advising ? (
                <div className="skeleton price-skeleton" />
              ) : advice?.price ? (
                <strong>
                  <small>¥</small>
                  {money(advice.price)}
                  <span>/{unit}</span>
                </strong>
              ) : (
                <strong className="no-price">待补充价格依据</strong>
              )}
            </div>
            <button
              className="button primary small"
              type="button"
              disabled={!advice?.price || advising}
              onClick={() => {
                if (advice?.price) {
                  setPrice(String(advice.price));
                  onToast('已采纳建议价，保存后生效。');
                }
              }}
            >
              采纳建议
              <Check size={15} />
            </button>
            <p>{advice?.explanation || '选择参考商品，或补充一条有来源的参考价。'}</p>
            {!!advice?.price && (
              <span className="price-range">
                参考区间 ¥{money(advice.low)}–{money(advice.high)}（建议价 ±10%）
              </span>
            )}
          </div>
          <div className="price-evidence">
            <div>
              <span>历史价格中位数</span>
              <strong>
                {advice?.historyMedian != null ? `¥${money(advice.historyMedian)}` : '暂无'}
              </strong>
              <small>近 30 天 · {advice?.sampleCount || 0} 条记录</small>
            </div>
            <div>
              <span>
                {advice?.marketKind === 'wholesale' ? '零售参考（批发价加价后）' : '市场参考价'}
              </span>
              <strong>
                {advice?.marketPrice != null ? `¥${money(advice.marketPrice)}` : '暂无有效参考'}
              </strong>
              <small>{advice?.marketSource || '需要日期与来源'}</small>
              {advice?.marketDate && <small>报价日期：{advice.marketDate}</small>}
            </div>
          </div>
          {!!advice?.history.length && (
            <details className="history-details">
              <summary>
                查看历史记录与来源
                <ChevronDown size={14} />
              </summary>
              <div className="history-table">
                {advice.history.map((record, i) => (
                  <div key={i}>
                    <span>{record.date}</span>
                    <strong>¥{money(record.price)}</strong>
                    <span>
                      {record.source === 'seed'
                        ? '演示记录'
                        : record.source === 'suggested'
                          ? '采纳建议价'
                          : '人工定价'}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
          <details className="market-reference">
            <summary>
              手动补充零售参考价
              <Plus size={14} />
            </summary>
            <p className="field-note">
              按当前计价单位填写零售参考价。手动输入会替换新发地参考；超过 7 天的报价不参与计算。
            </p>
            <div className="form-grid">
              <label className="field">
                参考价（元）
                <input
                  type="number"
                  min="0.01"
                  max="100000"
                  step="0.01"
                  value={marketPrice}
                  onChange={(event) => {
                    setLiveReference(null);
                    setManualContext(referenceContext);
                    setMarketPrice(event.target.value);
                  }}
                  placeholder="例如 5.20"
                />
              </label>
              <label className="field">
                参考日期
                <input
                  type="date"
                  value={marketDate}
                  max={today()}
                  onChange={(event) => {
                    setLiveReference(null);
                    setManualContext(referenceContext);
                    setMarketDate(event.target.value);
                  }}
                />
              </label>
              <label className="field span-two">
                数据来源
                <input
                  value={marketSource}
                  maxLength={100}
                  onChange={(event) => {
                    setLiveReference(null);
                    setManualContext(referenceContext);
                    setMarketSource(event.target.value);
                  }}
                  placeholder="例如：供应商报价单，9 月 17 日"
                />
              </label>
            </div>
            <button
              className="button secondary small"
              type="button"
              onClick={() => void recalculate()}
              disabled={advising}
            >
              重新计算建议
            </button>
          </details>
          <div className="final-pricing">
            <label className="field" htmlFor="final-price">
              最终售价（元 / {unit}）
            </label>
            <div className="price-input">
              <span>¥</span>
              <input
                id="final-price"
                required
                type="number"
                min="0.01"
                max="100000"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="填写或采纳建议"
              />
              <button
                type="button"
                className={`tool-button ${listening ? 'listening' : ''}`}
                onClick={toggle}
              >
                <Mic size={17} />
                {listening ? '结束录音' : '语音输入'}
              </button>
            </div>
            <p className="field-note">可以说“售价八块五”。识别后核对金额，再保存。</p>
          </div>
        </section>
        {error && (
          <div className="inline-error admin-error" role="alert">
            {error}
          </div>
        )}
        <div className="admin-actions">
          <p>
            <CircleHelp size={15} />
            分区与价格可手动修改，保存后立即同步顾客端。
          </p>
          <div>
            <button
              type="button"
              className="button secondary"
              onClick={reset}
              disabled={saving || recognizing}
            >
              清空录入
            </button>
            <button type="submit" className="button primary" disabled={saving || recognizing}>
              {saving ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}
              {editing ? '保存商品修改' : '确认并上架'}
            </button>
          </div>
        </div>
      </form>
      <section className="inventory">
        <div className="section-heading">
          <div>
            <h2>在售商品</h2>
            <span className="muted compact">共 {products.length} 件</span>
          </div>
          <div className="inventory-tools">
            <label className="search-field">
              <Search size={16} />
              <input
                placeholder="搜索商品或货架"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="搜索库存商品"
              />
            </label>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="筛选库存分区"
            >
              <option value="all">全部分区</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>商品</th>
                <th>分区 / 货架</th>
                <th>售价</th>
                <th>库存</th>
                <th>
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="inventory-product">
                      <img src={product.image} alt="" />
                      <span>
                        {product.name}
                        <small>{product.unit}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    {categories.find((item) => item.id === product.category)?.name ||
                      categoryLabels[product.category] ||
                      product.category}
                    <small className="table-sub">{product.shelf}</small>
                  </td>
                  <td className="table-price">¥{money(product.price)}</td>
                  <td>{product.stock > 0 ? product.stock : '已售罄'}</td>
                  <td>
                    <button className="text-button" onClick={() => edit(product)}>
                      <Pencil size={14} />
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="empty-state compact-empty">
              <Search size={25} />
              <p>没找到商品，试试其他关键词。</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
