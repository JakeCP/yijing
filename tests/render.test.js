// Render tests: SVG figures must not depend on webfont glyphs.
// Run: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { coinSVG, hexagramSVG, trigramFigure } from '../js/render.js';

test('coin faces are drawn paths, never <text> (tofu-proof without fonts)', () => {
  const inscribed = coinSVG('character');
  assert.ok(!inscribed.includes('<text'), 'character side must not use <text>');
  // two inscription glyphs (top and bottom of the square hole)
  assert.equal((inscribed.match(/class="coin-glyph"/g) ?? []).length, 2);
  assert.ok(inscribed.includes('<path d="M'));

  const plain = coinSVG('blank');
  assert.ok(!plain.includes('<text'));
  assert.ok(!plain.includes('coin-glyph'), 'blank side carries no inscription');

  // both faces keep the shared furniture: rim, inner ring, square hole
  for (const svg of [inscribed, plain]) {
    assert.ok(svg.includes('coin-rim') && svg.includes('coin-hole'));
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'));
  }
});

test('trigram figures are drawn, never typeset (no font carries U+2630s)', () => {
  const tri = { name_zh: '乾', name_pinyin: 'Qián', bits: [1, 1, 1] };
  const svg = trigramFigure(tri);
  assert.ok(!svg.includes('<text'));
  assert.ok(![...svg].some((c) => { const n = c.codePointAt(0); return n >= 0x2630 && n <= 0x2637; }), 'no trigram codepoints');
  assert.equal((svg.match(/class="hex-line"/g) ?? []).length, 3);
  assert.ok(svg.includes('trigram-figure'));
});

test('interactive hexagrams expose six named, focusable lines in a group', () => {
  const svg = hexagramSVG({
    bits: [1, 0, 0, 0, 1, 0], interactive: true, label: 'Hexagram 3',
    lineNames: ['Line 1 a', 'Line 2 b', 'Line 3 c', 'Line 4 d', 'Line 5 e', 'Line 6 f'],
  });
  assert.ok(svg.includes('role="group"'));
  assert.equal((svg.match(/tabindex="0"/g) ?? []).length, 6);
  assert.equal((svg.match(/data-line="[1-6]"/g) ?? []).length, 6);
  assert.ok(svg.includes('aria-label="Line 6 f"'));
  const plain = hexagramSVG({ bits: [1, 0, 0, 0, 1, 0] });
  assert.ok(!plain.includes('tabindex'), 'static figures stay out of the tab order');
  assert.equal((plain.match(/data-line="[1-6]"/g) ?? []).length, 6);
});

test('figures are brushed by default; flat lines are opt-in (library only)', () => {
  const brushed = hexagramSVG({ bits: [1, 0, 1, 0, 1, 0] });
  assert.ok(brushed.includes('<path d="M'), 'default figure draws brush paths');
  assert.ok(!brushed.includes('<rect x="1"'), 'default figure draws no flat bars');
  assert.ok(!brushed.includes('hexagram-plain'));
  const flat = hexagramSVG({ bits: [1, 0, 1, 0, 1, 0], plain: true });
  assert.ok(flat.includes('<rect x="1"') && flat.includes('hexagram-plain'), 'plain stays available for the library grid');
});

// app.js needs a DOM, so the reading's section order is asserted on the
// render source: both figures in the side column first, then the primary
// texts, then the relating texts under their own heading — never a large
// relating head mid-text, and nothing trailing outside the text column.
test('reading order: both figures first, primary text, then relating text', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.ok(!app.includes('hexaHead(relating'), 'no large relating head mid-text');

  const side = app.slice(app.indexOf('function spreadSide'), app.indexOf('function bindLineHighlight'));
  assert.ok(side.includes('relating.bits'), 'the side column holds the relating figure');
  assert.ok(!side.includes('plain'), 'the relating figure is brushed like the primary, not flat');

  const reading = app.slice(app.indexOf('function readingView'), app.indexOf('// ----------------------------------------------------------- hexagram page'));
  const at = ( needle) => reading.indexOf(needle);
  assert.ok(at('spreadSide(primary') !== -1 && at('spreadSide(primary') < at('judgmentBlock(primary'), 'figures precede the primary text');
  assert.ok(at('judgmentBlock(primary') < at('relating-heading'), 'primary text precedes the relating heading');
  assert.ok(at('relating-heading') < at('judgmentBlock(relating'), 'relating judgment sits under its heading');
  assert.ok(at('judgmentBlock(relating') < at('imageBlock(relating'), 'relating judgment before its image');
  const spreadClose = reading.lastIndexOf("'</div></div>'");
  assert.ok(at('castRecordHtml(route') !== -1 && at('castRecordHtml(route') < spreadClose, 'cast record stays inside the text column');
  assert.ok(at('id="cast-again"') !== -1 && at('id="cast-again"') < spreadClose, 'the action row stays inside the text column');
});
