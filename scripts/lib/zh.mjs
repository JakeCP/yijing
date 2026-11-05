// Chinese parsers: Project Gutenberg #25501 (base text) and zh Wikisource (collation).
// Both return per-hexagram: { name, judgment, image, lines[6], special|null, labels[6],
// specialLabel|null, lower?, upper? } with prefixes stripped (see docs/SCHEMA.md).

// PG prints "初九：…"; zh Wikisource sometimes punctuates the label with "，".
const LINE_LABEL_RE = /^(初九|初六|九二|六二|九三|六三|九四|六四|九五|六五|上九|上六)[：，](.*)$/;
const SPECIAL_RE = /^(用九|用六)[：，](.*)$/;

function fail(msg) {
  throw new Error(`zh parse: ${msg}`);
}

// ---------- shared helpers ----------

// Join physical lines into logical paragraphs. PG wraps long paragraphs with
// continuation lines indented by ideographic spaces (U+3000); unindented lines
// start a new paragraph; blank lines are ignored (PG spacing is irregular).
function logicalParagraphs(blockText) {
  const paras = [];
  for (const raw of blockText.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line.trim() === '') continue;
    const indented = /^[　 ]/.test(line);
    const text = line.replace(/[　 ]/g, '').trim();
    if (text === '') continue;
    if (indented && paras.length > 0) paras[paras.length - 1] += text;
    else paras.push(text);
  }
  return paras;
}

function finishHex({ name, judgment, image, lines, labels, special, specialLabel }, n, source) {
  if (!name) fail(`${source} hex ${n}: missing name`);
  if (!judgment) fail(`${source} hex ${n} (${name}): missing judgment`);
  if (!image) fail(`${source} hex ${n} (${name}): missing image`);
  if (lines.length !== 6) fail(`${source} hex ${n} (${name}): expected 6 lines, got ${lines.length}`);
  if (n <= 2 && !special) fail(`${source} hex ${n} (${name}): missing 用九/用六`);
  if (n > 2 && special) fail(`${source} hex ${n} (${name}): unexpected 用九/用六`);
  return { name, judgment, image, lines, labels, special, specialLabel };
}

// ---------- Project Gutenberg #25501 ----------

const CN_DIGIT = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function parseChineseNumber(s) {
  s = s.replace(/\s/g, '');
  if (s === '十') return 10;
  if (s.includes('十')) {
    const [a, b] = s.split('十');
    return (a === '' ? 1 : CN_DIGIT[a]) * 10 + (b === '' ? 0 : CN_DIGIT[b]);
  }
  return CN_DIGIT[s];
}

export function parseGutenberg(fullText) {
  const text = fullText.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const start = text.indexOf('*** START OF THE PROJECT GUTENBERG EBOOK');
  const end = text.indexOf('*** END OF THE PROJECT GUTENBERG EBOOK');
  if (start < 0 || end < 0) fail('gutenberg: START/END markers not found (branding strip failed)');
  const body = text.slice(text.indexOf('\n', start) + 1, end);

  const headerRe = /^第([一二三四五六七八九十\s]+)卦\s*$/gm;
  const heads = [...body.matchAll(headerRe)];
  if (heads.length !== 64) fail(`gutenberg: expected 64 hexagram headers, got ${heads.length}`);

  const out = [];
  for (let i = 0; i < 64; i++) {
    const n = parseChineseNumber(heads[i][1]);
    if (n !== i + 1) fail(`gutenberg: header ${i} says 第${heads[i][1]}卦 (=${n}), expected ${i + 1}`);
    const from = heads[i].index + heads[i][0].length;
    // Hex 64 block runs into the 繫辭 appendices; slot regexes ignore them, but cut
    // the block at the first appendix heading to keep stray text out entirely.
    let to = i + 1 < 64 ? heads[i + 1].index : body.length;
    let block = body.slice(from, to);
    if (n === 64) {
      const cut = block.indexOf('《易經');
      if (cut >= 0) block = block.slice(0, cut);
    }
    const paras = logicalParagraphs(block);
    if (paras.length < 3) fail(`gutenberg hex ${n}: too few paragraphs (${paras.length})`);
    // Usually para 0 is the bare hexagram name and para 1 is "Name：judgment".
    // A few hexagrams (e.g. 32) omit the bare-name line; take the name from the
    // judgment prefix instead.
    let name = paras[0];
    if (name.includes('：')) name = name.slice(0, name.indexOf('：'));

    let judgment = null;
    let image = null;
    const lines = [];
    const labels = [];
    let special = null;
    let specialLabel = null;
    let seenTuan = false;

    for (const p of paras) {
      let m;
      if (p.startsWith('彖曰：') || p.startsWith('彖曰:')) { seenTuan = true; continue; }
      if (p.startsWith('象曰：') || p.startsWith('象曰:')) {
        // First 象曰 paragraph after the 彖 is the Great Image (plus, for hex 1,
        // the 小象 joined as indented continuations — take the first sentence).
        if (seenTuan && image === null) {
          const rest = p.slice(3);
          if (n === 1) {
            const dot = rest.indexOf('。');
            image = dot >= 0 ? rest.slice(0, dot + 1) : rest;
          } else {
            image = rest;
          }
        }
        continue;
      }
      if (p.startsWith('文言曰')) break; // Wenyan (hex 1-2) follows all wanted slots
      if ((m = p.match(LINE_LABEL_RE))) { labels.push(m[1]); lines.push(m[2]); continue; }
      if ((m = p.match(SPECIAL_RE))) { specialLabel = m[1]; special = m[2]; continue; }
      if (judgment === null && p.startsWith(`${name}：`)) { judgment = p.slice(name.length + 1); continue; }
      // Remaining paragraphs are 文言 dialogue etc. for hex 1-2; ignore.
    }
    out.push(finishHex({ name, judgment, image, lines, labels, special, specialLabel }, n, 'gutenberg'));
  }
  return out;
}

