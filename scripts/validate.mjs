#!/usr/bin/env node
// Validate data/hexagrams.json + data/trigrams.json against docs/SCHEMA.md.
// Usage: node scripts/validate.mjs [--require zh,legge]   (default zh,legge)
// Exit 0 = pass (warnings may still print), 1 = errors. Length outliers are
// warnings for human review, per PLAN.md M8.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRIGRAMS, KINGWEN, TEST_VECTORS, bitsFor, bitsString, labelFor, hexagramSymbol } from './lib/kingwen.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reqIdx = process.argv.indexOf('--require');
const REQUIRED = (reqIdx >= 0 ? process.argv[reqIdx + 1] : 'zh,legge').split(',').map((s) => s.trim()).filter(Boolean);
const KNOWN = ['zh', 'legge', 'poem'];

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch (e) {
    err(`${rel}: cannot read/parse (${e.message})`);
    return null;
  }
}

const hexagrams = readJson('data/hexagrams.json');
const trigrams = readJson('data/trigrams.json');

// ---- trigrams ----
if (Array.isArray(trigrams)) {
  if (trigrams.length !== 8) err(`trigrams: expected 8 entries, got ${trigrams.length}`);
  trigrams.forEach((t, i) => {
    const exp = TRIGRAMS[i];
    if (!exp) return;
    if (t.name_zh !== exp.name_zh) err(`trigrams[${i}]: name_zh ${t.name_zh} != ${exp.name_zh}`);
    if (t.name_pinyin !== exp.name_pinyin) err(`trigram ${exp.name_zh}: name_pinyin mismatch`);
    if (t.symbol !== exp.symbol) err(`trigram ${exp.name_zh}: symbol mismatch`);
    if (t.image_zh !== exp.image_zh || t.image_pinyin !== exp.image_pinyin) err(`trigram ${exp.name_zh}: image mismatch`);
    if (JSON.stringify(t.bits) !== JSON.stringify(exp.bits)) err(`trigram ${exp.name_zh}: bits mismatch`);
    if (!('name_en' in t)) err(`trigram ${exp.name_zh}: missing name_en field`);
  });
}

// ---- hexagrams: structure ----
const SLOT_NAMES = ['judgment', 'image', 'lines', 'special'];
function checkTextArray(v, where, { single = false } = {}) {
  if (!Array.isArray(v) || v.length === 0) { err(`${where}: expected non-empty string[]`); return; }
  if (single && v.length !== 1) warn(`${where}: expected exactly 1 element for zh/legge, got ${v.length}`);
  v.forEach((s, k) => {
    if (typeof s !== 'string' || s.trim() === '') err(`${where}[${k}]: empty/non-string`);
    else if (s.includes('\n')) err(`${where}[${k}]: contains newline`);
  });
}

