// Pure, DOM-free Yijing casting engine (PLAN.md M1–M4, M12).
// Randomness is injected: every cast takes randomInt(bound) -> integer in [0, bound).
// Production passes cryptoRandomInt; tests pass scripted sequences.

// ---------------------------------------------------------------- randomness

function checkBound(bound) {
  if (!Number.isInteger(bound) || bound < 1 || bound > 4294967296) {
    throw new RangeError(`randomInt bound must be an integer in 1..2^32, got ${bound}`);
  }
}

function draw(randomInt, bound) {
  if (typeof randomInt !== 'function') throw new TypeError('a randomInt(bound) function is required');
  checkBound(bound);
  const v = randomInt(bound);
  if (!Number.isInteger(v) || v < 0 || v >= bound) {
    throw new RangeError(`randomInt(${bound}) must return an integer in [0, ${bound}), got ${v}`);
  }
  return v;
}

/** Build a randomInt backed by Web Crypto (rejection sampling, no modulo bias). */
export function makeCryptoRandomInt(cryptoObj = globalThis.crypto) {
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new TypeError('crypto.getRandomValues is not available');
  }
  const buf = new Uint32Array(1);
  return function cryptoRandomInt(bound) {
    checkBound(bound);
    if (bound === 1) return 0;
    const limit = Math.floor(4294967296 / bound) * bound;
    let x;
    do {
      cryptoObj.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % bound;
  };
}

export const cryptoRandomInt = makeCryptoRandomInt();

// ------------------------------------------------------------------- values

// 6 old yin (changing), 7 young yang, 8 young yin, 9 old yang (changing).
export const LINE_VALUES = [6, 7, 8, 9];

export function isValidValue(v) { return v === 6 || v === 7 || v === 8 || v === 9; }

function assertValue(v) {
  if (!isValidValue(v)) throw new RangeError(`line value must be 6, 7, 8 or 9, got ${v}`);
}

function assertValues(values) {
  if (!Array.isArray(values) || values.length !== 6) {
    throw new RangeError(`a cast is six line values, got ${JSON.stringify(values)}`);
  }
  values.forEach(assertValue);
}

export function bitForValue(v) { assertValue(v); return v === 7 || v === 9 ? 1 : 0; }
export function isChanging(v) { assertValue(v); return v === 6 || v === 9; }
export function isYang(v) { return bitForValue(v) === 1; }

/** e.g. 'old-yin' | 'young-yang' | 'young-yin' | 'old-yang' */
export function lineKind(v) {
  assertValue(v);
  return { 6: 'old-yin', 7: 'young-yang', 8: 'young-yin', 9: 'old-yang' }[v];
}

/** Human phrasing for announcements: 'old yin, changing', 'young yang', … */
export function describeValue(v) {
  assertValue(v);
  return {
    6: 'old yin, changing', 7: 'young yang',
    8: 'young yin', 9: 'old yang, changing',
  }[v];
}

export function bitsFromValues(values) {
  assertValues(values);
  return values.map(bitForValue);
}

/** 0-based indices (bottom→top) of the changing lines. */
export function changingIndices(values) {
  assertValues(values);
  const out = [];
  values.forEach((v, i) => { if (isChanging(v)) out.push(i); });
  return out;
}

/** Bits of the relating hexagram (之卦), or null when nothing changes. */
export function relatingBits(values) {
  const bits = bitsFromValues(values);
  if (!values.some(isChanging)) return null;
  return bits.map((b, i) => (isChanging(values[i]) ? 1 - b : b));
}

// ------------------------------------------------------------------- labels

// PLAN.md M4. Positions are 1..6 bottom→top.
const LABELS = [
  ['初六', '初九'], // position 1: [yin, yang]
  ['六二', '九二'],
  ['六三', '九三'],
  ['六四', '九四'],
  ['六五', '九五'],
  ['上六', '上九'],
];

export function labelFor(position, bit) {
  if (!Number.isInteger(position) || position < 1 || position > 6) {
    throw new RangeError(`position must be 1..6, got ${position}`);
  }
  if (bit !== 0 && bit !== 1) throw new RangeError(`bit must be 0 or 1, got ${bit}`);
  return LABELS[position - 1][bit];
}

export function labelForValue(position, value) {
  return labelFor(position, bitForValue(value));
}

/** 用九 for hexagram 1, 用六 for hexagram 2, null otherwise. */
export function specialLabel(number) {
  if (number === 1) return '用九';
  if (number === 2) return '用六';
  return null;
}

// Chinese numerals for 1..99, e.g. 63 -> 六十三 (hexagram ordinals: 第…卦).
const NUMERAL_DIGITS = '一二三四五六七八九';

