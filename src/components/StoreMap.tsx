import { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Compass,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Route as RouteIcon,
} from 'lucide-react';
import { entrance, zones } from '../../shared/catalog';
import { routeInstructions } from '../../shared/navigation';
import type { Category, Point, Route, StoreSection } from '../../shared/types';

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
}
const scale = (n: number) => n * 28 + 14;
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
}: Props) {
  const [zoom, setZoom] = useState(1);
  const mapZones = sections.filter((section) => section.active);
  const areas = mapZones.length ? mapZones : zones;
  const position: Point =
    currentPoint ||
    (current === 'entrance'
      ? entrance
      : areas.find((z) => z.id === current)?.location ||
        zones.find((z) => z.id === current)?.location ||
        entrance);
  const target = route?.stops[0];
  return (
    <section className={`map-panel ${expanded ? 'map-expanded' : ''}`} aria-label="虚拟超市地图">
      <div className="panel-heading">
        <div>
          <span className="heading-icon">
            <MapPin size={18} />
          </span>
          <h2>店内地图</h2>
          <span className="muted compact">点击分区，轻松到达</span>
        </div>
        <span className="small-tag">1F</span>
      </div>
      <div className="map-canvas">
        <div className="map-note">
          <span className="status-dot" />
          虚拟门店 · 位置可手动设置
        </div>
        <div className="compass" aria-label="地图上方为北">
          <span>N</span>
          <Compass size={28} strokeWidth={1.3} />
        </div>
        <div className="map-scroll">
          <svg
            className="floorplan"
            viewBox="0 0 924 700"
            role="group"
            aria-label={`${areas.length} 个门店分区及步行路线`}
            style={{
              width: `${zoom * 100}%`,
              minWidth: `${zoom * 100}%`,
              height: `${zoom * 100}%`,
            }}
          >
            <defs>
              <pattern id="floor-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M28 0H0V28" fill="none" stroke="#e8e9df" strokeWidth=".7" />
              </pattern>
              <filter id="shelf-shadow" x="-15%" y="-20%" width="140%" height="150%">
                <feDropShadow
                  dx="0"
                  dy="5"
                  stdDeviation="3"
                  floodColor="#34433a"
                  floodOpacity=".07"
                />
              </filter>
            </defs>
            <rect
              x="16"
              y="15"
              width="894"
              height="664"
              rx="18"
              fill="#f8f9f4"
              stroke="#d9dfd1"
              strokeWidth="3"
            />
            <rect x="28" y="28" width="868" height="638" rx="12" fill="url(#floor-grid)" />
            <path d="M406 679H490" stroke="#f8f9f4" strokeWidth="6" />
            <text x="450" y="52" textAnchor="middle" className="map-caption">
              挑点新鲜，慢慢逛
            </text>
            {areas.map((zone) => {
              const { x, y, w, h } = zone.rect;
              const active = selected === zone.id || route?.stops.includes(zone.id);
              return (
                <g
                  key={zone.id}
                  className={`map-zone ${active ? 'active' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${zone.name} ${zone.code}区，查看路线`}
                  onClick={() => onSelect(zone.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect(zone.id);
                    }
                  }}
                >
                  <rect
                    x={x * 28}
                    y={y * 28}
                    width={w * 28}
                    height={h * 28}
                    rx="12"
                    fill={zone.tint}
                    stroke={active ? zone.color : '#ffffff'}
                    strokeWidth={active ? 3 : 2}
                    filter="url(#shelf-shadow)"
                  />
                  {zone.id === 'pantry' ? (
                    <>
                      {[0, 1, 2].map((i) => (
                        <rect
                          key={i}
                          x={x * 28 + 12 + i * 38}
                          y={y * 28 + 65}
                          width="29"
                          height="84"
                          rx="4"
                          fill={zone.color}
                          opacity=".18"
                        />
                      ))}
                    </>
                  ) : (
                    <>
                      {Array.from({ length: Math.floor(w / 2) }).map((_, i) => (
                        <g key={i}>
                          <rect
                            x={x * 28 + 13 + i * 51}
                            y={y * 28 + h * 28 - 46}
                            width="43"
                            height="30"
                            rx="5"
                            fill={zone.color}
                            opacity=".17"
                          />
                          {[0, 1, 2].map((j) => (
                            <rect
                              key={j}
                              x={x * 28 + 19 + i * 51 + j * 11}
                              y={y * 28 + h * 28 - 40}
                              width="7"
                              height="18"
                              rx="3"
                              fill={zone.color}
                              opacity=".22"
                            />
                          ))}
                        </g>
                      ))}
                    </>
                  )}
                  <text
                    x={x * 28 + w * 14}
                    y={y * 28 + 28}
                    textAnchor="middle"
                    fill={zone.color}
                    className="zone-code"
                  >
                    {zone.code}
                  </text>
                  <text
                    x={x * 28 + w * 14}
                    y={y * 28 + 54}
                    textAnchor="middle"
                    fill={zone.color}
                    className="zone-name"
                  >
                    {zone.name}
                  </text>
                  {active && (
                    <circle cx={x * 28 + w * 28 - 14} cy={y * 28 + 14} r="4" fill={zone.color} />
                  )}
                </g>
              );
            })}
            <g className="map-fixture">
              <rect
                x="364"
                y="84"
                width="140"
                height="140"
                rx="10"
                fill="#eeeee5"
                stroke="white"
                strokeWidth="2"
              />
              <text x="434" y="127" textAnchor="middle">
                当季好物
              </text>
              <text x="434" y="149" textAnchor="middle" className="map-small">
                展示台
              </text>
              {[0, 1, 2].map((i) => (
                <rect
                  key={i}
                  x={378 + i * 40}
                  y="166"
                  width="32"
                  height="38"
                  rx="5"
                  fill="#d9dfc4"
                />
              ))}
            </g>
            <g className="map-fixture">
              <rect x="364" y="560" width="140" height="56" rx="8" fill="#e7e9e0" />
              <text x="434" y="594" textAnchor="middle">
                自助收银
              </text>
            </g>
            <text x="435" y="520" textAnchor="middle" className="map-caption">
              主 通 道
            </text>
            <text x="434" y="692" textAnchor="middle" className="map-small">
              入口 / 出口
            </text>
            {route && route.points.length > 1 && (
              <>
                <polyline
                  className="route-underlay"
                  points={route.points.map((p) => `${scale(p.x)},${scale(p.y)}`).join(' ')}
                />
                <polyline
                  className="route-line"
                  points={route.points.map((p) => `${scale(p.x)},${scale(p.y)}`).join(' ')}
                />
              </>
            )}
            {route?.stops.map((id, index) => {
              const p =
                route.shelfStops?.[index]?.position ||
                areas.find((z) => z.id === id)?.location ||
                zones.find((z) => z.id === id)?.location;
              if (!p) return null;
              return (
                <g key={`${id}-${index}`}>
                  <circle
                    cx={scale(p.x)}
                    cy={scale(p.y)}
                    r="14"
                    fill="#315443"
                    stroke="white"
                    strokeWidth="3"
                  />
                  <text
                    x={scale(p.x)}
                    y={scale(p.y) + 5}
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="700"
                  >
                    {index + 1}
                  </text>
                </g>
              );
            })}
            <g>
              <circle
                cx={scale(position.x)}
                cy={scale(position.y)}
                r="18"
                fill="#315443"
                opacity=".12"
              />
              <circle
                cx={scale(position.x)}
                cy={scale(position.y)}
                r="8"
                fill="#315443"
                stroke="white"
                strokeWidth="3"
              />
              <path
                d={`M${scale(position.x) - 4} ${scale(position.y) - 20}l4 -7 4 7`}
                fill="#315443"
              />
            </g>
          </svg>
        </div>
        <div className="map-controls">
          <button
            className="icon-button"
            onClick={() => setZoom(Math.min(1.7, +(zoom + 0.2).toFixed(1)))}
            disabled={zoom >= 1.7}
            aria-label="放大地图"
          >
            <Plus size={17} />
          </button>
          <button
            className="icon-button"
            onClick={() => setZoom(Math.max(1, +(zoom - 0.2).toFixed(1)))}
            disabled={zoom <= 1}
            aria-label="缩小地图"
          >
            <Minus size={17} />
          </button>
          <button className="icon-button" onClick={() => setZoom(1)} aria-label="重置地图缩放">
            <LocateFixed size={17} />
          </button>
        </div>
      </div>
      <div className="map-bottom">
        <div className="position-picker">
          <LocateFixed size={16} />
          <label htmlFor="current-position">我的位置</label>
          <select
            id="current-position"
            value={current}
            onChange={(event) => onPosition(event.target.value as Category | 'entrance')}
          >
            <option value="entrance">超市入口</option>
            {areas.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} />
        </div>
        <span className="muted compact">
          <span className="legend-line" />
          推荐路线
        </span>
      </div>
      {route && target && (
        <div className="route-details" aria-live="polite">
          <div className="route-summary">
            <span className="route-symbol">
              <Navigation size={20} />
            </span>
            <div>
              <strong>
                前往{' '}
                {route.shelfStops?.[0]?.name ||
                  areas.find((z) => z.id === target)?.name ||
                  zones.find((z) => z.id === target)?.name ||
                  target}
              </strong>
              <p>
                约 {route.distance} 米 · {route.minutes} 分钟
                {route.stops.length > 1 ? ` · ${route.stops.length} 个分区` : ''}
              </p>
            </div>
            <button className="button primary small" onClick={onArrive}>
              模拟到达 <Check size={15} />
            </button>
          </div>
          <details>
            <summary>
              <RouteIcon size={14} /> 查看步行指引 <ChevronDown size={14} />
            </summary>
            <ol>
              {routeInstructions(route.points).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
              <li>
                到达
                {route.shelfStops?.map((shelf) => shelf.name).join(' → ') ||
                  route.stops
                    .map(
                      (id) =>
                        areas.find((z) => z.id === id)?.name ||
                        zones.find((z) => z.id === id)?.name ||
                        id,
                    )
                    .join(' → ')}
              </li>
            </ol>
            <p className="muted compact">
              路线按虚拟平面图估算，多站按就近顺序；实际位置由你设置。
            </p>
          </details>
          {!!route.unreachable?.length && (
            <p className="inline-error" role="status">
              以下商品无法导航：{route.unreachable.join('、')}。
            </p>
          )}
        </div>
      )}
      {route?.unreachable?.length && !target && (
        <p className="inline-error" role="status">
          无法规划路线：{route.unreachable.join('、')}。
        </p>
      )}
      {!route && (
        <div className="map-hint">
          <Navigation size={16} />
          <span>选个分区，或让小禾带你去</span>
          <ArrowUpRight size={16} />
        </div>
      )}
    </section>
  );
}
