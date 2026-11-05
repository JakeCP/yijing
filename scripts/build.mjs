#!/usr/bin/env node
// Phase 1 data build: fetch (pinned) -> parse -> oracle checks -> collate ->
// overrides -> data/hexagrams.json + data/trigrams.json. Node >= 20, no deps.
//
// Usage:
//   node scripts/build.mjs           # use scripts/.cache, verify provenance hashes
//   node scripts/build.mjs --fetch   # (re)download sources, rewrite provenance.json
//
// Collation reports and plain-text slot dumps are written to scripts/.cache/
// for review (docs/COLLATION.md is the committed summary). See docs/SCHEMA.md.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { TRIGRAMS, KINGWEN, bitsFor, labelFor, hexagramSymbol } from './lib/kingwen.mjs';
import { parseGutenberg, parseZhWikisourcePage, foldVariants, normalizeZhForDiff } from './lib/zh.mjs';
import { parseLeggeDjvuXml, extractEnTextSection, stripEnWikitext, parseEnHexText, normalizeEnForDiff } from './lib/legge.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'scripts', '.cache');
const PROVENANCE_PATH = path.join(ROOT, 'scripts', 'provenance.json');
const OVERRIDES_PATH = path.join(ROOT, 'scripts', 'overrides.json');
const UA = 'yijing-static-site/0.1 (Phase 1 data build; Node fetch)';
const DO_FETCH = process.argv.includes('--fetch');

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function fetchBytes(url) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error(`fetch ${url}: ${lastErr.message}`);
}

async function wikiQuery(base, titles) {
  // Batched content+revision-id query. Returns Map title -> {revid, content, missing}.
  const out = new Map();
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const url = `${base}?action=query&format=json&formatversion=2&prop=revisions&rvprop=ids|content&rvslots=main&titles=${batch.map(encodeURIComponent).join('|')}`;
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (!res.ok) throw new Error(`wiki query ${base}: HTTP ${res.status}`);
    const data = await res.json();
    for (const page of data.query?.pages ?? []) {
      const rev = page.revisions?.[0];
      out.set(page.title, {
        revid: rev?.revid ?? null,
        content: rev?.slots?.main?.content ?? null,
        missing: Boolean(page.missing),
      });
    }
  }
  return out;
}

// zh Wikisource titles differ from the canonical table for two hexagrams.
const ZH_WS_TITLE = { 無妄: '无妄', 恆: '恒' };