export function chineseNumeral(n) {
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    throw new RangeError(`chineseNumeral expects an integer in 1..99, got ${n}`);
  }
  if (n < 10) return NUMERAL_DIGITS[n - 1];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${tens === 1 ? '' : NUMERAL_DIGITS[tens - 1]}十${ones === 0 ? '' : NUMERAL_DIGITS[ones - 1]}`;
}

// ----------------------------------------------------------------- King Wen

// Explicit lookup table: index+1 is the King Wen number, string is bits
// bottom→top. Not derivable from bits order (PLAN.md M3). Tests check this
// against data/hexagrams.json in full, plus the eight fixed test vectors.
export const KING_WEN_BITS = [
  '111111', '000000', '100010', '010001', '111010', '010111', '010000', '000010',
  '111011', '110111', '111000', '000111', '101111', '111101', '001000', '000100',
  '100110', '011001', '110000', '000011', '100101', '101001', '000001', '100000',
  '100111', '111001', '100001', '011110', '010010', '101101', '001110', '011100',
  '001111', '111100', '000101', '101000', '101011', '110101', '001010', '010100',
  '110001', '100011', '111110', '011111', '000110', '011000', '010110', '011010',
  '101110', '011101', '100100', '001001', '001011', '110100', '101100', '001101',
  '011011', '110110', '010011', '110010', '110011', '001100', '101010', '010101',
];

const NUMBER_BY_BITS = new Map(KING_WEN_BITS.map((b, i) => [b, i + 1]));

export function bitsToString(bits) {
  if (!Array.isArray(bits) || bits.length !== 6 || !bits.every((b) => b === 0 || b === 1)) {
    throw new RangeError(`bits must be six 0/1 values, got ${JSON.stringify(bits)}`);
  }
  return bits.join('');
}

export function bitsFromString(str) {
  if (typeof str !== 'string' || !/^[01]{6}$/.test(str)) {
    throw new RangeError(`bits string must be six 0/1 characters, got ${JSON.stringify(str)}`);
  }
  return [...str].map(Number);
}

export function numberForBits(bits) {
  const key = Array.isArray(bits) ? bitsToString(bits) : bits;
  const n = NUMBER_BY_BITS.get(key);
  if (n === undefined) throw new RangeError(`no hexagram for bits ${JSON.stringify(key)}`);
  return n;
}

export function bitsForNumber(number) {
  if (!Number.isInteger(number) || number < 1 || number > 64) {
    throw new RangeError(`hexagram number must be 1..64, got ${number}`);
  }
  return bitsFromString(KING_WEN_BITS[number - 1]);
}

export function numberForValues(values) { return numberForBits(bitsFromValues(values)); }

/** King Wen number of the relating hexagram, or null when nothing changes. */
export function relatingNumber(values) {
  const bits = relatingBits(values);
  return bits === null ? null : numberForBits(bits);
}

// -------------------------------------------------------------------- coins

// Character side = 3, blank side = 2 (PLAN.md N2). randomInt(2): 1 → character.
// Consumes exactly three draws of bound 2, in coin order.
export function castCoinLine(randomInt) {
  const faces = [];
  for (let i = 0; i < 3; i += 1) {
    faces.push(draw(randomInt, 2) === 1
      ? { side: 'character', value: 3 }
      : { side: 'blank', value: 2 });
  }
  const value = faces.reduce((sum, f) => sum + f.value, 0);
  return { method: 'coins', value, faces };
}

// ------------------------------------------------------------------- yarrow

// Direct sampling of the three changes (PLAN.md M1): change 1 removes 9 with
// probability 1/4 else 5; changes 2–3 remove 8 or 4 with probability 1/2 each.
// Line value = (49 − total removed) / 4. Consumes draws of bounds [4, 2, 2].
export function castYarrowLine(randomInt) {
  const changes = [
    draw(randomInt, 4) === 0 ? 9 : 5,
    draw(randomInt, 2) === 0 ? 8 : 4,
    draw(randomInt, 2) === 0 ? 8 : 4,
  ];
  const removed = changes[0] + changes[1] + changes[2];
  const remaining = 49 - removed;
  return { method: 'yarrow', value: remaining / 4, changes, remaining };
}

/**
 * Synthesize heap splits consistent with drawn yarrow removals, for display.
 * Each change: split heap into left/right, hang 1 from the right, count both
 * heaps off by fours; removed = 1 + remainderLeft + remainderRight (a heap
 * divisible by four leaves a remainder of 4). All splits satisfying this are
 * enumerated; one is picked with randomInt when given, else the middle one.
 * Returns one entry per change; the line value is untouched.
 */
export function synthesizeYarrowSplits(changes, randomInt = null) {
  if (!Array.isArray(changes) || changes.length !== 3) {
    throw new RangeError(`yarrow changes must be three removals, got ${JSON.stringify(changes)}`);
  }
  const allowed = [[5, 9], [4, 8], [4, 8]];
  changes.forEach((c, i) => {
    if (!allowed[i].includes(c)) throw new RangeError(`change ${i + 1} removal must be ${allowed[i].join(' or ')}, got ${c}`);
  });
  const splits = [];
  let heap = 49;
  for (const removed of changes) {
    const options = [];
    for (let left = 1; left < heap; left += 1) {
      const right = heap - left;
      if (right < 2) continue; // one stalk is hung from the right heap
      const remainderLeft = left % 4 === 0 ? 4 : left % 4;
      const rightAfterHang = right - 1;
      const remainderRight = rightAfterHang % 4 === 0 ? 4 : rightAfterHang % 4;
      if (1 + remainderLeft + remainderRight === removed) {
        options.push({ heap, left, right, hang: 1, remainderLeft, remainderRight, removed, remaining: heap - removed });
      }
    }
    if (options.length === 0) throw new RangeError(`no consistent split for heap ${heap}, removal ${removed}`);
    const pick = randomInt ? options[draw(randomInt, options.length)] : options[Math.floor(options.length / 2)];
    splits.push(pick);
    heap = pick.remaining;
  }
  return splits;
}

// -------------------------------------------------------------------- casts

export const METHODS = ['coins', 'yarrow', 'manual'];
export const METHOD_LETTERS = { coins: 'c', yarrow: 'y', manual: 'm' };
export const LETTER_METHODS = { c: 'coins', y: 'yarrow', m: 'manual' };

export function methodLetter(method) {
  if (METHOD_LETTERS[method]) return METHOD_LETTERS[method];
  if (LETTER_METHODS[method]) return method;
  throw new RangeError(`unknown casting method ${JSON.stringify(method)}`);
}

export function methodFromLetter(letter) {
  const m = LETTER_METHODS[letter];
  if (!m) throw new RangeError(`unknown method letter ${JSON.stringify(letter)}`);
  return m;
}

export function castLine(method, randomInt) {
  if (method === 'coins' || method === 'c') return castCoinLine(randomInt);
  if (method === 'yarrow' || method === 'y') return castYarrowLine(randomInt);
  throw new RangeError(`cannot cast a line by method ${JSON.stringify(method)}`);
}

/** Cast all six lines bottom→top. Returns { method, values, lines }. */
export function castHexagram(method, randomInt) {
  const lines = [];
  for (let i = 0; i < 6; i += 1) lines.push(castLine(method, randomInt));
  return { method: lines[0].method, values: lines.map((l) => l.value), lines };
}

/** Summarize a complete cast: numbers, bits, changing positions. */
export function summarizeCast(values) {
  assertValues(values);
  return {
    values: [...values],
    bits: bitsFromValues(values),
    number: numberForValues(values),
    changing: changingIndices(values),
    relatingBits: relatingBits(values),
    relatingNumber: relatingNumber(values),
    allChanging: values.every(isChanging),
  };
}

// ---------------------------------------------------------------- URL + routes

export function encodeReading(method, values) {
  assertValues(values);
  return `#/r/${methodLetter(method)}${values.join('')}`;
}

