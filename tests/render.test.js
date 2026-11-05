// Render tests: SVG figures must not depend on webfont glyphs.
// Run: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { coinSVG } from '../js/render.js';

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
