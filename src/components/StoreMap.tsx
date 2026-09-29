import { useEffect, useState } from 'react';
import { Check, LocateFixed, MapPin, Minus, Navigation, Plus, X } from 'lucide-react';
import { entrance } from '../../shared/catalog';
import { routeInstructions } from '../../shared/navigation';
import {
  fixedFixtures,
  fixtureKindLabels,
  fixtureSideLabels,
  mainAisles,
  productShelfTarget,
} from '../../shared/layout';
import type { Category, Point, Product, Route, Shelf, StoreSection } from '../../shared/types';
import './StoreMap.css';

interface Props {
  route: Route | null;
  current: Category | 'entrance';
  selected?: Category;
  onSelect: (id: Category) => void;
  onPosition: (id: Category | 'entrance') => void;
  onArrive: () => void;
  expanded?: boolean;
  sections?: StoreSection[];
  currentPoint?: Point;
  shelves?: Shelf[];
  products?: Product[];
  onShelfSelect?: (shelf: Shelf) => void;
}
const cell = 28;
const center = (n: number) => n * cell + cell / 2;
const colors = {
  gondola: '#818977',
  'produce-table': '#a69570',
  'display-table': '#bb9b76',
  'service-counter': '#b78161',
  'seafood-tank': '#6ea8b7',
  chiller: '#9cb7bc',
};

