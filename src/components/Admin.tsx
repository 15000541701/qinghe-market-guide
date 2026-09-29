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
import { categoryLabels, entrance, zones } from '../../shared/catalog';
import { findPath, isWalkable } from '../../shared/navigation';
import { fixedFixtures, mainAisles } from '../../shared/layout';
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
  Point,
} from '../../shared/types';
import { ApiError, api, money, parseSpokenPrice, post, useSpeech } from '../lib';
import MarketLookup from './MarketLookup';
import { marketToday } from '../../shared/market';
import { isWeighed } from '../../shared/shopping';
import FacilityEditor from './FacilityEditor';

interface Props {
  products: Product[];
  onRefresh: () => Promise<void>;
  onToast: (message: string) => void;
  ai: boolean;
}
const today = marketToday;
type MapRect = { x: number; y: number; w: number; h: number };
type ShelfSide = NonNullable<Product['shelfSide']>;
const shelfSideNames: Record<ShelfSide, string> = {
  left: '左侧',
  right: '右侧',
  front: '前侧',
  back: '后侧',
};
function shelfAccessSides(shelf?: Shelf): ShelfSide[] {
  if (!shelf) return [];
  const points = shelf.accessPoints || (shelf.position ? { front: shelf.position } : {});
  return Object.keys(points).filter((side): side is ShelfSide => side in shelfSideNames);
}
function overlaps(a: MapRect, b: MapRect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function rectInBounds(rect: MapRect) {
  return (
    Number.isInteger(rect.x) &&
    Number.isInteger(rect.y) &&
    Number.isInteger(rect.w) &&
    Number.isInteger(rect.h) &&
    rect.x >= 1 &&
    rect.y >= 1 &&
    rect.w >= 2 &&
    rect.h >= 2 &&
    rect.w <= 12 &&
    rect.h <= 10 &&
    rect.x + rect.w <= 32 &&
    rect.y + rect.h <= 24
  );
}
function rectPointDistance(point: Point, rect: MapRect) {
  const nearestX = Math.max(rect.x, Math.min(point.x, rect.x + rect.w - 1));
  const nearestY = Math.max(rect.y, Math.min(point.y, rect.y + rect.h - 1));
  return Math.abs(point.x - nearestX) + Math.abs(point.y - nearestY);
}
function nextSectionCode(sections: StoreSection[]) {
  const used = new Set(sections.map((section) => section.code.toUpperCase()));
  for (let index = 1; index <= 99; index++) {
    const code = `S${index}`;
    if (!used.has(code)) return code;
  }
  return `S${Date.now().toString(36).slice(-5).toUpperCase()}`;
}
function findOpenArea(sections: StoreSection[], shelves: Shelf[]) {
  const active = sections.filter((section) => section.active);
  const baseRects = active.length
    ? active.map((section) => section.rect)
    : zones.map((zone) => zone.rect);
  const fixtureRects = [
    ...fixedFixtures.map((fixture) => fixture.rect),
    ...mainAisles,
    ...shelves.flatMap((shelf) => (shelf.footprint ? [shelf.footprint] : [])),
  ];
  const candidateW = 2;
  const candidateH = 2;
  for (let y = 1; y <= 24 - candidateH; y++)
    for (let x = 1; x <= 32 - candidateW; x++) {
      const rect = { x, y, w: candidateW, h: candidateH };
      if (
        !rectInBounds(rect) ||
        baseRects.some((other) => overlaps(rect, other)) ||
        fixtureRects.some((other) => overlaps(rect, other))
      )
        continue;
      const candidate: StoreSection = {
        id: '__new-area-preview__',
        name: '新区域',
        code: 'NEW',
        color: '#536488',
        tint: '#e4e8f1',
        rect,
        location: { x, y },
        active: true,
      };
      const routeSections = [...active, candidate];
      const approaches = [
        ...Array.from({ length: candidateH }, (_, offset) => ({ x: x - 1, y: y + offset })),
        ...Array.from({ length: candidateH }, (_, offset) => ({
          x: x + candidateW,
          y: y + offset,
        })),
        ...Array.from({ length: candidateW }, (_, offset) => ({ x: x + offset, y: y - 1 })),
        ...Array.from({ length: candidateW }, (_, offset) => ({
          x: x + offset,
          y: y + candidateH,
        })),
      ];
      const location = approaches.find(
        (point) =>
          rectPointDistance(point, rect) > 0 &&
          isWalkable(point, routeSections, shelves) &&
          findPath(entrance, point, routeSections, shelves).length > 0,
      );
      if (location) return { rect, location };
    }
  return { rect: { x: 11, y: 8, w: 2, h: 2 }, location: { x: 13, y: 8 } };
}
export default function Admin({ products, onRefresh, onToast, ai }: Props) {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [sections, setSections] = useState<StoreSection[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryKind, setNewCategoryKind] = useState<'food' | 'non_food'>('food');
  const [newSection, setNewSection] = useState('pantry');
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionCode, setNewSectionCode] = useState('');
  const [newSectionRect, setNewSectionRect] = useState<MapRect>({ x: 1, y: 1, w: 2, h: 2 });
  const [newSectionLocation, setNewSectionLocation] = useState<Point>({ x: 1, y: 1 });
  const [sectionPickMode, setSectionPickMode] = useState<'rect' | 'access'>('rect');
  const [sectionDraftTouched, setSectionDraftTouched] = useState(false);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [sectionError, setSectionError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('vegetables');
  const [unit, setUnit] = useState('500g');
  const [saleMode, setSaleMode] = useState<'weight' | 'pack'>('weight');
  const [stock, setStock] = useState('50');
  const [shelf, setShelf] = useState('A-01');
  const [shelfId, setShelfId] = useState('');
  const [shelfSide, setShelfSide] = useState<ShelfSide>('front');
  const [shelfLevel, setShelfLevel] = useState('1');
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
    if (!sectionDraftTouched) {
      const placement = findOpenArea(sectionData, shelfData);
      setNewSectionRect(placement.rect);
      setNewSectionLocation(placement.location);
    }
    if (!newSectionCode) setNewSectionCode(nextSectionCode(sectionData));
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
    setShelfSide(shelfAccessSides(firstShelf)[0] || 'front');
    setShelfLevel('1');
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
    const selectedShelf =
      shelves.find((item) => item.id === shelfId && item.reachable) ||
      shelves.find((item) => item.reachable);
    setShelf(selectedShelf?.name || '');
    setShelfId(selectedShelf?.id || '');
    const sides = shelfAccessSides(selectedShelf);
    setShelfSide(sides.includes(shelfSide) ? shelfSide : sides[0] || 'front');
    setShelfLevel((current) => String(Math.min(Number(current) || 1, selectedShelf?.levels || 1)));
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
    const selectedShelf = shelves.find((item) => item.id === (product.shelfId || ''));
    const sides = shelfAccessSides(selectedShelf);
    setShelfSide(
      product.shelfSide && sides.includes(product.shelfSide)
        ? product.shelfSide
        : sides[0] || 'front',
    );
    setShelfLevel(String(Math.min(product.shelfLevel || 1, selectedShelf?.levels || 1)));
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
          shelfSide,
          shelfLevel: Number(shelfLevel),
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
  const sectionMapSections =
    sections.filter((section) => section.active).length > 0
      ? sections.filter((section) => section.active)
      : zones.map((zone) => ({ ...zone, active: true }));
  const areaPreview: StoreSection = {
    id: '__new-area-preview__',
    name: newSectionName || '新区域',
    code: newSectionCode || 'NEW',
    color: '#536488',
    tint: '#e4e8f1',
    rect: newSectionRect,
    location: newSectionLocation,
    active: true,
  };
  const areaPreviewSections = [...sectionMapSections, areaPreview];
  const sectionRectOverlaps =
    sectionMapSections.some((section) => overlaps(newSectionRect, section.rect)) ||
    fixedFixtures.some((fixture) => overlaps(newSectionRect, fixture.rect)) ||
    mainAisles.some((aisle) => overlaps(newSectionRect, aisle)) ||
    shelves.some((shelf) => shelf.footprint && overlaps(newSectionRect, shelf.footprint));
  const sectionAccessReachable =
    isWalkable(newSectionLocation, areaPreviewSections, shelves) &&
    findPath(entrance, newSectionLocation, areaPreviewSections, shelves).length > 0;
  const sectionDraftReady =
    rectInBounds(newSectionRect) && !sectionRectOverlaps && sectionAccessReachable;
  const selectedProductShelf = shelves.find((item) => item.id === shelfId);
  const selectedShelfSides = shelfAccessSides(selectedProductShelf);
  const selectedShelfLevels =
    selectedProductShelf && ['gondola', 'chiller'].includes(selectedProductShelf.kind || 'gondola')
      ? selectedProductShelf.levels || 1
      : 1;
  const pickAreaMapPoint = (event: React.MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      1,
      Math.min(31, Math.floor(((event.clientX - bounds.left) / bounds.width) * 31) + 1),
    );
    const y = Math.max(
      1,
      Math.min(23, Math.floor(((event.clientY - bounds.top) / bounds.height) * 23) + 1),
    );
    setSectionDraftTouched(true);
    setSectionError('');
    if (sectionPickMode === 'rect') setNewSectionRect((rect) => ({ ...rect, x, y }));
    else setNewSectionLocation({ x, y });
  };
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
          <a className="button secondary area-add-shortcut" href="#section-create-form">
            新增门店分区
          </a>
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
          className="area-create-panel"
          id="section-create-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setSectionError('');
            if (!sectionDraftReady) {
              setSectionError('请调整区域矩形或通道到达点，直到预览显示可导航。');
              return;
            }
            setSectionSaving(true);
            try {
              const created = await api<StoreSection>('/sections', {
                method: 'POST',
                body: JSON.stringify({
                  id: `section-${Date.now().toString(36)}`,
                  name: newSectionName,
                  code: newSectionCode,
                  color: '#536488',
                  tint: '#e4e8f1',
                  location: newSectionLocation,
                  rect: newSectionRect,
                }),
              });
              setNewSectionName('');
              const updatedSections = await api<StoreSection[]>('/sections');
              const placement = findOpenArea(updatedSections, shelves);
              setNewSectionCode(nextSectionCode(updatedSections));
              setNewSectionRect(placement.rect);
              setNewSectionLocation(placement.location);
              setSectionDraftTouched(false);
              await refreshLocations();
              if (created) onToast(`区域“${created.name}”已新增，可继续添加货架。`);
            } catch (e) {
              setSectionError((e as Error).message);
            } finally {
              setSectionSaving(false);
            }
          }}
        >
          <div className="area-create-heading">
            <div>
              <h3>新增门店分区</h3>
              <p>设置地图上的占用矩形和入口通道点，预览会标出已有区域与障碍。</p>
            </div>
            <span className={sectionDraftReady ? 'area-ready' : 'area-needs-adjustment'}>
              {sectionDraftReady ? '通道可到达' : '需要调整位置'}
            </span>
          </div>
          <div className="area-create-layout">
            <div className="area-create-fields">
              <label className="field">
                区域名称
                <input
                  value={newSectionName}
                  onChange={(e) => {
                    setNewSectionName(e.target.value);
                    setSectionError('');
                  }}
                  maxLength={40}
                  required
                  placeholder="例如：宠物用品区"
                />
              </label>
              <label className="field">
                区域编号
                <input
                  value={newSectionCode}
                  onChange={(e) => {
                    setNewSectionCode(e.target.value.toUpperCase());
                    setSectionError('');
                  }}
                  maxLength={8}
                  pattern="[A-Za-z0-9-]+"
                  required
                  placeholder="例如：H"
                />
              </label>
              <fieldset className="area-coordinates">
                <legend>地图矩形（左上角与宽高）</legend>
                {(['x', 'y', 'w', 'h'] as const).map((key) => (
                  <label className="field" key={key}>
                    {key.toUpperCase()}
                    <input
                      type="number"
                      min={key === 'x' || key === 'y' ? 1 : 2}
                      max={key === 'x' ? 31 : key === 'y' ? 23 : key === 'w' ? 12 : 10}
                      value={newSectionRect[key]}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setNewSectionRect((rect) => ({ ...rect, [key]: value }));
                        setSectionDraftTouched(true);
                        setSectionError('');
                      }}
                      required
                    />
                  </label>
                ))}
              </fieldset>
              <fieldset className="area-coordinates">
                <legend>通道到达点</legend>
                {(['x', 'y'] as const).map((key) => (
                  <label className="field" key={key}>
                    {key.toUpperCase()}
                    <input
                      type="number"
                      min={1}
                      max={key === 'x' ? 31 : 23}
                      value={newSectionLocation[key]}
                      onChange={(e) => {
                        setNewSectionLocation((point) => ({
                          ...point,
                          [key]: Number(e.target.value),
                        }));
                        setSectionDraftTouched(true);
                        setSectionError('');
                      }}
                      required
                    />
                  </label>
                ))}
              </fieldset>
              <label className="field">
                地图点选
                <select
                  value={sectionPickMode}
                  onChange={(e) => setSectionPickMode(e.target.value as 'rect' | 'access')}
                >
                  <option value="rect">点击地图设置矩形左上角</option>
                  <option value="access">点击地图设置通道到达点</option>
                </select>
              </label>
              {sectionError && (
                <p className="inline-error" role="alert">
                  {sectionError}
                </p>
              )}
              <button
                className="button primary"
                type="submit"
                disabled={sectionSaving || !sectionDraftReady}
              >
                {sectionSaving ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
                {sectionSaving ? '保存中…' : '保存新区域'}
              </button>
            </div>
            <div className="area-map-preview-wrap">
              <svg
                className="area-map-preview"
                viewBox="0 0 31 23"
                role="img"
                aria-label="分区地图预览，可按所选模式点选区域或通道点"
                onClick={pickAreaMapPoint}
              >
                <rect x="0" y="0" width="31" height="23" className="area-map-background" />
                {sectionMapSections.map((section) => (
                  <rect
                    key={section.id}
                    x={section.rect.x - 1}
                    y={section.rect.y - 1}
                    width={section.rect.w}
                    height={section.rect.h}
                    fill={section.tint}
                    stroke={section.color}
                    strokeWidth="0.12"
                  />
                ))}
                {fixedFixtures.map((fixture) => (
                  <rect
                    key={fixture.id}
                    x={fixture.rect.x - 1}
                    y={fixture.rect.y - 1}
                    width={fixture.rect.w}
                    height={fixture.rect.h}
                    className="area-map-fixed-fixture"
                  />
                ))}
                {shelves
                  .filter((shelf) => shelf.footprint)
                  .map((shelf) => (
                    <rect
                      key={shelf.id}
                      x={shelf.footprint!.x - 1}
                      y={shelf.footprint!.y - 1}
                      width={shelf.footprint!.w}
                      height={shelf.footprint!.h}
                      className="area-map-existing-fixture"
                    />
                  ))}
                <rect
                  x={newSectionRect.x - 1}
                  y={newSectionRect.y - 1}
                  width={Math.max(0.1, newSectionRect.w)}
                  height={Math.max(0.1, newSectionRect.h)}
                  className={
                    sectionRectOverlaps ? 'area-map-draft area-map-draft-invalid' : 'area-map-draft'
                  }
                />
                <circle
                  cx={entrance.x - 0.5}
                  cy={entrance.y - 0.5}
                  r="0.28"
                  className="area-map-entrance"
                />
                <circle
                  cx={newSectionLocation.x - 0.5}
                  cy={newSectionLocation.y - 0.5}
                  r="0.34"
                  className={
                    sectionAccessReachable
                      ? 'area-map-access'
                      : 'area-map-access area-map-access-invalid'
                  }
                />
                <rect x="0" y="0" width="31" height="23" fill="transparent" />
              </svg>
              <div className="area-map-legend">
                <span>
                  <i className="legend-area" />
                  现有区域
                </span>
                <span>
                  <i className="legend-draft" />
                  新区域
                </span>
                <span>
                  <i className="legend-access" />
                  通道到达点
                </span>
                <span>入口 E</span>
              </div>
              <p className="field-note">
                {sectionDraftReady
                  ? `新区域 ${newSectionRect.w}×${newSectionRect.h} 格，到达点 ${newSectionLocation.x},${newSectionLocation.y} 可从入口到达。`
                  : sectionRectOverlaps
                    ? '矩形与现有区域或固定障碍重叠，请点击空地或调整坐标。'
                    : '区域表示可行走地面；到达点不能落在设施占地上，且需能从入口沿通道到达。'}
              </p>
            </div>
          </div>
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
        <FacilityEditor
          sections={sections}
          shelves={shelves}
          onRefresh={refreshLocations}
          onToast={onToast}
        />
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
                  const selected = shelves.find((item) => item.id === event.target.value);
                  setShelf(selected?.name || '');
                  const sides = shelfAccessSides(selected);
                  setShelfSide(sides.includes(shelfSide) ? shelfSide : sides[0] || 'front');
                  setShelfLevel('1');
                }}
              >
                <option value="">选择货架</option>
                {sections.map((section) => {
                  const sectionShelves = shelves.filter((item) => item.sectionId === section.id);
                  if (
                    !sectionShelves.length ||
                    (!section.active && !sectionShelves.some((item) => item.id === shelfId))
                  )
                    return null;
                  return (
                    <optgroup key={section.id} label={section.name}>
                      {sectionShelves.map((item) => (
                        <option key={item.id} value={item.id} disabled={!item.reachable}>
                          {item.name}
                          {item.reachable ? '' : ' · 不可达'}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>
            <label className="field">
              货架侧面
              <select
                required
                value={shelfSide}
                disabled={!selectedProductShelf || !selectedShelfSides.length}
                onChange={(event) => setShelfSide(event.target.value as ShelfSide)}
              >
                {selectedShelfSides.map((side) => (
                  <option key={side} value={side}>
                    {shelfSideNames[side]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              货架层位（从下往上）
              <input
                type="number"
                min={1}
                max={selectedShelfLevels}
                value={shelfLevel}
                disabled={!selectedProductShelf || selectedShelfLevels <= 1}
                required
                onChange={(event) => setShelfLevel(event.target.value)}
              />
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