async function downloadAll() {
  fs.mkdirSync(CACHE, { recursive: true });
  const sources = [];
  const add = async (id, description, url, cacheFile, buf, details = {}) => {
    fs.writeFileSync(path.join(CACHE, cacheFile), buf);
    sources.push({ id, description, url, cache: cacheFile, sha256: sha256(buf), bytes: buf.length, details });
    console.log(`fetched ${id}: ${buf.length} bytes`);
  };

  await add('gutenberg-zh',
    'Project Gutenberg #25501 易經 (Chinese received text; base text, PG branding stripped at parse)',
    'https://www.gutenberg.org/files/25501/25501-0.txt', 'gutenberg-25501.txt',
    await fetchBytes('https://www.gutenberg.org/files/25501/25501-0.txt'),
    { ebook: 25501, note: 'PG header/footer between START/END markers excluded by parser' });

  await add('ia-legge-djvu-xml',
    'James Legge, SBE vol.16 The Yi King (1882), IA item I-Ching, DjVu OCR XML (parsed; word coordinates separate translation from notes by type size)',
    'https://archive.org/download/I-Ching/JamesLegge-IChing_djvu.xml', 'legge-djvu.xml',
    await fetchBytes('https://archive.org/download/I-Ching/JamesLegge-IChing_djvu.xml'),
    { item: 'I-Ching', edition: 'Sacred Books of the East vol. XVI, Clarendon Press, 1882 (title page of scan)' });

  await add('ia-legge-djvu-txt',
    'Same IA OCR as plain text (reference copy for manual checks; not parsed — its reading order interleaves footnotes)',
    'https://archive.org/download/I-Ching/JamesLegge-IChing_djvu.txt', 'legge-djvu.txt',
    await fetchBytes('https://archive.org/download/I-Ching/JamesLegge-IChing_djvu.txt'),
    { item: 'I-Ching' });

  // zh Wikisource collation pages
  const zhTitles = KINGWEN.map(([n, name]) => ({ n, title: `周易/${ZH_WS_TITLE[name] ?? name}` }));
  const zhPages = await wikiQuery('https://zh.wikisource.org/w/api.php', zhTitles.map((t) => t.title));
  const zhCache = zhTitles.map(({ n, title }) => {
    const p = zhPages.get(title);
    if (!p || p.missing || p.content === null) throw new Error(`zh wikisource: page not found: ${title}`);
    return { number: n, title, oldid: p.revid, wikitext: p.content };
  });
  await add('zh-wikisource',
    'zh Wikisource 周易 per-hexagram wikitext (collation only; CC BY-SA, no text copied into base)',
    'https://zh.wikisource.org/w/api.php (64 titles 周易/<name>)', 'zh-wikisource.json',
    Buffer.from(`${JSON.stringify(zhCache, null, 2)}\n`),
    { pages: zhCache.map(({ number, title, oldid }) => ({ number, title, oldid })) });

  // en Wikisource collation (SBE vol.16 Hexagram 1-32 main pages -> Page: djvu pages)
  const enBase = 'https://en.wikisource.org/w/api.php';
  const hexTitles = Array.from({ length: 32 }, (_, i) => `Sacred Books of the East/Volume 16/Hexagram ${i + 1}`);
  const hexPages = await wikiQuery(enBase, hexTitles);
  const hexInfo = [];
  const needed = new Set();
  hexTitles.forEach((title, idx) => {
    const p = hexPages.get(title);
    if (!p || p.missing || p.content === null) throw new Error(`en wikisource: page not found: ${title}`);
    const ranges = [];
    for (const m of p.content.matchAll(/<pages\b([^>]*)\/>/g)) {
      // Keep only Text transclusions; note sections are named note/note2/...
      const only = m[1].match(/onlysection\s*=\s*"([^"]*)"/)?.[1];
      if (only !== undefined && only !== 'text') continue;
      if (only === undefined && !/(?:from|to)section\s*=\s*"text"/.test(m[1]) && /section\s*=/.test(m[1])) continue;
      const inc = m[1].match(/include\s*=\s*(\d+)(?:\s*-\s*(\d+))?/) 
      const from = inc?.[1] ?? m[1].match(/from\s*=\s*(\d+)/)?.[1];
      const to = inc ? (inc[2] ?? inc[1]) : m[1].match(/to\s*=\s*(\d+)/)?.[1];
      if (from && to) {
        ranges.push([Number(from), Number(to)]);
        for (let d = Number(from); d <= Number(to); d++) needed.add(d);
      }
    }
    // Some main pages are mid-migration to ProofreadPage and carry inline text
    // instead of <pages> transclusions (Hexagram 32 at fetch time). Keep the
    // wikitext so collation can fall back to it; empty ranges are not fatal.
    hexInfo.push({ number: idx + 1, title, oldid: p.revid, ranges, wikitext: p.content });
  });
  const pageTitles = [...needed].sort((a, b) => a - b)
    .map((d) => ({ djvu: d, title: `Page:Sacred Books of the East - Volume 16.djvu/${d}` }));
  const djvuPages = await wikiQuery(enBase, pageTitles.map((t) => t.title));
  const enPages = pageTitles.map(({ djvu, title }) => {
    const p = djvuPages.get(title);
    if (!p || p.missing || p.content === null) throw new Error(`en wikisource: page not found: ${title}`);
    return { djvu, title, oldid: p.revid, wikitext: p.content };
  });
  await add('en-wikisource',
    'en Wikisource SBE Volume 16, Hexagram 1-32 transclusions + underlying Page: wikitext (collation only, Text section; CC BY-SA)',
    'https://en.wikisource.org/w/api.php (Hexagram 1-32 + Page:Sacred Books of the East - Volume 16.djvu/NN)',
    'en-wikisource.json',
    Buffer.from(`${JSON.stringify({ hexagrams: hexInfo, pages: enPages }, null, 2)}\n`),
    {
      hexagrams: hexInfo.map(({ number, title, oldid, ranges }) => ({ number, title, oldid, ranges })),
      pages: enPages.map(({ djvu, title, oldid }) => ({ djvu, title, oldid })),
    });

  return sources;
}

function readCache(name) {
  return fs.readFileSync(path.join(CACHE, name));
}

