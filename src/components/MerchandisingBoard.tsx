import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, GripVertical, LayoutGrid, Package, Search, Undo2 } from 'lucide-react';
import type { Product, Shelf, StoreSection } from '../../shared/types';
import { fixtureKindLabels, fixtureSideLabels, productLocationLabel } from '../../shared/layout';
import { shelfSlotCapacity, type ShelfSide } from '../../shared/shelf-capacity';
import {
  applyPlacement,
  assessProductDrop,
  placementChangesError,
  type DropAssessment,
  effectivePlacement,
  placementIndex,
  rankShelfCandidates,
  placementOf,
  planProductDrop,
  samePlacement,
  shelfCells,
  unplaced,
  type Placement,
  type PlacementChange,
} from '../../shared/placement';
import {
  translatedShelf,
  shelfGeometry,
  rotateShelfSide,
  type ShelfLayoutAction,
  type ShelfLayoutResult,
  type PlacedSnapshot,
} from '../../shared/shelf-move';
import { api } from '../lib';
import {
  expandShelfSelection,
  shelfVersion,
  translateShelfSelection,
  type ShelfBatchAction,
  type ShelfBatchResult,
  type ShelfBatchUndo,
} from '../../shared/shelf-batch';
import ProductImage from './ProductImage';
import ShelfPlacementMap from './ShelfPlacementMap';
import './MerchandisingBoard.css';

type Receipt =
  | { kind: 'products'; changes: PlacementChange[]; label: string }
  | { kind: 'shelfBatch'; undo: ShelfBatchUndo; label: string }
  | { kind: 'shelf'; before: Shelf; after: Shelf; label: string }
  | {
      kind: 'layout';
      after: Shelf;
      undo: ShelfLayoutResult['undo'];
      expectedProducts: PlacedSnapshot[];
      label: string;
    };
