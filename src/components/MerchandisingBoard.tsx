import { useState } from 'react';
import { GripVertical, Move } from 'lucide-react';
import type { Product, Shelf, StoreSection } from '../../shared/types';
import { fixtureKindLabels, fixtureSideLabels, productLocationLabel } from '../../shared/layout';
import { shelfSlotCapacity, shelfSlotPlacementError, shelfSlotUsage } from '../../shared/shelf-capacity';
import { api } from '../lib';

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
  const [facilityId, setFacilityId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [draggedId, setDraggedId] = useState('');
  const [hovered, setHovered] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const facilities = shelves.filter(
    (s) => s.reachable && s.footprint && sections.some((a) => a.id === s.sectionId && a.active),
  );
  const facility = facilities.find((s) => s.id === facilityId) || facilities[0];
  const visible = products.filter(
    (p) =>
      p.status !== 'archived' &&
      `${p.name}${p.sku || p.id}${p.brand || ''}`.toLowerCase().includes(query.toLowerCase()),
  );
  const move = async (
    id: string,
    shelf: Shelf,
    side: NonNullable<Product['shelfSide']>,
    level: number,
  ) => {
    const product = products.find((p) => p.id === id);
    if (!product || busy) return;
    const capacityError = shelfSlotPlacementError(
      shelf,
      product,
      products,
      side,
      level,
    );
    if (capacityError) {
      setError(capacityError);
      return;
    }
    setBusy(true);
    setError('');
    let saved = false;
    try {
      await api(`/products/${encodeURIComponent(id)}/placement`, {
        method: 'PATCH',
        body: JSON.stringify({
          shelfId: shelf.id,
          shelfSide: side,
          shelfLevel: level,
          expected: {
            shelfId: product.shelfId,
            shelfSide: product.shelfSide,
            shelfLevel: product.shelfLevel,
          },
        }),
      });
      saved = true;
      onToast(`${product.name} 已移到 ${shelf.name} · ${fixtureSideLabels[side]} · 第${level}层。`);
      setSelectedId('');
      await onRefresh();
    } catch (e) {
      setError(
        saved
          ? '位置已保存，列表刷新失败，请刷新页面查看。'
          : e instanceof Error
            ? e.message
            : '陈列移动失败。',
      );
    } finally {
      setBusy(false);
      setDraggedId('');
      setHovered('');
    }
  };
  const card = (product: Product) => (
    <div
      key={product.id}
      className={`merch-product ${selectedId === product.id ? 'selected' : ''}`}
      draggable={!busy}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', product.id);
        e.dataTransfer.effectAllowed = 'move';
        setDraggedId(product.id);
      }}
      onDragEnd={() => {
        setDraggedId('');
        setHovered('');
      }}
    >
      <button
        className="merch-handle"
        aria-label={`拖动${product.name}`}
        disabled={busy}
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' || busy) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDraggedId(product.id);
        }}
        onPointerMove={(e) => {
          if (e.pointerType === 'mouse' || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
          const target = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest<HTMLElement>('[data-placement-target]');
          setHovered(target?.dataset.placementTarget || '');
        }}
        onPointerUp={(e) => {
          if (e.pointerType === 'mouse' || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
          const target = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest<HTMLElement>('[data-placement-target]');
          const shelf = shelves.find((s) => s.id === target?.dataset.shelfId);
          if (shelf && target)
            void move(
              product.id,
              shelf,
              target.dataset.side as NonNullable<Product['shelfSide']>,
              Number(target.dataset.level),
            );
          else {
            setDraggedId('');
            setHovered('');
          }
        }}
        onPointerCancel={() => {
          setDraggedId('');
          setHovered('');
        }}
        onClick={() => setSelectedId(product.id)}
      >
        <GripVertical size={16} />
      </button>
      <button
        className="merch-product-text"
        disabled={busy}
        onClick={() => setSelectedId(product.id)}
      >
        <strong>{product.name}</strong>
        <small>{product.sku || product.id}</small>
        <small>
          {product.shelfId ? productLocationLabel(product) : '尚未安排陈列'}
          {product.status === 'draft' ? ' · 待确认售价/库存' : ''}
        </small>
      </button>
    </div>
  );
  return (
    <section className="inventory" id="merchandising" aria-label="拖拽商品陈列">
      <div className="section-heading">
        <div>
          <h2>拖拽商品陈列</h2>
          <p className="field-note">
            将 SKU
            拖到目标设施的侧面与层位。也可先点击商品，再点击目标层位完成移动；手机拖动左侧手柄。
          </p>
        </div>
      </div>
      <div className="merch-controls">
        <label>
          搜索 SKU{' '}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="名称、品牌、SKU"
          />
        </label>
        <label>
          目标设施{' '}
          <select
            value={facility?.id || ''}
            disabled={busy}
            onChange={(e) => setFacilityId(e.target.value)}
          >
            {sections
              .filter((s) => s.active)
              .map((section) => (
                <optgroup key={section.id} label={section.name}>
                  {facilities
                    .filter((f) => f.sectionId === section.id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} · {fixtureKindLabels[f.kind || 'gondola']}
                      </option>
                    ))}
                </optgroup>
              ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {busy && <p role="status">正在保存陈列位置…</p>}
      {(draggedId || selectedId) && (
        <p className="field-note" role="status">
          待移动：{products.find((p) => p.id === (draggedId || selectedId))?.name}
          。选择目标层位即可。
        </p>
      )}
      <div className="merch-board">
        <div className="merch-product-list">
          {visible.map(card)}
          {!visible.length && <p className="field-note">没有匹配的 SKU，可先批量导入。</p>}
        </div>
        <div className="merch-facility">
          {facility ? (
            <>
              <h3>
                {facility.name} · {fixtureKindLabels[facility.kind || 'gondola']}
              </h3>
              <p className="field-note">
                每个可达侧面、每层最多 {shelfSlotCapacity(facility)} 个 SKU；库存数量不计入陈列位。
              </p>
              {(
                Object.keys(facility.accessPoints || {}) as NonNullable<Product['shelfSide']>[]
              ).map((side) => (
                <div key={side} className="merch-face">
                  <h4>{fixtureSideLabels[side]}</h4>
                  {Array.from(
                    { length: facility.levels || 1 },
                    (_, i) => (facility.levels || 1) - i,
                  ).map((level) => {
                    const key = `${facility.id}:${side}:${level}`;
                    const slotProducts = products.filter(
                      (p) =>
                        p.status !== 'archived' &&
                        p.shelfId === facility.id &&
                        p.shelfSide === side &&
                        (p.shelfLevel || 1) === level,
                    );
                    const slotCapacity = shelfSlotCapacity(facility);
                    const slotFull = slotProducts.length >= slotCapacity;
                    return (
                      <div
                        key={key}
                        className={`merch-slot ${hovered === key ? 'drag-over' : ''} ${slotFull ? 'full' : ''}`}
                        data-placement-target={key}
                        data-shelf-id={facility.id}
                        data-side={side}
                        data-level={level}
                        onDragOver={(e) => {
                          if (!busy) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setHovered(key);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!busy)
                            void move(e.dataTransfer.getData('text/plain'), facility, side, level);
                        }}
                      >
                        <small className="merch-slot-count">
                          {slotProducts.length}/{slotCapacity} 个 SKU
                        </small>
                        <button
                          className="merch-slot-label"
                          disabled={!selectedId || busy}
                          onClick={() => void move(selectedId, facility, side, level)}
                        >
                          <Move size={13} />
                          {(facility.levels || 1) > 1 ? `第${level}层` : '陈列面'}
                          {selectedId ? ' · 放到这里' : ''}
                        </button>
                        {slotProducts.map(card)}
                        <small className="merch-drop-hint">
                          {slotFull ? '已满；另选层位或在设施管理新增货架' : '拖放到此处'}
                        </small>
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          ) : (
            <p className="field-note">请先新增启用、可达的陈列设施。</p>
          )}
        </div>
      </div>
      <p className="field-note">
        保存只变更陈列位置，商品分类、售价和库存不随拖拽修改。待确认 SKU
        可先排陈列，确认本店售价与库存后再上架。
      </p>
    </section>
  );
}