function verifyProvenance() {
  const prov = JSON.parse(fs.readFileSync(PROVENANCE_PATH, 'utf8'));
  for (const s of prov.sources) {
    const f = path.join(CACHE, s.cache);
    if (!fs.existsSync(f)) throw new Error(`cache missing ${s.cache} — run: node scripts/build.mjs --fetch`);
    const buf = fs.readFileSync(f);
    if (sha256(buf) !== s.sha256) {
      throw new Error(`provenance mismatch for ${s.cache} (hash differs) — inspect, or re-pin with --fetch`);
    }
  }
  console.log(`provenance verified: ${prov.sources.length} sources`);
}

function compareZh(pgHex, wsHex) {
  // Returns list of {slot, pg, ws} where normalized texts differ.
  const diffs = [];
  const pairs = [
    ['judgment', pgHex.judgment, wsHex.judgment],
    ['image', pgHex.image, wsHex.image],
    ...pgHex.lines.map((l, i) => [`lines.${i}`, l, wsHex.lines[i]]),
  ];
  if (pgHex.special || wsHex.special) pairs.push(['special', pgHex.special ?? '', wsHex.special ?? '']);
  let punctOnly = 0;
  for (const [slot, a, b] of pairs) {
    if (a === b) continue;
    if (normalizeZhForDiff(a) === normalizeZhForDiff(b)) { punctOnly++; continue; }
    diffs.push({ slot, pg: a, ws: b });
  }
  return { diffs, punctOnly };
}

