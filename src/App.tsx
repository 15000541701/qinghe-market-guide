import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Compass,
  Fish,
  LayoutGrid,
  Leaf,
  Map as MapIcon,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Search,
  ShoppingBasket,
  ShoppingBag,
  SlidersHorizontal,
  Sprout,
  Store,
  Trash2,
  Wheat,
  X,
} from 'lucide-react';
import { categoryLabels, entrance, zones } from '../shared/catalog';
import { buildRoute } from '../shared/navigation';
import type { Category, ListItem, MealPlan, Product, Route, ShoppingAction } from '../shared/types';
import { api, money } from './lib';
import Admin from './components/Admin';
import ChatPanel from './components/ChatPanel';
import ProductCard from './components/ProductCard';
import StoreMap from './components/StoreMap';
import MealPanel from './components/MealPanel';
import { buildMealPlan } from '../shared/meal-planner';
import {
  amountLabel,
  cartTotal,
  isWeighed,
  lineCents,
  mutateShoppingList,
  quantityStep,
  roundQuantity,
} from '../shared/shopping';

type Tab = 'guide' | 'map' | 'list';
function loadList(): ListItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem('qinghe-list') || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(
          (x) =>
            typeof x?.productId === 'string' &&
            Number.isFinite(x.quantity) &&
            x.quantity > 0 &&
            x.quantity <= 99 &&
            (x.purchasedQuantity === undefined ||
              (Number.isFinite(x.purchasedQuantity) &&
                x.purchasedQuantity >= 0 &&
                x.purchasedQuantity <= 999)) &&
            typeof x.checked === 'boolean',
        )
      : [];
  } catch {
    return [];
  }
}
export default function App() {
  const [role, setRole] = useState<'customer' | 'store'>('customer');
  const [tab, setTab] = useState<Tab>('guide');
  const [products, setProducts] = useState<Product[]>([]);
  const [ai, setAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');
  const [recommendations, setRecommendations] = useState<Product[] | null>(null);
  const [resultTitle, setResultTitle] = useState('');
  const [current, setCurrent] = useState<Category | 'entrance'>('entrance');
  const [route, setRoute] = useState<Route | null>(null);
  const [selected, setSelected] = useState<Category | undefined>();
  const [list, setListState] = useState<ListItem[]>(loadList);
  const listRef = useRef(list);
  const undoStack = useRef<ListItem[][]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatRequest, setChatRequest] = useState<{ id: number; text: string } | null>(null);
  const requestNumber = useRef(0);
  const setList = (update: ListItem[] | ((previous: ListItem[]) => ListItem[])) => {
    const before = listRef.current;
    const next = typeof update === 'function' ? update(before) : update;
    if (JSON.stringify(before) === JSON.stringify(next)) return;
    undoStack.current = [...undoStack.current.slice(-9), before.map((item) => ({ ...item }))];
    listRef.current = next;
    setListState(next);
  };
  const displayedPlan = useMemo(
    () =>
      mealPlan
        ? buildMealPlan(
            mealPlan.preferences,
            products,
            list,
            mealPlan.recipes.map((recipe) => recipe.id),
          )
        : null,
    [mealPlan, products, list],
  );
  const askAgent = (text: string) => {
    setTab('guide');
    setChatRequest({ id: ++requestNumber.current, text });
  };
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = (text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4500);
  };
  const refresh = async () => {
    const data = await api<Product[]>('/products');
    setProducts(data);
  };
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, status] = await Promise.all([
        api<Product[]>('/products'),
        api<{ ai: boolean }>('/status'),
      ]);
      setProducts(data);
      setAi(status.ai);
    } catch {
      setError('暂时无法连接门店服务，请确认服务已启动后重试。');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    return () => clearTimeout(toastTimer.current);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('qinghe-list', JSON.stringify(list));
    } catch {
      /* Private browsing can disable storage; the in-memory list stays usable. */
    }
  }, [list]);
  const availableList = list.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId);
    return product ? [{ ...item, product }] : [];
  });
  const listCount = availableList.length;
  const total = cartTotal(list, products);
  const add = (product: Product) => {
    if (!product.stock) return;
    setList((previous) =>
      previous.some((item) => item.productId === product.id)
        ? previous.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  purchasedQuantity:
                    (item.purchasedQuantity || 0) + (item.checked ? item.quantity : 0),
                  checked: false,
                  quantity: Math.min((item.checked ? 0 : item.quantity) + 1, product.stock, 99),
                }
              : item,
          )
        : [...previous, { productId: product.id, quantity: 1, checked: false }],
    );
    notify(`${product.name}已加入购物清单`);
  };
  const navigateTo = (id: Category, switchTab = false) => {
    setSelected(id);
    setRoute(
      buildRoute(
        [id],
        current === 'entrance' ? entrance : zones.find((z) => z.id === current)!.location,
      ),
    );
    if (switchTab) setTab('map');
    else if (window.innerWidth < 800) {
      setTab('map');
    }
  };
  const navigateProduct = (product: Product) => {
    navigateTo(product.category);
    notify(`已规划前往${categoryLabels[product.category]}的路线 · 货架 ${product.shelf}`);
  };
  const arrive = () => {
    if (!route?.stops.length) return;
    const stop = route.stops[0];
    setCurrent(stop);
    const remaining = route.stops.slice(1);
    setRoute(
      remaining.length ? buildRoute(remaining, zones.find((z) => z.id === stop)!.location) : null,
    );
    notify(`模拟到达${categoryLabels[stop]}，可以挑选商品了。`);
  };
  const changePosition = (id: Category | 'entrance') => {
    setCurrent(id);
    if (route)
      setRoute(
        buildRoute(
          route.stops,
          id === 'entrance' ? entrance : zones.find((z) => z.id === id)!.location,
        ),
      );
  };
  const planList = () => {
    const targets = availableList
      .filter((item) => !item.checked && item.product.stock > 0)
      .map((item) => item.product.category);
    if (!targets.length) {
      notify('清单里没有待购买的在售商品。');
      return;
    }
    setRoute(
      buildRoute(
        targets,
        current === 'entrance' ? entrance : zones.find((z) => z.id === current)!.location,
      ),
    );
    setTab('map');
  };
  const executeAction = async (action: ShoppingAction): Promise<string> => {
    if (action.type === 'undo') {
      const before = undoStack.current.pop();
      if (!before) return '当前没有可以撤销的清单操作。';
      listRef.current = before;
      setListState(before);
      const message = `已撤销上一次清单操作。待购合计 ¥${money(cartTotal(before, products))}。`;
      notify(message);
      return message;
    }
    if (action.type === 'navigate') {
      if (action.category) {
        navigateTo(action.category, true);
        return `已规划前往${categoryLabels[action.category]}的路线，可在地图中查看。`;
      }
      const pending = listRef.current
        .filter((item) => !item.checked)
        .flatMap(
          (item) => products.find((p) => p.id === item.productId && p.stock > 0)?.category || [],
        );
      if (!pending.length) return '清单里没有待购的在售商品。请先确认采购方案或加入商品。';
      const nextRoute = buildRoute(
        pending,
        current === 'entrance' ? entrance : zones.find((z) => z.id === current)!.location,
      );
      setRoute(nextRoute);
      setTab('map');
      return `已按待购清单规划 ${nextRoute.stops.length} 个分区的路线，约 ${nextRoute.distance} 米。到达后可说“去下一站”推进模拟行程。`;
    }
    if (action.type === 'next') {
      if (!route?.stops.length) return '当前没有正在进行的路线。可以先说“按清单规划路线”。';
      const reached = route.stops[0];
      arrive();
      setTab('map');
      return route.stops.length > 1
        ? `已模拟到达${categoryLabels[reached]}，下一站是${categoryLabels[route.stops[1]]}。`
        : `已模拟到达${categoryLabels[reached]}，本次路线完成。`;
    }
    const freshProducts = await api<Product[]>('/products');
    setProducts(freshProducts);
    const result = mutateShoppingList(listRef.current, freshProducts, action);
    if (result.changed) setList(result.list);
    notify(result.text);
    return result.text;
  };
  const shown = useMemo(() => {
    const source = recommendations
      ? recommendations
          .map((p) => products.find((current) => current.id === p.id))
          .filter((p): p is Product => !!p)
      : products;
    return source
      .filter(
        (p) =>
          p.stock > 0 &&
          (category === 'all' || p.category === category) &&
          `${p.name}${p.tags.join('')}${p.aliases.join('')}`.includes(query),
      )
      .sort((a, b) =>
        sort === 'asc' ? a.price - b.price : sort === 'desc' ? b.price - a.price : 0,
      );
  }, [products, recommendations, category, query, sort]);
  const handleResults = (results: Product[], title: string) => {
    setRecommendations(title ? results : null);
    setResultTitle(title);
    setCategory('all');
    setQuery('');
  };
  const mapProps = {
    route,
    current,
    selected,
    onSelect: (id: Category) => {
      setCategory(id);
      navigateTo(id);
    },
    onPosition: changePosition,
    onArrive: arrive,
  };
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => {
              setRole('customer');
              setTab('guide');
            }}
            aria-label="青禾首页"
          >
            <span className="brand-symbol">
              <Sprout size={28} strokeWidth={1.6} />
            </span>
            <span className="brand-name">
              青禾<span>让采购轻松一点</span>
            </span>
          </button>
          <nav className="main-nav" aria-label="主导航">
            {(
              [
                { id: 'guide', label: '导购逛店', Icon: Compass },
                { id: 'map', label: '门店地图', Icon: MapIcon },
                { id: 'list', label: '购物清单', Icon: ShoppingBag },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                className={tab === id && role === 'customer' ? 'active' : ''}
                aria-current={tab === id && role === 'customer' ? 'page' : undefined}
                onClick={() => {
                  setRole('customer');
                  setTab(id);
                }}
              >
                <Icon size={18} />
                <span>{label}</span>
                {id === 'list' && listCount > 0 && <span className="nav-count">{listCount}</span>}
              </button>
            ))}
          </nav>
          <div className="role-switch" aria-label="切换使用角色">
            <button
              className={role === 'customer' ? 'active' : ''}
              onClick={() => setRole('customer')}
              aria-pressed={role === 'customer'}
            >
              顾客端
            </button>
            <button
              className={role === 'store' ? 'active' : ''}
              onClick={() => setRole('store')}
              aria-pressed={role === 'store'}
            >
              <Store size={14} />
              超市端
            </button>
          </div>
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>
        {error ? (
          <main className="main-container">
            <div className="service-error">
              <Store size={38} />
              <h1>门店暂时没有连接上</h1>
              <p>{error}</p>
              <button className="button primary" onClick={() => void load()}>
                重新连接
              </button>
            </div>
          </main>
        ) : role === 'store' ? (
          <Admin products={products} onRefresh={refresh} onToast={notify} ai={ai} />
        ) : (
          <main className={`main-container ${tab === 'guide' ? 'guide-main' : ''}`}>
            <div className="page-heading">
              <div>
                <h1>
                  {tab === 'guide'
                    ? '今天，想买点什么？'
                    : tab === 'map'
                      ? '跟着地图，慢慢逛。'
                      : '把想买的，都记下来。'}
                </h1>
                <p>
                  {tab === 'guide'
                    ? '聊聊你的想法，小禾帮你挑选，也带你找到。'
                    : tab === 'map'
                      ? '选择目的地，或按购物清单规划一条顺路的行程。'
                      : '挑选好物，规划路线，让这一趟采购从容一点。'}
                </p>
              </div>
              <div className="store-label">
                <MapPin size={16} />
                <span>
                  青禾生活超市<span className="demo-label">示例门店</span>
                </span>
                <span className="open-label">
                  <span className="status-dot" />
                  体验中
                </span>
              </div>
            </div>
            <div hidden={tab !== 'guide'}>
              <div className="guide-workspace">
                <ChatPanel
                  products={products}
                  onResults={handleResults}
                  onNavigate={navigateProduct}
                  onAdd={add}
                  onToast={notify}
                  ai={ai}
                  context={{
                    cart: list,
                    meal: displayedPlan?.preferences,
                    recipeIds: displayedPlan?.recipes.map((recipe) => recipe.id),
                  }}
                  onPlan={setMealPlan}
                  onAction={executeAction}
                  onBusy={setChatBusy}
                  request={chatRequest}
                  onRequestConsumed={() => setChatRequest(null)}
                  visible={tab === 'guide'}
                />
                {tab === 'guide' &&
                  (displayedPlan ? (
                    <MealPanel plan={displayedPlan} busy={chatBusy} onSend={askAgent} />
                  ) : (
                    <StoreMap {...mapProps} />
                  ))}
              </div>
              <div className="discovery-strip">
                <div className="discovery-image" />
                <div>
                  <span className="strip-leaf">
                    <Leaf size={18} />
                  </span>
                  <strong>把新鲜，带回家。</strong>
                  <span>从一把青菜开始，给日常添点好滋味。</span>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    setRecommendations(null);
                    setResultTitle('');
                    setCategory('vegetables');
                    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  去蔬菜区看看
                  <ArrowUpRight size={16} />
                </button>
              </div>
              <section className="products-section" id="products">
                <div className="section-heading">
                  <div>
                    <h2>{resultTitle || '逛逛新鲜好物'}</h2>
                    <span className="muted compact">{shown.length} 件可选商品</span>
                    {recommendations !== null && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setRecommendations(null);
                          setResultTitle('');
                        }}
                      >
                        查看全部
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <label className="search-field">
                    <Search size={16} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="搜索商品"
                      aria-label="搜索顾客商品"
                    />
                  </label>
                </div>
                <div className="product-toolbar">
                  <div className="category-tabs" role="group" aria-label="商品分区">
                    <button
                      className={category === 'all' ? 'active' : ''}
                      onClick={() => setCategory('all')}
                    >
                      <LayoutGrid size={15} />
                      全部好物
                    </button>
                    {zones.map((zone) => (
                      <button
                        key={zone.id}
                        className={category === zone.id ? 'active' : ''}
                        onClick={() => setCategory(zone.id)}
                      >
                        {zone.name}
                      </button>
                    ))}
                  </div>
                  <label className="sort-label">
                    <SlidersHorizontal size={14} />
                    <select
                      aria-label="商品排序"
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                    >
                      <option value="featured">默认排序</option>
                      <option value="asc">价格从低到高</option>
                      <option value="desc">价格从高到低</option>
                    </select>
                  </label>
                </div>
                {loading ? (
                  <div className="product-grid">
                    {[1, 2, 3, 4].map((i) => (
                      <div className="product-skeleton skeleton" key={i} />
                    ))}
                  </div>
                ) : shown.length ? (
                  <div className="product-grid">
                    {shown.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={add}
                        onNavigate={navigateProduct}
                        added={list.some((item) => item.productId === product.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <ShoppingBasket size={34} />
                    <h3>暂时没有符合条件的商品</h3>
                    <p>试试其他关键词、分区，或让小禾帮你放宽预算。</p>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setRecommendations(null);
                        setCategory('all');
                        setQuery('');
                        setResultTitle('');
                      }}
                    >
                      查看全部商品
                    </button>
                  </div>
                )}
              </section>
            </div>
            {tab === 'map' && (
              <div className="map-page">
                <aside className="zone-directory">
                  <h2>想去哪个分区？</h2>
                  <p>点击分区，查看步行路线。</p>
                  {zones.map((zone) => (
                    <button
                      key={zone.id}
                      className={selected === zone.id ? 'active' : ''}
                      onClick={() => navigateTo(zone.id)}
                    >
                      <span
                        className="zone-letter"
                        style={{ color: zone.color, background: zone.tint }}
                      >
                        {zone.code}
                      </span>
                      <span>
                        <strong>{zone.name}</strong>
                        <small>
                          {products.filter((p) => p.category === zone.id && p.stock > 0).length}{' '}
                          件在售商品
                        </small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                  <button
                    className="button primary plan-list"
                    onClick={planList}
                    disabled={!availableList.some((x) => !x.checked)}
                  >
                    <Navigation size={16} />
                    按购物清单规划
                  </button>
                  <p className="field-note">示例平面图，无真实室内定位。请手动设置“我的位置”。</p>
                  {displayedPlan && (
                    <button className="text-button" onClick={() => setTab('guide')}>
                      返回菜谱与导购对话
                      <ArrowRight size={14} />
                    </button>
                  )}
                </aside>
                <StoreMap {...mapProps} expanded />
              </div>
            )}
            {tab === 'list' && (
              <section className="shopping-page">
                {!availableList.length ? (
                  <div className="empty-state list-empty">
                    <span className="empty-basket">
                      <ShoppingBag size={40} strokeWidth={1.4} />
                    </span>
                    <h2>清单还空着，去挑点喜欢的。</h2>
                    <p>
                      点击商品图片上的加号，把好物加入清单，
                      <br />
                      小禾会帮你串起要逛的分区。
                    </p>
                    <button className="button primary" onClick={() => setTab('guide')}>
                      去逛逛
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="shopping-items">
                      <div className="section-heading">
                        <h2>
                          我的购物清单 <span className="muted compact">{listCount} 种</span>
                        </h2>
                        <button
                          className="text-button"
                          disabled={!availableList.some((item) => item.checked)}
                          onClick={() =>
                            setList((previous) => previous.filter((item) => !item.checked))
                          }
                        >
                          <CheckCheck size={15} />
                          清除已购
                        </button>
                      </div>
                      {availableList.map((item) => (
                        <div
                          className={`shopping-item ${item.checked ? 'is-checked' : ''}`}
                          key={item.productId}
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            aria-label={`标记${item.product.name}已购买`}
                            onChange={(event) =>
                              setList((previous) =>
                                previous.map((entry) =>
                                  entry.productId === item.productId
                                    ? { ...entry, checked: event.target.checked }
                                    : entry,
                                ),
                              )
                            }
                          />
                          <img src={item.product.image} alt="" />
                          <div className="shopping-item-name">
                            <strong>{item.product.name}</strong>
                            <span>
                              {categoryLabels[item.product.category]} · {item.product.shelf} ·{' '}
                              {item.product.unit}
                              {!item.product.stock ? ' · 已售罄' : ''}
                            </span>
                            <span>{amountLabel(item.product, item.quantity)}</span>
                            {!!item.purchasedQuantity && (
                              <span>
                                此前已购：{amountLabel(item.product, item.purchasedQuantity)}
                              </span>
                            )}
                            <button
                              className="text-button"
                              onClick={() => navigateTo(item.product.category, true)}
                            >
                              带我去
                              <ArrowUpRight size={13} />
                            </button>
                          </div>
                          <div className="quantity-control">
                            <button
                              aria-label={`减少${item.product.name}数量`}
                              disabled={item.quantity <= quantityStep(item.product)}
                              onClick={() =>
                                setList((previous) =>
                                  previous.map((entry) =>
                                    entry.productId === item.productId
                                      ? {
                                          ...entry,
                                          quantity: roundQuantity(
                                            Math.max(
                                              quantityStep(item.product),
                                              entry.quantity - quantityStep(item.product),
                                            ),
                                          ),
                                        }
                                      : entry,
                                  ),
                                )
                              }
                            >
                              <Minus size={13} />
                            </button>
                            <span>
                              {isWeighed(item.product)
                                ? amountLabel(item.product, item.quantity).replace('预计 ', '')
                                : item.quantity}
                            </span>
                            <button
                              aria-label={`增加${item.product.name}数量`}
                              disabled={
                                item.quantity + quantityStep(item.product) >
                                Math.min(99, item.product.stock)
                              }
                              onClick={() =>
                                setList((previous) =>
                                  previous.map((entry) =>
                                    entry.productId === item.productId
                                      ? {
                                          ...entry,
                                          quantity: roundQuantity(
                                            entry.quantity + quantityStep(item.product),
                                          ),
                                        }
                                      : entry,
                                  ),
                                )
                              }
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <strong className="item-total">
                            ¥{money(lineCents(item.product, item.quantity) / 100)}
                          </strong>
                          <button
                            className="icon-button"
                            aria-label={`从清单移除${item.product.name}`}
                            onClick={() =>
                              setList((previous) =>
                                previous.filter((entry) => entry.productId !== item.productId),
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <aside className="list-summary">
                      <ShoppingBasket size={27} strokeWidth={1.4} />
                      <h2>这一趟，要买这些。</h2>
                      <div>
                        <span>商品种类</span>
                        <strong>{listCount} 种</strong>
                      </div>
                      <div>
                        <span>待逛分区</span>
                        <strong>
                          {
                            new Set(
                              availableList
                                .filter((item) => !item.checked)
                                .map((item) => item.product.category),
                            ).size
                          }{' '}
                          个
                        </strong>
                      </div>
                      <div className="list-total">
                        <span>待购合计</span>
                        <strong>¥{money(total)}</strong>
                      </div>
                      <p>按商品标注单位计价，称重商品以实际结算为准。</p>
                      {displayedPlan?.preferences.budget != null && (
                        <p
                          className={
                            total > displayedPlan.preferences.budget
                              ? 'budget-exceeded'
                              : 'budget-remains'
                          }
                        >
                          整单预算 ¥{money(displayedPlan.preferences.budget)} ·{' '}
                          {total > displayedPlan.preferences.budget
                            ? `已超出 ¥${money(total - displayedPlan.preferences.budget)}`
                            : `还余 ¥${money(displayedPlan.preferences.budget - total)}`}
                        </p>
                      )}
                      <button
                        className="text-button"
                        disabled={!undoStack.current.length}
                        onClick={() => void executeAction({ type: 'undo' })}
                      >
                        撤销上一次清单操作
                      </button>
                      <button
                        className="button primary"
                        onClick={planList}
                        disabled={
                          !availableList.some((item) => !item.checked && item.product.stock > 0)
                        }
                      >
                        <Navigation size={16} />
                        规划采购路线
                      </button>
                      <button className="text-button" onClick={() => setTab('guide')}>
                        继续挑选
                        <ArrowRight size={14} />
                      </button>
                    </aside>
                  </>
                )}
              </section>
            )}
          </main>
        )}
      </div>
      <footer className="site-footer">
        <span>
          <Sprout size={15} />
          青禾 · 让每一次采购轻松一点
        </span>
        <span>初始商品与地图为演示数据 · 图片仅供展示</span>
        <span>虚拟超市导购原型</span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{toast}</span>
          <button onClick={() => setToast('')} aria-label="关闭提示">
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