// ---------- zh Wikisource (collation only) ----------

// Resolve MediaWiki language-converter markup -{...}- keeping the Hant form.
function resolveLangConv(s) {
  return s.replace(/-\{([^}]*)\}-/g, (_, inner) => {
    const hant = inner.match(/zh-hant\s*:\s*([^;]+)/i);
    if (hant) return hant[1].trim();
    if (inner.includes(';') && inner.includes(':')) {
      return inner.split(';')[0].split(':').pop().trim();
    }
    return inner;
  });
}

function cleanWikitextZh(wikitext) {
  let s = wikitext;
  // Trigram header must be read before link stripping. Handled by caller on raw text.
  s = resolveLangConv(s);
  s = s.replace(/\{\{header2?[\s\S]*?\}\}/g, ''); // nav header (may span lines, no nesting)
  s = s.replace(/\{\{另\|([^|}]+)\|[^}]*\}\}/g, '$1'); // variant template: keep base char
  s = s.replace(/\{\{\*\|[^}]*\}\}/g, ''); // footnote template
  s = s.replace(/\{\{[^{}]*\}\}/g, ''); // any remaining simple templates
  s = s.replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '');
  s = s.replace(/\[\[File:[^\]]*\]\]/g, '');
  s = s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1');
  s = s.replace(/'''/g, '').replace(/''/g, '');
  s = s.replace(/<[^>]+>/g, '');
  return s;
}

export function parseZhWikisourcePage(wikitext, n) {
  // Trigram header, e.g. "震下坎上" or "-{乾}-下-{乾}-上".
  const rawConv = resolveLangConv(wikitext);
  const tm = rawConv.match(/([乾坤震巽坎離艮兌])下([乾坤震巽坎離艮兌])上/);
  const lower = tm ? tm[1] : null;
  const upper = tm ? tm[2] : null;

  const cleaned = cleanWikitextZh(wikitext);
  const linesText = cleaned.split('\n').map((l) => l.replace(/^\*+#?\s*/, '').replace(/^[*#:;]\s*/, '').trim());

  // Sections: 易經 (judgment+lines) -> 彖曰 -> 象曰 (image + 小象) -> 文言.
  let section = 'head';
  let name = null;
  let judgment = null;
  let image = null;
  const lines = [];
  const labels = [];
  let special = null;
  let specialLabel = null;

  // Hexagram name from the ";屯" definition line in the raw wikitext.
  const nm = wikitext.match(/^;(.+)$/m);
  if (nm) name = resolveLangConv(nm[1]).replace(/<[^>]+>/g, '').trim();

  for (const l of linesText) {
    if (l === '') continue;
    if (/^彖曰/.test(l)) { section = 'tuan'; continue; }
    if (/^象曰/.test(l)) { section = 'xiang'; continue; }
    if (/^文言/.test(l)) { section = 'wenyan'; continue; }
    if (/易經/.test(l) && section === 'head') { section = 'jing'; continue; }
    let m;
    if (section === 'jing') {
      if ((m = l.match(LINE_LABEL_RE))) { labels.push(m[1]); lines.push(m[2]); continue; }
      if ((m = l.match(SPECIAL_RE))) { specialLabel = m[1]; special = m[2]; continue; }
      // Judgment is the first content line of the 易經 section. Usually
      // "屯：元亨…" (strip "Name："), but where the name opens the sentence
      // itself (履虎尾…, 否之匪人…, 同人于野…) there is no colon to strip.
      if (judgment === null && lines.length === 0 && !l.startsWith('周易')) {
        // Strip "Name：" only when the prefix IS the page name. Hexagram 29's
        // judgment opens "習坎：有孚…" where 習坎 is text, not the name 坎.
        judgment = name && l.startsWith(`${name}：`) ? l.slice(name.length + 1) : l;
        section = 'jing';
        continue;
      }
      // Long judgments continue on following *** lines (e.g. hexagram 2).
      if (judgment !== null && lines.length === 0) { judgment += l; continue; }
    }
    if (section === 'xiang' && image === null) {
      image = l;
      continue;
    }
  }
  const h = finishHex({ name, judgment, image, lines, labels, special, specialLabel }, n, 'zh-wikisource');
  h.lower = lower;
  h.upper = upper;
  return h;
}

// ---------- collation diff helpers ----------

// Graphic-variant folding for DIFFING ONLY (never applied to output text).
const VARIANT_FOLD = {
  无: '無', 于: '於', 羣: '群', 遯: '遁', 恒: '恆', 脩: '修', 乾: '乾',
  乾卦: '乾卦', 餗: '餗', 牀: '床', 弃: '棄',
};

export function foldVariants(s) {
  return [...s].map((ch) => VARIANT_FOLD[ch] ?? ch).join('');
}

// Normalize a Chinese slot for comparison: fold variants, drop punctuation/space.
export function normalizeZhForDiff(s) {
  return foldVariants(s).replace(/[\s，。；：、·・「」『』（）()？！?!—…~·"'“”‘’《》〈〉-]/g, '');
}
