import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  CircleHelp,
  Compass,
  Fish,
  LayoutGrid,
  Leaf,
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
import { buildRoute, buildShelfRoute } from '../shared/navigation';
import { availableForSale, purchaseLimit } from '../shared/catalog-status';
import { productLocationLabel, productShelfTarget } from '../shared/layout';
import type {
  Category,
  Currency,
  ListItem,
  MealPlan,
  Product,
  Route,
  ShoppingAction,
  Shelf,
  StoreCategory,
  StoreSection,
  Point,
} from '../shared/types';
import { api, money } from './lib';
import Admin from './components/Admin';
import ModelSettingsPanel from './components/ModelSettingsPanel';
import ChatPanel from './components/ChatPanel';
import ProductCard from './components/ProductCard';
import ProductDetail from './components/ProductDetail';
import StoreMap from './components/StoreMap';
import MealPanel from './components/MealPanel';
import { buildMealPlan } from '../shared/meal-planner';
import { defaultHomePantry } from '../shared/recipes';
import { currencySymbol, productCurrency } from '../shared/currency';
import {
  merchandisingFamilyLabel,
  productCategoryLabel,
  productHasNavigableShelf,
  productMerchandisingSummary,
  productPlacementStatus,
} from '../shared/merchandising-display';
import {
  amountLabel,
  cartTotal,
  isWeighed,
  lineCents,
  mutateShoppingList,
  quantityStep,
  roundQuantity,
} from '../shared/shopping';