/** Strict decode (PLAN.md M12). Returns { method, letter, values } or null. */
export function decodeReading(hash) {
  if (typeof hash !== 'string') return null;
  const m = /^#\/r\/([cym])([6-9]{6})$/.exec(hash);
  if (!m) return null;
  return { method: LETTER_METHODS[m[1]], letter: m[1], values: [...m[2]].map(Number) };
}

const HEXAGRAM_RE = /^#\/h\/([1-9]|[1-5][0-9]|6[0-4])$/;

/**
 * Parse a location hash into a route. '' and '#' land on the cast page
 * (no hash present); every other malformed hash is 'not-found'.
 * Routes: { name:'cast' } | { name:'reading', method, letter, values } |
 * { name:'hexagram', number } | { name:'library' } | { name:'about' } |
 * { name:'not-found', hash }
 */
export function parseRoute(hash) {
  if (hash === '' || hash === '#' || hash === '#/') return { name: 'cast' };
  if (typeof hash !== 'string') return { name: 'not-found', hash: '' };
  if (hash === '#/library') return { name: 'library' };
  if (hash === '#/about') return { name: 'about' };
  const reading = decodeReading(hash);
  if (reading) return { name: 'reading', ...reading };
  const h = HEXAGRAM_RE.exec(hash);
  if (h) return { name: 'hexagram', number: Number(h[1]) };
  return { name: 'not-found', hash };
}

export function hexagramHash(number) {
  bitsForNumber(number); // validates 1..64
  return `#/h/${number}`;
}
