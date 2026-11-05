// Book-layout pure logic: trigram matrix, facing-pages choice, previews.
// Run: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  trigramForBits, splitTrigrams, buildTrigramMatrix,
  firstJudgmentLine, facingEnglishId, facingActive, libraryMode,
} from '../js/book.js';

const hexagrams = JSON.parse(readFileSync(new URL('../data/hexagrams.json', import.meta.url), 'utf8'));
const trigrams = JSON.parse(readFileSync(new URL('../data/trigrams.json', import.meta.url), 'utf8'));

test('splitTrigrams takes lower first, upper second (bottom to top)', () => {
  assert.deepEqual(splitTrigrams([1, 0, 0, 0, 1, 0]), { lower: [1, 0, 0], upper: [0, 1, 0] });
  assert.throws(() => splitTrigrams([1, 0, 0]), RangeError);
});

test('trigramForBits matches the eight figures and rejects junk', () => {
  assert.equal(trigramForBits(trigrams, [1, 1, 1]).name_zh, '乾');
  assert.equal(trigramForBits(trigrams, [0, 0, 0]).name_zh, '坤');
  assert.equal(trigramForBits(trigrams, [0, 1, 0]).name_zh, '坎');
  assert.throws(() => trigramForBits(trigrams, [2, 0, 0]), RangeError);
});

test('buildTrigramMatrix fills all 64 cells exactly once, rows upper, cols lower', () => {
  const { order, cells } = buildTrigramMatrix(hexagrams, trigrams);
  assert.equal(order.length, 8);
  const seen = new Set();
  cells.forEach((row, ui) => row.forEach((h, li) => {
    assert.ok(h, `cell ${ui}/${li} filled`);
    assert.deepEqual(h.bits.slice(3, 6), order[ui].bits, 'row is the upper trigram');
    assert.deepEqual(h.bits.slice(0, 3), order[li].bits, 'column is the lower trigram');
    seen.add(h.number);
  }));
  assert.equal(seen.size, 64);
  // Spot vectors: 1 乾 over 乾, 11 泰 = earth over heaven, 12 否 the reverse.
  const at = (upperZh, lowerZh) => cells[order.findIndex((t) => t.name_zh === upperZh)][order.findIndex((t) => t.name_zh === lowerZh)].number;
  assert.equal(at('乾', '乾'), 1);
  assert.equal(at('坤', '乾'), 11);
  assert.equal(at('乾', '坤'), 12);
});

test('buildTrigramMatrix throws on a gap or a duplicate', () => {
  assert.throws(() => buildTrigramMatrix(hexagrams.slice(1), trigrams), RangeError);
  assert.throws(() => buildTrigramMatrix([...hexagrams, hexagrams[0]], trigrams), RangeError);
});

test('firstJudgmentLine prefers the rendering, falls back in order', () => {
  const h = hexagrams[0];
  const got = firstJudgmentLine(h);
  assert.equal(got.id, 'poem');
  assert.equal(got.text, h.texts.poem.judgment[0]);
  assert.equal(firstJudgmentLine({ texts: { zh: { judgment: ['原文句。'] } } }).id, 'zh');
  assert.equal(firstJudgmentLine({ texts: {} }), null);
});

test('facingEnglishId pairs Chinese with the chosen English (rendering default)', () => {
  const all = ['zh', 'legge', 'poem'];
  assert.equal(facingEnglishId('legge', all), 'legge');
  assert.equal(facingEnglishId('poem', all), 'poem');
  assert.equal(facingEnglishId('zh', all), 'poem');
  assert.equal(facingEnglishId('zh', ['zh', 'legge']), 'legge');
  assert.equal(facingEnglishId('poem', ['poem']), null, 'no Chinese, no facing');
  assert.equal(facingEnglishId('zh', ['zh']), null, 'no English, no facing');
});

test('facing and matrix modes never engage below their width gate', () => {
  assert.equal(facingActive(true, true), true);
  assert.equal(facingActive(true, false), false);
  assert.equal(facingActive(false, true), false);
  assert.equal(libraryMode('trigrams', true), 'trigrams');
  assert.equal(libraryMode('trigrams', false), 'kingwen');
  assert.equal(libraryMode('nonsense', true), 'kingwen');
});
