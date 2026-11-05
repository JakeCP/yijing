// Legge parser: Internet Archive item `I-Ching` (SBE vol.16, 1882) DjVu OCR.
// The printed page carries translation (large type) above discursive notes (small
// type); the plain _djvu.txt interleaves them page by page. The _djvu.xml of the same
// OCR carries word coordinates, so we separate the two streams by type size
// (paragraph median word height): translation ~72-76 units, notes ~58-62,
// running heads ~51. Only translation-stream paragraphs are parsed further.
// Slot map: PLAN.md M7. Hexagrams are keyed by ORDER only, never by name.

function fail(msg) {
  throw new Error(`legge parse: ${msg}`);
}

function unescapeXml(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const MAIN_MIN_MEDIAN_HEIGHT = 66;

// Extract main-type (translation) paragraphs in reading order.
function mainParagraphs(xml) {
  const pages = [...xml.matchAll(/<OBJECT\b[^>]*>([\s\S]*?)<\/OBJECT>/g)];
  if (pages.length < 400) fail(`djvu.xml: only ${pages.length} pages found`);
  const out = [];
  pages.forEach((pm, pageIdx) => {
    const paras = [...pm[1].matchAll(/<PARAGRAPH>([\s\S]*?)<\/PARAGRAPH>/g)];
    for (const para of paras) {
      const heights = [];
      const lineTexts = [];
      for (const lm of para[1].matchAll(/<LINE>([\s\S]*?)<\/LINE>/g)) {
        const words = [];
        for (const wm of lm[1].matchAll(/<WORD coords="(\d+),(\d+),(\d+),(\d+)"[^>]*>([^<]*)<\/WORD>/g)) {
          heights.push(Math.abs(Number(wm[2]) - Number(wm[4])));
          words.push(unescapeXml(wm[5]));
        }
        if (words.length) lineTexts.push(words.join(' '));
      }
      if (!lineTexts.length || !heights.length) continue;
      const sorted = [...heights].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      if (median < MAIN_MIN_MEDIAN_HEIGHT) continue; // note / running head
      let text = '';
      for (const lt of lineTexts) {
        if (text === '') text = lt;
        else if (/[A-Za-z]-$/.test(text)) text = text.slice(0, -1) + lt; // dehyphenate
        else text += ` ${lt}`;
      }
      out.push({ page: pageIdx, text: text.trim(), median });
    }
  });
  return out;
}

function classify(text) {
  if (/^Explanation of the\b/.test(text)) return { kind: 'skip' };
  const words = text.split(/\s+/).filter(Boolean).length;
  // Running heads / printer's signatures that passed the type-size filter.
  if (/\bSECT\./.test(text)) return { kind: 'skip' };
  if (words <= 8 && /(YI KING|APPENDIXES)/i.test(text)) return { kind: 'skip' };
  if (/^\[?16\]?[\sA-Z0-9]{0,4}$/.test(text) || /^[A-Z]\s*2$/.test(text)) return { kind: 'skip' };
  if (text.length < 80 && /^(TEXT|APPENDIX|APPENDIXES|SECTION|Section)\b/.test(text)) return { kind: 'section' };
  if (words <= 8 && /hex|exag|exacr/i.test(text)) return { kind: 'hexhead' };
  // Bare roman numeral paragraph: a Text hexagram heading whose title words were
  // lost to OCR (e.g. hexagram 16 reads just "XVI."). Harmless elsewhere.
  if (/^[IVXLCDM]{1,7}\.$/.test(text)) return { kind: 'hexhead' };
  // Numbered line paragraphs; tolerate a few OCR junk characters before the digit
  // (e.g. "_7~ 5. The fifth line ..."), OCR punctuation swaps ("1,", "3-"), and a
  // missing space ("6.‘"). No "line" keyword check: OCR turns it into "lime"
  // (hexagram 13) and Appendix II Lesser paragraphs start with quotations.
  const num = text.match(/^(?:[^A-Za-z]{0,6}?)([1-7])[.,-]\s*(?=[A-Z(‘'])/);
  if (num) return { kind: 'numbered', num: Number(num[1]) };
  const rom = text.match(/^([IVXLCDM]{1,7})\.\s+\S/);
  if (rom) return { kind: 'roman', roman: rom[1] };
  return { kind: 'body' };
}

// A signature mark ("O 2", "[16] K") sometimes OCR-glues onto the first line of
// a page-top continuation paragraph. Strip it there (mechanical, not textual).
function stripSignaturePrefix(s) {
  return s.replace(/^(?:\[16\]\s*)?[A-Z]\s+2\s+/, '').replace(/^\[16\]\s*[A-Z]?\s+/, '');
}

// For Great Images accepted without a clean roman prefix: drop a garbled
// numeral prefix ("X XIX.", "xX 2 AXXIII.", "LIl.") before the text proper.
function stripImagePrefix(s) {
  const m = s.match(/^([^.]{1,18})\.\s+/);
  if (m && !/[a-z]{3,}/.test(m[1])) return s.slice(m[0].length);
  return s;
}

function isOpenEnded(text) {
  const u = text.replace(/[’”"')\]\s]+$/, '');
  if (/[.!?]$/.test(u)) return false;
  if (/[.!?][\s:;]+$/.test(text)) return false; // stray OCR colon after a full stop
  return true;
}

// Clean layout artifacts that share a DjVu paragraph with real text, and split
// paragraphs at an embedded numbered-paragraph start (figure OCR garbage and a
// running head can precede "6. In the ..." inside one DjVu paragraph, hex 1).
function preprocessPara(text) {
  let t = text.replace(/^Explanation of the [^.]*\.\s*/, '');
  t = t.replace(/^(?:THE YI KING\.|THE APPENDIXES\.)\s*(?:TEXT\.|SECT\.\s*[IVX]+\.)?\s*/i, '');
  const m = t.match(/\s(?=[1-7][.,-]\s*(?:In |The |\(The ))/);
  if (m && m.index > 0) return [t.slice(0, m.index), t.slice(m.index + 1)];
  return [t];
}

// Merge page-spanning fragments: a body paragraph following an open-ended
// buffer is its continuation (notes/heads have already been filtered out).
function mergeTokens(paras) {
  const tokens = [];
  let buf = null;
  const flush = () => { if (buf) { tokens.push(buf); buf = null; } };
  const expanded = [];
  for (const p of paras) {
    for (const t of preprocessPara(p.text)) {
      if (t.trim() !== '') expanded.push({ page: p.page, text: t.trim(), median: p.median });
    }
  }
  for (const p of expanded) {
    const c = classify(p.text);
    if (c.kind === 'skip') continue;
    if (c.kind === 'section' || c.kind === 'hexhead' || c.kind === 'numbered' || c.kind === 'roman') {
      flush();
      buf = { ...c, text: p.text, page: p.page };
      // Headings are complete by themselves.
      if (c.kind === 'section' || c.kind === 'hexhead') flush();
      continue;
    }
    // body
    if (buf && isOpenEnded(buf.text)) {
      buf.text = /[A-Za-z]-$/.test(buf.text) ? buf.text.slice(0, -1) + p.text : `${buf.text} ${p.text}`;
    } else {
      flush();
      buf = { kind: 'body', text: p.text, page: p.page };
    }
  }
  flush();
  return tokens;
}

export function normalizeLegge(s) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+([’”])/g, '$1')
    .replace(/([‘“])\s+/g, '$1')
    .replace(/\s*—\s*/g, '—')
    .trim();
}

const ROMAN_VAL = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
function romanToInt(r) {
  let v = 0;
  for (let i = 0; i < r.length; i++) {
    const cur = ROMAN_VAL[r[i]];
    if (cur === undefined) return null;
    const next = ROMAN_VAL[r[i + 1]] ?? 0;
    v += cur < next ? -cur : cur;
  }
  return v;
}

// Hexagram-figure OCR garbage is short, largely non-alphabetic, and full of
// vowelless pseudo-words ("sgt ato t NS Pepe"); real Legge prose is none of these.
function looksLikeGarbage(s) {
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 5 || s.length < 25) return true;
  const alpha = (s.match(/[A-Za-z]/g) || []).length;
  if (alpha / s.length < 0.5) return true;
  const sized = words.filter((w) => w.replace(/[^A-Za-z]/g, '').length >= 2);
  if (!sized.length) return true;
  const vowelless = sized.filter((w) => !/[aeiou]/i.test(w)).length;
  return vowelless / sized.length > 0.25;
}

// Exposed for build diagnostics: the main-type token stream after merging.
export function debugMainTokens(xml) {
  return mergeTokens(mainParagraphs(xml));
}

// Exposed for build diagnostics: main-type paragraphs before merging.
export function debugMainParagraphs(xml) {
  return mainParagraphs(xml);
}

export function parseLeggeDjvuXml(xml) {
  const tokens = mergeTokens(mainParagraphs(xml));
  const warnings = [];
  const textHex = [];
  const images = [];
  const imageRomans = [];
  let state = 'pre';
  let cur = null;
  let lesserCount = 0;

  for (const tok of tokens) {
    if (tok.kind === 'section') {
      if (/^APPENDIX II\b/i.test(tok.text)) state = 'app2';
      else if (/^APPENDIX III\b/i.test(tok.text)) state = 'done';
      else if (/^APPENDIX I\b/i.test(tok.text)) state = 'app1';
      else if (state === 'pre' && /\bTEXT\b/.test(tok.text)) state = 'text';
      continue;
    }
    if (state === 'text') {
      // Text translation paragraphs never begin with a roman numeral; a short
      // roman token here is a hexagram heading whose title OCR garbled "Hexagram".
      const isHead = tok.kind === 'hexhead'
        || (tok.kind === 'roman' && tok.text.split(/\s+/).filter(Boolean).length <= 10);
      if (isHead) {
        // A heading split across two OCR paragraphs yields two hexhead tokens in a
        // row; the second belongs to the same (still empty) hexagram.
        if (cur && cur.judgment === null && cur.lines.length === 0) {
          cur.heading += ` + ${tok.text}`;
          continue;
        }
        cur = { heading: tok.text, judgment: null, lines: [], special: null, extras: [] };
        textHex.push(cur);
        continue;
      }
      if (!cur) continue;
      if (tok.kind === 'numbered') {
        const body = tok.text.replace(/^(?:[^A-Za-z]{0,6}?)[1-7][.,-]\s*/, '');
        if (tok.num === 7) {
          if (textHex.length > 2) fail(`Text hex #${textHex.length}: unexpected paragraph 7`);
          cur.special = body;
        } else {
          if (tok.num !== cur.lines.length + 1) {
            fail(`Text hex #${textHex.length} (${cur.heading}): line paragraph ${tok.num} follows ${cur.lines.length}`);
          }
          cur.lines.push(body);
        }
        continue;
      }
      // Body token inside a hexagram. Before the judgment it IS the judgment
      // (figure OCR garbage aside). Afterwards, while slots are still incomplete,
      // it is a page-break continuation of the current slot — Legge paragraphs
      // break across pages between sentences too, so "previous token ended with a
      // full stop" does not mean the paragraph ended (hex 5 line 6, hex 30
      // judgment). Once the hexagram is complete, stray main-type tokens can only
      // be note-stream leakage; they go to extras (dropped, but warned about).
      const clean = stripSignaturePrefix(tok.text);
      if (cur.judgment === null) {
        if (looksLikeGarbage(clean)) { cur.extras.push(tok.text); continue; }
        cur.judgment = clean;
      } else if (cur.lines.length < 6 || (textHex.length <= 2 && cur.special === null)) {
        if (looksLikeGarbage(clean)) { cur.extras.push(tok.text); continue; }
        const append = (target) => (/[A-Za-z]-$/.test(target) ? target.slice(0, -1) + clean : `${target} ${clean}`);
        if (cur.special !== null) cur.special = append(cur.special);
        else if (cur.lines.length > 0) cur.lines[cur.lines.length - 1] = append(cur.lines[cur.lines.length - 1]);
        else cur.judgment = append(cur.judgment);
        warnings.push(`Text hex ${textHex.length}: appended continuation token: ${clean.slice(0, 50)}…`);
      } else if (!looksLikeGarbage(clean)) {
        // After the last slot: either that slot's page-break tail (hex 5 line 6)
        // or a leaked note sentence (hex 2). Appending keeps the text visible for
        // the read-through/overrides pass; dropping it would lose data silently.
        const append = (target) => (/[A-Za-z]-$/.test(target) ? target.slice(0, -1) + clean : `${target} ${clean}`);
        if (cur.special !== null) cur.special = append(cur.special);
        else cur.lines[5] = append(cur.lines[5]);
        warnings.push(`Text hex ${textHex.length}: appended POST-COMPLETION token (verify continuation vs note leak): ${clean.slice(0, 50)}…`);
      } else {
        cur.extras.push(tok.text);
      }
      continue;
    }
    if (state === 'app2') {
      if (tok.kind === 'roman') {
        images.push(tok.text.replace(/^[IVXLCDM]{1,7}\.\s+/, ''));
        imageRomans.push(tok.roman);
        lesserCount = 0;
        continue;
      }
      if (tok.kind === 'numbered') { lesserCount++; continue; }
      if (tok.kind === 'body') {
        // Great Images whose roman prefix OCR failed land here. They are
        // recognizable by Legge's formula "The superior man, in accordance with
        // this, ..." (Lesser paragraphs quote line text instead). Accept those;
        // everything else in Appendix II is Lesser material, excluded by design.
        const clean = stripSignaturePrefix(tok.text);
        if (/in accordance with this/i.test(clean) && !looksLikeGarbage(clean)) {
          warnings.push(`app2: image #${images.length + 1} accepted via formula (page ${tok.page}): ${clean.slice(0, 60)}…`);
          images.push(stripImagePrefix(clean));
          imageRomans.push(null);
          lesserCount = 0;
        } else if (lesserCount >= 6 && !looksLikeGarbage(clean) && /^[(\[A-Z]/.test(stripImagePrefix(clean))) {
          warnings.push(`app2: image #${images.length + 1} accepted via position (page ${tok.page}): ${clean.slice(0, 60)}…`);
          images.push(stripImagePrefix(clean));
          imageRomans.push(null);
          lesserCount = 0;
        }
        // else: Lesser paragraph or continuation — excluded silently.
      }
      continue;
    }
    // 'pre' / 'app1' / 'done': ignore (front matter, Appendix I, later appendices).
  }

  if (textHex.length !== 64) fail(`Text: expected 64 hexagrams, got ${textHex.length}`);
  textHex.forEach((h, i) => {
    const n = i + 1;
    if (!h.judgment) fail(`Text hex ${n} (${h.heading}): missing judgment`);
    if (h.lines.length !== 6) fail(`Text hex ${n} (${h.heading}): expected 6 lines, got ${h.lines.length}`);
    if (n <= 2 && !h.special) fail(`Text hex ${n}: missing paragraph 7 (special)`);
    if (n > 2 && h.special) fail(`Text hex ${n}: unexpected special`);
    if (h.extras.length) warnings.push(`Text hex ${n}: ${h.extras.length} extra main-type token(s): ${h.extras.map((e) => e.slice(0, 40)).join(' | ')}`);
  });
  if (images.length !== 64) fail(`Appendix II: expected 64 Great Images, got ${images.length}`);
  imageRomans.forEach((r, i) => {
    if (r === null) return;
    const v = romanToInt(r);
    if (v !== i + 1) warnings.push(`app2: image #${i + 1} roman reads "${r}" (= ${v}) — keyed by order as ${i + 1}; check for drift`);
  });

  return {
    hexagrams: textHex.map((h) => ({
      judgment: normalizeLegge(h.judgment),
      lines: h.lines.map(normalizeLegge),
      special: h.special ? normalizeLegge(h.special) : null,
    })),
    images: images.map(normalizeLegge),
    warnings,
  };
}

// ---------- en Wikisource collation (Text, hexagrams 1-32 only) ----------

// Extract the "text" section of a ProofreadPage Page: wikitext. If the page has
// no text-section markers, fall back to the whole page minus noinclude/note parts.
export function extractEnTextSection(wikitext) {
  const parts = [...wikitext.matchAll(/<section begin="text" \/>([\s\S]*?)<section end="text" \/>/g)].map((m) => m[1]);
  if (parts.length) return parts.join('\n\n');
  return wikitext
    .replace(/<noinclude>[\s\S]*?<\/noinclude>/g, '')
    .replace(/<section begin="note" \/>[\s\S]*?<section end="note" \/>/g, '')
    .replace(/<section[^>]*>/g, '');
}

// Resolve the small template vocabulary used in SBE-16 text sections to plain text.
export function stripEnWikitext(s) {
  let out = s.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, '');
  // Links first (they can wrap templates; iterate templates after anyway).
  out = out.replace(/\[\[(?:[^\]|]+)\|([^\]]+)\]\]/g, '$1').replace(/\[\[([^\]]+)\]\]/g, '$1');
  let prev;
  do {
    prev = out;
    out = out.replace(/\{\{([^{}]*)\}\}/g, (_, inner) => {
      const args = inner.split('|');
      const name = (args.shift() || '').trim().toLowerCase();
      const last = args.length ? args[args.length - 1] : '';
      switch (name) {
        case 'anchor': case 'anchor+': case 'dhr': case 'rule': case 'nop':
        case 'main other': case 'running header': case 'pagequality':
        case 'header': case 'migrate to':
          return name === 'anchor+' ? last : '';
        case 'tooltip': case 'sic': return args[0] ?? '';
        case 'sp': case 'spw': return args.join('');
        case '=': return '=';
        default: return last; // c, sc, smaller, font-size, nowrap, etc: keep text arg
      }
    });
  } while (out !== prev);
  out = out.replace(/\[\[(?:[^\]|]+)\|([^\]]+)\]\]/g, '$1').replace(/\[\[([^\]]+)\]\]/g, '$1');
  return out.replace(/'''/g, '').replace(/''/g, '').replace(/<[^>]+>/g, '');
}

// Given concatenated plain text of one hexagram's Text pages, split into slots.
export function parseEnHexText(plain, n) {
  const joined = plain.replace(/([A-Za-z])-\n(?=[a-z])/g, '$1');
  // Numbered paragraphs sometimes follow the judgment after a single newline
  // (a stripped {{dhr}} rule), so split before "N. " line starts too.
  const paras = joined.split(/\n\s*\n|\n(?=[1-7]\.\s)/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let judgment = null;
  const lines = [];
  let special = null;
  for (const p of paras) {
    const m = p.match(/^([1-7])\.\s+([\s\S]*)$/);
    if (m) {
      if (Number(m[1]) === 7) special = m[2];
      else lines.push(m[2]);
      continue;
    }
    if (judgment === null) {
      if (p.length < 90 && (/Hexagram/i.test(p) || /^(THE Y|TEXT\.|Explanation of)/.test(p))) continue;
      if (/^[䷀-䷿☰-☷\s]+$/.test(p)) continue; // hexagram figure line
      if (p.length < 20) continue;
      judgment = p;
    }
  }
  if (!judgment || lines.length !== 6) {
    // Collation source only: a malformed hexagram is reported by the caller,
    // it must not abort the build.
    return { judgment, lines, special, ok: false };
  }
  return { judgment: normalizeLegge(judgment), lines: lines.map(normalizeLegge), special: special ? normalizeLegge(special) : null, ok: true };
}

// Normalize English for collation diffing: ignore diacritics, case, punctuation
// spacing, and quote style. Word-level differences remain visible.
export function normalizeEnForDiff(s) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