if (Array.isArray(hexagrams)) {
  if (hexagrams.length !== 64) err(`hexagrams: expected 64 entries, got ${hexagrams.length}`);
  const seenNums = new Set();
  const seenBits = new Map();

  hexagrams.forEach((h, i) => {
    const [n, name, pinyin, lower, upper] = KINGWEN[i] ?? [];
    const where = `hex ${h?.number ?? i + 1}`;
    if (h.number !== i + 1) err(`${where}: array order must be King Wen 1..64 (index ${i} has number ${h.number})`);
    if (seenNums.has(h.number)) err(`${where}: duplicate number`);
    seenNums.add(h.number);
    if (h.name_zh !== name) err(`${where}: name_zh ${JSON.stringify(h.name_zh)} != table ${JSON.stringify(name)}`);
    if (h.name_pinyin !== pinyin) err(`${where}: name_pinyin ${JSON.stringify(h.name_pinyin)} != table ${JSON.stringify(pinyin)}`);
    if (!('name_en' in h)) err(`${where}: missing name_en field (null until Phase 4)`);
    if (h.symbol !== hexagramSymbol(h.number)) err(`${where}: symbol mismatch`);
    if (h.lower !== lower || h.upper !== upper) err(`${where}: lower/upper ${h.lower}/${h.upper} != table ${lower}/${upper}`);
    if (!Array.isArray(h.bits) || h.bits.length !== 6 || !h.bits.every((b) => b === 0 || b === 1)) {
      err(`${where}: bits must be six 0/1`);
    } else {
      const exp = bitsFor(lower, upper);
      if (JSON.stringify(h.bits) !== JSON.stringify(exp)) err(`${where}: bits ${bitsString(h.bits)} != trigram composition ${bitsString(exp)}`);
      const bs = bitsString(h.bits);
      if (seenBits.has(bs)) err(`${where}: duplicate bit pattern ${bs} (also hex ${seenBits.get(bs)})`);
      seenBits.set(bs, h.number);
      // Label generation is consistent by construction; assert the table is total
      // (guards future table edits) and exercise every label form.
      h.bits.forEach((b, p) => {
        if (!labelFor(p + 1, b)) err(`${where}: no label for position ${p + 1} bit ${b}`);
      });
    }
    if (TEST_VECTORS[h.number] && bitsString(h.bits ?? []) !== TEST_VECTORS[h.number]) {
      err(`${where}: test vector failed: ${bitsString(h.bits ?? [])} != ${TEST_VECTORS[h.number]}`);
    }

    if (!h.texts || typeof h.texts !== 'object') { err(`${where}: missing texts`); return; }
    for (const key of Object.keys(h.texts)) {
      if (!KNOWN.includes(key)) err(`${where}: unknown translation id ${JSON.stringify(key)}`);
    }
    for (const tr of KNOWN) {
      const t = h.texts[tr];
      if (t === undefined) {
        if (REQUIRED.includes(tr)) err(`${where}: missing required translation ${tr}`);
        continue;
      }
      for (const s of SLOT_NAMES) if (!(s in t)) err(`${where}.${tr}: missing slot ${s}`);
      checkTextArray(t.judgment, `${where}.${tr}.judgment`, { single: tr !== 'poem' });
      checkTextArray(t.image, `${where}.${tr}.image`, { single: tr !== 'poem' });
      if (!Array.isArray(t.lines) || t.lines.length !== 6) err(`${where}.${tr}.lines: expected 6 entries`);
      else t.lines.forEach((l, k) => checkTextArray(l, `${where}.${tr}.lines.${k}`, { single: tr !== 'poem' }));
      if (h.number <= 2) checkTextArray(t.special, `${where}.${tr}.special`, { single: tr !== 'poem' });
      else if (t.special !== null) err(`${where}.${tr}.special: must be null except hexagrams 1-2`);

      // Markup leakage + script purity + label/prefix leakage
      const all = [t.judgment, t.image, ...(t.lines ?? []), ...(t.special ? [t.special] : [])]
        .flatMap((a) => (Array.isArray(a) ? a : []));
      for (const s of all) {
        if (typeof s !== 'string') continue;
        if (/-\{|\{\{|\[\[|<\/?[a-zA-Z][^>]*>|&(?:[a-zA-Z]+|#\d+);/.test(s)) err(`${where}.${tr}: markup leakage: ${JSON.stringify(s.slice(0, 60))}`);
        if (tr === 'zh' && /[A-Za-z]{2,}/.test(s)) err(`${where}.zh: Latin word in Chinese slot: ${JSON.stringify(s.slice(0, 60))}`);
        if (tr !== 'zh' && /[\u3400-\u9fff]/.test(s)) err(`${where}.${tr}: CJK in non-Chinese slot: ${JSON.stringify(s.slice(0, 60))}`);
      }
      if (tr === 'zh') {
        const j = t.judgment?.[0] ?? '';
        if (j.startsWith(`${h.name_zh}：`)) err(`${where}.zh.judgment: name prefix not stripped`);
        if ((t.image?.[0] ?? '').startsWith('象曰')) err(`${where}.zh.image: 象曰 prefix not stripped`);
        (t.lines ?? []).forEach((l, k) => {
          const expected = `${labelFor(k + 1, h.bits?.[k] ?? 0)}：`;
          if ((l?.[0] ?? '').startsWith(expected)) err(`${where}.zh.lines.${k}: label prefix not stripped`);
        });
        if ((t.special?.[0] ?? '').startsWith('用')) err(`${where}.zh.special: 用九/用六 prefix not stripped`);
        // Every zh slot must actually contain Han characters.
        for (const s of all) if (typeof s === 'string' && !/[\u3400-\u9fff]/.test(s)) err(`${where}.zh: slot without Han characters: ${JSON.stringify(s.slice(0, 40))}`);
      }
      if (tr === 'legge') {
        (t.lines ?? []).forEach((l, k) => {
          if (/^[1-7][.,-]\s/.test(l?.[0] ?? '')) err(`${where}.legge.lines.${k}: paragraph number not stripped`);
        });
        if (/^[IVXLCDM]+\.\s/.test(t.image?.[0] ?? '')) err(`${where}.legge.image: roman prefix not stripped`);
      }
    }
  });

  // Length outliers per translation and slot kind (warnings for human review).
  // Short Chinese line statements (包羞。) are normal, so kinds are never pooled.
  for (const tr of KNOWN) {
    const byKind = { judgment: [], image: [], line: [], special: [] };
    const collect = (kind, v) => { const len = (v ?? []).join('').length; if (len > 0) byKind[kind].push(len); };
    hexagrams.forEach((h) => {
      const t = h.texts?.[tr];
      if (!t) return;
      collect('judgment', t.judgment); collect('image', t.image);
      (t.lines ?? []).forEach((l) => collect('line', l));
      if (t.special) collect('special', t.special);
    });
    const medians = Object.fromEntries(Object.entries(byKind).map(([k, arr]) => {
      const s = [...arr].sort((a, b) => a - b);
      return [k, s.length ? s[Math.floor(s.length / 2)] : 0];
    }));
    hexagrams.forEach((h) => {
      const t = h.texts?.[tr];
      if (!t) return;
      const slots = [['judgment', 'judgment', t.judgment], ['image', 'image', t.image],
        ...(t.lines ?? []).map((l, k) => [`lines.${k}`, 'line', l]),
        ...(t.special ? [['special', 'special', t.special]] : [])];
      for (const [slot, kind, v] of slots) {
        const len = (v ?? []).join('').length;
        const median = medians[kind];
        if (len > 0 && median > 0 && (len < median * 0.3 || len > median * 3)) {
          warn(`hex ${h.number}.${tr}.${slot}: length ${len} is an outlier (median ${kind} length ${median}) — eyeball it`);
        }
      }
    });
  }
}

for (const w of warnings) console.log(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.log(`error: ${e}`);
  console.log(`validate FAILED: ${errors.length} error(s), ${warnings.length} warning(s) [require: ${REQUIRED.join(',')}]`);
  process.exit(1);
}
console.log(`validate OK [require: ${REQUIRED.join(',')}] (${warnings.length} warning(s))`);
