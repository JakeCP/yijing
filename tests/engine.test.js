// Engine tests: exact enumeration of distributions, King Wen vectors,
// label table, relating hexagram, URL + routing strictness.
// Run: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  castCoinLine, castYarrowLine, castLine, castHexagram, synthesizeYarrowSplits,
  bitForValue, isChanging, lineKind, describeValue, bitsFromValues, changingIndices,
  relatingBits, relatingNumber, numberForBits, bitsForNumber, numberForValues,
  labelFor, specialLabel, encodeReading, decodeReading, parseRoute, hexagramHash,
  methodLetter, methodFromLetter, summarizeCast, makeCryptoRandomInt, KING_WEN_BITS,
} from '../js/engine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hexagrams = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/hexagrams.json'), 'utf8'));

// Scripted randomness: returns queued values, records bounds it was asked for.
function scripted(values) {
  const queue = [...values];
  const bounds = [];
  const fn = (bound) => {
    bounds.push(bound);
    if (queue.length === 0) throw new Error('scripted randomness exhausted');
    return queue.shift();
  };
  fn.bounds = bounds;
  fn.remaining = () => queue.length;
  return fn;
}

// ------------------------------------------------------------- distributions

test('coins: exact enumeration of all 8 outcomes gives 1/8, 3/8, 3/8, 1/8', () => {
  const tally = { 6: 0, 7: 0, 8: 0, 9: 0 };
  for (let mask = 0; mask < 8; mask += 1) {
    const draws = [0, 1, 2].map((i) => (mask >> i) & 1);
    const line = castCoinLine(scripted(draws));
    tally[line.value] += 1;
    // face values: draw 1 -> character (3), draw 0 -> blank (2)
    line.faces.forEach((f, i) => {
      assert.equal(f.value, draws[i] === 1 ? 3 : 2);
      assert.equal(f.side, draws[i] === 1 ? 'character' : 'blank');
    });
    assert.equal(line.value, line.faces.reduce((s, f) => s + f.value, 0));
  }
  assert.deepEqual(tally, { 6: 1, 7: 3, 8: 3, 9: 1 });
});

test('yarrow: exact enumeration of all 16 weighted paths gives 1/16, 5/16, 7/16, 3/16', () => {
  const tally = { 6: 0, 7: 0, 8: 0, 9: 0 };
  for (let a = 0; a < 4; a += 1) for (let b = 0; b < 2; b += 1) for (let c = 0; c < 2; c += 1) {
    const line = castYarrowLine(scripted([a, b, c]));
    tally[line.value] += 1;
    assert.equal(line.changes[0], a === 0 ? 9 : 5);
    assert.equal(line.changes[1], b === 0 ? 8 : 4);
    assert.equal(line.changes[2], c === 0 ? 8 : 4);
    assert.equal(line.remaining, 49 - line.changes.reduce((s, x) => s + x, 0));
    assert.equal(line.value, line.remaining / 4);
  }
  assert.deepEqual(tally, { 6: 1, 7: 5, 8: 7, 9: 3 });
});

test('yarrow synthesized splits are consistent for every path', () => {
  for (let a = 0; a < 4; a += 1) for (let b = 0; b < 2; b += 1) for (let c = 0; c < 2; c += 1) {
    const line = castYarrowLine(scripted([a, b, c]));
    for (const splits of [synthesizeYarrowSplits(line.changes), synthesizeYarrowSplits(line.changes, () => 0)]) {
      let heap = 49;
      splits.forEach((s, i) => {
        assert.equal(s.heap, heap);
        assert.equal(s.left + s.right, heap);
        assert.equal(s.removed, line.changes[i]);
        assert.equal(1 + s.remainderLeft + s.remainderRight, s.removed);
        assert.equal((s.left - s.remainderLeft) % 4, 0);
        assert.equal((s.right - 1 - s.remainderRight) % 4, 0);
        assert.ok(s.remainderLeft >= 1 && s.remainderLeft <= 4);
        assert.ok(s.remainderRight >= 1 && s.remainderRight <= 4);
        heap = s.remaining;
      });
      assert.equal(heap, line.remaining);
    }
  }
  assert.throws(() => synthesizeYarrowSplits([7, 4, 4]), RangeError);
  assert.throws(() => synthesizeYarrowSplits([5, 5, 4]), RangeError);
  assert.throws(() => synthesizeYarrowSplits([5, 4]), RangeError);
});

