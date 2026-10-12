import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Check, LocateFixed, MapPin, Minus, Navigation, Plus, X } from 'lucide-react';
import { entrance } from '../../shared/catalog';
import { mapView } from '../../shared/map-config';
import { routeInstructions } from '../../shared/navigation';
import {
  fixedFixtures,
  fixtureKindLabels,
  fixtureSideLabels,
  mainAisles,
  productShelfTarget,
} from '../../shared/layout';
import type { Category, Point, Product, Route, Shelf, StoreSection } from '../../shared/types';
import { currencySymbol, productCurrency } from '../../shared/currency';
import { shelfSlotCapacity } from '../../shared/shelf-capacity';
import ProductImage from './ProductImage';
import './StoreMap.css';

interface Props {
  route: Route | null;
  current: Category | 'entrance';
  selected?: Category;
  onSelect: (id: Category) => void;
  onPosition: (id: Category | 'entrance') => void;
  onArrive: () => void;
  sections?: StoreSection[];
  currentPoint?: Point;
  shelves?: Shelf[];
  products?: Product[];
  onShelfSelect?: (shelf: Shelf) => void;
  onPlanList?: () => void;
  selectedProductId?: string;
  onSelectProduct?: (product: Product) => void;
  onClearSelectedProduct?: () => void;
}
const cell = 28;
const center = (n: number) => n * cell + cell / 2;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.8;
const DEFAULT_ZOOM = 1;
const clampZoom = (value: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
const pointDistance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const colors = {
  gondola: '#818977',
  'produce-table': '#a69570',
  'display-table': '#bb9b76',
  'service-counter': '#b78161',
  'seafood-tank': '#6ea8b7',
  chiller: '#9cb7bc',
  freezer: '#7fa3b6',
  'hanging-rack': '#a496b4',
};

function FixtureDrawing({
  shelf,
  active,
  products,
  selectedProductId,
  focusedId,
  selectedSide,
  selectedLevel,
}: {
  shelf: Shelf;
  active: boolean;
  products: Product[];
  selectedProductId?: string;
  focusedId: string;
  selectedSide?: Product['shelfSide'];
  selectedLevel?: number;
}) {
  const r = shelf.footprint;
  if (!r)
    return shelf.position ? (
      <g>
        <circle cx={center(shelf.position.x)} cy={center(shelf.position.y)} r="7" fill="#aaa" />
        <text
          x={center(shelf.position.x)}
          y={center(shelf.position.y) - 12}
          className="floor-label"
        >
          {shelf.name} · 待配置
        </text>
      </g>
    ) : null;
  const kind = shelf.kind || 'gondola';
  const x = r.x * cell,
    y = r.y * cell,
    w = r.w * cell,
    h = r.h * cell;
  const long = h > w;
  const capacity = shelfSlotCapacity(shelf);
  const level = focusedId === shelf.id ? selectedLevel || 1 : 1;
  const availableSides = Object.keys(shelf.accessPoints || {}) as NonNullable<Product['shelfSide']>[];
  const merchandiseColor = (product?: Product) => {
    if (!product) return '#edf0e8';
    const key = product.merchandisingFamily || product.displayGroup || product.category;
    const palette = ['#78a16d', '#c99b4e', '#7c9fac', '#b87e68', '#9c8db2', '#8d9b70', '#bd8dba', '#7c8cae'];
    const hash = [...key].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7);
    return palette[hash % palette.length];
  };
  const itemsForSide = (side: NonNullable<Product['shelfSide']>) =>
    products
      .filter(
        (product) =>
          product.status !== 'archived' &&
          product.shelfId === shelf.id &&
          product.shelfSide === side &&
          (product.shelfLevel || 1) === level,
      )
      .slice(0, capacity);
  const gondolaFace = (side: NonNullable<Product['shelfSide']>, sideIndex: number) => {
    const items = itemsForSide(side);
    return Array.from({ length: capacity }, (_, index) => {
      const product = items[index];
      const slotX = long
        ? x + 3 + (sideIndex ? w * 0.53 : 0)
        : x + 4 + (index * (w - 8)) / capacity;
      const slotY = long
        ? y + 5 + (index * (h - 10)) / capacity
        : y + 3 + sideIndex * h * 0.53;
      const slotWidth = long ? Math.max(3, w * 0.4) : Math.max(3, (w - 8) / capacity - 2);
      const slotHeight = long ? Math.max(3, (h - 10) / capacity - 2) : Math.max(3, h * 0.3);
      return (
        <rect
          key={`${side}-${index}`}
          x={slotX}
          y={slotY}
          width={slotWidth}
          height={slotHeight}
          rx="1"
          fill={merchandiseColor(product)}
          stroke={product?.id === selectedProductId ? '#203e2f' : product ? '#fff' : '#c8cec2'}
          strokeWidth={product?.id === selectedProductId ? 2.2 : 0.8}
        />
      );
    });
  };
  const surfaceSlots = () => {
    const side =
      (focusedId === shelf.id && selectedSide && availableSides.includes(selectedSide)
        ? selectedSide
        : availableSides[0]) || 'front';
    const items = itemsForSide(side);
    const columns = Math.ceil(Math.sqrt(capacity));
    const rows = Math.ceil(capacity / columns);
    const gap = 2;
    const slotWidth = Math.max(3, (w - 10 - (columns - 1) * gap) / columns);
    const slotHeight = Math.max(3, (h - 10 - (rows - 1) * gap) / rows);
    return Array.from({ length: capacity }, (_, index) => {
      const product = items[index];
      return (
        <rect
          key={`${side}-${index}`}
          x={x + 5 + (index % columns) * (slotWidth + gap)}
          y={y + 5 + Math.floor(index / columns) * (slotHeight + gap)}
          width={slotWidth}
          height={slotHeight}
          rx="1.5"
          fill={merchandiseColor(product)}
          stroke={product?.id === selectedProductId ? '#203e2f' : product ? '#fff' : '#c8cec2'}
          strokeWidth={product?.id === selectedProductId ? 2.2 : 0.8}
        />
      );
    });
  };
  return (
    <g>
      <rect
        x={x + 3}
        y={y + 4}
        width={w}
        height={h}
        rx={kind === 'gondola' ? 2 : 6}
        fill="#243525"
        opacity=".1"
      />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={kind === 'gondola' ? 2 : 6}
        fill={colors[kind]}
        stroke={active ? '#243e31' : '#ffffff'}
        strokeWidth={active ? 3 : 1.5}
      />
      {kind === 'gondola' && (
        <>
          <rect
            x={x + (long ? w * 0.42 : 0)}
            y={y + (long ? 0 : h * 0.42)}
            width={long ? w * 0.16 : w}
            height={long ? h : h * 0.16}
            fill="#56604f"
          />
          {availableSides.slice(0, 2).flatMap((side, index) => gondolaFace(side, index))}
          <rect x={x - 2} y={y - 3} width={w + 4} height="6" rx="2" fill="#64725c" />
          <rect x={x - 2} y={y + h - 3} width={w + 4} height="6" rx="2" fill="#64725c" />
        </>
      )}
      {kind === 'seafood-tank' && (
        <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx="4" fill="#c2e0e5" stroke="#518392" />
      )}
      {kind === 'service-counter' && (
        <>
          <rect x={x + 4} y={y + 4} width={w - 8} height={h * 0.45} rx="2" fill="#f3dfc0" />
          <path d={`M${x + 3} ${y + h - 5}h${w - 6}`} stroke="#e0eced" strokeWidth="4" />
          <text x={x + w / 2} y={y - 6} textAnchor="middle" className="floor-micro">
            员工操作侧
          </text>
        </>
      )}
      {kind === 'gondola'
        ? null
        : kind === 'hanging-rack'
          ? Array.from({ length: capacity }, (_, index) => {
              const side = availableSides[0] || 'front';
              const product = itemsForSide(side)[index];
              const slotWidth = Math.max(3, (w - 10 - (capacity - 1) * 2) / capacity);
              return (
                <rect
                  key={`hang-${index}`}
                  x={x + 5 + index * (slotWidth + 2)}
                  y={y + 7}
                  width={slotWidth}
                  height={Math.max(3, h - 14)}
                  fill={merchandiseColor(product)}
                  stroke={product?.id === selectedProductId ? '#203e2f' : product ? '#fff' : '#c8cec2'}
                />
              );
            })
          : surfaceSlots()}
      <g transform={`translate(${x + w / 2},${y + h / 2})`}>
        <rect
          x="-19"
          y="-8"
          width="38"
          height="16"
          rx="3"
          fill={active ? '#244f3b' : '#ffffff'}
          opacity=".95"
        />
        <text
          textAnchor="middle"
          y="3.5"
          fontSize="12"
          fontWeight="700"
          fill={active ? '#fff' : '#394b40'}
        >
          {shelf.name}
        </text>
      </g>
    </g>
  );
}

