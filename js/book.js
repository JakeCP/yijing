// Pure, DOM-free helpers for the desktop book layouts (spread, facing
// pages, library matrix). No DOM, no storage: app.js wires these to the
// page; tests cover them directly.

function bitsKey(bits) {
  return bits.join('');
}

function assertTrigramBits(bits) {
  if (!Array.isArray(bits) || bits.length !== 3 || !bits.every((b) => b === 0 || b === 1)) {
    throw new RangeError(`trigram bits must be three 0/1 values, got ${JSON.stringify(bits)}`);
  }
}

/** The trigram (from a trigrams.json-shaped list) matching three bits. */
export function trigramForBits(trigrams, bits) {
  assertTrigramBits(bits);
  const key = bitsKey(bits);
  const t = trigrams.find((x) => bitsKey(x.bits) === key);
  if (!t) throw new RangeError(`no trigram for bits ${key}`);
  return t;
}

/** Split six hexagram bits into { lower, upper } trigram bit triples. */
export function splitTrigrams(bits) {
  if (!Array.isArray(bits) || bits.length !== 6 || !bits.every((b) => b === 0 || b === 1)) {
    throw new RangeError(`hexagram bits must be six 0/1 values, got ${JSON.stringify(bits)}`);
  }
  return { lower: bits.slice(0, 3), upper: bits.slice(3, 6) };
}

/**
 * The 8x8 by-trigrams matrix. Rows are the upper trigram, columns the
 * lower, both in the order the trigrams list gives. Returns
 * { order, cells } where cells[upperIndex][lowerIndex] is the hexagram.
 * Throws if any cell is empty or filled twice.
 */
export function buildTrigramMatrix(hexagrams, trigrams) {
  const order = [...trigrams];
  const indexByKey = new Map(order.map((t, i) => [bitsKey(t.bits), i]));
  const cells = order.map(() => order.map(() => null));
  for (const h of hexagrams) {
    const { lower, upper } = splitTrigrams(h.bits);
    const ui = indexByKey.get(bitsKey(upper));
    const li = indexByKey.get(bitsKey(lower));
    if (ui === undefined || li === undefined) {
      throw new RangeError(`hexagram ${h.number} names a trigram outside the list`);
    }
    if (cells[ui][li]) throw new RangeError(`trigram cell ${ui}/${li} filled twice`);
    cells[ui][li] = h;
  }
  cells.forEach((row, ui) => row.forEach((cell, li) => {
    if (!cell) throw new RangeError(`trigram cell ${ui}/${li} is empty`);
  }));
  return { order, cells };
}

/** First line of a hexagram judgment, preferring the rendering (library preview). */
export function firstJudgmentLine(hexagram, preference = ['poem', 'legge', 'zh']) {
  for (const id of preference) {
    const slot = hexagram.texts?.[id]?.judgment;
    if (Array.isArray(slot) && slot.length && slot[0]) return { id, text: slot[0] };
  }
  return null;
}

/**
 * Which English text faces the Chinese in facing-pages mode.
 * The reader's chosen translation wins when it is English; a Chinese
 * choice pairs with the rendering (else Legge, else null: no facing).
 */
export function facingEnglishId(chosenId, availableIds) {
  const has = (id) => availableIds.includes(id);
  if (!has('zh')) return null;
  if ((chosenId === 'poem' || chosenId === 'legge') && has(chosenId)) return chosenId;
  if (has('poem')) return 'poem';
  if (has('legge')) return 'legge';
  return null;
}

/** Facing mode only ever applies when stored on AND the viewport is wide. */
export function facingActive(stored, wideEnough) {
  return stored === true && wideEnough === true;
}

/** Library view guard: the matrix is a desktop layout; narrow falls back. */
export function libraryMode(stored, wideEnough) {
  return stored === 'trigrams' && wideEnough === true ? 'trigrams' : 'kingwen';
}