test('a cast consumes randomness in order, line by line, bottom to top', () => {
  const rnd = scripted([
    1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1,
  ]);
  const cast = castHexagram('coins', rnd);
  assert.deepEqual(cast.values, [9, 6, 8, 7, 7, 8]);
  assert.equal(rnd.remaining(), 0);
  assert.deepEqual(rnd.bounds, Array(18).fill(2));

  const yrnd = scripted([0, 0, 0, 1, 1, 1, 2, 0, 1, 3, 1, 0, 0, 1, 1, 1, 0, 0]);
  const ycast = castHexagram('yarrow', yrnd);
  assert.deepEqual(ycast.values, [6, 9, 8, 8, 8, 7]);
  assert.equal(yrnd.remaining(), 0);
  assert.deepEqual(yrnd.bounds, Array(6).fill([4, 2, 2]).flat());
});

test('engine rejects misbehaving randomInt', () => {
  assert.throws(() => castCoinLine(() => 2), RangeError);
  assert.throws(() => castCoinLine(() => -1), RangeError);
  assert.throws(() => castCoinLine(() => 0.5), RangeError);
  assert.throws(() => castCoinLine(null), TypeError);
  assert.throws(() => castLine('manual', () => 0), RangeError);
  assert.throws(() => castLine('dice', () => 0), RangeError);
});

test('crypto adapter: rejection sampling with a fake crypto source', () => {
  const fills = [4294967295, 5]; // first is >= limit for bound 3, must be rejected
  const fake = { getRandomValues(arr) { arr[0] = fills.shift(); } };
  const rnd = makeCryptoRandomInt(fake);
  assert.equal(rnd(3), 2); // 5 % 3
  assert.equal(fills.length, 0);

  const real = makeCryptoRandomInt();
  for (let i = 0; i < 200; i += 1) {
    const v = real(4);
    assert.ok(Number.isInteger(v) && v >= 0 && v < 4);
  }
  assert.equal(real(1), 0);
  assert.throws(() => real(0), RangeError);
  assert.throws(() => makeCryptoRandomInt({}), TypeError);
});

// ------------------------------------------------------------------- values

test('value semantics: bits, changing, kinds', () => {
  assert.deepEqual([6, 7, 8, 9].map(bitForValue), [0, 1, 0, 1]);
  assert.deepEqual([6, 7, 8, 9].map(isChanging), [true, false, false, true]);
  assert.deepEqual([6, 7, 8, 9].map(lineKind), ['old-yin', 'young-yang', 'young-yin', 'old-yang']);
  assert.equal(describeValue(6), 'old yin, changing');
  assert.equal(describeValue(7), 'young yang');
  assert.equal(describeValue(8), 'young yin');
  assert.equal(describeValue(9), 'old yang, changing');
  for (const bad of [5, 10, 0, '7', null, NaN]) assert.throws(() => bitForValue(bad), RangeError);
});

