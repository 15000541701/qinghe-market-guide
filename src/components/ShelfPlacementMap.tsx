import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from 'react';
import {
  Minus,
  Plus,
  Move,
  RotateCw,
  RotateCcw,
  Scan,
  Check,
  X,
  Group,
  Ungroup,
  Trash2,
  MousePointer2,
} from 'lucide-react';
import type { Point, Shelf, StoreSection } from '../../shared/types';
import { mapBounds } from '../../shared/map-config';
import { fixedFixtures, mainAisles } from '../../shared/layout';
import {
  createShelfMoveValidator,
  translatedShelf,
  rotatedShelf,
  resizedShelf,
  footprintFromCorners,
  type ShelfLayoutAction,
} from '../../shared/shelf-move';
import { shelfUsableFloorCells, placementRegionPaths } from '../../shared/placement-regions';
import FootprintRect from './FootprintRect';
import {
  expandShelfSelection,
  toggleShelfSelection,
  shelfSelectionBounds,
  translateShelfSelection,
  shelfBatchPlacementError,
} from '../../shared/shelf-batch';

type Drag = {
  id: string;
  pointer: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
  ids: string[];
  origin: Shelf[];
};
export default function ShelfPlacementMap({
  shelves,
  sections,
  selectedId,
  selectedIds,
  onSelectionChange,
  onMoveSelection,
  onBatchAction,
  onTransform,
  busy,
}: {
  shelves: Shelf[];
  sections: StoreSection[];
  selectedId: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[], primary?: string) => void;
  onMoveSelection: (shelves: Shelf[], dx: number, dy: number) => Promise<void>;
  onBatchAction: (type: 'group' | 'ungroup' | 'delete') => Promise<void>;
  onTransform: (shelf: Shelf, action: ShelfLayoutAction) => Promise<void>;
  busy: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const pattern = useId().replace(/:/g, '');
  const [zoom, setZoom] = useState(1);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [notice, setNotice] = useState('');
  const [editingArea, setEditingArea] = useState(false);
  const [firstCorner, setFirstCorner] = useState<Point | null>(null);
  const [lastCorner, setLastCorner] = useState<Point | null>(null);
  const [areaLocked, setAreaLocked] = useState(false);
  const areaDragRef = useRef<{
    pointer: number;
    start: Point;
    last: Point;
    previous: { first: Point | null; last: Point | null; locked: boolean };
  } | null>(null);
  const releaseAreaPointer = () => {
    const current = areaDragRef.current;
    areaDragRef.current = null;
    if (current && svg.current?.hasPointerCapture(current.pointer))
      svg.current.releasePointerCapture(current.pointer);
  };
  const cancelAreaDrag = () => {
    const current = areaDragRef.current;
    if (!current) return;
    releaseAreaPointer();
    setFirstCorner(current.previous.first);
    setLastCorner(current.previous.last);
    setAreaLocked(current.previous.locked);
  };
  const resetArea = () => {
    releaseAreaPointer();
    setEditingArea(false);
    setFirstCorner(null);
    setLastCorner(null);
    setAreaLocked(false);
  };
  useEffect(() => {
    resetArea();
    setNotice('');
  }, [selectedId]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetArea();
        dragRef.current = null;
        setDrag(null);
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  const selected = shelves.find((shelf) => shelf.id === selectedId);
  const source = drag?.origin.find((shelf) => shelf.id === drag.id);
  const selectedShelves = shelves.filter((shelf) => selectedIds.includes(shelf.id));
  const singleEditable =
    selectedIds.length === 1 && selectedIds[0] === selectedId && !selected?.groupId;
  const alreadyGrouped =
    selectedShelves.length > 1 &&
    !!selectedShelves[0].groupId &&
    selectedShelves.every((shelf) => shelf.groupId === selectedShelves[0].groupId);
  const validatePlacement = useMemo(
    () => createShelfMoveValidator(shelves, sections),
    [shelves, sections],
  );
  const usableFloor = useMemo(() => shelfUsableFloorCells(), []);
  const usableFloorPaths = useMemo(() => placementRegionPaths(usableFloor), [usableFloor]);

  const gridX = Math.round(drag?.x || 0),
    gridY = Math.round(drag?.y || 0);
  const movingShelves = useMemo(
    () =>
      source?.footprint && drag
        ? translateShelfSelection(
            drag.ids,
            gridX - source.footprint.x,
            gridY - source.footprint.y,
            drag.origin,
          )
        : [],
    [source, gridX, gridY, drag?.origin],
  );
  const candidate = movingShelves.find((shelf) => shelf.id === drag?.id);
  const selectionBounds = shelfSelectionBounds(drag?.moved ? movingShelves : selectedShelves);
  const areaCandidate = useMemo(
    () =>
      selected?.footprint && firstCorner && lastCorner
        ? resizedShelf(selected, footprintFromCorners(firstCorner, lastCorner))
        : undefined,
    [selected, firstCorner, lastCorner],
  );
  const preview = editingArea ? areaCandidate : candidate;
  const error = useMemo(
    () =>
      preview
        ? preview.footprint!.w < 1 || preview.footprint!.h < 1
          ? '沿对角拖动，至少覆盖1格宽和1格高。'
          : editingArea
            ? validatePlacement(preview)
            : shelfBatchPlacementError(movingShelves, shelves, sections)
        : undefined,
    [preview, validatePlacement, editingArea, movingShelves, shelves, sections],
  );
  const mapPoint = (event: PointerEvent) => {
    const matrix = svg.current?.getScreenCTM();
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      : null;
  };
  const snapPoint = (point: DOMPoint): Point => ({
    x: Math.max(1, Math.min(mapBounds.maxX + 1, Math.round(point.x))),
    y: Math.max(1, Math.min(mapBounds.maxY + 1, Math.round(point.y))),
  });
  const rotate = async (direction: 'cw' | 'ccw') => {
    if (!selected?.footprint || !singleEditable || busy) return;
    const reason = validatePlacement(rotatedShelf(selected, direction));
    if (reason) {
      setNotice(reason);
      return;
    }
    resetArea();
    setNotice('');
    try {
      await onTransform(selected, { type: 'rotate', direction });
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : '旋转失败。');
    }
  };
  const cancel = () => {
    dragRef.current = null;
    setDrag(null);
  };
  const end = (event: PointerEvent) => {
    const area = areaDragRef.current;
    if (area) {
      if (area.pointer !== event.pointerId) return;
      const point = mapPoint(event);
      const corner = point ? snapPoint(point) : area.last;
      const footprint = footprintFromCorners(area.start, corner);
      if (footprint.w < 1 || footprint.h < 1) {
        cancelAreaDrag();
        setNotice('请按住起点，沿对角拖出至少1×1格的范围。');
      } else {
        releaseAreaPointer();
        setFirstCorner(area.start);
        setLastCorner(corner);
        setAreaLocked(true);
        setNotice('');
      }
      return;
    }
    const current = dragRef.current;
    if (!current || current.pointer !== event.pointerId) return;
    const anchor = current.origin.find((shelf) => shelf.id === current.id)!;
    if (current.moved && anchor.footprint) {
      const dx = Math.round(current.x) - anchor.footprint.x,
        dy = Math.round(current.y) - anchor.footprint.y;
      const updates = translateShelfSelection(current.ids, dx, dy, current.origin);
      const reason = shelfBatchPlacementError(updates, shelves, sections);
      setNotice(reason || '');
      if (!reason && (dx || dy)) void onMoveSelection(current.origin, dx, dy);
    }
    cancel();
  };
  return (
    <div className="placement-map">
      <div className="placement-map-toolbar">
        <div>
          <span className="merch-eyebrow">门店布局</span>
          <h3>
            <Move size={16} /> 拖动货架，松手安放
          </h3>
        </div>
        <div className="placement-zoom">
          <button
            type="button"
            aria-label="缩小布局"
            onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}
          >
            <Minus size={16} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="放大布局"
            onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="placement-layout-tools">
        <strong>
          {!selectedIds.length
            ? '未选择货架'
            : selectedIds.length > 1
              ? `已选 ${selectedIds.length} 个货架${alreadyGrouped ? ' · 已组合' : ''}`
              : selected?.name || '先选择货架'}
        </strong>
        <button
          type="button"
          aria-pressed={multiSelectMode}
          disabled={busy || editingArea}
          onClick={() => setMultiSelectMode((value) => !value)}
        >
          <MousePointer2 size={15} />
          多选
        </button>
        <button
          type="button"
          disabled={busy || editingArea || selectedIds.length < 2 || alreadyGrouped}
          onClick={() => void onBatchAction('group')}
        >
          <Group size={15} />
          组合
        </button>
        <button
          type="button"
          disabled={busy || editingArea || !selectedShelves.some((shelf) => shelf.groupId)}
          onClick={() => void onBatchAction('ungroup')}
        >
          <Ungroup size={15} />
          分拆
        </button>
        <button
          type="button"
          className="placement-delete"
          disabled={busy || editingArea || !selectedIds.length}
          onClick={() => void onBatchAction('delete')}
        >
          <Trash2 size={15} />
          删除{selectedIds.length > 1 ? ` (${selectedIds.length})` : ''}
        </button>
        <span className="placement-selection-hint">
          按住 Ctrl / ⌘ 点击多选；拖动已选货架可整体移动。组合后可分拆，删除可撤销。
        </span>
        {(selectedIds.length > 1 || selected?.groupId) && (
          <span className="placement-selection-hint">
            旋转或改占地需单选且未组合，可先分拆组合。
          </span>
        )}
        <button
          type="button"
          disabled={busy || !selected?.footprint || editingArea || !singleEditable}
          onClick={() => void rotate('ccw')}
          title="以左上角为基准逆时针旋转90°"
        >
          <RotateCcw size={15} />
          逆时针90°
        </button>
        <button
          type="button"
          disabled={busy || !selected?.footprint || editingArea || !singleEditable}
          onClick={() => void rotate('cw')}
          title="以左上角为基准顺时针旋转90°"
        >
          <RotateCw size={15} />
          顺时针90°
        </button>
        <button
          type="button"
          disabled={busy || !selected?.footprint || !singleEditable}
          aria-pressed={editingArea}
          onClick={() => {
            cancel();
            if (editingArea) resetArea();
            else {
              setEditingArea(true);
              setNotice('');
            }
          }}
        >
          <Scan size={15} />
          框选占地
        </button>
        {selected?.footprint && (
          <small>
            {selected.footprint.w} × {selected.footprint.h} 格 ·{' '}
            {(((selected.rotation || 0) % 360) + 360) % 360}°
          </small>
        )}
      </div>
      {editingArea && (
        <div className="placement-area-actions">
          <span>
            {!firstCorner
              ? '按住起点，沿对角拖动框选占地'
              : !areaLocked
                ? `框选中 ${areaCandidate?.footprint?.w || 0} × ${areaCandidate?.footprint?.h || 0} 格 · 松手确定范围`
                : `预览 ${areaCandidate?.footprint?.w} × ${areaCandidate?.footprint?.h} 格`}
          </span>
          <button
            type="button"
            disabled={busy || !areaLocked || !!error || !areaCandidate}
            onClick={async () => {
              if (!selected || !areaCandidate?.footprint) return;
              try {
                await onTransform(selected, { type: 'resize', footprint: areaCandidate.footprint });
                resetArea();
                setNotice('');
              } catch (cause) {
                setNotice(cause instanceof Error ? cause.message : '占地保存失败。');
              }
            }}
          >
            <Check size={14} />
            保存占地
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              releaseAreaPointer();
              setFirstCorner(null);
              setLastCorner(null);
              setAreaLocked(false);
              setNotice('');
            }}
          >
            重选
          </button>
          <button type="button" disabled={busy} onClick={resetArea}>
            <X size={14} />
            取消
          </button>
        </div>
      )}
      <div className="placement-region-legend" aria-label="货架摆放范围说明">
        <span>
          <i aria-hidden="true" />
          半透明绿底与虚线：可用于摆货架的整片地面，包含已占用区域
        </span>
        <span>
          <i className="occupied" aria-hidden="true" />
          实心柜体：已有货架占用，不能重叠安放
        </span>
        {editingArea && (
          <span className="placement-selection-legend">
            <i aria-hidden="true" />
            当前框选范围：蓝色可保存，红色需调整
          </span>
        )}
      </div>
      <div className="placement-map-scroll">
        <svg
          ref={svg}
          className={`placement-map-canvas ${editingArea ? 'drawing-area' : ''}`}
          style={{ minWidth: 850 * zoom }}
          viewBox={`0 0 ${mapBounds.maxX + 2} ${mapBounds.maxY + 2}`}
          aria-label="可拖动货架的门店布局"
          role="group"
          onPointerDown={(event) => {
            if (!editingArea && !busy && !(event.target as Element).closest('[data-facility-id]')) {
              onSelectionChange([]);
              return;
            }
            if (
              !editingArea ||
              busy ||
              areaDragRef.current ||
              event.button !== 0 ||
              event.isPrimary === false
            )
              return;
            const point = mapPoint(event);
            if (!point) return;
            event.preventDefault();
            const corner = snapPoint(point);
            areaDragRef.current = {
              pointer: event.pointerId,
              start: corner,
              last: corner,
              previous: { first: firstCorner, last: lastCorner, locked: areaLocked },
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            setFirstCorner(corner);
            setLastCorner(corner);
            setAreaLocked(false);
            setNotice('');
          }}
          onPointerMove={(event) => {
            if (editingArea) {
              const area = areaDragRef.current;
              if (!area || area.pointer !== event.pointerId) return;
              if (event.pointerType === 'mouse' && event.buttons === 0) {
                cancelAreaDrag();
                return;
              }
              const point = mapPoint(event);
              if (!point) return;
              const corner = snapPoint(point);
              if (corner.x !== area.last.x || corner.y !== area.last.y) {
                area.last = corner;
                setLastCorner(corner);
              }
              return;
            }
            const current = dragRef.current,
              point = mapPoint(event);
            if (!current || current.pointer !== event.pointerId || !point) return;
            const moved =
              current.moved ||
              Math.hypot(point.x - current.startX, point.y - current.startY) > 0.25;
            const shelf = current.origin.find((item) => item.id === current.id)!;
            const next = {
              ...current,
              moved,
              x: shelf.footprint!.x + point.x - current.startX,
              y: shelf.footprint!.y + point.y - current.startY,
            };
            dragRef.current = next;
            setDrag(next);
          }}
          onKeyDown={(event) => {
            if (
              (event.key === 'Delete' || event.key === 'Backspace') &&
              selectedIds.length &&
              !editingArea &&
              !busy
            ) {
              event.preventDefault();
              void onBatchAction('delete');
            }
          }}
          onPointerUp={end}
          onPointerCancel={(event) => {
            if (areaDragRef.current?.pointer === event.pointerId) cancelAreaDrag();
            cancel();
          }}
          onLostPointerCapture={(event) => {
            if (
              event.target === event.currentTarget &&
              areaDragRef.current?.pointer === event.pointerId
            )
              cancelAreaDrag();
          }}
        >
          <defs>
            <pattern id={pattern} width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#dae1d6" strokeWidth=".035" />
            </pattern>
          </defs>
          <rect
            x=".5"
            y=".5"
            width={mapBounds.maxX + 1}
            height={mapBounds.maxY + 1}
            rx=".5"
            fill="#f8faf5"
          />
          {sections
            .filter((section) => section.active)
            .map((section) => (
              <g key={section.id}>
                <FootprintRect
                  bounds={section.rect}
                  rx=".15"
                  fill={section.tint}
                  stroke={section.color}
                  strokeOpacity=".2"
                  strokeWidth=".08"
                />
                <text
                  x={section.rect.x + 0.15}
                  y={section.rect.y + 0.6}
                  fill={section.color}
                  fontSize=".48"
                >
                  {section.name}
                </text>
              </g>
            ))}
          {mainAisles.map((rect, index) => (
            <FootprintRect key={index} bounds={rect} fill="#e7ece3" opacity=".75" />
          ))}
          {usableFloor.length > 0 && (
            <g className="placement-available-region" aria-hidden="true" pointerEvents="none">
              <path d={usableFloorPaths.fill} className="placement-available-fill" />
              <path d={usableFloorPaths.outline} className="placement-available-outline" />
            </g>
          )}
          <rect
            x="1"
            y="1"
            width={mapBounds.maxX}
            height={mapBounds.maxY}
            fill={`url(#${pattern})`}
            pointerEvents="none"
          />
          {fixedFixtures.map((fixture) => (
            <g key={fixture.id}>
              <FootprintRect bounds={fixture.rect} fill="#d8d6cd" rx=".15" />
              <text
                x={fixture.rect.x + 0.1}
                y={fixture.rect.y + 0.65}
                fontSize=".45"
                fill="#626458"
              >
                {fixture.name}
              </text>
            </g>
          ))}
          {drag?.moved &&
            !editingArea &&
            movingShelves.map((shelf) => (
              <FootprintRect
                key={`landing-${shelf.id}`}
                bounds={shelf.footprint!}
                className={`placement-landing ${error ? 'invalid' : ''}`}
                rx=".15"
              />
            ))}
          {[
            ...shelves.filter((shelf) => !drag?.ids.includes(shelf.id)),
            ...shelves.filter((shelf) => drag?.ids.includes(shelf.id)),
          ].map((shelf) => {
            if (!shelf.footprint) return null;
            const moving = !!drag?.ids.includes(shelf.id);
            const original = moving ? drag!.origin.find((item) => item.id === shelf.id)! : shelf;
            const x = moving
                ? original.footprint!.x + drag!.x - source!.footprint!.x
                : shelf.footprint.x,
              y = moving
                ? original.footprint!.y + drag!.y - source!.footprint!.y
                : shelf.footprint.y;
            const index = shelf.mapNumber || shelves.findIndex((item) => item.id === shelf.id) + 1;
            const angle = shelf.rotation || 0,
              normal = ((angle % 360) + 360) % 360;
            const baseW = normal % 180 ? shelf.footprint.h : shelf.footprint.w;
            const baseH = normal % 180 ? shelf.footprint.w : shelf.footprint.h;
            const offset =
              normal === 90
                ? [baseH, 0]
                : normal === 180
                  ? [baseW, baseH]
                  : normal === 270
                    ? [0, baseW]
                    : [0, 0];
            return (
              <g
                key={shelf.id}
                data-facility-id={shelf.id}
                role="button"
                tabIndex={busy ? -1 : 0}
                aria-label={`${shelf.name}，已占用区域；拖动安放，方向键微调，回车查看商品`}
                aria-pressed={selectedIds.includes(shelf.id)}
                className={`placement-fixture ${moving ? 'dragging' : ''} ${selectedIds.includes(shelf.id) ? 'selected' : ''} ${busy ? 'locked' : ''}`}
                style={{ transform: `translate(${x}px, ${y}px)` }}
                onPointerDown={(event) => {
                  if (busy || editingArea || event.button !== 0) return;
                  const point = mapPoint(event);
                  if (!point) return;
                  event.currentTarget.focus();
                  const additive = event.ctrlKey || event.metaKey || multiSelectMode;
                  const ids = additive
                    ? toggleShelfSelection(selectedIds, shelf.id, true, shelves)
                    : selectedIds.includes(shelf.id)
                      ? selectedIds
                      : expandShelfSelection([shelf.id], shelves);
                  onSelectionChange(ids, shelf.id);
                  setNotice('');
                  if (additive) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  const next: Drag = {
                    id: shelf.id,
                    pointer: event.pointerId,
                    startX: point.x,
                    startY: point.y,
                    x: shelf.footprint!.x,
                    y: shelf.footprint!.y,
                    moved: false,
                    ids,
                    origin: shelves.filter((item) => ids.includes(item.id)),
                  };
                  dragRef.current = next;
                  setDrag(next);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    cancel();
                    return;
                  }
                  if (busy || editingArea) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectionChange(
                      toggleShelfSelection(
                        selectedIds,
                        shelf.id,
                        event.ctrlKey || event.metaKey,
                        shelves,
                      ),
                      shelf.id,
                    );
                    return;
                  }
                  const directions: Record<string, [number, number]> = {
                    ArrowLeft: [-1, 0],
                    ArrowRight: [1, 0],
                    ArrowUp: [0, -1],
                    ArrowDown: [0, 1],
                  };
                  const direction = directions[event.key];
                  if (!direction) return;
                  event.preventDefault();
                  const ids = selectedIds.length
                    ? selectedIds
                    : expandShelfSelection([shelf.id], shelves);
                  onSelectionChange(ids, shelf.id);
                  const origin = shelves.filter((item) => ids.includes(item.id));
                  const updates = translateShelfSelection(ids, direction[0], direction[1], origin);
                  const reason = shelfBatchPlacementError(updates, shelves, sections);
                  setNotice(reason || '');
                  if (!reason) void onMoveSelection(origin, direction[0], direction[1]);
                }}
              >
                <title>
                  {shelf.name} · 已占用 · {shelf.footprint.x}, {shelf.footprint.y}
                </title>
                <g
                  className="placement-fixture-body"
                  style={{
                    transform: `translate(${offset[0]}px, ${offset[1]}px) rotate(${angle}deg)`,
                  }}
                >
                  <rect width={baseW} height={baseH} rx=".17" />
                  <path
                    d={`M${baseW / 2 - 0.14} .32 L${baseW / 2} .16 L${baseW / 2 + 0.14} .32`}
                    className="placement-orientation"
                  />
                </g>
                <text
                  x={shelf.footprint.w / 2}
                  y={shelf.footprint.h / 2}
                  dominantBaseline="central"
                  textAnchor="middle"
                  fontSize=".5"
                  pointerEvents="none"
                >
                  {index}
                </text>
              </g>
            );
          })}
          {selectedIds.length > 1 && selectionBounds && (
            <FootprintRect
              bounds={selectionBounds}
              className="placement-selection-box"
              pointerEvents="none"
            />
          )}
          {editingArea && areaCandidate?.footprint && (
            <g pointerEvents="none" aria-hidden="true">
              <FootprintRect
                bounds={areaCandidate.footprint}
                className={`placement-landing placement-area-preview ${error ? 'invalid' : ''}`}
                rx=".15"
              />
              <text
                x={areaCandidate.footprint.x + 0.15}
                y={areaCandidate.footprint.y - 0.2}
                className={`placement-area-size ${error ? 'invalid' : ''}`}
              >
                {areaCandidate.footprint.w} × {areaCandidate.footprint.h} 格
              </text>
            </g>
          )}
        </svg>
      </div>
      <div className={`placement-map-caption ${error || notice ? 'invalid' : ''}`} role="status">
        {editingArea
          ? notice ||
            error ||
            (!firstCorner
              ? '按住一个角，沿对角拖动框选矩形占地；松手确定范围。'
              : !areaLocked
                ? '范围和格数实时更新，松手后确认；可重新拖动调整。'
                : '占地有效，点击“保存占地”后生效；商品与层数保持不变。')
          : drag?.moved
            ? error || '可以安放 · 松手吸附到网格'
            : notice ||
              (selected
                ? selected.footprint
                  ? `已选：${selected.name} · 点击查看陈列，拖动调整位置`
                  : `已选旧位置：${selected.name} · 请先在“货架设施”中补全资料`
                : '点击货架查看陈列；绿色轮廓可放置，红色轮廓不可放置。')}
      </div>
    </div>
  );
}
