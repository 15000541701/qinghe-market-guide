import { mapBounds } from '../../shared/map-config';
import { useEffect, useState } from 'react';
import { LoaderCircle, Plus, Save } from 'lucide-react';
import type { Point, Shelf, StoreSection } from '../../shared/types';
import {
  fixtureAccessPoints,
  fixtureKindLabels,
  fixtureSideLabels,
  fixedFixtures,
  mainAisles,
  fixtureSupportsLevels,
} from '../../shared/layout';
import { entrance } from '../../shared/catalog';
import { findPath, isWalkable } from '../../shared/navigation';
import {
  DEFAULT_CAPACITY_PER_SLOT,
  MAX_CAPACITY_PER_SLOT,
  shelfSlotCapacity,
} from '../../shared/shelf-capacity';
import { api } from '../lib';

type FixtureKind = NonNullable<Shelf['kind']>;
type AccessSide = 'left' | 'right' | 'front' | 'back';
type Footprint = NonNullable<Shelf['footprint']>;
type AccessDraft = Record<AccessSide, string>;
type FixtureDraft = {
  sectionId: string;
  name: string;
  kind: FixtureKind;
  footprint: Footprint;
  levels: number;
  capacityPerSlot: number;
  allowedDisplayGroups: string;
  reachable: boolean;
  access: AccessDraft;
};

const sides: AccessSide[] = ['left', 'right', 'front', 'back'];
const sideNames: Record<AccessSide, string> = fixtureSideLabels;
const kinds: { id: FixtureKind; name: string; defaultFootprint: Footprint; levels: number }[] = [
  {
    id: 'freezer',
    name: fixtureKindLabels.freezer,
    defaultFootprint: { x: 2, y: 2, w: 3, h: 1 },
    levels: 1,
  },
  {
    id: 'hanging-rack',
    name: fixtureKindLabels['hanging-rack'],
    defaultFootprint: { x: 2, y: 2, w: 1, h: 4 },
    levels: 1,
  },
  {
    id: 'gondola',
    name: fixtureKindLabels.gondola,
    defaultFootprint: { x: 2, y: 2, w: 2, h: 4 },
    levels: 4,
  },
  {
    id: 'produce-table',
    name: fixtureKindLabels['produce-table'],
    defaultFootprint: { x: 2, y: 2, w: 3, h: 2 },
    levels: 1,
  },
  {
    id: 'display-table',
    name: fixtureKindLabels['display-table'],
    defaultFootprint: { x: 2, y: 2, w: 3, h: 2 },
    levels: 1,
  },
  {
    id: 'service-counter',
    name: fixtureKindLabels['service-counter'],
    defaultFootprint: { x: 2, y: 2, w: 4, h: 1 },
    levels: 1,
  },
  {
    id: 'seafood-tank',
    name: fixtureKindLabels['seafood-tank'],
    defaultFootprint: { x: 2, y: 2, w: 3, h: 2 },
    levels: 1,
  },
  {
    id: 'chiller',
    name: fixtureKindLabels.chiller,
    defaultFootprint: { x: 2, y: 2, w: 4, h: 1 },
    levels: 4,
  },
];
const kindNames = fixtureKindLabels as Record<FixtureKind, string>;
const multiLevel = fixtureSupportsLevels;
const defaultLevels = (kind: FixtureKind) => kinds.find((item) => item.id === kind)?.levels || 1;

function accessDraft(points?: Shelf['accessPoints'], position?: Point | null): AccessDraft {
  const source = points || (position ? { front: position } : {});
  return Object.fromEntries(
    sides.map((side) => {
      const point = source[side];
      return [side, point ? `${point.x},${point.y}` : ''];
    }),
  ) as AccessDraft;
}