function applyOverrides(hexagrams) {
  const list = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
  if (!Array.isArray(list)) throw new Error('overrides.json: expected a top-level array');
  const SLOT_RE = /^(zh|legge)\.(\d{1,2})\.(judgment|image|special|lines\.[0-5])$/;
  for (const [idx, o] of list.entries()) {
    const m = String(o.slot ?? '').match(SLOT_RE);
    if (!m) throw new Error(`overrides[${idx}]: bad slot ${JSON.stringify(o.slot)}`);
    if (!o.reason || typeof o.reason !== 'string') throw new Error(`overrides[${idx}] (${o.slot}): missing reason`);
    const hex = hexagrams[Number(m[2]) - 1];
    const texts = hex.texts[m[1]];
    const get = () => (m[3].startsWith('lines.') ? texts.lines[Number(m[3].slice(6))] : texts[m[3]]);
    const set = (v) => {
      if (m[3].startsWith('lines.')) texts.lines[Number(m[3].slice(6))] = v;
      else texts[m[3]] = v;
    };
    if (o.value !== undefined) {
      if (!Array.isArray(o.value) || !o.value.every((s) => typeof s === 'string')) {
        throw new Error(`overrides[${idx}] (${o.slot}): value must be an array of strings`);
      }
      set(o.value);
    } else if (o.find !== undefined && o.replace !== undefined) {
      const cur = get();
      if (!Array.isArray(cur)) throw new Error(`overrides[${idx}] (${o.slot}): slot is null, cannot find/replace`);
      const joined = cur.join('\n');
      const count = joined.split(o.find).length - 1;
      if (count !== 1) throw new Error(`overrides[${idx}] (${o.slot}): find occurs ${count} times (expected 1): ${JSON.stringify(o.find)}`);
      set(joined.replace(o.find, o.replace).split('\n'));
    } else {
      throw new Error(`overrides[${idx}] (${o.slot}): need either value or find+replace`);
    }
  }
  return list.length;
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  const needFetch = DO_FETCH || !fs.existsSync(PROVENANCE_PATH);
  if (needFetch) {
    const sources = await downloadAll();
    const prov = {
      version: 1,
      note: 'Pinned inputs for scripts/build.mjs. Regenerate only with --fetch after deliberate source review. Wikisource oldid = revision id captured at fetch; cached wikitext is the reproducible input.',
      sources,
    };
    fs.writeFileSync(PROVENANCE_PATH, `${JSON.stringify(prov, null, 2)}\n`);
    console.log('wrote scripts/provenance.json');
  } else {
    verifyProvenance();
  }

  // ---- parse ----
  const pg = parseGutenberg(readCache('gutenberg-25501.txt').toString('utf8'));
  const zhWsCache = JSON.parse(readCache('zh-wikisource.json').toString('utf8'));
  const legge = parseLeggeDjvuXml(readCache('legge-djvu.xml').toString('utf8'));
  const enCache = JSON.parse(readCache('en-wikisource.json').toString('utf8'));
  console.log(`parsed: gutenberg ${pg.length} hex, legge ${legge.hexagrams.length} hex + ${legge.images.length} images`);
  for (const w of legge.warnings) console.log(`  legge warning: ${w}`);

  // zh Wikisource (collation + oracles)
  const ws = [];
  const wsErrors = [];
  for (const entry of zhWsCache) {
    try {
      ws[entry.number - 1] = parseZhWikisourcePage(entry.wikitext, entry.number);
    } catch (e) {
      ws[entry.number - 1] = null;
      wsErrors.push(`hex ${entry.number}: ${e.message}`);
    }
  }
  if (wsErrors.length) console.log(`zh-wikisource parse errors (${wsErrors.length}):\n  ${wsErrors.join('\n  ')}`);

  // ---- oracles: King Wen table vs source labels / trigram headers (fatal) ----
  KINGWEN.forEach(([n, name, , lower, upper], i) => {
    const bits = bitsFor(lower, upper);
    const h = pg[i];
    if (foldVariants(h.name) !== foldVariants(name)) {
      throw new Error(`oracle: hex ${n} name: gutenberg ${JSON.stringify(h.name)} vs table ${JSON.stringify(name)}`);
    }
    h.labels.forEach((lab, p) => {
      const exp = labelFor(p + 1, bits[p]);
      if (lab !== exp) throw new Error(`oracle: hex ${n} pos ${p + 1}: gutenberg label ${lab} vs table ${exp}`);
    });
    if (n === 1 && h.specialLabel !== '用九') throw new Error('oracle: hex 1 special label');
    if (n === 2 && h.specialLabel !== '用六') throw new Error('oracle: hex 2 special label');
    const w = ws[i];
    if (w) {
      if (w.lower && w.upper && (w.lower !== lower || w.upper !== upper)) {
        throw new Error(`oracle: hex ${n} trigram header: wikisource ${w.lower}下${w.upper}上 vs table ${lower}下${upper}上`);
      }
      w.labels.forEach((lab, p) => {
        const exp = labelFor(p + 1, bits[p]);
        if (lab !== exp) throw new Error(`oracle: hex ${n} pos ${p + 1}: wikisource label ${lab} vs table ${exp}`);
      });
    }
  });
  console.log('oracles passed: 384 PG labels + names; WS trigram headers + labels where parsed');

  // ---- assemble (pre-override) ----
  const wrap = (s) => [s];
  const hexagrams = KINGWEN.map(([n, name, pinyin, lower, upper], i) => ({
    number: n,
    name_zh: name,
    name_pinyin: pinyin,
    name_en: null,
    symbol: hexagramSymbol(n),
    bits: bitsFor(lower, upper),
    lower,
    upper,
    texts: {
      zh: {
        judgment: wrap(pg[i].judgment),
        image: wrap(pg[i].image),
        lines: pg[i].lines.map(wrap),
        special: pg[i].special ? wrap(pg[i].special) : null,
      },
      legge: {
        judgment: wrap(legge.hexagrams[i].judgment),
        image: wrap(legge.images[i]),
        lines: legge.hexagrams[i].lines.map(wrap),
        special: legge.hexagrams[i].special ? wrap(legge.hexagrams[i].special) : null,
      },
    },
  }));

  // ---- collation reports (cache only; committed summary is docs/COLLATION.md) ----
  const zhReport = [];
  let zhDiffTotal = 0;
  let zhPunctTotal = 0;
  KINGWEN.forEach(([n, name], i) => {
    if (!ws[i]) { zhReport.push(`HEX ${n} ${name}: wikisource parse FAILED (see errors)`); return; }
    const { diffs, punctOnly } = compareZh(pg[i], ws[i]);
    zhDiffTotal += diffs.length;
    zhPunctTotal += punctOnly;
    if (pg[i].name !== name) zhReport.push(`HEX ${n}: name PG=${JSON.stringify(pg[i].name)} table=${JSON.stringify(name)} (graphic variant)`);
    for (const d of diffs) {
      zhReport.push(`HEX ${n} ${name} ${d.slot}:\n  PG: ${d.pg}\n  WS: ${d.ws}`);
    }
  });
  zhReport.unshift(`zh collation: PG #25501 (base) vs zh Wikisource. True (normalized) diffs: ${zhDiffTotal}; punctuation/variant-only slot diffs: ${zhPunctTotal}. Normalization folds 无/無 于/於 羣/群 遯/遁 恒/恆 and drops punctuation.`);
  fs.writeFileSync(path.join(CACHE, 'collation-zh.txt'), `${zhReport.join('\n')}\n`);

  const enByDjvu = new Map(enCache.pages.map((p) => [p.djvu, p.wikitext]));
  const leggeReport = ['legge collation: IA DjVu OCR (base) vs en Wikisource proofread (Text only, hex 1-32). Great Images have no en collation (Appendix II not transcribed there). Normalized diffs ignore diacritics/case/quote style.'];
  let enDiffTotal = 0;
  let enOkHex = 0;
  for (const info of enCache.hexagrams) {
    const plain = info.ranges.length
      ? info.ranges
        .flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, k) => a + k))
        // Join with a single newline: paragraphs split across DjVu pages must
        // rejoin; true paragraph breaks are blank lines inside the pages.
        .map((d) => stripEnWikitext(extractEnTextSection(enByDjvu.get(d) ?? '')).trim())
        .join('\n')
      : stripEnWikitext((info.wikitext ?? '').replace(/##[^#]*##/g, ''));
    const en = parseEnHexText(plain, info.number);
    const ia = legge.hexagrams[info.number - 1];
    if (!en.ok) {
      leggeReport.push(`HEX ${info.number}: en-wikisource assemble FAILED (judgment=${JSON.stringify(en.judgment?.slice(0, 60))}, lines=${en.lines.length})`);
      continue;
    }
    enOkHex++;
    const pairs = [
      ['judgment', ia.judgment, en.judgment],
      ...ia.lines.map((l, k) => [`lines.${k}`, l, en.lines[k]]),
    ];
    if (ia.special || en.special) pairs.push(['special', ia.special ?? '', en.special ?? '']);
    for (const [slot, a, b] of pairs) {
      if (normalizeEnForDiff(a) !== normalizeEnForDiff(b)) {
        enDiffTotal++;
        leggeReport.push(`HEX ${info.number} ${slot}:\n  IA: ${a}\n  WS: ${b}`);
      }
    }
  }
  leggeReport.splice(1, 0, `assembled en hexagrams: ${enOkHex}/32; differing slots: ${enDiffTotal}`);
  fs.writeFileSync(path.join(CACHE, 'collation-legge.txt'), `${leggeReport.join('\n')}\n`);

  console.log(`collation: zh true diffs ${zhDiffTotal} (+${zhPunctTotal} punct/variant-only); legge differing slots ${enDiffTotal} (of ${enOkHex} en hex)`);
  console.log('wrote cache reports: collation-zh.txt, collation-legge.txt');

  // ---- overrides + write data ----
  const applied = applyOverrides(hexagrams);
  console.log(`overrides applied: ${applied}`);

  // Plain-text dumps of the FINAL (post-override) slots, for the read-through.
  const dump = (tr) => hexagrams.map((h) => {
    const t = h.texts[tr];
    return [`=== ${h.number} ${h.name_zh} ${h.name_pinyin} [${tr}]`,
      `J: ${t.judgment.join(' / ')}`, `I: ${t.image.join(' / ')}`,
      ...t.lines.map((l, k) => `${k + 1}: ${l.join(' / ')}`),
      ...(t.special ? [`S: ${t.special.join(' / ')}`] : [])].join('\n');
  }).join('\n\n');
  fs.writeFileSync(path.join(CACHE, 'dump-zh.txt'), `${dump('zh')}\n`);
  fs.writeFileSync(path.join(CACHE, 'dump-legge.txt'), `${dump('legge')}\n`);
  const trigrams = TRIGRAMS.map((t) => ({
    name_zh: t.name_zh, name_pinyin: t.name_pinyin, name_en: null,
    symbol: t.symbol, image_zh: t.image_zh, image_pinyin: t.image_pinyin, bits: t.bits,
  }));
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'hexagrams.json'), `${JSON.stringify(hexagrams, null, 2)}\n`);
  fs.writeFileSync(path.join(ROOT, 'data', 'trigrams.json'), `${JSON.stringify(trigrams, null, 2)}\n`);
  console.log('wrote data/hexagrams.json, data/trigrams.json');
}

main().catch((e) => {
  console.error(`build failed: ${e.message}`);
  process.exit(1);
});