export default function StoreMap({
  route,
  current,
  selected,
  onSelect,
  onPosition,
  onArrive,
  sections = [],
  currentPoint,
  shelves = [],
  products = [],
  onShelfSelect,
  onPlanList,
  selectedProductId,
  onSelectProduct,
  onClearSelectedProduct,
}: Props) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [focusedId, setFocusedId] = useState('');
  const [side, setSide] = useState<NonNullable<Product['shelfSide']>>('front');
  const [hoveredProductId, setHoveredProductId] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const activePointers = useRef(new Map<number, Point>());
  const dragStart = useRef<{ id: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const pinchStart = useRef<{
    distance: number;
    zoom: number;
    worldX: number;
    worldY: number;
  } | null>(null);
  const areas = sections.filter((section) => section.active);
  const position =
    currentPoint || sections.find((section) => section.id === current)?.location || entrance;
  const routeTargetId = route?.shelfStops?.[0]?.id;
  const boundPan = (next: Point, scale: number): Point => {
    const viewport = viewportRef.current;
    if (!viewport) return next;
    const width = mapView.width * scale;
    const height = mapView.height * scale;
    const x = width <= viewport.clientWidth
      ? (viewport.clientWidth - width) / 2
      : Math.max(viewport.clientWidth - width, Math.min(0, next.x));
    const y = height <= viewport.clientHeight
      ? (viewport.clientHeight - height) / 2
      : Math.max(viewport.clientHeight - height, Math.min(0, next.y));
    return { x, y };
  };
  const fitMap = (oversize = 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const fit = Math.min(
      (viewport.clientWidth - 24) / mapView.width,
      (viewport.clientHeight - 24) / mapView.height,
    );
    const nextZoom = clampZoom(fit * oversize);
    setZoom(nextZoom);
    setPan(
      boundPan(
        {
          x: (viewport.clientWidth - mapView.width * nextZoom) / 2,
          y: (viewport.clientHeight - mapView.height * nextZoom) / 2,
        },
        nextZoom,
      ),
    );
  };
  const resetView = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const targetX = center(position.x);
    const targetY = center(position.y);
    setZoom(DEFAULT_ZOOM);
    setPan(
      boundPan(
        {
          x: viewport.clientWidth / 2 - targetX * DEFAULT_ZOOM,
          y: viewport.clientHeight / 2 - targetY * DEFAULT_ZOOM,
        },
        DEFAULT_ZOOM,
      ),
    );
  };
  const zoomAt = (nextZoom: number, clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const scale = clampZoom(nextZoom);
    const rect = viewport.getBoundingClientRect();
    const anchorX = clientX - rect.left;
    const anchorY = clientY - rect.top;
    const worldX = (anchorX - pan.x) / zoom;
    const worldY = (anchorY - pan.y) / zoom;
    setZoom(scale);
    setPan(boundPan({ x: anchorX - worldX * scale, y: anchorY - worldY * scale }, scale));
  };
  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
  }, [zoom, pan]);
  useEffect(() => {
    const frame = requestAnimationFrame(resetView);
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const rect = viewport.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const anchorY = event.clientY - rect.top;
      const worldX = (anchorX - currentPan.x) / currentZoom;
      const worldY = (anchorY - currentPan.y) / currentZoom;
      const nextZoom = clampZoom(currentZoom * Math.exp(-event.deltaY * 0.0015));
      const nextPan = boundPan(
        {
          x: anchorX - worldX * nextZoom,
          y: anchorY - worldY * nextZoom,
        },
        nextZoom,
      );
      zoomRef.current = nextZoom;
      panRef.current = nextPan;
      setZoom(nextZoom);
      setPan(nextPan);
    };
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, []);
  const onMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button,select,input,[role="button"]')) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.setPointerCapture(event.pointerId);
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.current.size === 1) {
      dragStart.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      setIsPanning(true);
    } else if (activePointers.current.size === 2) {
      const points = [...activePointers.current.values()];
      const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
      const rect = viewport.getBoundingClientRect();
      pinchStart.current = {
        distance: Math.max(1, pointDistance(points[0], points[1])),
        zoom,
        worldX: (midpoint.x - rect.left - pan.x) / zoom,
        worldY: (midpoint.y - rect.top - pan.y) / zoom,
      };
      dragStart.current = null;
    }
  };
  const onMapPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(event.pointerId)) return;
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (activePointers.current.size >= 2 && pinchStart.current) {
      const points = [...activePointers.current.values()];
      const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
      const rect = viewport.getBoundingClientRect();
      const scale = clampZoom(
        pinchStart.current.zoom * (pointDistance(points[0], points[1]) / pinchStart.current.distance),
      );
      setZoom(scale);
      setPan(
        boundPan(
          {
            x: midpoint.x - rect.left - pinchStart.current.worldX * scale,
            y: midpoint.y - rect.top - pinchStart.current.worldY * scale,
          },
          scale,
        ),
      );
    } else if (dragStart.current?.id === event.pointerId) {
      setPan(
        boundPan(
          {
            x: dragStart.current.panX + event.clientX - dragStart.current.x,
            y: dragStart.current.panY + event.clientY - dragStart.current.y,
          },
          zoom,
        ),
      );
    }
  };
  const onMapPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(event.pointerId);
    pinchStart.current = null;
    if (activePointers.current.size === 1) {
      const [id, point] = [...activePointers.current.entries()][0];
      dragStart.current = { id, x: point.x, y: point.y, panX: pan.x, panY: pan.y };
      setIsPanning(true);
    } else {
      dragStart.current = null;
      setIsPanning(false);
    }
  };
  useEffect(() => {
    if (routeTargetId) {
      setFocusedId(routeTargetId.split('@')[0]);
      const requestedSide = routeTargetId.split('@')[1] as
        NonNullable<Product['shelfSide']> | undefined;
      if (requestedSide) setSide(requestedSide);
      const frame = requestAnimationFrame(() => {
        const viewport = viewportRef.current;
        if (!viewport || !route?.points.length) return;
        viewport.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const xs = route.points.map((point) => center(point.x));
        const ys = route.points.map((point) => center(point.y));
        const left = Math.min(...xs);
        const right = Math.max(...xs);
        const top = Math.min(...ys);
        const bottom = Math.max(...ys);
        const width = Math.max(1, right - left);
        const height = Math.max(1, bottom - top);
        const routeFit = Math.min(
          (viewport.clientWidth - 48) / width,
          (viewport.clientHeight - 48) / height,
        );
        const scale = clampZoom(Math.max(DEFAULT_ZOOM, Math.min(1.35, routeFit)));
        const focus = route.shelfStops?.[0]?.position || route.points.at(-1)!;
        setZoom(scale);
        setPan(
          boundPan(
            {
              x: viewport.clientWidth / 2 - center(focus.x) * scale,
              y: viewport.clientHeight / 2 - center(focus.y) * scale,
            },
            scale,
          ),
        );
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [routeTargetId, route, shelves]);
  const focused = shelves.find((shelf) => shelf.id === focusedId);
  const focusedProducts = products.filter(
    (product) => product.status !== 'archived' && product.shelfId === focused?.id,
  );
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const availableSides = Object.keys(focused?.accessPoints || {}) as NonNullable<
    Product['shelfSide']
  >[];
  const effectiveSide = availableSides.includes(side) ? side : availableSides[0];
  const focus = (shelf: Shelf) => {
    setFocusedId(shelf.id);
    setSide((Object.keys(shelf.accessPoints || {})[0] || 'front') as typeof side);
  };
  return (
    <section
      id="home-store-map"
      className={`map-panel supermarket-map ${focused ? 'has-focused' : ''}`}
      aria-label="超市陈列与通道地图"
    >
      <div className="panel-heading">
        <div>
          <MapPin size={19} />
          <h2>卖场平面图</h2>
          <span className="muted compact">1F · 点击陈列设施查看商品</span>
        </div>
      </div>
      <div className="store-map-legend">
        {Object.entries(fixtureKindLabels).map(([key, label]) => (
          <span key={key}>
            <i style={{ background: colors[key as keyof typeof colors] }} />
            {label}
          </span>
        ))}
      </div>
      <div
        className={`store-floor-scroll ${isPanning ? 'is-panning' : ''}`}
        ref={viewportRef}
        onPointerDown={onMapPointerDown}
        onPointerMove={onMapPointerMove}
        onPointerUp={onMapPointerEnd}
        onPointerCancel={onMapPointerEnd}
        id="store-floor-viewport"
      >
        <svg
          className="store-floor-svg"
          viewBox={`0 0 ${mapView.width} ${mapView.height}`}
          width={mapView.width}
          height={mapView.height}
          style={{
            width: mapView.width,
            height: mapView.height,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          role="group"
          aria-label="主通道连接双面货架、生鲜岛台、熟食档口、活鲜池及冷藏柜"
        >
          <defs>
            <pattern
              id="floor-tiles"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <rect width="28" height="28" fill="#fbfaf6" />
              <path d="M28 0H0V28" fill="none" stroke="#eae8df" strokeWidth=".5" />
            </pattern>
          </defs>
          <rect
            x="20"
            y="20"
            width={mapView.width - 40}
            height="676"
            rx="8"
            fill="url(#floor-tiles)"
            stroke="#8c9589"
            strokeWidth="5"
          />
          {mainAisles.map((r, index) => (
            <rect
              key={index}
              x={r.x * cell}
              y={r.y * cell}
              width={r.w * cell}
              height={r.h * cell}
              fill="#eeeade"
              opacity=".72"
            />
          ))}
          <text
            x="308"
            y="337"
            textAnchor="middle"
            className="floor-aisle-label"
            transform="rotate(-90 308 337)"
          >
            主 通 道
          </text>
          <text
            x="588"
            y="337"
            textAnchor="middle"
            className="floor-aisle-label"
            transform="rotate(-90 588 337)"
          >
            主 通 道
          </text>
          <text x="451" y="307" textAnchor="middle" className="floor-aisle-label">
            横 向 通 道
          </text>
          <text x="451" y="599" textAnchor="middle" className="floor-aisle-label">
            入 口 缓 冲 区
          </text>
          {areas.map((area) => (
            <g key={area.id}>
              <rect
                x={area.rect.x * cell}
                y={area.rect.y * cell}
                width={area.rect.w * cell}
                height={area.rect.h * cell}
                rx="3"
                fill={area.tint}
                opacity={selected === area.id ? '.7' : '.28'}
                stroke={selected === area.id ? area.color : 'none'}
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={area.rect.x * cell + 5}
                y={area.rect.y * cell + 16}
                fill={area.color}
                className="floor-department"
                role="button"
                tabIndex={0}
                onClick={() => onSelect(area.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelect(area.id);
                }}
              >
                {area.code} / {area.name}
              </text>
            </g>
          ))}
          {fixedFixtures.map((fixture) => (
            <g key={fixture.id}>
              <rect
                x={fixture.rect.x * cell}
                y={fixture.rect.y * cell}
                width={fixture.rect.w * cell}
                height={fixture.rect.h * cell}
                rx="3"
                fill="#a7ada0"
              />
              <rect
                x={fixture.rect.x * cell + 5}
                y={fixture.rect.y * cell + 5}
                width="18"
                height="18"
                rx="2"
                fill="#526253"
              />
              <text
                x={(fixture.rect.x + fixture.rect.w / 2) * cell + 6}
                y={fixture.rect.y * cell + 18}
                className="floor-fixture-name"
              >
                {fixture.name}
              </text>
            </g>
          ))}
          {shelves
            .filter((shelf) => areas.some((area) => area.id === shelf.sectionId))
            .map((shelf) => (
              <g
                key={shelf.id}
                role="button"
                tabIndex={0}
                aria-label={`${fixtureKindLabels[shelf.kind || 'gondola']} ${shelf.name}，查看侧面和层位`}
                style={{ cursor: 'pointer' }}
                onClick={() => focus(shelf)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    focus(shelf);
                  }
                }}
              >
                <title>
                  {shelf.name} · {fixtureKindLabels[shelf.kind || 'gondola']}
                </title>
                <FixtureDrawing
                  shelf={shelf}
                  active={
                    focused?.id === shelf.id ||
                    !!route?.shelfStops?.some((stop) => stop.id.split('@')[0] === shelf.id)
                  }
                  products={products}
                  selectedProductId={selectedProductId}
                  focusedId={focused?.id || ''}
                  selectedSide={focused?.id === shelf.id ? effectiveSide : undefined}
                  selectedLevel={focused?.id === shelf.id ? selectedProduct?.shelfLevel || 1 : 1}
                />
              </g>
            ))}
          {route && route.points.length > 1 && (
            <>
              <polyline
                points={route.points.map((p) => `${center(p.x)},${center(p.y)}`).join(' ')}
                fill="none"
                stroke="#fff"
                strokeWidth="8"
                strokeLinejoin="round"
              />
              <polyline
                points={route.points.map((p) => `${center(p.x)},${center(p.y)}`).join(' ')}
                fill="none"
                stroke="#467e54"
                strokeWidth="4"
                strokeDasharray="7 5"
                strokeLinejoin="round"
              />
            </>
          )}
          {route?.shelfStops?.map(
            (stop, index) =>
              stop.position && (
                <g key={`${stop.id}-${index}`} pointerEvents="none">
                  <circle
                    cx={center(stop.position.x)}
                    cy={center(stop.position.y)}
                    r="10"
                    fill="#315d40"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={center(stop.position.x)}
                    y={center(stop.position.y) + 3.5}
                    textAnchor="middle"
                    fontSize="10"
                    fill="white"
                  >
                    {index + 1}
                  </text>
                </g>
              ),
          )}
          <circle
            cx={center(position.x)}
            cy={center(position.y)}
            r="9"
            fill="#315d40"
            opacity=".15"
          />
          <circle
            cx={center(position.x)}
            cy={center(position.y)}
            r="5"
            fill="#315d40"
            stroke="white"
            strokeWidth="2"
          />
          <path d="M397 696h90" stroke="#fbfaf6" strokeWidth="8" />
          <text x="434" y="721" textAnchor="middle" className="floor-label">
            入口 / 出口 ↑
          </text>
          <text x="850" y="714" textAnchor="middle" className="floor-micro">
            示例卖场 · 每格约2米
          </text>
        </svg>
        {(() => {
          const preview = products.find((product) => product.id === hoveredProductId) ||
            products.find((product) => product.id === selectedProductId);
          return preview ? (
            <div className="map-product-preview" role="status">
              <ProductImage
                src={preview.image}
                fallbackSrc={preview.sourceImageUrl}
                alt={preview.name}
                size="map"
                className="map-product-preview-image"
                priority={selectedProductId === preview.id}
              />
              <span>
                <strong title={preview.name}>{preview.name}</strong>
                <small>
                  {preview.price > 0
                    ? `${currencySymbol(productCurrency(preview))}${preview.price.toFixed(2)}/${preview.unit}`
                    : '价格待确认'}
                </small>
              </span>
              <button
                className="icon-button"
                aria-label="关闭商品预览"
                onClick={() => {
                  setHoveredProductId('');
                  onClearSelectedProduct?.();
                }}
              >
                <X size={15} />
              </button>
            </div>
          ) : null;
        })()}
      </div>
      <div className="store-map-toolbar">
        <label>
          <LocateFixed size={15} /> 我的位置{' '}
          <select value={current} onChange={(e) => onPosition(e.target.value)}>
            <option value="entrance">超市入口</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <button
            className="icon-button"
            aria-label="缩小地图"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => {
              const rect = viewportRef.current?.getBoundingClientRect();
              if (rect) zoomAt(zoom - 0.12, rect.left + rect.width / 2, rect.top + rect.height / 2);
            }}
          >
            <Minus size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="放大地图"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => {
              const rect = viewportRef.current?.getBoundingClientRect();
              if (rect) zoomAt(zoom + 0.12, rect.left + rect.width / 2, rect.top + rect.height / 2);
            }}
          >
            <Plus size={16} />
          </button>
          <button className="icon-button" aria-label="适合视口" onClick={() => fitMap(1)}>
            适合
          </button>
          <button className="icon-button" aria-label="重置地图缩放与当前位置" onClick={resetView}>
            重置
          </button>
          <span className="store-map-zoom-label" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>
      <label className="store-fixture-picker">
        查找陈列位置{' '}
        <select
          value={focusedId}
          onChange={(e) => {
            const shelf = shelves.find((s) => s.id === e.target.value);
            if (shelf) focus(shelf);
          }}
        >
          <option value="">选择货架、岛台或柜台</option>
          {areas.map((area) => (
            <optgroup key={area.id} label={area.name}>
              {shelves
                .filter((s) => s.sectionId === area.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {fixtureKindLabels[s.kind || 'gondola']}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="store-area-directory" aria-label="卖场区域">
        <div className="store-area-directory-heading">
          <strong>卖场区域</strong>
          {onPlanList && (
            <button className="text-button" onClick={onPlanList}>
              <Navigation size={14} />
              按购物清单规划
            </button>
          )}
        </div>
        <div className="store-area-grid">
          {areas.map((area) => {
            const count = products.filter(
              (product) =>
                product.status !== 'archived' &&
                shelves.find((shelf) => shelf.id === product.shelfId)?.sectionId === area.id,
            ).length;
            return (
              <button
                type="button"
                key={area.id}
                className={`store-area-card ${selected === area.id ? 'active' : ''}`}
                aria-pressed={selected === area.id}
                onClick={() => onSelect(area.id)}
              >
                <span className="store-area-code" style={{ color: area.color, background: area.tint }}>
                  {area.code}
                </span>
                <span className="store-area-name">{area.name}</span>
                <small>{count ? `${count} 件商品` : '空区域'}</small>
              </button>
            );
          })}
        </div>
      </div>
      {focused && (
        <div className="fixture-detail">
          <div className="fixture-detail-heading">
            <div>
              <small>{areas.find((a) => a.id === focused.sectionId)?.name}</small>
              <h3>
                {focused.name} · {fixtureKindLabels[focused.kind || 'gondola']}
              </h3>
            </div>
            <button
              className="icon-button"
              aria-label="关闭陈列详情"
              onClick={() => setFocusedId('')}
            >
              <X size={17} />
            </button>
          </div>
          <div className="fixture-side-tabs">
            {availableSides.map((value) => (
              <button
                key={value}
                className={effectiveSide === value ? 'active' : ''}
                onClick={() => setSide(value)}
              >
                {fixtureSideLabels[value]}
                {value === 'left' ? '（地图左）' : value === 'right' ? '（地图右）' : ''}
              </button>
            ))}
          </div>
          <p className="field-note">
            {(focused.levels || 1) > 1
              ? `从下往上编号 · 每个等大格对应1个SKU位（此侧层最多${shelfSlotCapacity(focused)}个）。`
              : focused.kind === 'service-counter'
                ? '服务柜台：从顾客侧到达，向店员选购。'
                : focused.kind === 'seafood-tank'
                  ? '池内陈列：到达池边顾客侧，由店员协助选购。'
                  : `台面陈列：到达台边取货 · 每格1个SKU位（此侧层最多${shelfSlotCapacity(focused)}个）。`}
          </p>
          <div className="fixture-elevation">
            {Array.from({ length: focused.levels || 1 }, (_, i) => (focused.levels || 1) - i).map(
              (level) => {
                const items = focusedProducts.filter(
                  (p) =>
                    (p.shelfLevel || 1) === level &&
                    (!effectiveSide || !p.shelfSide || p.shelfSide === effectiveSide),
                );
                const slotCapacity = shelfSlotCapacity(focused);
                const renderedSlotCount = Math.max(slotCapacity, items.length);
                return (
                  <div className="fixture-level" key={level}>
                    <span className="fixture-level-label">
                      {(focused.levels || 1) > 1 ? `第${level}层` : '陈列面'}
                      <small>{fixtureSideLabels[effectiveSide || 'front']}</small>
                    </span>
                    <div
                      className="fixture-slot-grid"
                      style={{ '--slot-count': renderedSlotCount } as CSSProperties}
                    >
                      {Array.from({ length: renderedSlotCount }, (_, slot) => {
                        const product = items[slot];
                        return product ? (
                          <button
                            type="button"
                            key={product.id}
                            className={`fixture-slot ${selectedProductId === product.id ? 'selected' : ''} ${slot >= slotCapacity ? 'over-capacity' : ''}`}
                            aria-pressed={selectedProductId === product.id}
                            title={`${product.name} · ${product.price > 0 ? `${currencySymbol(productCurrency(product))}${product.price.toFixed(2)}/${product.unit}` : '价格待确认'}`}
                            onMouseEnter={() => setHoveredProductId(product.id)}
                            onMouseLeave={() => setHoveredProductId('')}
                            onFocus={() => setHoveredProductId(product.id)}
                            onBlur={() => setHoveredProductId('')}
                            onClick={() => {
                              if (onSelectProduct) onSelectProduct(product);
                              else onShelfSelect?.(productShelfTarget(product, focused));
                            }}
                          >
                            <span className="fixture-slot-media">
                              <ProductImage
                                src={product.image}
                                fallbackSrc={product.sourceImageUrl}
                                alt={product.name}
                                size="map"
                                className="fixture-slot-image"
                                priority={selectedProductId === product.id}
                              />
                            </span>
                            <strong title={product.name}>{product.name}</strong>
                            <small>
                              {product.status === 'draft'
                                ? '待本店确认'
                                : product.price > 0
                                  ? `${currencySymbol(productCurrency(product))}${product.price.toFixed(2)}/${product.unit}`
                                  : '价格待确认'}
                            </small>
                          </button>
                        ) : (
                          <div className="fixture-slot empty" key={`empty-${level}-${slot}`} aria-label="空陈列位">
                            <span className="fixture-slot-media" />
                            <strong>空位</strong>
                            <small>{slot + 1}</small>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              },
            )}
          </div>
          <button
            className="button primary small"
            onClick={() => {
              const point = effectiveSide && focused.accessPoints?.[effectiveSide];
              onShelfSelect?.(
                point
                  ? {
                      ...focused,
                      id: `${focused.id}@${effectiveSide}`,
                      name: `${focused.name} · ${fixtureSideLabels[effectiveSide]}`,
                      position: point,
                    }
                  : focused,
              );
            }}
          >
            <Navigation size={15} />
            前往{focused.name}
            {effectiveSide ? ` · ${fixtureSideLabels[effectiveSide]}` : ''}
          </button>
          {!focused.footprint && (
            <p className="field-note">此旧位置尚未配置实体占地，请在超市端补充陈列设施。</p>
          )}
        </div>
      )}
      {route && !!route.stops.length && (
        <div className="route-details" aria-live="polite">
          <div className="route-summary">
            <Navigation size={20} />
            <div>
              <strong>前往 {route.shelfStops?.[0]?.name || '目标区域'}</strong>
              <p>
                约 {route.distance} 米 · {route.minutes} 分钟 · {route.stops.length} 个取货点
              </p>
            </div>
            <button className="button primary small" onClick={onArrive}>
              模拟到达 <Check size={14} />
            </button>
          </div>
          <details>
            <summary>展开步行指引</summary>
            <ol>
              {routeInstructions(route.points).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </details>
        </div>
      )}
      {!!route?.unreachable?.length && (
        <p className="inline-error" role="status">
          无法到达：{route.unreachable.join('、')}
        </p>
      )}
      <p className="store-map-footnote">
        按常规超市陈列关系设计的示例布局，位置由你手动设置，不代表真实门店测绘。
      </p>
    </section>
  );
}