function pointsFromDraft(access: AccessDraft): Partial<Record<AccessSide, Point>> {
  return Object.fromEntries(
    sides.flatMap((side) => {
      const value = access[side].trim();
      if (!value) return [];
      const match = value.match(/^(\d+)\s*,\s*(\d+)$/);
      return match ? [[side, { x: Number(match[1]), y: Number(match[2]) }]] : [];
    }),
  ) as Partial<Record<AccessSide, Point>>;
}
function rectsOverlap(a: Footprint, b: Footprint) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function pointOnSide(point: Point, side: AccessSide, footprint: Footprint) {
  if (side === 'left')
    return (
      point.x === footprint.x - 1 && point.y >= footprint.y && point.y < footprint.y + footprint.h
    );
  if (side === 'right')
    return (
      point.x === footprint.x + footprint.w &&
      point.y >= footprint.y &&
      point.y < footprint.y + footprint.h
    );
  if (side === 'front')
    return (
      point.y === footprint.y + footprint.h &&
      point.x >= footprint.x &&
      point.x < footprint.x + footprint.w
    );
  return (
    point.y === footprint.y - 1 && point.x >= footprint.x && point.x < footprint.x + footprint.w
  );
}

function suggestedFootprint(
  sectionId: string,
  kind: FixtureKind,
  sections: StoreSection[],
  shelves: Shelf[],
): Footprint {
  const section = sections.find((item) => item.id === sectionId);
  const template =
    kinds.find((item) => item.id === kind)?.defaultFootprint || kinds[0].defaultFootprint;
  if (!section) return template;
  const activeFootprints = shelves.filter((item) => item.footprint).map((item) => item.footprint!);
  const w = Math.min(template.w, Math.max(1, section.rect.w - 2));
  const h = Math.min(template.h, Math.max(1, section.rect.h - 2));
  for (let y = section.rect.y + 1; y + h < section.rect.y + section.rect.h; y++)
    for (let x = section.rect.x + 1; x + w < section.rect.x + section.rect.w; x++) {
      const candidate = { x, y, w, h };
      if (
        !activeFootprints.some(
          (other) =>
            candidate.x < other.x + other.w &&
            candidate.x + candidate.w > other.x &&
            candidate.y < other.y + other.h &&
            candidate.y + candidate.h > other.y,
        ) &&
        !fixedFixtures.some(
          (fixture) =>
            candidate.x < fixture.rect.x + fixture.rect.w &&
            candidate.x + candidate.w > fixture.rect.x &&
            candidate.y < fixture.rect.y + fixture.rect.h &&
            candidate.y + candidate.h > fixture.rect.y,
        ) &&
        !mainAisles.some(
          (aisle) =>
            candidate.x < aisle.x + aisle.w &&
            candidate.x + candidate.w > aisle.x &&
            candidate.y < aisle.y + aisle.h &&
            candidate.y + candidate.h > aisle.y,
        )
      )
        return candidate;
    }
  return { x: section.rect.x, y: section.rect.y, w: 1, h: 1 };
}

function suggestedAccess(
  footprint: Footprint,
  sectionId = '',
  sections: StoreSection[] = [],
  shelves: Shelf[] = [],
  name = '新设施',
  kind: FixtureKind = 'gondola',
  levels = 1,
): AccessDraft {
  const fixture: Shelf = {
    id: '__new-fixture-preview__',
    sectionId,
    name,
    kind,
    footprint,
    levels,
    accessPoints: {},
    position: null,
    reachable: true,
  };
  const fixtures = [...shelves, fixture];
  const candidates = Object.entries(fixtureAccessPoints(footprint)).filter(
    ([, point]) =>
      isWalkable(point, sections, fixtures) &&
      findPath(entrance, point, sections, fixtures).length > 0,
  );
  const selected = Object.fromEntries(candidates.slice(0, 2));
  return accessDraft(
    Object.keys(selected).length
      ? (selected as Shelf['accessPoints'])
      : fixtureAccessPoints(footprint),
  );
}

export function draftFromShelf(shelf: Shelf, sections: StoreSection[], shelves: Shelf[]): FixtureDraft {
  const kind = shelf.kind || 'gondola';
  const footprint = shelf.footprint || suggestedFootprint(shelf.sectionId, kind, sections, shelves);
  const accessPoints =
    shelf.accessPoints ||
    (shelf.position ? { front: shelf.position } : fixtureAccessPoints(footprint));
  return {
    sectionId: shelf.sectionId,
    name: shelf.name,
    kind,
    footprint,
    levels: multiLevel(kind) ? shelf.levels || defaultLevels(kind) : 1,
    capacityPerSlot: shelfSlotCapacity(shelf),
    allowedDisplayGroups: (shelf.allowedDisplayGroups || []).join(', '),
    reachable: shelf.reachable,
    access: accessDraft(accessPoints),
  };
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '保存失败，请检查区域、占地和到达点。';
}