test('relating hexagram flips only changing lines; none changing -> null', () => {
  assert.equal(relatingBits([7, 8, 7, 8, 7, 8]), null);
  assert.equal(relatingNumber([7, 8, 7, 8, 7, 8]), null);
  // all changing on 乾 (all 9) relates to 坤
  assert.deepEqual(relatingBits([9, 9, 9, 9, 9, 9]), [0, 0, 0, 0, 0, 0]);
  assert.equal(relatingNumber([9, 9, 9, 9, 9, 9]), 2);
  assert.equal(relatingNumber([6, 6, 6, 6, 6, 6]), 1);
  // 屯 100010 with line 1 changing (9) -> 000010 = 比 (8)
  assert.equal(numberForValues([9, 8, 8, 8, 7, 8]), 3);
  assert.equal(relatingNumber([9, 8, 8, 8, 7, 8]), 8);
  assert.deepEqual(changingIndices([9, 8, 6, 7, 8, 9]), [0, 2, 5]);
  assert.deepEqual(bitsFromValues([9, 8, 6, 7, 8, 9]), [1, 0, 0, 1, 0, 1]);
  assert.throws(() => bitsFromValues([7, 8, 7]), RangeError);
  assert.throws(() => bitsFromValues([7, 8, 7, 8, 7, 5]), RangeError);
});

test('summarizeCast', () => {
  const s = summarizeCast([9, 9, 9, 9, 9, 9]);
  assert.equal(s.number, 1);
  assert.equal(s.relatingNumber, 2);
  assert.equal(s.allChanging, true);
  assert.deepEqual(s.changing, [0, 1, 2, 3, 4, 5]);
  const quiet = summarizeCast([7, 7, 7, 8, 8, 8]);
  assert.equal(quiet.number, 11);
  assert.equal(quiet.relatingNumber, null);
  assert.equal(quiet.allChanging, false);
});

// ---------------------------------------------------------------- King Wen

test('King Wen fixed test vectors (PLAN.md M3)', () => {
  const vectors = {
    1: '111111', 2: '000000', 3: '100010', 11: '111000',
    12: '000111', 29: '010010', 63: '101010', 64: '010101',
  };
  for (const [n, bits] of Object.entries(vectors)) {
    assert.equal(KING_WEN_BITS[Number(n) - 1], bits, `hexagram ${n}`);
    assert.deepEqual(bitsForNumber(Number(n)).join(''), bits);
    assert.equal(numberForBits(bits), Number(n));
  }
});

test('King Wen table matches data/hexagrams.json for all 64', () => {
  assert.equal(hexagrams.length, 64);
  assert.equal(new Set(KING_WEN_BITS).size, 64);
  for (const h of hexagrams) {
    assert.equal(KING_WEN_BITS[h.number - 1], h.bits.join(''), `hexagram ${h.number} ${h.name_zh}`);
    assert.equal(numberForBits(h.bits), h.number);
    assert.deepEqual(bitsForNumber(h.number), h.bits);
  }
  assert.throws(() => bitsForNumber(0), RangeError);
  assert.throws(() => bitsForNumber(65), RangeError);
  assert.throws(() => numberForBits([1, 1, 1]), RangeError);
  assert.throws(() => numberForBits('11111'), RangeError);
});

// ------------------------------------------------------------------- labels

test('line label table (PLAN.md M4)', () => {
  const table = [
    [1, 1, '初九'], [1, 0, '初六'],
    [2, 1, '九二'], [2, 0, '六二'],
    [3, 1, '九三'], [3, 0, '六三'],
    [4, 1, '九四'], [4, 0, '六四'],
    [5, 1, '九五'], [5, 0, '六五'],
    [6, 1, '上九'], [6, 0, '上六'],
  ];
  for (const [pos, bit, label] of table) assert.equal(labelFor(pos, bit), label);
  assert.throws(() => labelFor(0, 1), RangeError);
  assert.throws(() => labelFor(7, 1), RangeError);
  assert.throws(() => labelFor(1, 2), RangeError);
  assert.equal(specialLabel(1), '用九');
  assert.equal(specialLabel(2), '用六');
  assert.equal(specialLabel(3), null);
});

// --------------------------------------------------------------- URL/routes