type Tab = 'guide' | 'list';
function loadHomePantry() {
  try {
    const stored = JSON.parse(localStorage.getItem('qinghe-home-pantry') || 'null');
    return Array.isArray(stored)
      ? [
          ...new Set(
            stored.filter(
              (key): key is string => typeof key === 'string' && defaultHomePantry.includes(key),
            ),
          ),
        ]
      : [...defaultHomePantry];
  } catch {
    return [...defaultHomePantry];
  }
}
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
  const [detailId, setDetailId] = useState(
    () => new URLSearchParams(window.location.search).get('product') || '',
  );
  const [collection, setCollection] = useState<'all' | 'samsclub'>(() =>
    new URLSearchParams(window.location.search).get('collection') === 'samsclub'
      ? 'samsclub'
      : 'all',
  );
  const catalogScroll = useRef(0);
  const syncProductRoute = () => {
    const id = new URLSearchParams(window.location.search).get('product') || '';
    setDetailId(id);
    requestAnimationFrame(() =>
      window.scrollTo({ top: id ? 0 : catalogScroll.current, behavior: 'instant' }),
    );
  };
  useEffect(() => {
    window.addEventListener('popstate', syncProductRoute);
    return () => window.removeEventListener('popstate', syncProductRoute);
  }, []);
  const openProductDetails = (product: Product) => {
    catalogScroll.current = window.scrollY;
    const url = new URL(window.location.href);
    url.searchParams.set('product', product.id);
    url.hash = '';
    window.history.pushState({ qingheProduct: true }, '', url);
    setDetailId(product.id);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const closeProductDetails = (restoreScroll = true) => {
    if (window.history.state?.qingheProduct && restoreScroll) window.history.back();
    else {
      const url = new URL(window.location.href);
      url.searchParams.delete('product');
      window.history.replaceState(null, '', url);
      setDetailId('');
      if (restoreScroll)
        requestAnimationFrame(() =>
          window.scrollTo({ top: catalogScroll.current, behavior: 'instant' }),
        );
    }
  };
  const [role, setRole] = useState<'customer' | 'store'>('customer');
  const [tab, setTab] = useState<Tab>('guide');
  const displayTab: Tab = (tab as string) === 'map' ? 'guide' : tab;
  const [mapScrollRequest, setMapScrollRequest] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [storeSections, setStoreSections] = useState<StoreSection[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [ai, setAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [currencyMode, setCurrencyMode] = useState<Currency>('USD');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');
  const [shownLimit, setShownLimit] = useState(48);
  const [recommendations, setRecommendations] = useState<Product[] | null>(null);
  const [resultTitle, setResultTitle] = useState('');
  const [current, setCurrent] = useState<Category | 'entrance'>('entrance');
  const [currentPoint, setCurrentPoint] = useState<Point>(entrance);
  const [route, setRoute] = useState<Route | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selected, setSelected] = useState<Category | undefined>();
  const [list, setListState] = useState<ListItem[]>(loadList);
  const listRef = useRef(list);
  const undoStack = useRef<ListItem[][]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [homePantry, setHomePantry] = useState<string[]>(loadHomePantry);
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
  const currencyProducts = useMemo(
    () => products.filter((product) => productCurrency(product) === currencyMode),
    [products, currencyMode],
  );
  const currencyProductIds = useMemo(
    () => new Set(currencyProducts.map((product) => product.id)),
    [currencyProducts],
  );
  const currencyList = useMemo(
    () => list.filter((item) => currencyProductIds.has(item.productId)),
    [list, currencyProductIds],
  );
  const otherCurrencyListCount = list.length - currencyList.length;
  const displayedPlan = useMemo(
    () =>
      mealPlan
        ? buildMealPlan(
            mealPlan.preferences,
            currencyProducts,
            currencyList,
            mealPlan.recipes.map((recipe) => recipe.id),
            storeCategories,
          )
        : null,
    [mealPlan, currencyProducts, currencyList, storeCategories],
  );
  const askAgent = (text: string) => {
    setTab('guide');
    setChatRequest({ id: ++requestNumber.current, text });
  };
  const [toast, setToast] = useState('');
  const categoryName = (id?: string) => {
    if (!id) return '';
    return (
      storeCategories.find((item) => item.id === id)?.name ||
      merchandisingFamilyLabel(id, categoryLabels[id] || id)
    );
  };
  const shelfForProduct = (product: Product) => {
    if (!productHasNavigableShelf(product)) return undefined;
    if (product.catalogOrigin === 'open-prices') {
      const shelf = shelves.find((item) => item.id === product.shelfId);
      if (!shelf?.reachable || !shelf.position) return undefined;
      const target = productShelfTarget(product, shelf);
      return target.reachable && target.position ? shelf : undefined;
    }
    return (
      shelves.find((item) => item.id === product.shelfId) ||
      shelves.find((item) => item.name === product.shelf)
    );
  };
  const productLocationOrStatus = (product: Product) =>
    shelfForProduct(product)
      ? productLocationLabel(product)
      : productPlacementStatus(product) || '待安排陈列';
  const revealHomeMap = () => {
    setTab('guide');
    setMapScrollRequest((request) => request + 1);
  };
  useEffect(() => {
    if (!mapScrollRequest) return;
    requestAnimationFrame(() =>
      document
        .getElementById('store-floor-viewport')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    );
  }, [mapScrollRequest]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = (text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4500);
  };
  const refresh = async () => {
    const [data, places, categoryData, sectionData] = await Promise.all([
      api<Product[]>('/products'),
      api<Shelf[]>('/shelves'),
      api<StoreCategory[]>('/categories'),
      api<StoreSection[]>('/sections'),
    ]);
    setProducts(data);
    setShelves(places);
    setStoreCategories(categoryData);
    setStoreSections(sectionData);
  };
  const receivePlan = (plan: MealPlan | null) => {
    if (!plan) {
      setMealPlan(null);
      return;
    }
    if (plan.preferences.homePantry) setHomePantry(plan.preferences.homePantry);
    void refresh().then(
      () => setMealPlan(plan),
      () => setMealPlan(plan),
    );
  };
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [data, status, places, categoryData, sectionData] = await Promise.all([
        api<Product[]>('/products'),
        api<{ ai: boolean }>('/status'),
        api<Shelf[]>('/shelves'),
        api<StoreCategory[]>('/categories'),
        api<StoreSection[]>('/sections'),
      ]);
      setProducts(data);
      setShelves(places);
      setStoreCategories(categoryData);
      setStoreSections(sectionData);
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
  useEffect(() => {
    try {
      localStorage.setItem('qinghe-home-pantry', JSON.stringify(homePantry));
    } catch {
      /* Private browsing can disable storage; the current tab keeps its selection. */
    }
  }, [homePantry]);
  const availableList = currencyList.flatMap((item) => {
    const product = currencyProducts.find((p) => p.id === item.productId);
    return product ? [{ ...item, product }] : [];
  });
  const listCount = availableList.length;
  const total = cartTotal(currencyList, currencyProducts);
  const add = (product: Product) => {
    if (productCurrency(product) !== currencyMode || !availableForSale(product)) return;
    setList((previous) =>
      previous.some((item) => item.productId === product.id)
        ? previous.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  purchasedQuantity:
                    (item.purchasedQuantity || 0) + (item.checked ? item.quantity : 0),
                  checked: false,
                  quantity: Math.min(
                    (item.checked ? 0 : item.quantity) + 1,
                    purchaseLimit(product),
                  ),
                }
              : item,
          )
        : [...previous, { productId: product.id, quantity: 1, checked: false }],
    );
    notify(`${product.name}已加入购物清单`);
  };
  const positionFor = (id: Category | 'entrance') =>
    id === 'entrance'
      ? entrance
      : storeSections.find((section) => section.id === id)?.location ||
        zones.find((zone) => zone.id === id)?.location ||
        entrance;
  const navigateTo = (id: Category, switchTab = false) => {
    const categoryRecord = storeCategories.find((item) => item.id === id);
    const sectionId = categoryRecord?.sectionId || id;
    const matchingProducts = currencyProducts.filter((product) => product.category === id);
    const destinations = categoryRecord
      ? [
          ...new Map(
            matchingProducts
              .map(shelfForProduct)
              .filter((shelf): shelf is Shelf => !!shelf)
              .map((shelf) => [shelf.id, shelf] as const),
          ).values(),
        ]
      : shelves.filter((shelf) => shelf.sectionId === sectionId && shelf.reachable);
    const section = storeSections.find((item) => item.id === sectionId);
    setSelected(destinations[0]?.sectionId || sectionId);
    if (categoryRecord && !destinations.length) {
      setRoute({
        points: [currentPoint],
        stops: [],
        distance: 0,
        minutes: 0,
        unreachable: [
          `${categoryRecord.name}（当前商品待确认分类、保存条件或陈列位置，暂不可导航）`,
        ],
      });
    } else if (categoryRecord) {
      const next = buildShelfRoute(destinations, currentPoint, storeSections, shelves);
      const notPlaced = matchingProducts
        .filter((product) => !shelfForProduct(product))
        .map((product) => `${product.name}（${productPlacementStatus(product) || '待安排陈列'}）`);
      next.unreachable = [...(next.unreachable || []), ...notPlaced];
      setRoute(next);
    } else if (!sectionId || !section) {
      setRoute({
        points: [currentPoint],
        stops: [],
        distance: 0,
        minutes: 0,
        unreachable: [`${id}（未关联门店分区）`],
      });
    } else
      setRoute(
        destinations.length
          ? buildShelfRoute(destinations, currentPoint, storeSections, shelves)
          : buildShelfRoute(
              [
                {
                  id: section.id,
                  sectionId: section.id,
                  name: section.name,
                  position: section.location,
                  reachable: section.active,
                },
              ],
              currentPoint,
              storeSections,
              shelves,
            ),
      );
    if (switchTab || window.innerWidth < 800) revealHomeMap();
  };
  const navigateSection = (sectionId: string) => {
    const destinations = shelves.filter(
      (shelf) => shelf.sectionId === sectionId && shelf.reachable,
    );
    const section = storeSections.find((item) => item.id === sectionId);
    setSelected(sectionId);
    setRoute(
      destinations.length
        ? buildShelfRoute(destinations, currentPoint, storeSections, shelves)
        : section
          ? buildShelfRoute(
              [
                {
                  id: section.id,
                  sectionId: section.id,
                  name: section.name,
                  position: section.location,
                  reachable: section.active,
                },
              ],
              currentPoint,
              storeSections,
              shelves,
            )
          : {
              points: [currentPoint],
              stops: [],
              distance: 0,
              minutes: 0,
              unreachable: [`${sectionId}（未关联门店分区）`],
            },
    );
    revealHomeMap();
  };
  const navigateShelf = (shelf: Shelf) => {
    setSelectedProductId('');
    const next = buildShelfRoute([shelf], currentPoint, storeSections, shelves);
    setSelected(shelf.sectionId);
    setRoute(next);
    revealHomeMap();
    notify(
      next.shelfStops?.length
        ? `已规划前往 ${shelf.name} 的模拟路线。`
        : `${shelf.name} 暂不可达，请在超市端配置通道位置。`,
    );
  };
  const navigateProduct = (product: Product) => {
    const shelf = shelfForProduct(product);
    if (shelf) {
      setSelectedProductId(product.id);
      const target = productShelfTarget(product, shelf);
      const next = buildShelfRoute([target], currentPoint, storeSections, shelves);
      setSelected(target.sectionId);
      setRoute(next);
      revealHomeMap();
    } else {
      setSelectedProductId('');
      notify(`${product.name}：${productPlacementStatus(product) || '待安排陈列'}，暂不可导航。`);
    }
  };
  const arrive = () => {
    if (!route?.stops.length) return;
    const stop = route.stops[0];
    setCurrent(stop);
    const reachedPoint = route.shelfStops?.[0]?.position || positionFor(stop);
    setCurrentPoint(reachedPoint);
    const remaining = route.shelfStops?.slice(1);
    setRoute(
      remaining?.length
        ? buildShelfRoute(remaining, reachedPoint, storeSections, shelves)
        : route.stops.length > 1
          ? buildRoute(route.stops.slice(1), positionFor(stop))
          : null,
    );
    notify(`模拟到达${route.shelfStops?.[0]?.name || categoryName(stop)}，可以挑选商品了。`);
  };
  const changePosition = (id: Category | 'entrance') => {
    setCurrent(id);
    const point = positionFor(id);
    setCurrentPoint(point);
    if (route)
      setRoute(
        route.shelfStops
          ? buildShelfRoute(route.shelfStops, point, storeSections, shelves)
          : buildRoute(route.stops, point),
      );
  };
  const planList = () => {
    const pendingItems = availableList.filter(
      (item) => !item.checked && availableForSale(item.product),
    );
    const targets = pendingItems
      .map((item) => {
        const shelf = shelfForProduct(item.product);
        return shelf ? productShelfTarget(item.product, shelf) : undefined;
      })
      .filter((target): target is Shelf => !!target);
    if (!pendingItems.length) {
      notify('清单里没有待购买的在售商品。');
      return;
    }
    const missing = pendingItems
      .filter((item) => !shelfForProduct(item.product))
      .map(
        (item) => `${item.product.name}（${productPlacementStatus(item.product) || '待安排陈列'}）`,
      );
    const nextRoute = buildShelfRoute(targets, currentPoint, storeSections, shelves);
    if (missing.length) nextRoute.unreachable = [...(nextRoute.unreachable || []), ...missing];
    setRoute(nextRoute);
    revealHomeMap();
  };
  const executeAction = async (action: ShoppingAction): Promise<string> => {
    if (action.type === 'undo') {
      const before = undoStack.current.pop();
      if (!before) return '当前没有可以撤销的清单操作。';
      listRef.current = before;
      setListState(before);
      const message = `已撤销上一次清单操作。待购合计 ${currencySymbol(currencyMode)}${money(cartTotal(before, currencyProducts))}。`;
      notify(message);
      return message;
    }
    if (action.type === 'navigate') {
      if (action.productId) {
        const product = currencyProducts.find((item) => item.id === action.productId);
        if (product) {
          navigateProduct(product);
          return shelfForProduct(product)
            ? `正在模拟前往 ${productLocationLabel(product)}。`
            : `${product.name}：${productPlacementStatus(product) || '待安排陈列'}，暂不可导航。`;
        }
      }
      if (action.category) {
        navigateTo(action.category, true);
        return `已规划前往${categoryName(action.category)}的路线，可在地图中查看。`;
      }
      const requestedProducts = listRef.current
        .filter((item) => !item.checked && currencyProductIds.has(item.productId))
        .flatMap((item) => {
          const product = currencyProducts.find(
            (p) => p.id === item.productId && availableForSale(p),
          );
          return product ? [product] : [];
        });
      const pending = requestedProducts.flatMap((item) => {
        const shelf = shelfForProduct(item);
        return shelf ? [productShelfTarget(item, shelf)] : [];
      });
      if (!requestedProducts.length)
        return '清单里没有待购的在售商品。请先确认采购方案或加入商品。';
      if (!pending.length)
        return requestedProducts
          .map((product) => `${product.name}：${productPlacementStatus(product) || '待安排陈列'}`)
          .join('；');
      const nextRoute = buildShelfRoute(pending, currentPoint, storeSections, shelves);
      const unplaced = requestedProducts
        .filter((product) => !shelfForProduct(product))
        .map((product) => `${product.name}（${productPlacementStatus(product) || '待安排陈列'}）`);
      nextRoute.unreachable = [...(nextRoute.unreachable || []), ...unplaced];
      setRoute(nextRoute);
      revealHomeMap();
      return `已按待购清单规划 ${nextRoute.shelfStops?.length || 0} 个取货点的路线，约 ${nextRoute.distance} 米。到达后可说“去下一站”推进模拟行程。`;
    }
    if (action.type === 'next') {
      if (!route?.stops.length) return '当前没有正在进行的路线。可以先说“按清单规划路线”。';
      const reached = route.stops[0];
      arrive();
      revealHomeMap();
      return route.stops.length > 1
        ? `已模拟到达${route.shelfStops?.[0]?.name || categoryName(reached)}，下一站是${route.shelfStops?.[1]?.name || categoryName(route.stops[1])}。`
        : `已模拟到达${route.shelfStops?.[0]?.name || categoryName(reached)}，本次路线完成。`;
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
          .map((p) => currencyProducts.find((current) => current.id === p.id))
          .filter((p): p is Product => !!p)
      : currencyProducts;
    return source
      .filter(
        (p) =>
          p.status !== 'archived' &&
          (collection === 'all' || p.sourceRetailer === 'Sam’s Club US') &&
          (p.inventoryMode === 'untracked' || availableForSale(p) || p.status === 'draft') &&
          (category === 'all' || p.category === category) &&
          `${p.name}${p.tags.join('')}${p.aliases.join('')}`.includes(query),
      )
      .sort((a, b) => {
        if (sort === 'asc') return a.price - b.price;
        if (sort === 'desc') return b.price - a.price;
        const catalogPriority = (product: Product) =>
          Number(availableForSale(product)) * 4 +
          Number(product.price > 0) * 2 +
          Number(!!product.image);
        return (
          Number(b.sourceRetailer === 'Sam’s Club US') -
            Number(a.sourceRetailer === 'Sam’s Club US') || catalogPriority(b) - catalogPriority(a)
        );
      });
  }, [currencyProducts, recommendations, category, query, sort, collection]);
  useEffect(() => setShownLimit(48), [category, query, sort, recommendations]);
  const visibleProducts = shown.slice(0, shownLimit);
  const handleResults = (results: Product[], title: string) => {
    setRecommendations(
      title ? results.filter((product) => productCurrency(product) === currencyMode) : null,
    );
    setResultTitle(title);
    setCategory('all');
    setQuery('');
  };
  const changeCurrencyMode = (currency: Currency) => {
    if (currency === currencyMode) return;
    setCurrencyMode(currency);
    if (currency === 'CNY') setCollection('all');
    setRecommendations(null);
    setResultTitle('');
    setCategory('all');
    setQuery('');
    setMealPlan(null);
  };
  const mapProps = {
    route,
    current,
    currentPoint,
    sections: storeSections,
    shelves,
    products: currencyProducts,
    selectedProductId,
    onSelectProduct: navigateProduct,
    onClearSelectedProduct: () => setSelectedProductId(''),
    onViewProduct: openProductDetails,
    onShelfSelect: navigateShelf,
    onPlanList: planList,
    selected,
    onSelect: (id: Category) => {
      const matchingCategories = storeCategories.filter(
        (item) => item.sectionId === id && item.active,
      );
      setCategory(matchingCategories.length === 1 ? matchingCategories[0].id : 'all');
      navigateSection(id);
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
              if (detailId) closeProductDetails(false);
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
                { id: 'list', label: '购物清单', Icon: ShoppingBag },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                className={displayTab === id && role === 'customer' ? 'active' : ''}
                aria-current={displayTab === id && role === 'customer' ? 'page' : undefined}
                onClick={() => {
                  if (detailId) closeProductDetails(false);
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
              onClick={() => {
                if (detailId) closeProductDetails(false);
                setRole('customer');
              }}
              aria-pressed={role === 'customer'}
            >
              顾客端
            </button>
            <button
              className={role === 'store' ? 'active' : ''}
              onClick={() => {
                if (detailId) closeProductDetails(false);
                setRole('store');
              }}
              aria-pressed={role === 'store'}
            >
              <Store size={14} />
              超市端
            </button>
          </div>
        </div>
      </header>
      <ModelSettingsPanel />
      <div id="main-content" tabIndex={-1}>
        {detailId && (
          <ProductDetail
            key={detailId}
            id={detailId}
            onBack={() => closeProductDetails()}
            onAdd={add}
            onNavigate={(product) => {
              closeProductDetails(false);
              navigateProduct(product);
            }}
            added={list.some((item) => item.productId === detailId)}
          />
        )}
        <div hidden={!!detailId}>
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
            <main className={`main-container ${displayTab === 'guide' ? 'guide-main' : ''}`}>
              <div className="page-heading">
                <div>
                  <h1>{displayTab === 'guide' ? '今天，想买点什么？' : '把想买的，都记下来。'}</h1>
                  <p>
                    {displayTab === 'guide'
                      ? '聊聊你的想法，小禾帮你挑选，也带你找到。'
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
              <div hidden={displayTab !== 'guide'}>
                <div className="guide-workspace">
                  <ChatPanel
                    key={currencyMode}
                    currency={currencyMode}
                    products={currencyProducts}
                    onResults={handleResults}
                    onNavigate={navigateProduct}
                    onView={openProductDetails}
                    onAdd={add}
                    onToast={notify}
                    ai={ai}
                    context={{
                      cart: currencyList,
                      meal: displayedPlan?.preferences,
                      recipeIds: displayedPlan?.recipes.map((recipe) => recipe.id),
                      homePantry,
                    }}
                    storeCategories={storeCategories}
                    onPlan={receivePlan}
                    onAction={executeAction}
                    onBusy={setChatBusy}
                    request={chatRequest}
                    onRequestConsumed={() => setChatRequest(null)}
                    visible={displayTab === 'guide'}
                  />
                  {displayTab === 'guide' && <StoreMap {...mapProps} />}
                </div>
                {displayedPlan && (
                  <div className="meal-plan-below-map">
                    <MealPanel
                      plan={displayedPlan}
                      categoryNames={Object.fromEntries(
                        storeCategories.map((item) => [item.id, item.name]),
                      )}
                      busy={chatBusy}
                      onSend={askAgent}
                    />
                  </div>
                )}
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
                      <h2>{resultTitle || '门店商品目录'}</h2>
                      <span className="muted compact">
                        {currencyMode} · {currencyMode === 'USD' ? '美元' : '人民币'} ·{' '}
                        {shown.length} 个商品
                      </span>
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
                  {currencyMode === 'USD' && (
                    <div className="catalog-source-switch" role="group" aria-label="商品来源">
                      <button
                        className={collection === 'all' ? 'active' : ''}
                        aria-pressed={collection === 'all'}
                        onClick={() => setCollection('all')}
                      >
                        全部商品
                      </button>
                      <button
                        className={collection === 'samsclub' ? 'active' : ''}
                        aria-pressed={collection === 'samsclub'}
                        onClick={() => {
                          setCollection('samsclub');
                          setCategory('all');
                          setQuery('');
                          setRecommendations(null);
                          setResultTitle('');
                        }}
                      >
                        山姆精选 · {currencyProducts.filter((product) => product.sourceRetailer === 'Sam’s Club US' && product.status !== 'archived').length}款
                      </button>
                    </div>
                  )}
                  <div className="product-toolbar">
                    <div className="currency-toggle" role="group" aria-label="目录币种">
                      <button
                        className={currencyMode === 'USD' ? 'active' : ''}
                        aria-pressed={currencyMode === 'USD'}
                        onClick={() => changeCurrencyMode('USD')}
                      >
                        USD 美元
                      </button>
                      <button
                        className={currencyMode === 'CNY' ? 'active' : ''}
                        aria-pressed={currencyMode === 'CNY'}
                        onClick={() => changeCurrencyMode('CNY')}
                      >
                        CNY 人民币
                      </button>
                    </div>
                    <div className="category-tabs" role="group" aria-label="商品分区">
                      <button
                        className={category === 'all' ? 'active' : ''}
                        onClick={() => setCategory('all')}
                      >
                        <LayoutGrid size={15} />
                        全部好物
                      </button>
                      {storeCategories
                        .filter(
                          (item) =>
                            item.active &&
                            currencyProducts.some((product) => product.category === item.id),
                        )
                        .map((zone) => (
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
                      {visibleProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          categoryLabel={productCategoryLabel(
                            product,
                            storeCategories,
                            categoryLabels[product.category] || product.category,
                          )}
                          onAdd={add}
                          onNavigate={navigateProduct}
                          onView={openProductDetails}
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
                  {shownLimit < shown.length && (
                    <div className="product-load-more">
                      <button
                        className="button secondary"
                        onClick={() =>
                          setShownLimit((current) => Math.min(current + 48, shown.length))
                        }
                      >
                        加载更多（{visibleProducts.length}/{shown.length}）
                      </button>
                    </div>
                  )}
                </section>
              </div>
              {displayTab === 'list' && (
                <section className="shopping-page">
                  {otherCurrencyListCount > 0 && (
                    <p className="currency-separation-note" role="status">
                      另有 {otherCurrencyListCount} 件其他币种商品仍保留在清单中；当前只显示{' '}
                      {currencyMode} 小计。
                      <button
                        className="text-button"
                        onClick={() => changeCurrencyMode(currencyMode === 'USD' ? 'CNY' : 'USD')}
                      >
                        切换查看
                      </button>
                    </p>
                  )}
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
                              setList((previous) =>
                                previous.filter(
                                  (item) =>
                                    !currencyProductIds.has(item.productId) || !item.checked,
                                ),
                              )
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
                              <strong>
                                <button
                                  className="product-title-link"
                                  onClick={() => openProductDetails(item.product)}
                                >
                                  {item.product.name}
                                </button>
                              </strong>
                              <span>
                                {categoryName(item.product.category)} ·{' '}
                                {productLocationOrStatus(item.product)} · {item.product.unit}
                                {item.product.inventoryMode !== 'untracked' && !item.product.stock
                                  ? ' · 已售罄'
                                  : ''}
                              </span>
                              {productMerchandisingSummary(item.product) && (
                                <span className="shopping-item-merchandising">
                                  {productMerchandisingSummary(item.product)}
                                </span>
                              )}
                              <span>{amountLabel(item.product, item.quantity)}</span>
                              {!!item.purchasedQuantity && (
                                <span>
                                  此前已购：{amountLabel(item.product, item.purchasedQuantity)}
                                </span>
                              )}
                              <button
                                className="text-button"
                                onClick={() => navigateProduct(item.product)}
                                disabled={!shelfForProduct(item.product)}
                              >
                                {shelfForProduct(item.product) ? (
                                  <>
                                    带我去
                                    <ArrowUpRight size={13} />
                                  </>
                                ) : (
                                  productPlacementStatus(item.product) || '待安排陈列'
                                )}
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
                                  purchaseLimit(item.product)
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
                              {currencySymbol(currencyMode)}
                              {money(lineCents(item.product, item.quantity) / 100)}
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
                          <strong>
                            {currencySymbol(currencyMode)}
                            {money(total)}
                          </strong>
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
                            整单预算 {currencySymbol(currencyMode)}
                            {money(displayedPlan.preferences.budget)} ·{' '}
                            {total > displayedPlan.preferences.budget
                              ? `已超出 ${currencySymbol(currencyMode)}${money(total - displayedPlan.preferences.budget)}`
                              : `还余 ${currencySymbol(currencyMode)}${money(displayedPlan.preferences.budget - total)}`}
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
                            !availableList.some(
                              (item) => !item.checked && availableForSale(item.product),
                            )
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