function FixtureDrawing({ shelf, active }: { shelf: Shelf; active: boolean }) {
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
  const count = Math.max(2, long ? r.h : r.w);
  return (
    <g>
      {kind === 'service-counter' && (
        <rect x={x} y={y - cell} width={w} height={cell} fill="#e4e0d6" opacity=".6" />
      )}
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
          {[0, 1].flatMap((side) =>
            Array.from({ length: count * 2 }, (_, index) => (
              <rect
                key={`${side}-${index}`}
                x={long ? x + 3 + side * (w * 0.53) : x + 4 + (index * (w - 8)) / (count * 2)}
                y={long ? y + 7 + (index * (h - 14)) / (count * 2) : y + 3 + side * (h * 0.53)}
                width={long ? w * 0.28 : (w - 8) / (count * 2) - 2}
                height={long ? (h - 14) / (count * 2) - 2 : h * 0.28}
                rx="1"
                fill={['#e0cc9e', '#d6dfc2', '#e7e2d3', '#bfced0'][index % 4]}
              />
            )),
          )}
          <rect x={x - 2} y={y - 3} width={w + 4} height="6" rx="2" fill="#64725c" />
          <rect x={x - 2} y={y + h - 3} width={w + 4} height="6" rx="2" fill="#64725c" />
        </>
      )}
      {(kind === 'produce-table' || kind === 'display-table') &&
        Array.from({ length: 4 }, (_, index) => {
          const bx = x + 5 + ((index % 2) * (w - 10)) / 2;
          const by = y + 5 + (Math.floor(index / 2) * (h - 10)) / 2;
          return (
            <g key={index}>
              <rect
                x={bx}
                y={by}
                width={(w - 12) / 2}
                height={(h - 12) / 2}
                rx="2"
                fill="#e7d5b4"
              />
              {[0, 1, 2].map((j) => (
                <ellipse
                  key={j}
                  cx={bx + 5 + j * 5}
                  cy={by + 7 + (j % 2) * 5}
                  rx="4"
                  ry="3"
                  fill={
                    kind === 'produce-table'
                      ? ['#749358', '#d9ac4b', '#93a875'][index % 3]
                      : '#bd8649'
                  }
                />
              ))}
            </g>
          );
        })}
      {kind === 'seafood-tank' && (
        <>
          <rect
            x={x + 5}
            y={y + 5}
            width={w - 10}
            height={h - 10}
            rx="4"
            fill="#c2e0e5"
            stroke="#518392"
          />
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${x + 16 + i * 17},${y + 18 + i * 14})`}>
              <ellipse rx="7" ry="3.5" fill="#689daa" />
              <path d="M6 0l5 -4v8z" fill="#689daa" />
            </g>
          ))}
          <path d={`M${x + 7} ${y + h - 12}q8 -4 16 0t16 0`} fill="none" stroke="#78b5c4" />
        </>
      )}
      {kind === 'chiller' &&
        Array.from({ length: count }, (_, i) => (
          <rect
            key={i}
            x={x + 4 + (long ? 0 : (i * (w - 8)) / count)}
            y={y + 4 + (long ? (i * (h - 8)) / count : 0)}
            width={long ? w - 8 : (w - 8) / count - 2}
            height={long ? (h - 8) / count - 2 : h - 8}
            fill="#e4f0f0"
            stroke="#8ba7aa"
            strokeWidth=".7"
          />
        ))}
      {kind === 'service-counter' && (
        <>
          <rect x={x + 4} y={y + 4} width={w - 8} height={h * 0.45} rx="2" fill="#f3dfc0" />
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={x + 6 + (i * (w - 12)) / 3}
              y={y + 5}
              width={(w - 18) / 3}
              height={h * 0.3}
              fill={['#c58c4d', '#b9764b', '#dec593'][i]}
            />
          ))}
          <path d={`M${x + 3} ${y + h - 5}h${w - 6}`} stroke="#e0eced" strokeWidth="4" />
          <text x={x + w / 2} y={y - 6} textAnchor="middle" className="floor-micro">
            员工操作侧
          </text>
        </>
      )}
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
          fontSize="9.5"
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
  expanded,
  sections = [],
  currentPoint,
  shelves = [],
  products = [],
  onShelfSelect,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [focusedId, setFocusedId] = useState('');
  const [side, setSide] = useState<NonNullable<Product['shelfSide']>>('front');
  const areas = sections.filter((section) => section.active);
  const position =
    currentPoint || sections.find((section) => section.id === current)?.location || entrance;
  const routeTargetId = route?.shelfStops?.[0]?.id;
  useEffect(() => {
    if (routeTargetId) {
      setFocusedId(routeTargetId.split('@')[0]);
      const requestedSide = routeTargetId.split('@')[1] as
        NonNullable<Product['shelfSide']> | undefined;
      if (requestedSide) setSide(requestedSide);
    }
  }, [routeTargetId]);
  const focused = shelves.find((shelf) => shelf.id === focusedId);
  const focusedProducts = products.filter(
    (product) =>
      product.shelfId === focused?.id || (!product.shelfId && product.shelf === focused?.name),
  );
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
      className={`map-panel supermarket-map ${expanded ? 'map-expanded' : ''}`}
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
      <div className="store-floor-scroll">
        <svg
          className="store-floor-svg"
          viewBox="0 0 924 728"
          style={{ width: `${zoom * 100}%`, minWidth: 660 }}
          role="group"
          aria-label="主通道连接双面货架、生鲜岛台、熟食档口、活鲜池及冷藏柜"
        >
          <defs>
            <pattern
              id={expanded ? 'floor-tiles-full' : 'floor-tiles'}
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
            width="884"
            height="676"
            rx="8"
            fill={`url(#${expanded ? 'floor-tiles-full' : 'floor-tiles'})`}
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
            r="13"
            fill="#315d40"
            opacity=".15"
          />
          <circle
            cx={center(position.x)}
            cy={center(position.y)}
            r="7"
            fill="#315d40"
            stroke="white"
            strokeWidth="3"
          />
          <path d="M397 696h90" stroke="#fbfaf6" strokeWidth="8" />
          <text x="434" y="721" textAnchor="middle" className="floor-label">
            入口 / 出口 ↑
          </text>
          <text x="850" y="714" textAnchor="middle" className="floor-micro">
            示例卖场 · 每格约2米
          </text>
        </svg>
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
            disabled={zoom <= 1}
            onClick={() => setZoom(Math.max(1, zoom - 0.2))}
          >
            <Minus size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="放大地图"
            disabled={zoom >= 2}
            onClick={() => setZoom(Math.min(2, zoom + 0.2))}
          >
            <Plus size={16} />
          </button>
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
              ? '正面层位示意 · 从下往上编号，点击商品可导航到对应侧。'
              : focused.kind === 'service-counter'
                ? '服务柜台：从顾客侧到达，向店员选购。'
                : focused.kind === 'seafood-tank'
                  ? '池内陈列：到达池边顾客侧，由店员协助选购。'
                  : '台面陈列：到达台边取货。'}
          </p>
          <div className="fixture-elevation">
            {Array.from({ length: focused.levels || 1 }, (_, i) => (focused.levels || 1) - i).map(
              (level) => {
                const items = focusedProducts.filter(
                  (p) =>
                    (p.shelfLevel || 1) === level &&
                    (!effectiveSide || !p.shelfSide || p.shelfSide === effectiveSide),
                );
                return (
                  <div className="fixture-level" key={level}>
                    <span>{(focused.levels || 1) > 1 ? `第${level}层` : '陈列面'}</span>
                    <div>
                      {items.length ? (
                        items.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => onShelfSelect?.(productShelfTarget(product, focused))}
                          >
                            <strong>{product.name}</strong>
                            <small>
                              {product.stock > 0
                                ? `${product.price.toFixed(2)}元/${product.unit}`
                                : '暂时无货'}
                            </small>
                          </button>
                        ))
                      ) : (
                        <span className="fixture-empty">暂无已录入商品</span>
                      )}
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
