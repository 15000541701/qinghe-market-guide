import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FootprintRect from '../src/components/FootprintRect';
import { draftFromShelf } from '../src/components/FacilityEditor';
import type { Shelf, StoreSection } from '../shared/types';
import { footprintFromCorners } from '../shared/shelf-move';

test('反向拖出的5×2格占地输出有色SVG矩形，不能只剩角点或无效w/h属性', () => {
  const footprint = footprintFromCorners({ x: 19, y: 9 }, { x: 14, y: 7 });
  const svg = renderToStaticMarkup(
    createElement(
      'svg',
      null,
      createElement(FootprintRect, {
        bounds: footprint,
        className: 'placement-area-preview',
        fill: '#68b7dc',
        fillOpacity: 0.42,
      }),
    ),
  );
  assert.match(svg, /<rect\b/);
  assert.match(svg, /\bwidth="5"/);
  assert.match(svg, /\bheight="2"/);
  assert.match(svg, /\bx="14"/);
  assert.match(svg, /\by="7"/);
  assert.match(svg, /fill="#68b7dc"/);
  assert.match(svg, /fill-opacity="0.42"/);
  assert.doesNotMatch(svg, /\s(?:w|h)="/);
});

test('设施编辑草稿保留两层服饰挂架，不强制降为一层，缺省时仍沿用一层默认值', () => {
  const section: StoreSection = {
    id: 'clothing', name: '服饰', code: 'C', active: true,
    color: '#315443', tint: '#eef4e8', location: { x: 2, y: 9 },
    rect: { x: 1, y: 1, w: 8, h: 8 },
  };
  const shelf: Shelf = {
    id: 'hanging', name: '服饰挂架', sectionId: section.id, kind: 'hanging-rack',
    levels: 2, reachable: true, footprint: { x: 2, y: 2, w: 1, h: 4 },
    accessPoints: { left: { x: 1, y: 3 } }, position: { x: 1, y: 3 },
  };
  const draft = draftFromShelf(shelf, [section], [shelf]);
  assert.equal(draft.levels, 2);
  assert.equal(draft.kind, 'hanging-rack');
  assert.deepEqual(draft.footprint, shelf.footprint);
  assert.equal(draftFromShelf({ ...shelf, levels: undefined }, [section], [shelf]).levels, 1);
});