type ProductDrag = {
  id: string;
  pointer: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
};
const mergeProducts = (before: Product[], updates: Product[]) => [
  ...new Map([...before, ...updates].map((item) => [item.id, item])).values(),
];
export default function MerchandisingBoard({
  products,
  shelves,
  sections,
  onRefresh,
  onToast,
}: {
  products: Product[];
  shelves: Shelf[];
  sections: StoreSection[];
  onRefresh: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'pending' | 'placed' | 'all'>('pending');
  const [limit, setLimit] = useState(60);
  const [facilityId, setFacilityId] = useState('');
  const [shelfSelection, setShelfSelection] = useState<string[] | null>(null);
  const [side, setSide] = useState<ShelfSide>('front');
  const [selectedId, setSelectedId] = useState('');
  const [productOverrides, setProductOverrides] = useState<Product[]>([]);
  const [shelfOverrides, setShelfOverrides] = useState<Shelf[]>([]);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [drag, setDrag] = useState<ProductDrag | null>(null);
  const dragRef = useRef<ProductDrag | null>(null);
  const suppressClick = useRef(false);
  const [hover, setHover] = useState<Placement | null>(null);
  const board = useRef<HTMLElement>(null);
  const previousRects = useRef(new Map<string, DOMRect>());
  const shelfHoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shelfHoverId = useRef('');
  const viewProducts = useMemo(
    () =>
      products.map((product) => productOverrides.find((item) => item.id === product.id) || product),
    [products, productOverrides],
  );
  const viewShelves = useMemo(
    () =>
      [
        ...new Map([...shelves, ...shelfOverrides].map((shelf) => [shelf.id, shelf])).values(),
      ].filter((shelf) => !shelf.deleted),
    [shelves, shelfOverrides],
  );
  const facilities = viewShelves.filter((shelf) =>
    sections.some((section) => section.id === shelf.sectionId && section.active),
  );
  const facility = facilities.find((shelf) => shelf.id === facilityId) || facilities[0];
  const selectedShelfIds =
    shelfSelection === null
      ? expandShelfSelection(facility ? [facility.id] : [], viewShelves)
      : shelfSelection.filter((id) => viewShelves.some((shelf) => shelf.id === id));

  const sides = Object.keys(facility?.accessPoints || {}) as ShelfSide[];
  const activeSide = sides.includes(side) ? side : sides[0];
  const activeId = drag?.moved ? drag.id : selectedId;
  const activeProduct = viewProducts.find((product) => product.id === activeId);
  const legacyFacility = !!facility && (!facility.footprint || !sides.length);
  const legacyProducts = legacyFacility
    ? viewProducts.filter(
        (product) => product.status !== 'archived' && product.shelfId === facility.id,
      )
    : [];
  const rackCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of viewProducts)
      if (product.status !== 'archived' && product.shelfId)
        counts.set(product.shelfId, (counts.get(product.shelfId) || 0) + 1);
    return counts;
  }, [viewProducts]);
  const sideCount = (shelf: Shelf, value: ShelfSide) =>
    Array.from(
      { length: shelf.levels || 1 },
      (_, index) => shelfCells(viewProducts, shelf, value, index + 1).filter(Boolean).length,
    ).reduce((sum, count) => sum + count, 0);
  const selectFacility = (id: string, selection?: string[]) => {
    setFacilityId(id);
    setShelfSelection(selection || expandShelfSelection([id], viewShelves));
    setLimit(60);
    setHover(null);
    const shelf = viewShelves.find((item) => item.id === id);
    if (shelf) {
      const values = Object.keys(shelf.accessPoints || {}) as ShelfSide[];
      setSide(values.find((value) => sideCount(shelf, value) > 0) || values[0] || 'front');
    }
  };
  const cellAssessments = useMemo(() => {
    const result = new Map<string, DropAssessment>();
    if (facility && activeSide)
      for (let level = 1; level <= (facility.levels || 1); level++)
        shelfCells(viewProducts, facility, activeSide, level).forEach((_product, slot) => {
          result.set(
            `${level}:${slot}`,
            assessProductDrop(
              activeProduct,
              {
                shelfId: facility.id,
                shelfSide: activeSide,
                shelfLevel: level,
                shelfSlot: slot,
              },
              viewProducts,
              viewShelves,
            ),
          );
        });
    return result;
  }, [facility, activeSide, activeProduct, viewProducts, viewShelves]);
  const locations = useMemo(
    () => placementIndex(viewProducts, viewShelves),
    [viewProducts, viewShelves],
  );
  const pending = (product: Product) => !locations.has(product.id);
  const rankedCandidates = useMemo(
    () => rankShelfCandidates(viewProducts, facility, viewShelves),
    [viewProducts, facility, viewShelves],
  );
  const candidateById = useMemo(
    () => new Map(rankedCandidates.map((item) => [item.product.id, item])),
    [rankedCandidates],
  );
  const visible = rankedCandidates
    .filter(
      ({ product, pending }) =>
        (filter === 'all' || (filter === 'pending' ? pending : !pending)) &&
        `${product.name} ${product.sku || product.id} ${product.brand || ''}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .map((item) => item.product);
  const preferredCount = rankedCandidates.filter((item) => item.priority === 0).length;
  const pendingCount = viewProducts.filter(
    (product) => product.status !== 'archived' && pending(product),
  ).length;
  const cancelDrag = () => {
    dragRef.current = null;
    setDrag(null);
    setHover(null);
    clearTimeout(shelfHoverTimer.current);
    shelfHoverId.current = '';
  };
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelDrag();
        setSelectedId('');
      }
    };
    window.addEventListener('keydown', cancel);
    const releaseOutside = (event: globalThis.PointerEvent) => {
      if (dragRef.current && !board.current?.contains(event.target as Node)) cancelDrag();
    };
    window.addEventListener('pointerup', releaseOutside);
    return () => {
      window.removeEventListener('keydown', cancel);
      window.removeEventListener('pointerup', releaseOutside);
      clearTimeout(shelfHoverTimer.current);
    };
  }, []);
  const capturePositions = () => {
    const rects = new Map<string, DOMRect>();
    board.current?.querySelectorAll<HTMLElement>('[data-motion-id]').forEach((element) => {
      const id = element.dataset.motionId!;
      if (!rects.has(id) || element.dataset.inShelf) rects.set(id, element.getBoundingClientRect());
    });
    previousRects.current = rects;
  };
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      previousRects.current.clear();
      return;
    }
    board.current?.querySelectorAll<HTMLElement>('[data-motion-id]').forEach((element) => {
      const before = previousRects.current.get(element.dataset.motionId!);
      if (!before) return;
      const after = element.getBoundingClientRect();
      const x = before.left - after.left,
        y = before.top - after.top;
      if (Math.abs(x) + Math.abs(y) > 2 && typeof element.animate === 'function')
        element.animate(
          [
            { transform: `translate(${x}px, ${y}px)`, opacity: 0.65 },
            { transform: 'translate(0, 0)', opacity: 1 },
          ],
          { duration: 280, easing: 'cubic-bezier(.16,1,.3,1)' },
        );
    });
    previousRects.current.clear();
  }, [viewProducts]);
  const changesError = (changes: PlacementChange[]) =>
    placementChangesError(changes, viewProducts, viewShelves);
  const preview = useMemo(() => {
    if (!activeProduct || !hover) return null;
    const changes = planProductDrop(activeProduct.id, hover, viewProducts, viewShelves);
    const reason = changesError(changes);
    const shelf = viewShelves.find((item) => item.id === hover.shelfId);
    const occupant =
      shelf && hover.shelfSide
        ? shelfCells(viewProducts, shelf, hover.shelfSide, hover.shelfLevel || 1)[
            hover.shelfSlot || 0
          ]
        : undefined;
    const source = effectivePlacement(activeProduct, viewProducts, viewShelves);
    return {
      error: reason,
      text:
        reason ||
        (!changes.length
          ? '位置不变'
          : !shelf
            ? '移回待摆放'
            : occupant && occupant.id !== activeProduct.id
              ? source
                ? `与“${occupant.name}”交换位置`
                : `替换“${occupant.name}”，原商品移回待摆放`
              : `移到 ${shelf.name} · ${fixtureSideLabels[hover.shelfSide!]} · 第${hover.shelfLevel}层第${hover.shelfSlot! + 1}格`),
    };
  }, [activeProduct, hover, viewProducts, viewShelves]);
  const saveChanges = async (changes: PlacementChange[], label: string, undo = false) => {
    if (saving.current || !changes.length) return;
    const reason = changesError(changes);
    if (reason) {
      setError(reason);
      return;
    }
    const before = viewProducts.filter((product) =>
      changes.some((change) => change.id === product.id),
    );
    capturePositions();
    setProductOverrides((current) =>
      mergeProducts(
        current,
        before.map((product) =>
          applyPlacement(
            product,
            changes.find((item) => item.id === product.id)!.target,
            viewShelves,
          ),
        ),
      ),
    );
    saving.current = true;
    setBusy(true);
    setError('');
    let saved = false;
    try {
      const result = await api<{ products: Product[]; undo: PlacementChange[] }>(
        '/merchandising/placements',
        { method: 'POST', body: JSON.stringify({ changes }) },
      );
      saved = true;
      setProductOverrides((current) => mergeProducts(current, result.products));
      setReceipt(undo ? null : { kind: 'products', changes: result.undo, label });
      setSelectedId('');
      setStatus(undo ? '已撤销，商品回到原位。' : label);
      onToast(undo ? '已撤销陈列操作。' : label);
      await onRefresh();
      setProductOverrides([]);
    } catch (cause) {
      if (!saved) {
        capturePositions();
        setProductOverrides((current) => mergeProducts(current, before));
      }
      setError(
        saved
          ? '位置已保存，列表刷新失败，请刷新页面查看。'
          : cause instanceof Error
            ? cause.message
            : '未能确认保存，请刷新核对。',
      );
    } finally {
      saving.current = false;
      setBusy(false);
      setHover(null);
    }
  };
  const dropProduct = (id: string, target: Placement) => {
    if (saving.current) return;
    const product = viewProducts.find((item) => item.id === id);
    if (!product) return;
    const changes = planProductDrop(id, target, viewProducts, viewShelves);
    const targetShelf = viewShelves.find((item) => item.id === target.shelfId);
    const occupant =
      targetShelf && target.shelfSide
        ? shelfCells(viewProducts, targetShelf, target.shelfSide, target.shelfLevel || 1)[
            target.shelfSlot || 0
          ]
        : undefined;
    const label = !targetShelf
      ? `“${product.name}”已移回待摆放。`
      : occupant && occupant.id !== id
        ? effectivePlacement(product, viewProducts, viewShelves)
          ? `“${product.name}”与“${occupant.name}”已交换位置。`
          : `已替换“${occupant.name}”，原商品已移回待摆放。`
        : `“${product.name}”已移到 ${targetShelf.name} · 第${target.shelfLevel}层第${target.shelfSlot! + 1}格。`;
    void saveChanges(changes, label);
  };
  const moveShelf = async (shelf: Shelf, x: number, y: number, undo = false) => {
    if (saving.current || !shelf.footprint) return;
    saving.current = true;
    setBusy(true);
    setError('');
    let saved = false;
    const next = translatedShelf(shelf, x, y);
    setShelfOverrides((current) => [...current.filter((item) => item.id !== shelf.id), next]);
    try {
      const updated = await api<Shelf>(`/shelves/${encodeURIComponent(shelf.id)}/position`, {
        method: 'PATCH',
        body: JSON.stringify({
          x,
          y,
          expected: {
            footprint: shelf.footprint,
            sectionId: shelf.sectionId,
            accessPoints: shelf.accessPoints || {},
            layoutRevision: shelf.layoutRevision || 0,
          },
        }),
      });
      saved = true;
      setShelfOverrides((current) => [...current.filter((item) => item.id !== shelf.id), updated]);
      setReceipt(
        undo
          ? null
          : { kind: 'shelf', before: shelf, after: updated, label: `移动货架“${shelf.name}”` },
      );
      setStatus(undo ? '货架已回到原位。' : `货架“${shelf.name}”已安放，商品随货架一起移动。`);
      onToast(undo ? '已撤销货架移动。' : `货架“${shelf.name}”位置已保存。`);
      await onRefresh();
      setShelfOverrides([]);
    } catch (cause) {
      if (!saved)
        setShelfOverrides((current) => [...current.filter((item) => item.id !== shelf.id), shelf]);
      setError(
        saved
          ? '货架已保存，刷新失败，请刷新页面查看。'
          : cause instanceof Error
            ? cause.message
            : '未能确认保存，请刷新核对。',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const runShelfBatch = async (
    action: ShelfBatchAction,
    selected: Shelf[],
    undoPayload?: ShelfBatchUndo,
  ) => {
    if (saving.current || (!selected.length && !undoPayload)) return;
    saving.current = true;
    setBusy(true);
    setError('');
    let saved = false;
    const count = undoPayload?.expected.length || selected.length;
    const label = undoPayload
      ? '已撤销货架操作。'
      : action.type === 'delete'
        ? `已删除${count}个货架，商品已移回待摆放。`
        : action.type === 'group'
          ? `已将${count}个货架组合，拖动任意成员可整体移动。`
          : action.type === 'ungroup'
            ? '已分拆组合，货架与商品保留。'
            : `已整体移动${count}个货架。`;
    if (!undoPayload && action.type === 'move') {
      const updates = translateShelfSelection(
        selected.map((shelf) => shelf.id),
        action.dx,
        action.dy,
        selected,
      );
      setShelfOverrides((current) => [
        ...new Map([...current, ...updates].map((shelf) => [shelf.id, shelf])).values(),
      ]);
    }
    try {
      const ids = selected.map((shelf) => shelf.id);
      const payload = undoPayload || {
        expected: selected.map(shelfVersion),
        expectedProducts: viewProducts
          .filter(
            (product) =>
              product.status !== 'archived' && product.shelfId && ids.includes(product.shelfId),
          )
          .map((product) => ({ id: product.id, placement: placementOf(product) })),
        action,
      };
      const result = await api<ShelfBatchResult>('/shelves/batch', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      saved = true;
      capturePositions();
      setShelfOverrides((current) => [
        ...new Map([...current, ...result.shelves].map((shelf) => [shelf.id, shelf])).values(),
      ]);
      setProductOverrides((current) => mergeProducts(current, result.products));
      const liveIds = result.shelves.filter((shelf) => !shelf.deleted).map((shelf) => shelf.id);
      setShelfSelection(liveIds);
      if (liveIds.length && !liveIds.includes(facilityId)) setFacilityId(liveIds[0]);
      setReceipt(undoPayload ? null : { kind: 'shelfBatch', undo: result.undo, label });
      setHover(null);
      setSelectedId('');
      setStatus(label);
      onToast(label);
      await onRefresh();
      setShelfOverrides([]);
      setProductOverrides([]);
    } catch (cause) {
      if (!saved && !undoPayload && action.type === 'move')
        setShelfOverrides((current) => [
          ...new Map([...current, ...selected].map((shelf) => [shelf.id, shelf])).values(),
        ]);
      setError(
        saved
          ? '操作已保存，刷新失败，请刷新核对。'
          : cause instanceof Error
            ? cause.message
            : '货架操作失败。',
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const transformShelf = async (
    shelf: Shelf,
    action: ShelfLayoutAction,
    expectedProducts?: PlacedSnapshot[],
    undo = false,
  ) => {
    if (saving.current || !shelf.footprint) return;
    saving.current = true;
    setBusy(true);
    setError('');
    let saved = false;
    const label = undo
      ? '已撤销货架布局变更。'
      : action.type === 'rotate'
        ? `货架已${action.direction === 'cw' ? '顺时针' : '逆时针'}旋转90°。`
        : '货架占地已更新。';
    try {
      const result = await api<ShelfLayoutResult>(
        `/shelves/${encodeURIComponent(shelf.id)}/layout`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            expected: { geometry: shelfGeometry(shelf), revision: shelf.layoutRevision || 0 },
            action,
            expectedProducts:
              expectedProducts ||
              viewProducts
                .filter((product) => product.status !== 'archived' && product.shelfId === shelf.id)
                .map((product) => ({ id: product.id, placement: placementOf(product) })),
          }),
        },
      );
      saved = true;
      capturePositions();
      setShelfOverrides((current) => [
        ...current.filter((item) => item.id !== shelf.id),
        result.shelf,
      ]);
      setProductOverrides((current) => mergeProducts(current, result.products));
      let face = activeSide;
      const turns = ((result.shelf.rotation || 0) - (shelf.rotation || 0)) / 90;
      for (let step = 0; face && step < Math.abs(turns); step++)
        face = rotateShelfSide(face, turns > 0 ? 'cw' : 'ccw');
      if (face && facility?.id === shelf.id) setSide(face);
      setReceipt(
        undo
          ? null
          : {
              kind: 'layout',
              after: result.shelf,
              undo: result.undo,
              expectedProducts: result.expectedProducts,
              label,
            },
      );
      setStatus(label);
      onToast(label);
      setHover(null);
      await onRefresh();
      setShelfOverrides([]);
      setProductOverrides([]);
    } catch (cause) {
      setError(
        saved
          ? '布局已保存，但刷新失败，请刷新页面核对。'
          : cause instanceof Error
            ? cause.message
            : '货架布局保存失败。',
      );
      if (!saved) throw cause;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const targetAt = (x: number, y: number): Placement | null => {
    const element = document.elementFromPoint(x, y);
    const cell = element?.closest<HTMLElement>('[data-merch-cell]');
    if (cell?.dataset.merchCell) return JSON.parse(cell.dataset.merchCell);
    if (element?.closest('[data-unplace]')) return unplaced();
    return null;
  };
  const productPointerDown = (event: PointerEvent, product: Product) => {
    if (busy || event.button !== 0 || (event.target as Element).closest('.product-image__retry'))
      return;
    if (event.pointerType !== 'mouse' && !(event.target as Element).closest('[data-drag-handle]'))
      return;
    const next = {
      id: product.id,
      pointer: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    dragRef.current = next;
    setDrag(next);
    setError('');
  };
  const productPointerMove = (event: PointerEvent) => {
    const current = dragRef.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      cancelDrag();
      return;
    }
    const moved =
      current.moved ||
      Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 5;
    const next = { ...current, x: event.clientX, y: event.clientY, moved };
    dragRef.current = next;
    setDrag(next);
    if (!moved) return;
    if (!board.current?.hasPointerCapture(event.pointerId))
      board.current?.setPointerCapture(event.pointerId);
    setHover(targetAt(event.clientX, event.clientY));
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const id = element?.closest<SVGElement>('[data-facility-id]')?.dataset.facilityId;
    if (id !== shelfHoverId.current) {
      clearTimeout(shelfHoverTimer.current);
      shelfHoverId.current = id || '';
      if (id) shelfHoverTimer.current = setTimeout(() => selectFacility(id), 400);
    }
    const scroller = element?.closest<HTMLElement>('.merch-product-list, .merch-elevation');
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      if (event.clientY < rect.top + 35) scroller.scrollTop -= 12;
      else if (event.clientY > rect.bottom - 35) scroller.scrollTop += 12;
    }
    if (event.clientY < 65) window.scrollBy(0, -12);
    else if (event.clientY > window.innerHeight - 65) window.scrollBy(0, 12);
  };
  const productPointerUp = (event: PointerEvent) => {
    const current = dragRef.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (current.moved) {
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      const target = targetAt(event.clientX, event.clientY);
      if (target) dropProduct(current.id, target);
    }
    cancelDrag();
  };
  const card = (product: Product, location?: Placement, assessment?: DropAssessment) => (
    <div
      key={product.id}
      data-motion-id={product.id}
      data-in-shelf={location ? 'true' : undefined}
      className={`merch-item ${selectedId === product.id ? 'selected' : ''} ${drag?.moved && drag.id === product.id ? 'is-dragging' : ''} ${!location && !candidateById.get(product.id)?.canPlace ? 'merch-incompatible' : ''}`}
      aria-disabled={(!location && !candidateById.get(product.id)?.canPlace) || undefined}
      onPointerDown={(event) => {
        if (location || candidateById.get(product.id)?.canPlace) productPointerDown(event, product);
      }}
      onDragStart={(event) => event.preventDefault()}
    >
      <button
        type="button"
        className="merch-grip"
        data-drag-handle
        aria-label={`拖动${product.name}`}
        disabled={busy || (!location && !candidateById.get(product.id)?.canPlace)}
        onClick={() => {
          if (!suppressClick.current) setSelectedId(product.id);
        }}
      >
        <GripVertical size={16} />
      </button>
      <ProductImage src={product.image} alt={product.name} size="admin" />
      <button
        type="button"
        className="merch-item-info"
        disabled={
          busy ||
          (!location && !candidateById.get(product.id)?.canPlace) ||
          !!(location && selectedId && selectedId !== product.id && assessment?.kind === 'blocked')
        }
        title={assessment?.kind === 'blocked' ? assessment.reason : product.name}
        onClick={() => {
          if (suppressClick.current) return;
          if (selectedId && selectedId !== product.id && location) {
            dropProduct(selectedId, location);
            return;
          }
          setSelectedId(selectedId === product.id ? '' : product.id);
        }}
      >
        <strong>{product.name}</strong>
        <small>
          {location
            ? `${product.sku || product.id}`
            : product.shelfId
              ? productLocationLabel(product)
              : '待摆放'}
        </small>
      </button>
      {!location && !candidateById.get(product.id)?.canPlace && (
        <div className="merch-card-mask">
          <strong>不适用当前货架</strong>
          <small>{candidateById.get(product.id)?.shortReason}</small>
        </div>
      )}
    </div>
  );
  return (
    <section
      className={`inventory merch-studio ${drag?.moved ? 'merch-dragging' : ''}`}
      id="merchandising"
      aria-label="货架布局与商品陈列"
      ref={board}
      onPointerMove={productPointerMove}
      onPointerUp={productPointerUp}
      onPointerCancel={cancelDrag}
      onLostPointerCapture={(event) => {
        if (event.target === board.current) cancelDrag();
      }}
    >
      <div className="section-heading">
        <div>
          <span className="merch-eyebrow">陈列工作台</span>
          <h2>摆好货架，也摆好每一件商品</h2>
          <p className="field-note">
            地图上拖动货架；商品拖到空格是移动，拖到商品上是交换。新商品替换后，原商品回到待摆放。
          </p>
        </div>
        {receipt && (
          <button
            type="button"
            className="button secondary small merch-undo"
            disabled={busy}
            title={`撤销：${receipt.label}`}
            onClick={() => {
              if (receipt.kind === 'products')
                void saveChanges(receipt.changes, receipt.label, true);
              else if (receipt.kind === 'shelfBatch')
                void runShelfBatch(receipt.undo.action, [], receipt.undo);
              else if (receipt.kind === 'layout')
                void transformShelf(
                  receipt.after,
                  { type: 'restore', ...receipt.undo },
                  receipt.expectedProducts,
                  true,
                ).catch(() => {});
              else
                void moveShelf(
                  receipt.after,
                  receipt.before.footprint!.x,
                  receipt.before.footprint!.y,
                  true,
                );
            }}
          >
            <Undo2 size={15} /> 撤销上一步
          </button>
        )}
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
          <button
            className="text-button"
            type="button"
            disabled={busy}
            onClick={() => {
              void onRefresh()
                .then(() => {
                  setProductOverrides([]);
                  setShelfOverrides([]);
                  setError('');
                })
                .catch(() => setError('刷新失败，请检查后端连接。'));
            }}
          >
            刷新位置
          </button>
        </p>
      )}
      <div
        className={`merch-feedback ${preview?.error ? 'invalid' : ''}`}
        role="status"
        aria-live="polite"
      >
        {busy
          ? '正在保存位置…'
          : preview?.text ||
            (activeProduct
              ? `已选“${activeProduct.name}” · 点击目标格位，或直接拖动；Esc 取消`
              : status || '选择货架查看陈列。每次操作自动保存，并可撤销上一步。')}
      </div>
      <div className="merch-workspace">
        <div className="merch-map-and-products">
          <ShelfPlacementMap
            shelves={viewShelves}
            sections={sections}
            selectedId={facility?.id || ''}
            selectedIds={selectedShelfIds}
            onSelectionChange={(ids, primary) => {
              const focus = primary && ids.includes(primary) ? primary : ids[0];
              if (focus) selectFacility(focus, ids);
              else setShelfSelection(ids);
            }}
            onMoveSelection={(selected, dx, dy) =>
              runShelfBatch({ type: 'move', dx, dy }, selected)
            }
            onBatchAction={(type) =>
              runShelfBatch(
                { type },
                viewShelves.filter((shelf) => selectedShelfIds.includes(shelf.id)),
              )
            }
            busy={busy}
            onTransform={(shelf, action) => transformShelf(shelf, action)}
          />
          <section className="merch-rack-target" aria-label="当前货架格位编辑">
            <div className="merch-rack-heading">
              <span className="merch-eyebrow">当前货架陈列</span>
              <h3>{facility?.name || '请选择目标货架'}</h3>
            </div>
            {facility && (
              <>
                <div className="merch-rack-overview">
                  <strong>
                    {rackCounts.get(facility.id) || 0} 件
                    {legacyFacility ? '关联商品' : '商品已陈列'}
                  </strong>
                  <span>
                    {legacyFacility
                      ? '原有商品已列出，未推断具体格位。'
                      : rackCounts.get(facility.id)
                        ? '各侧数量见下方；已有商品直接显示在格位中。'
                        : '整架为空，尚未安放商品。'}
                  </span>
                  <p>
                    {legacyFacility
                      ? '请先补全位置资料，再编辑具体格位。'
                      : activeProduct
                        ? `正在安放：${activeProduct.name}。各格位已提前校验。`
                        : '先从商品库选择商品，再查看各格位能否安放。'}
                  </p>
                </div>
                {!legacyFacility && (
                  <div className="merch-cell-legend" aria-label="格位状态说明">
                    <span>● 已陈列</span>
                    <span className="can-place">● 可放入</span>
                    <span className="can-exchange">● 可交换 / 替换</span>
                    <span className="cannot-place">● 不可放置</span>
                  </div>
                )}
                <div className="merch-tabs merch-side-tabs">
                  {sides.map((value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={activeSide === value}
                      onClick={() => setSide(value)}
                    >
                      {fixtureSideLabels[value]} · {sideCount(facility, value)}
                    </button>
                  ))}
                </div>
                {!facility.reachable && (
                  <p className="inline-error">该货架当前不可达，请先在设施管理中配置通道点。</p>
                )}
                {legacyFacility && (
                  <div className="merch-legacy-panel">
                    <p>
                      以下商品已关联这个旧位置，但尚无具体格位。请在下方“货架设施”中补全占地、侧面与层数后再编辑陈列。
                    </p>
                    {legacyProducts.map((product) => (
                      <div className="merch-legacy-product" key={product.id}>
                        <ProductImage src={product.image} alt={product.name} size="admin" />
                        <div>
                          <strong>{product.name}</strong>
                          <small>位置资料待补全 · {product.sku || product.id}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="merch-elevation">
                  {!legacyFacility &&
                    activeSide &&
                    Array.from(
                      { length: facility.levels || 1 },
                      (_, index) => (facility.levels || 1) - index,
                    ).map((level) => {
                      const cells = shelfCells(viewProducts, facility, activeSide, level);
                      return (
                        <div className="merch-rack-level" key={level}>
                          <div className="merch-level-heading">
                            <strong>第 {level} 层</strong>
                            <small>
                              {cells.filter(Boolean).length}/{shelfSlotCapacity(facility)} 个 SKU
                            </small>
                          </div>
                          {!activeProduct && !cells.some(Boolean) ? (
                            <p className="merch-empty-level">
                              本层暂无商品 · {shelfSlotCapacity(facility)} 个空位
                            </p>
                          ) : (
                            <div className="merch-cells">
                              {cells.map((product, slot) => {
                                const location: Placement = {
                                  shelfId: facility.id,
                                  shelfSide: activeSide,
                                  shelfLevel: level,
                                  shelfSlot: slot,
                                };
                                const over = hover && samePlacement(hover, location);
                                const assessment = cellAssessments.get(`${level}:${slot}`)!;
                                return (
                                  <div
                                    key={slot}
                                    data-merch-cell={JSON.stringify(location)}
                                    className={`merch-cell state-${assessment.kind} ${over ? (assessment.kind === 'blocked' ? 'invalid' : 'is-target') : ''} ${slot >= shelfSlotCapacity(facility) ? 'over-capacity' : ''}`}
                                    title={assessment.reason}
                                    onMouseEnter={() => {
                                      if (selectedId && !dragRef.current) setHover(location);
                                    }}
                                    onMouseLeave={() => {
                                      if (!dragRef.current) setHover(null);
                                    }}
                                  >
                                    <span className="merch-cell-number">{slot + 1}</span>
                                    {product ? (
                                      card(product, location, assessment)
                                    ) : (
                                      <button
                                        type="button"
                                        className="merch-empty-cell"
                                        disabled={
                                          !selectedId ||
                                          busy ||
                                          assessment.kind === 'blocked' ||
                                          assessment.kind === 'same'
                                        }
                                        onClick={() => dropProduct(selectedId, location)}
                                        onFocus={() => {
                                          if (selectedId) setHover(location);
                                        }}
                                        onBlur={() => setHover(null)}
                                        aria-label={`第${level}层第${slot + 1}格，${assessment.label}，${assessment.reason}`}
                                      >
                                        <span>{assessment.kind === 'blocked' ? '×' : '＋'}</span>
                                        <small>{assessment.label}</small>
                                      </button>
                                    )}
                                    <div className="merch-cell-status" aria-live="off">
                                      <strong>{product ? assessment.label : ''}</strong>
                                      <small>{assessment.shortReason}</small>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
                <p className="merch-rack-footnote">
                  <Check size={14} />{' '}
                  {legacyFacility ? '原有关联商品保持不变' : '松手自动保存 · 支持撤销'}
                  <br />
                  {legacyFacility
                    ? '在下方“货架设施”中补全资料。'
                    : '手机拖动商品左侧手柄，也可先选商品再点格位。'}
                </p>
              </>
            )}
          </section>
        </div>
        <aside className="merch-rack-panel" aria-label="货架格位编辑">
          <div className="merch-rack-heading">
            <span className="merch-eyebrow">选择目标货架 · 自动推荐商品</span>
            <label>
              <LayoutGrid size={18} />
              <select
                aria-label="选择陈列货架"
                value={facility?.id || ''}
                onChange={(event) => selectFacility(event.target.value)}
              >
                {sections
                  .filter((section) => section.active)
                  .map((section) => (
                    <optgroup key={section.id} label={section.name}>
                      {facilities
                        .filter((shelf) => shelf.sectionId === section.id)
                        .map((shelf) => (
                          <option key={shelf.id} value={shelf.id}>
                            {shelf.name} · {rackCounts.get(shelf.id) || 0} 件
                            {!shelf.footprint ? ' · 位置待补全' : ''}
                          </option>
                        ))}
                    </optgroup>
                  ))}
              </select>
            </label>
            <p>
              {facility
                ? legacyFacility
                  ? '旧商品位置 · 格位资料待补全'
                  : `${fixtureKindLabels[facility.kind || 'gondola']} · 每层 ${shelfSlotCapacity(facility)} 个格位`
                : '先在下方设施管理中添加货架'}
            </p>
          </div>
          <div
            className={`merch-source ${hover && !hover.shelfId ? 'drop-pending' : ''}`}
            data-unplace
          >
            <div className="merch-source-heading">
              <h3>
                <Package size={17} /> 商品库{' '}
                <small>
                  {preferredCount} 件适合当前货架 · {pendingCount} 件待摆放
                </small>
              </h3>
              <span>拖到这里可移回待摆放</span>
            </div>
            <div className="merch-source-tools">
              <div className="merch-tabs" aria-label="商品陈列筛选">
                {(
                  [
                    ['pending', '待摆放'],
                    ['placed', '已摆放'],
                    ['all', '全部'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={filter === value}
                    onClick={() => {
                      setFilter(value);
                      setLimit(60);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="merch-search">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setLimit(60);
                  }}
                  placeholder="搜索名称、品牌或 SKU"
                  aria-label="搜索陈列商品"
                />
              </label>
            </div>
            {activeProduct && (
              <button
                type="button"
                className="text-button merch-unplace"
                disabled={busy}
                onClick={() => dropProduct(activeProduct.id, unplaced())}
              >
                将所选商品移回待摆放
              </button>
            )}
            <div className="merch-product-list">
              {visible.slice(0, limit).map((product, index) => {
                const priority = candidateById.get(product.id)!.priority;
                return (
                  <Fragment key={product.id}>
                    {(index === 0 ||
                      candidateById.get(visible[index - 1].id)!.priority !== priority) && (
                      <h4 className={`merch-source-group priority-${priority}`}>
                        {priority === 0
                          ? '优先安放 · 适合当前货架且尚未摆放'
                          : priority === 1
                            ? '已陈列 · 可调整位置'
                            : '不适用当前货架 · 原因见遮罩'}
                      </h4>
                    )}
                    {card(product)}
                  </Fragment>
                );
              })}
              {!visible.length && (
                <p className="field-note">这里还没有商品，试试切换筛选或搜索。</p>
              )}
            </div>
            {visible.length > limit && (
              <button
                type="button"
                className="text-button merch-more"
                onClick={() => setLimit((value) => value + 60)}
              >
                再显示 60 件 · 共 {visible.length} 件
              </button>
            )}
          </div>
        </aside>
      </div>
      {drag?.moved &&
        createPortal(
          <div
            className="merch-drag-ghost"
            style={{ left: drag.x + 16, top: drag.y + 12 }}
            aria-hidden="true"
          >
            <ProductImage src={activeProduct?.image} alt="" size="admin" />
            <strong>{activeProduct?.name}</strong>
            <small>
              {preview?.error ? '此处不可放置' : preview ? '松手完成操作' : '拖到目标格位'}
            </small>
          </div>,
          document.body,
        )}
    </section>
  );
}