export default function FacilityEditor({
  sections,
  shelves,
  onRefresh,
  onToast,
  searchQuery = '',
}: {
  sections: StoreSection[];
  shelves: Shelf[];
  onRefresh: () => Promise<void>;
  onToast: (message: string) => void;
  searchQuery?: string;
}) {
  const activeSections = sections.filter((section) => section.active);
  const visibleShelves = shelves.filter((shelf) =>
    `${shelf.name} ${kindNames[shelf.kind || 'gondola']} ${sections.find((section) => section.id === shelf.sectionId)?.name || ''}`
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase()),
  );
  const [sectionId, setSectionId] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<FixtureKind>('gondola');
  const [footprint, setFootprint] = useState<Footprint>(kinds[0].defaultFootprint);
  const [levels, setLevels] = useState(4);
  const [capacityPerSlot, setCapacityPerSlot] = useState(DEFAULT_CAPACITY_PER_SLOT);
  const [allowedDisplayGroups, setAllowedDisplayGroups] = useState('');
  const [reachable, setReachable] = useState(true);
  const [access, setAccess] = useState<AccessDraft>(suggestedAccess(kinds[0].defaultFootprint));
  const [drafts, setDrafts] = useState<Record<string, FixtureDraft>>({});
  const [savingNew, setSavingNew] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!activeSections.length) return;
    const owner = activeSections.some((section) => section.id === sectionId)
      ? sectionId
      : activeSections[0].id;
    if (owner !== sectionId) {
      setSectionId(owner);
      const suggested = suggestedFootprint(owner, kind, sections, shelves);
      setFootprint(suggested);
      setAccess(suggestedAccess(suggested, owner, sections, shelves, name, kind, levels));
    }
  }, [sections, sectionId, shelves.length]);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        shelves.map((shelf) => [shelf.id, draftFromShelf(shelf, sections, shelves)]),
      ),
    );
  }, [shelves, sections]);

  const fixtureError = (draft: FixtureDraft, ignoreId?: string) => {
    const section = sections.find((item) => item.id === draft.sectionId && item.active);
    if (!section) return '请选择启用中的所属区域。';
    if (
      draft.footprint.x < 1 ||
      draft.footprint.y < 1 ||
      draft.footprint.w < 1 ||
      draft.footprint.h < 1 ||
      draft.footprint.x + draft.footprint.w > mapBounds.maxX + 1 ||
      draft.footprint.y + draft.footprint.h > mapBounds.maxY + 1
    )
      return '设施占地超出地图边界。';
    if (draft.levels < 1 || draft.levels > 8) return '层数需设置为 1–8 层。';
    if (!multiLevel(draft.kind) && draft.levels !== 1) return '此类设施只能设置 1 层。';
    if (
      !Number.isInteger(draft.capacityPerSlot) ||
      draft.capacityPerSlot < 1 ||
      draft.capacityPerSlot > MAX_CAPACITY_PER_SLOT
    )
      return `每侧每层容量需设置为 1–${MAX_CAPACITY_PER_SLOT} 个 SKU。`;
    const displayGroups = draft.allowedDisplayGroups
      .split(',')
      .map((group) => group.trim())
      .filter(Boolean);
    if (new Set(displayGroups).size !== displayGroups.length) return '允许的陈列分组不能重复。';
    if (fixedFixtures.some((fixture) => rectsOverlap(draft.footprint, fixture.rect)))
      return '设施占地与固定设施重叠。';
    if (mainAisles.some((aisle) => rectsOverlap(draft.footprint, aisle)))
      return '设施占地不能侵占主通道。';
    if (
      shelves.some(
        (shelf) =>
          shelf.id !== ignoreId &&
          shelf.footprint &&
          rectsOverlap(draft.footprint, shelf.footprint),
      )
    )
      return '设施占地与其他货架或柜台重叠。';
    const configuredSides = sides.filter((side) => draft.access[side].trim());
    const accessPoints = pointsFromDraft(draft.access);
    if (configuredSides.some((side) => !accessPoints[side])) return '侧面到达点请使用 x,y 坐标。';
    if (draft.reachable && !Object.keys(accessPoints).length)
      return '可导航设施至少需要设置一个侧面到达点。';
    const preview: Shelf = {
      id: ignoreId || '__new-fixture-preview__',
      sectionId: draft.sectionId,
      name: draft.name,
      kind: draft.kind,
      footprint: draft.footprint,
      levels: draft.levels,
      capacityPerSlot: draft.capacityPerSlot,
      allowedDisplayGroups: displayGroups,
      accessPoints,
      position:
        accessPoints.front || accessPoints.right || accessPoints.back || accessPoints.left || null,
      reachable: draft.reachable,
      rotation: shelves.find((item) => item.id === ignoreId)?.rotation,
    };
    const fixtureSet = [...shelves.filter((shelf) => shelf.id !== ignoreId), preview];
    for (const [side, point] of Object.entries(accessPoints) as [AccessSide, Point][]) {
      if (!pointOnSide(point, side, draft.footprint))
        return `${sideNames[side]}到达点必须紧邻设施对应一侧。`;
      if (
        draft.reachable &&
        (!isWalkable(point, sections, fixtureSet) ||
          !findPath(entrance, point, sections, fixtureSet).length)
      )
        return `${sideNames[side]}到达点无法从入口通行，请换到相邻通道格。`;
    }
    return '';
  };

  const updateNewKind = (nextKind: FixtureKind) => {
    setKind(nextKind);
    const footprint = suggestedFootprint(sectionId, nextKind, sections, shelves);
    setFootprint(footprint);
    setLevels(defaultLevels(nextKind));
    setAccess(
      suggestedAccess(
        footprint,
        sectionId,
        sections,
        shelves,
        name,
        nextKind,
        defaultLevels(nextKind),
      ),
    );
    setError('');
  };

  const createFixture = async (event: React.FormEvent) => {
    event.preventDefault();
    const draft: FixtureDraft = {
      sectionId,
      name,
      kind,
      footprint,
      levels,
      capacityPerSlot,
      allowedDisplayGroups,
      reachable,
      access,
    };
    const validationError = fixtureError(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSavingNew(true);
    setError('');
    try {
      const accessPoints = pointsFromDraft(access);
      const firstAccess =
        accessPoints.front || accessPoints.right || accessPoints.back || accessPoints.left || null;
      await api('/shelves', {
        method: 'POST',
        body: JSON.stringify({
          id: `shelf-${Date.now().toString(36)}`,
          sectionId,
          name,
          kind,
          footprint,
          levels: multiLevel(kind) ? levels : 1,
          capacityPerSlot,
          allowedDisplayGroups: allowedDisplayGroups
            .split(',')
            .map((group) => group.trim())
            .filter(Boolean),
          accessPoints,
          position: firstAccess,
          reachable: reachable && !!firstAccess,
        }),
      });
      setName('');
      const latestShelves = await api<Shelf[]>('/shelves');
      const nextFootprint = suggestedFootprint(sectionId, kind, sections, latestShelves);
      setFootprint(nextFootprint);
      setAccess(
        suggestedAccess(nextFootprint, sectionId, sections, latestShelves, '', kind, levels),
      );
      onToast(
        `设施“${name}”已添加到“${sections.find((item) => item.id === sectionId)?.name || ''}”。`,
      );
      await onRefresh();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setSavingNew(false);
    }
  };

  const saveFixture = async (shelf: Shelf) => {
    const draft = drafts[shelf.id];
    if (!draft) return;
    const validationError = fixtureError(draft, shelf.id);
    if (validationError) {
      setItemErrors((current) => ({ ...current, [shelf.id]: validationError }));
      return;
    }
    setSavingId(shelf.id);
    setItemErrors((current) => ({ ...current, [shelf.id]: '' }));
    try {
      const accessPoints = pointsFromDraft(draft.access);
      const firstAccess =
        accessPoints.front || accessPoints.right || accessPoints.back || accessPoints.left || null;
      await api(`/shelves/${shelf.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          sectionId: draft.sectionId,
          name: draft.name,
          kind: draft.kind,
          footprint: draft.footprint,
          levels: multiLevel(draft.kind) ? draft.levels : 1,
          capacityPerSlot: draft.capacityPerSlot,
          allowedDisplayGroups: draft.allowedDisplayGroups
            .split(',')
            .map((group) => group.trim())
            .filter(Boolean),
          accessPoints,
          position: firstAccess,
          reachable: draft.reachable && !!firstAccess,
        }),
      });
      await onRefresh();
      onToast(`设施“${draft.name}”已保存。`);
    } catch (cause) {
      setItemErrors((current) => ({ ...current, [shelf.id]: errorText(cause) }));
    } finally {
      setSavingId(null);
    }
  };

  const updateDraft = (id: string, patch: Partial<FixtureDraft>) =>
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

  return (
    <div className="facility-editor">
      <details className="management-create">
        <summary>
          <span>
            <Plus size={16} />
            新增货架设施
          </span>
          <small>设置类型、容量与到达侧</small>
        </summary>
        <form className="facility-create" onSubmit={createFixture}>
          <div className="section-heading">
            <div>
              <h3>新增门店设施</h3>
              <p className="muted compact">
                中央货架排、生鲜台、服务柜台、海鲜池和冷柜均可配置占地与顾客到达侧。
              </p>
            </div>
          </div>
          <div className="facility-form-grid">
            <label className="field">
              设施名称 / 货架编号
              <input
                value={name}
                maxLength={30}
                required
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：A-01"
              />
            </label>
            <label className="field">
              所属区域
              <select
                value={sectionId}
                required
                onChange={(event) => {
                  const next = event.target.value;
                  setSectionId(next);
                  const suggested = suggestedFootprint(next, kind, sections, shelves);
                  setFootprint(suggested);
                  setAccess(
                    suggestedAccess(suggested, next, sections, shelves, name, kind, levels),
                  );
                }}
              >
                <option value="">选择区域</option>
                {activeSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              设施类型
              <select
                value={kind}
                onChange={(event) => updateNewKind(event.target.value as FixtureKind)}
              >
                {kinds.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              层数（从下往上）
              <input
                type="number"
                min={1}
                max={multiLevel(kind) ? 8 : 1}
                value={multiLevel(kind) ? levels : 1}
                disabled={!multiLevel(kind)}
                onChange={(event) => setLevels(Number(event.target.value))}
              />
            </label>
            <label className="field">
              每侧每层 SKU 上限
              <input
                type="number"
                min={1}
                max={MAX_CAPACITY_PER_SLOT}
                value={capacityPerSlot}
                onChange={(event) => setCapacityPerSlot(Number(event.target.value))}
              />
              <small>默认 4 个 SKU；库存数量不占用陈列位。</small>
            </label>
            <label className="field">
              允许的陈列分组
              <input
                value={allowedDisplayGroups}
                onChange={(event) => setAllowedDisplayGroups(event.target.value)}
                placeholder="留空表示不限制"
              />
              <small>可填逗号分隔的分组编号；未知储温不会自动推断。</small>
            </label>
            <fieldset className="facility-footprint-fields">
              <legend>地图占地 x、y、宽、高</legend>
              {(['x', 'y', 'w', 'h'] as const).map((key) => (
                <label className="field" key={key}>
                  {key.toUpperCase()}
                  <input
                    type="number"
                    min={1}
                    max={key === 'x' ? mapBounds.maxX : key === 'y' ? mapBounds.maxY : 16}
                    value={footprint[key]}
                    onChange={(event) =>
                      setFootprint((current) => ({ ...current, [key]: Number(event.target.value) }))
                    }
                  />
                </label>
              ))}
            </fieldset>
            <fieldset className="facility-access-fields">
              <legend>顾客到达点（地图坐标 x,y；留空表示该侧不可达）</legend>
              {sides.map((side) => (
                <label className="field" key={side}>
                  {sideNames[side]}
                  <input
                    value={access[side]}
                    pattern="[0-9]+\s*,\s*[0-9]+"
                    onChange={(event) =>
                      setAccess((current) => ({ ...current, [side]: event.target.value }))
                    }
                    aria-label={`${name || '新设施'}${sideNames[side]}到达点`}
                  />
                </label>
              ))}
            </fieldset>
          </div>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <button className="button secondary" type="submit" disabled={savingNew}>
            {savingNew ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
            {savingNew ? '保存中…' : '新增设施'}
          </button>
        </form>
      </details>

      <div className="facility-list">
        {!visibleShelves.length && <p className="management-empty">没有匹配的货架设施。</p>}
        {visibleShelves.map((shelf) => {
          const draft = drafts[shelf.id];
          if (!draft) return null;
          return (
            <details className="facility-item" key={shelf.id}>
              <summary>
                <strong>{draft.name}</strong>
                <em className={`management-status ${shelf.reachable ? 'enabled' : ''}`}>
                  {shelf.reachable ? '可到达' : '不可到达'}
                </em>
                <span>
                  {kindNames[draft.kind]} ·{' '}
                  {sections.find((section) => section.id === draft.sectionId)?.name || '未关联区域'}{' '}
                  · {draft.footprint.w}×{draft.footprint.h}
                </span>
              </summary>
              <div className="facility-form-grid facility-edit-grid">
                <label className="field">
                  设施名称 / 编号
                  <input
                    value={draft.name}
                    maxLength={30}
                    onChange={(event) => updateDraft(shelf.id, { name: event.target.value })}
                  />
                </label>
                <label className="field">
                  所属区域
                  <select
                    value={draft.sectionId}
                    onChange={(event) => updateDraft(shelf.id, { sectionId: event.target.value })}
                  >
                    {activeSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  设施类型
                  <select
                    value={draft.kind}
                    onChange={(event) => {
                      const nextKind = event.target.value as FixtureKind;
                      updateDraft(shelf.id, {
                        kind: nextKind,
                        levels: multiLevel(nextKind) ? draft.levels || defaultLevels(nextKind) : 1,
                      });
                    }}
                  >
                    {kinds.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  层数（从下往上）
                  <input
                    type="number"
                    min={1}
                    max={multiLevel(draft.kind) ? 8 : 1}
                    value={multiLevel(draft.kind) ? draft.levels : 1}
                    disabled={!multiLevel(draft.kind)}
                    onChange={(event) =>
                      updateDraft(shelf.id, { levels: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="field">
                  每侧每层 SKU 上限
                  <input
                    type="number"
                    min={1}
                    max={MAX_CAPACITY_PER_SLOT}
                    value={draft.capacityPerSlot}
                    onChange={(event) =>
                      updateDraft(shelf.id, { capacityPerSlot: Number(event.target.value) })
                    }
                  />
                  <small>默认 4 个 SKU；库存数量不占用陈列位。</small>
                </label>
                <label className="field">
                  允许的陈列分组
                  <input
                    value={draft.allowedDisplayGroups}
                    onChange={(event) =>
                      updateDraft(shelf.id, { allowedDisplayGroups: event.target.value })
                    }
                    placeholder="留空表示不限制"
                  />
                  <small>可填逗号分隔的分组编号；未知储温不会自动推断。</small>
                </label>
                <fieldset className="facility-footprint-fields">
                  <legend>地图占地 x、y、宽、高</legend>
                  {(['x', 'y', 'w', 'h'] as const).map((key) => (
                    <label className="field" key={key}>
                      {key.toUpperCase()}
                      <input
                        type="number"
                        min={1}
                        max={key === 'x' ? mapBounds.maxX : key === 'y' ? mapBounds.maxY : 16}
                        value={draft.footprint[key]}
                        onChange={(event) =>
                          updateDraft(shelf.id, {
                            footprint: { ...draft.footprint, [key]: Number(event.target.value) },
                          })
                        }
                      />
                    </label>
                  ))}
                </fieldset>
                <fieldset className="facility-access-fields">
                  <legend>顾客到达点（x,y）</legend>
                  {sides.map((side) => (
                    <label className="field" key={side}>
                      {sideNames[side]}
                      <input
                        value={draft.access[side]}
                        pattern="[0-9]+\s*,\s*[0-9]+"
                        onChange={(event) =>
                          updateDraft(shelf.id, {
                            access: { ...draft.access, [side]: event.target.value },
                          })
                        }
                      />
                    </label>
                  ))}
                </fieldset>
                <label className="facility-reachable">
                  <input
                    type="checkbox"
                    checked={draft.reachable}
                    onChange={(event) => updateDraft(shelf.id, { reachable: event.target.checked })}
                  />
                  顾客可到达
                </label>
                {itemErrors[shelf.id] && (
                  <p className="inline-error" role="alert">
                    {itemErrors[shelf.id]}
                  </p>
                )}
                <button
                  className="button secondary"
                  type="button"
                  disabled={savingId === shelf.id}
                  onClick={() => void saveFixture(shelf)}
                >
                  {savingId === shelf.id ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {savingId === shelf.id ? '保存中…' : '保存设施'}
                </button>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