test('reading URL encode/decode round-trips for all methods', () => {
  assert.equal(encodeReading('coins', [7, 8, 9, 8, 7, 6]), '#/r/c789876');
  assert.equal(encodeReading('yarrow', [7, 8, 9, 8, 7, 6]), '#/r/y789876');
  assert.equal(encodeReading('manual', [6, 6, 6, 6, 6, 6]), '#/r/m666666');
  assert.equal(encodeReading('c', [9, 9, 9, 9, 9, 9]), '#/r/c999999');
  assert.deepEqual(decodeReading('#/r/c789876'), { method: 'coins', letter: 'c', values: [7, 8, 9, 8, 7, 6] });
  assert.deepEqual(decodeReading('#/r/y789876'), { method: 'yarrow', letter: 'y', values: [7, 8, 9, 8, 7, 6] });
  assert.deepEqual(decodeReading('#/r/m666666'), { method: 'manual', letter: 'm', values: [6, 6, 6, 6, 6, 6] });
  for (const method of ['coins', 'yarrow', 'manual']) {
    const d = decodeReading(encodeReading(method, [8, 7, 6, 9, 8, 7]));
    assert.equal(d.method, method);
    assert.deepEqual(d.values, [8, 7, 6, 9, 8, 7]);
  }
  assert.throws(() => encodeReading('coins', [7, 8, 9]), RangeError);
  assert.throws(() => encodeReading('dice', [7, 8, 9, 8, 7, 6]), RangeError);
  assert.equal(methodLetter('yarrow'), 'y');
  assert.equal(methodFromLetter('m'), 'manual');
  assert.throws(() => methodFromLetter('x'), RangeError);
});

test('decodeReading is strict', () => {
  const bad = [
    '#/r/789876', '#/r/x789876', '#/r/C789876', '#/r/c123456', '#/r/c78987',
    '#/r/c7898765', '#/r/c78987a', '#/r/c 789876', '#/r/c789876/', '#/r/c789876?q=1',
    '/r/c789876', '#r/c789876', '#/r/cc789876', '#/r/', '', '#', null, undefined, 42,
  ];
  for (const b of bad) assert.equal(decodeReading(b), null, JSON.stringify(b));
});

test('parseRoute: valid routes', () => {
  assert.deepEqual(parseRoute(''), { name: 'cast' });
  assert.deepEqual(parseRoute('#'), { name: 'cast' });
  assert.deepEqual(parseRoute('#/'), { name: 'cast' });
  assert.deepEqual(parseRoute('#/library'), { name: 'library' });
  assert.deepEqual(parseRoute('#/about'), { name: 'about' });
  assert.deepEqual(parseRoute('#/h/1'), { name: 'hexagram', number: 1 });
  assert.deepEqual(parseRoute('#/h/64'), { name: 'hexagram', number: 64 });
  assert.deepEqual(parseRoute('#/h/29'), { name: 'hexagram', number: 29 });
  const r = parseRoute('#/r/y789876');
  assert.equal(r.name, 'reading');
  assert.equal(r.method, 'yarrow');
  assert.deepEqual(r.values, [7, 8, 9, 8, 7, 6]);
});

test('parseRoute: everything malformed is not-found, never cast', () => {
  const bad = [
    '#/r/123', '#/h/0', '#/h/65', '#/h/01', '#/h/007', '#/h/-1', '#/h/1.5',
    '#/h/', '#/h/abc', '#/h/64/', '#/h/64 ', '#/library/', '#/about/',
    '#/cast', '#/home', '#//', '#/r', '#/R/c789876', '#/H/3', '#/Library',
    '#/about#x', '#foo', '#/h/99', '#/r/c789876/extra', null, undefined,
  ];
  for (const b of bad) assert.equal(parseRoute(b).name, 'not-found', JSON.stringify(b));
  // every hexagram number 1..64 parses, 0 and 65+ do not
  for (let n = 1; n <= 64; n += 1) assert.equal(parseRoute(`#/h/${n}`).number, n);
  assert.equal(hexagramHash(3), '#/h/3');
  assert.throws(() => hexagramHash(65), RangeError);
});
