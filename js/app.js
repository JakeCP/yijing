// Yijing 易經 — routing, views, casting interaction. Pure logic lives in engine.js.

import {
  parseRoute, castLine, cryptoRandomInt, synthesizeYarrowSplits,
  encodeReading, numberForValues, relatingNumber,
  changingIndices, describeValue, labelFor, specialLabel,
  chineseNumeral, hexagramHash,
} from './engine.js';
import { hexagramSVG, trigramFigure, coinSVG, stalksSVG, escapeHtml } from './render.js';
import { buildTrigramMatrix, firstJudgmentLine, facingEnglishId, facingActive, libraryMode } from './book.js';

const DATA_VERSION = '3'; // bump when data/*.json changes (PLAN.md S9)
const app = document.getElementById('app');
const liveRegion = document.getElementById('live');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

// Trigram natural-image names (UI copy; data carries the characters).
const IMAGE_EN = { '天': 'heaven', '地': 'earth', '雷': 'thunder', '風': 'wind', '水': 'water', '火': 'fire', '山': 'mountain', '澤': 'marsh' };

// --------------------------------------------------------------- storage
function storage(kind) {
  const store = kind === 'session' ? window.sessionStorage : window.localStorage;
  return {
    get(key) { try { const v = store.getItem(key); return v === null ? null : JSON.parse(v); } catch { return null; } },
    set(key, value) { try { store.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } },
    remove(key) { try { store.removeItem(key); } catch { /* ignore */ } },
  };
}
const session = storage('session');
const local = storage('local');
const S_CAST = 'yi-cast-in-progress';
const S_LAST = 'yi-last-cast';
const L_TRANSLATION = 'yi-translation';
const L_FACING = 'yi-facing';
const L_LIBRARY = 'yi-library-view';
// Desktop book layouts engage at these widths (mirrors css/style.css).
const WIDE_MQ = window.matchMedia('(min-width: 1024px)');
const FACING_MQ = window.matchMedia('(min-width: 1280px)');

// ------------------------------------------------------------------ data
let DATA = null; // { hexagrams, trigrams, byNumber, trigramByName }
let loadPromise = null;

function loadData() {
  if (DATA) return Promise.resolve(DATA);
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([
    fetch(`data/hexagrams.json?v=${DATA_VERSION}`).then((r) => { if (!r.ok) throw new Error(`hexagrams ${r.status}`); return r.json(); }),
    fetch(`data/trigrams.json?v=${DATA_VERSION}`).then((r) => { if (!r.ok) throw new Error(`trigrams ${r.status}`); return r.json(); }),
  ]).then(([hexagrams, trigrams]) => {
    DATA = {
      hexagrams,
      trigrams,
      byNumber: new Map(hexagrams.map((h) => [h.number, h])),
      trigramByName: new Map(trigrams.map((t) => [t.name_zh, t])),
    };
    return DATA;
  }).catch((err) => {
    loadPromise = null;
    throw err;
  });
  return loadPromise;
}

// Texts load lazily: on idle after first paint, or on the first cast tap.
if ('requestIdleCallback' in window) window.requestIdleCallback(() => { loadData().catch(() => {}); }, { timeout: 2500 });
else window.setTimeout(() => { loadData().catch(() => {}); }, 1200);

// ------------------------------------------------------------ translation
function defaultTranslation() {
  const saved = local.get(L_TRANSLATION);
  if (saved === 'zh' || saved === 'legge' || saved === 'poem') return saved;
  if ((navigator.language || '').toLowerCase().startsWith('zh')) return 'zh';
  // The Rendering is the default English text; Chinese above wins (Phase 4).
  if (DATA && DATA.hexagrams.every((h) => h.texts.poem)) return 'poem';
  return 'legge';
}

function pickTranslation(hexagram) {
  const want = defaultTranslation();
  if (hexagram.texts[want]) return want;
  if (hexagram.texts.legge) return 'legge';
  return 'zh';
}

const TRANSLATION_LABELS = { zh: '原文', legge: 'Legge', poem: 'Rendering' };

function translationBar(hexagrams, currentId, facingEn = null) {
  // Offer an option only when every hexagram on the page has it.
  const ids = ['zh', 'legge', 'poem'].filter((id) => hexagrams.every((h) => h.texts[id]));
  const buttons = ids.map((id) => (
    `<button type="button" data-translation="${id}" aria-pressed="${id === currentId}">${id === 'zh' ? `<span lang="zh-Hant">原文</span>` : TRANSLATION_LABELS[id]}</button>`
  )).join('<span class="sep" aria-hidden="true">·</span>');
  // Facing pages (desktop, wide): the Chinese set vertically facing the
  // chosen English. The toggle renders wherever a pairing exists; CSS
  // shows it only at the facing width, JS applies it only there too.
  const en = facingEnglishId(currentId, ids);
  const on = facingActive(local.get(L_FACING) === true, FACING_MQ.matches) && facingEn !== null;
  const facing = en
    ? `<span class="sep facing-sep" aria-hidden="true">·</span><button type="button" class="facing-toggle" data-facing aria-pressed="${on}">Facing pages</button>`
    : '';
  return `<div class="translation-bar" role="group" aria-label="Translation">${buttons}${facing}</div>`;
}

/** The facing companion for the current render, or null when off/unavailable. */
function facingFor(hexagrams, currentId) {
  if (!facingActive(local.get(L_FACING) === true, FACING_MQ.matches)) return null;
  const ids = ['zh', 'legge', 'poem'].filter((id) => hexagrams.every((h) => h.texts[id]));
  return facingEnglishId(currentId, ids);
}

function bindTranslationBar(rerender) {
  app.querySelectorAll('[data-translation]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.translation;
      local.set(L_TRANSLATION, id);
      rerender(true); // preserve the reader's place (per-line anchors)
      announce(`${TRANSLATION_LABELS[id] === '原文' ? 'Chinese text' : TRANSLATION_LABELS[id]} shown.`);
      const next = app.querySelector(`[data-translation="${id}"]`);
      if (next) next.focus({ preventScroll: true });
    });
  });
  const facingBtn = app.querySelector('[data-facing]');
  if (facingBtn) {
    facingBtn.addEventListener('click', () => {
      const next = local.get(L_FACING) !== true;
      local.set(L_FACING, next);
      rerender(true);
      announce(next ? 'Facing pages shown: Chinese facing the English.' : 'Facing pages off.');
      const again = app.querySelector('[data-facing]');
      if (again) again.focus({ preventScroll: true });
    });
  }
}

/** Re-render once when the viewport crosses a layout gate (same route only). */
let wideRerenderHandler = null;
function bindWideRerender(seq, rerender) {
  if (wideRerenderHandler) {
    FACING_MQ.removeEventListener('change', wideRerenderHandler);
    WIDE_MQ.removeEventListener('change', wideRerenderHandler);
  }
  wideRerenderHandler = () => { if (seq === routeSeq) rerender(true); };
  FACING_MQ.addEventListener('change', wideRerenderHandler, { once: true });
  WIDE_MQ.addEventListener('change', wideRerenderHandler, { once: true });
}

// Keep the reader's place across a translation switch using block anchors.
function captureAnchor() {
  const blocks = app.querySelectorAll('[data-anchor]');
  for (const el of blocks) {
    const rect = el.getBoundingClientRect();
    if (rect.bottom > 70) return { id: el.dataset.anchor, offset: rect.top };
  }
  return null;
}
function restoreAnchor(saved) {
  if (!saved) return;
  const el = app.querySelector(`[data-anchor="${saved.id}"]`);
  if (el) window.scrollBy(0, el.getBoundingClientRect().top - saved.offset);
}

// -------------------------------------------------------------- rendering
function nameLabel(h) {
  return `Hexagram ${h.number}, ${h.name_zh} ${h.name_pinyin}${h.name_en ? `, ${h.name_en}` : ''}`;
}

function trigramPhrase(t) {
  return `<span lang="zh-Hant">${escapeHtml(t.name_zh)}</span> ${escapeHtml(t.name_pinyin)}, ${IMAGE_EN[t.image_zh] || escapeHtml(t.image_pinyin)}`;
}

function hexaFigure(h, { values = null, interactive = false, className = '' } = {}) {
  const lineNames = interactive
    ? h.bits.map((bit, i) => `Line ${i + 1}, ${labelFor(i + 1, bit)}${values && (values[i] === 6 || values[i] === 9) ? ', changing' : ''}`)
    : null;
  return hexagramSVG({ bits: h.bits, values, label: nameLabel(h), interactive, lineNames, className });
}

function hexaNames(h, { headingLevel = 1 } = {}) {
  const tag = `h${headingLevel}`;
  return `<p class="hexa-number">${h.number} · <span lang="zh-Hant">第${chineseNumeral(h.number)}卦</span></p>
    <${tag} class="hexa-name"${headingLevel === 1 ? ' tabindex="-1"' : ''} lang="zh-Hant">${escapeHtml(h.name_zh)}</${tag}>
    <p class="hexa-pinyin">${escapeHtml(h.name_pinyin)}</p>
    ${h.name_en ? `<p class="hexa-en">${escapeHtml(h.name_en)}</p>` : ''}`;
}

function trigramLine(h, className = 'hexa-trigrams') {
  const upper = DATA.trigramByName.get(h.upper);
  const lower = DATA.trigramByName.get(h.lower);
  return `<p class="${className}">${trigramPhrase(upper)} above · ${trigramPhrase(lower)} below</p>`;
}

function hexaHead(h, { values = null, big = true, headingLevel = 1, interactive = false } = {}) {
  return `<header class="hexa-head">
    ${hexaFigure(h, { values, interactive })}
    ${hexaNames(h, { headingLevel })}
    ${trigramLine(h)}
  </header>`;
}

/**
 * The figure column: sticky on desktop, the head of the page on narrow
 * screens. A reading with changing lines shows both figures here,
 * before any text — side by side with 之 between on narrow screens,
 * stacked (primary, its names and trigrams, 之, relating) in the
 * desktop column. The trigram rows repeat the head's trigram phrase
 * with drawn figures, so they are visual only; the relating figure is
 * a real link to its page.
 */
function spreadSide(h, { values = null, headingLevel = 1, relating = null } = {}) {
  const upper = DATA.trigramByName.get(h.upper);
  const lower = DATA.trigramByName.get(h.lower);
  const row = (t, place) => `<div class="trigram-row">
      ${trigramFigure(t)}
      <p class="trigram-row-text"><span class="trigram-place">${place}</span>
      <span lang="zh-Hant">${escapeHtml(t.name_zh)}</span> ${escapeHtml(t.name_pinyin)} ·
      <span lang="zh-Hant">${escapeHtml(t.image_zh)}</span> ${IMAGE_EN[t.image_zh] || escapeHtml(t.image_pinyin)}</p>
    </div>`;
  const rows = `<div class="trigram-rows" aria-hidden="true">${row(upper, 'Above')}${row(lower, 'Below')}</div>`;
  if (!relating) {
    return `<div class="spread-side">
    ${hexaHead(h, { values, headingLevel, interactive: WIDE_MQ.matches })}
    ${rows}
  </div>`;
  }
  return `<div class="spread-side has-relating">
    <div class="side-fig-primary">${hexaFigure(h, { values, interactive: WIDE_MQ.matches, className: 'primary-figure' })}</div>
    <p class="side-zhi"><span class="zhi-char" lang="zh-Hant">之</span><span class="zhi-gloss">becoming</span></p>
    <a class="side-fig-relating" href="${hexagramHash(relating.number)}">
      ${hexagramSVG({ bits: relating.bits, label: nameLabel(relating), className: 'relating-figure' })}
      <span class="relating-name"><span class="rn-number">${relating.number}</span> <span class="rn-zh" lang="zh-Hant">${escapeHtml(relating.name_zh)}</span> <span class="rn-pinyin">${escapeHtml(relating.name_pinyin)}</span>${relating.name_en ? ` <span class="rn-en">${escapeHtml(relating.name_en)}</span>` : ''}</span>
    </a>
    <header class="side-names-primary">${hexaNames(h, { headingLevel })}</header>
    ${trigramLine(h, 'hexa-trigrams side-trigram-line')}
    ${rows}
  </div>`;
}

/** Light a figure line and its text together (hover and keyboard focus).
 * Only the primary figure is interactive (its lines carry tabindex);
 * the relating figure in the same column never lights the texts. */
function bindLineHighlight() {
  const lines = app.querySelectorAll('.spread-side .hex-line[tabindex][data-line]');
  const entries = app.querySelectorAll('.line-entry[data-line]');
  if (!lines.length || !entries.length) return;
  const light = (n, on) => {
    app.querySelectorAll(`.spread-side .hex-line[tabindex][data-line="${n}"], .line-entry[data-line="${n}"]`)
      .forEach((el) => el.classList.toggle('is-lit', on));
  };
  const wire = (els) => els.forEach((el) => {
    const n = el.dataset.line;
    el.addEventListener('mouseenter', () => light(n, true));
    el.addEventListener('mouseleave', () => light(n, false));
    el.addEventListener('focus', () => light(n, true));
    el.addEventListener('blur', () => light(n, false));
  });
  wire(lines);
  wire(entries);
}

function slotText(lines, translation) {
  // Chinese body text carries its language so speech switches voice (M15).
  const lang = translation === 'zh' ? ' lang="zh-Hant"' : '';
  if (translation === 'poem' && lines.length > 1) {
    return `<p class="slot-text"${lang}>${lines.map((l) => `<span class="verse-line">${escapeHtml(l)}</span>`).join('')}</p>`;
  }
  return lines.map((l) => `<p class="slot-text"${lang}>${escapeHtml(l)}</p>`).join('');
}

/** Chinese set as one continuous vertical column (facing pages). */
function zhVerticalText(lines) {
  return `<p class="slot-text vertical-text" lang="zh-Hant">${lines.map(escapeHtml).join('')}</p>`;
}

/** One slot in one language, or the same slot facing in two (facingEn). */
function facingSlot(h, tr, slot, facingEn) {
  if (!facingEn) return slotText(h.texts[tr][slot], tr);
  return `<div class="facing-cols">
    <div class="facing-zh">${zhVerticalText(h.texts.zh[slot])}</div>
    <div class="facing-en">${slotText(h.texts[facingEn][slot], facingEn)}</div>
  </div>`;
}

function textBlock(labelHtml, lines, translation, anchor, headingTag = 'h2') {
  return `<section class="text-block" data-anchor="${anchor}">
    <${headingTag} class="layer-label">${labelHtml}</${headingTag}>
    ${slotText(lines, translation)}
  </section>`;
}

function slotBlock(labelHtml, h, tr, slot, facingEn, anchor, headingTag = 'h2') {
  if (!facingEn) return textBlock(labelHtml, h.texts[tr][slot], tr, anchor, headingTag);
  return `<section class="text-block facing-pair" data-anchor="${anchor}">
    <${headingTag} class="layer-label">${labelHtml}</${headingTag}>
    ${facingSlot(h, tr, slot, facingEn)}
  </section>`;
}

function judgmentBlock(h, tr, anchor = 'judgment', headingTag = 'h2', facingEn = null) {
  return slotBlock(`The Judgment · <span class="zh" lang="zh-Hant">卦辭</span>`, h, tr, 'judgment', facingEn, anchor, headingTag);
}
function imageBlock(h, tr, anchor = 'image', headingTag = 'h2', facingEn = null) {
  return slotBlock(`The Image · <span class="zh" lang="zh-Hant">大象</span> <span class="soft">(from the later <span class="zh" lang="zh-Hant">象傳</span>)</span>`, h, tr, 'image', facingEn, anchor, headingTag);
}

function lineEntry(h, tr, index, { changing = false, anchor = true, facingEn = null, focusable = null } = {}) {
  // Line texts join the tab order only where the spread can light the
  // figure beside them; narrow screens keep their leaner tab order.
  const canFocus = focusable === null ? WIDE_MQ.matches : focusable;
  const label = labelFor(index + 1, h.bits[index]);
  const text = facingEn
    ? `<div class="facing-cols">
        <div class="facing-zh">${zhVerticalText(h.texts.zh.lines[index])}</div>
        <div class="facing-en">${slotText(h.texts[facingEn].lines[index], facingEn)}</div>
      </div>`
    : slotText(h.texts[tr].lines[index], tr);
  return `<article class="line-entry${changing ? ' is-changing' : ''}${facingEn ? ' facing-pair' : ''}" data-line="${index + 1}"${canFocus ? ' tabindex="0"' : ''}${anchor ? ` data-anchor="line-${index + 1}"` : ''}>
    <p class="line-tag"><span class="line-tag-name zh" lang="zh-Hant">${label}</span><span class="line-tag-sep" aria-hidden="true"> · </span><span class="line-tag-sub">line ${index + 1}${changing ? ' · <span class="changing-note">changing</span>' : ''}</span></p>
    <div class="line-text">${text}</div>
  </article>`;
}

function loadingView() {
  app.innerHTML = `<div class="view state-msg"><p class="big-zh" lang="zh-Hant">易</p><p class="soft"><em>Opening the book…</em></p></div>`;
}

function errorView() {
  app.innerHTML = `<div class="view state-msg">
    <p class="big-zh" lang="zh-Hant">易</p>
    <h1 class="page-title" tabindex="-1">The texts could not be loaded</h1>
    <p class="soft">Something interrupted the download of the book itself.</p>
    <p><button type="button" class="btn-primary" id="retry-load">Try again</button></p>
  </div>`;
  document.title = 'Yijing 易經';
  document.getElementById('retry-load').addEventListener('click', () => { loadPromise = null; route(); });
  focusHeading();
}

function focusHeading() {
  const h = app.querySelector('h1');
  if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
}

let routeSeq = 0; // bumped per route; async views bail out when stale

async function withData(render) {
  const seq = routeSeq;
  if (!DATA) {
    loadingView();
    try { await loadData(); } catch { if (seq === routeSeq) errorView(); return; }
    if (seq !== routeSeq) return; // a newer route already owns the page
  }
  render();
}

function announce(message) {
  liveRegion.textContent = '';
  window.setTimeout(() => { liveRegion.textContent = message; }, 40);
}

function setBodyTranslation(tr, facingEn = null) {
  document.body.dataset.translation = tr;
  document.body.dataset.facing = facingEn ? 'on' : '';
}

function delay(ms) {
  return REDUCED.matches ? Promise.resolve() : new Promise((res) => { window.setTimeout(res, ms); });
}

// A pause is not motion: keep it even under reduced motion, so the sixth
// line (and its announcement) lands before the reading replaces the page.
function pause(ms) {
  return new Promise((res) => { window.setTimeout(res, REDUCED.matches ? Math.min(ms, 350) : ms); });
}

// --------------------------------------------------------------- cast view
let castRun = 0; // cancels in-flight cast animations on navigation

function emptyCast() {
  return { method: 'coins', values: [], detail: [], question: '' };
}

function currentCast() {
  const saved = session.get(S_CAST);
  if (saved && (saved.method === 'coins' || saved.method === 'yarrow')
    && Array.isArray(saved.values) && saved.values.length < 6
    && saved.values.every((v) => [6, 7, 8, 9].includes(v))
    && Array.isArray(saved.detail)) {
    return { question: '', ...saved };
  }
  return emptyCast();
}

function saveCast(cast) { session.set(S_CAST, cast); }

// 'three inscribed', 'two plain, one inscribed', … from coin sides
// ('character' | 'blank'), majority first.
function coinFacesPhrase(sides) {
  const inscribed = sides.filter((s) => s === 'character').length;
  return {
    0: 'three plain',
    1: 'two plain, one inscribed',
    2: 'two inscribed, one plain',
    3: 'three inscribed',
  }[inscribed];
}

function detailRecord(line, splits) {
  if (line.method === 'coins') {
    return { kind: 'coins', value: line.value, faces: line.faces.map((f) => f.side) };
  }
  return {
    kind: 'yarrow', value: line.value, changes: line.changes, remaining: line.remaining,
    splits: splits ? splits.map((s) => ({ heap: s.heap, left: s.left, right: s.right, removed: s.removed })) : [],
  };
}

// Faint ink-wash ridges for the foot of the desktop cast page. Drawn
// paths only, currentColor at CSS-set low opacity; CSS masks every
// edge so it dissolves into the paper, and it sits in its own band
// below the ritual, never under a control. The small disc is a
// cinnabar sun inside the landscape. Hidden on narrow screens/print.
const INK_WASH = `<svg class="ink-wash" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true" focusable="false">
<path class="wash-far" d="M0 150 C140 96 240 132 360 84 C470 40 560 92 680 70 C800 48 900 108 1020 78 C1100 58 1160 84 1200 72 L1200 220 L0 220 Z"/>
<path class="wash-mid" d="M0 182 C120 140 260 176 400 132 C540 88 640 150 790 124 C930 100 1030 152 1200 126 L1200 220 L0 220 Z"/>
<path class="wash-water" d="M60 198 q30 -6 60 0 M210 206 q34 -6 68 0 M420 200 q30 -6 60 0 M640 208 q34 -6 68 0 M860 202 q30 -6 60 0 M1020 210 q34 -6 68 0"/>
<circle class="wash-sun" cx="300" cy="52" r="11"/>
</svg>`;

function castView() {
  const cast = currentCast();
  saveCast(cast);
  const started = cast.values.length > 0;
  document.title = 'Yijing 易經 — cast';

  app.innerHTML = `<div class="view cast-wrap"><div class="cast-layout"><div class="cast-ritual">
    <h1 class="cast-title" tabindex="-1" lang="zh-Hant">易經</h1>
    <p class="cast-subtitle">the Book of Changes</p>

    <div class="question-field">
      <label for="question">Hold a question, if you have one</label>
      <input id="question" type="text" autocomplete="off" maxlength="240"
        placeholder="It stays on this device, only for this visit"
        value="${escapeHtml(cast.question || '')}" ${started ? 'disabled' : ''}>
    </div>

    <div class="method-choice" role="group" aria-label="Casting method">
      <button type="button" data-method="coins" aria-pressed="${cast.method === 'coins'}" ${started ? 'disabled' : ''}>Three coins</button>
      <button type="button" data-method="yarrow" aria-pressed="${cast.method === 'yarrow'}" ${started ? 'disabled' : ''}>Yarrow stalks</button>
    </div>

    <div class="cast-stage" aria-hidden="false">
      <div class="cast-figure" id="cast-figure"></div>
      <div class="cast-detail" id="cast-detail"></div>
    </div>

    <div class="cast-controls">
      <button type="button" class="btn-primary cast-button" id="cast-button"></button>
      <p class="cast-progress" id="cast-progress"></p>
      <div class="cast-minor">
        <button type="button" id="undo-line">undo line</button>
        <button type="button" id="restart-cast">start again</button>
        <button type="button" id="cast-all">cast all six</button>
      </div>
    </div>

    <details class="quiet manual-cast" id="manual-cast">
      <summary>Enter a cast made by hand</summary>
      <p class="small soft">Six lines, bottom to top — 6 old yin, 7 young yang, 8 young yin, 9 old yang.</p>
      <form id="manual-form">
        <div class="rows">
          ${[1, 2, 3, 4, 5, 6].map((pos) => `<div class="manual-row">
            <label class="pos" for="manual-${pos}">Line ${pos}${pos === 1 ? ' · bottom' : pos === 6 ? ' · top' : ''}</label>
            <select id="manual-${pos}" required>
              <option value="">—</option>
              <option value="6">6 · old yin, changing</option>
              <option value="7">7 · young yang</option>
              <option value="8">8 · young yin</option>
              <option value="9">9 · old yang, changing</option>
            </select>
          </div>`).join('')}
        </div>
        <button type="submit" class="btn-primary">See the reading</button>
      </form>
    </details>
    <div class="cast-arrival" id="cast-arrival" hidden></div>
  </div>
  <aside class="cast-aside" aria-label="From the Appended Words">
    <div class="title-slip"><span class="slip-text" lang="zh-Hant">易經</span></div>
    <p class="vertical-passage" lang="zh-Hant"><span class="vp-col">易有太極，是生兩儀，</span><span class="vp-col">兩儀生四象，四象生八卦。</span></p>
    <p class="passage-source"><span lang="zh-Hant">繫辭上</span> · Appended Words, I</p>
    <p class="passage-gloss"><em>In Change there is the Great Ultimate. It gives birth to the Two Forms; the Two Forms to the Four Images; the Four Images to the Eight Trigrams.</em></p>
  </aside></div>${INK_WASH}</div>`;

  const figure = document.getElementById('cast-figure');
  const detail = document.getElementById('cast-detail');
  const button = document.getElementById('cast-button');
  const progress = document.getElementById('cast-progress');
  const undoBtn = document.getElementById('undo-line');
  const restartBtn = document.getElementById('restart-cast');
  const allBtn = document.getElementById('cast-all');
  const questionInput = document.getElementById('question');
  const run = ++castRun;
  let animating = false;

  function redraw(freshIndex = -1) {
    if (cast.values.length === 0) {
      figure.innerHTML = '<p class="cast-placeholder" lang="zh-Hant" aria-hidden="true">未卜</p>';
    } else {
      const bits = cast.values.map((v) => (v === 7 || v === 9 ? 1 : 0));
      figure.innerHTML = hexagramSVG({
        bits, values: cast.values, freshIndex,
        label: `${cast.values.length} of 6 lines cast`,
      });
    }
    button.textContent = cast.method === 'coins' ? 'Cast the coins' : 'Divide the stalks';
    progress.textContent = cast.values.length === 0
      ? 'Six lines, cast one at a time, from the bottom'
      : `Line ${cast.values.length} of 6 is cast`;
    undoBtn.disabled = animating || cast.values.length === 0;
    restartBtn.disabled = animating || cast.values.length === 0;
    // Hidden (space reserved) until a first line exists to undo or clear.
    undoBtn.classList.toggle('cast-minor-waiting', cast.values.length === 0);
    restartBtn.classList.toggle('cast-minor-waiting', cast.values.length === 0);
    allBtn.setAttribute('aria-disabled', String(animating || cast.values.length >= 6));
    allBtn.classList.toggle('is-busy', animating);
    // Keep the cast button focusable while a line animates: a disabled
    // button drops keyboard focus to <body>, breaking a keyboard-only
    // cast. castOne() already ignores taps while animating.
    button.setAttribute('aria-disabled', String(animating));
    button.classList.toggle('is-busy', animating);
  }

  function finishIfComplete() {
    if (cast.values.length !== 6) return false;
    session.set(S_LAST, {
      code: encodeReading(cast.method, cast.values).slice(4),
      method: cast.method,
      values: cast.values,
      detail: cast.detail,
      question: (cast.question || '').trim(),
    });
    session.remove(S_CAST);
    return true;
  }

  async function castOne({ quick = false } = {}) {
    if (animating || cast.values.length >= 6) return false;
    animating = true;
    loadData().catch(() => {}); // texts will be needed at line six
    redraw();
    const position = cast.values.length + 1;
    const line = castLine(cast.method, cryptoRandomInt);

    if (cast.method === 'coins') {
      detail.innerHTML = `<div class="coins-row">${line.faces.map((f) => `<span class="coin-flipping" style="display:inline-block">${coinSVG(f.side)}</span>`).join('')}</div>`;
      await delay(quick ? 300 : 640);
      if (run !== castRun) return false;
      detail.innerHTML = `<div class="coins-row">${line.faces.map((f) => coinSVG(f.side)).join('')}</div>
        <p class="detail-note">${coinFacesPhrase(line.faces.map((f) => f.side))} — ${line.value}, ${describeValue(line.value)}</p>`;
      cast.values.push(line.value);
      cast.detail.push(detailRecord(line));
    } else {
      const splits = synthesizeYarrowSplits(line.changes, cryptoRandomInt);
      const names = ['First change', 'Second change', 'Third change'];
      detail.innerHTML = `${stalksSVG(49)}<div class="yarrow-changes"></div>`;
      const list = detail.querySelector('.yarrow-changes');
      // One quiet line at a time; the splits in full live in the cast record.
      for (let i = 0; i < 3; i += 1) {
        await delay(quick ? 130 : 420);
        if (run !== castRun) return false;
        const s = splits[i];
        list.innerHTML = `<p class="change">${names[i]} — ${s.heap} stalks, divided ${s.left} · ${s.right}, ${s.removed} set aside</p>`;
      }
      await delay(quick ? 120 : 380);
      if (run !== castRun) return false;
      list.innerHTML = `<p class="change detail-note">${line.remaining} remain — ${line.value}, ${describeValue(line.value)}</p>`;
      cast.values.push(line.value);
      cast.detail.push(detailRecord(line, splits));
    }

    saveCast(cast);
    animating = false;
    redraw(position - 1);
    announce(`Line ${position}: ${describeValue(line.value)}.`);
    if (questionInput) questionInput.disabled = true;
    document.querySelectorAll('[data-method]').forEach((b) => { b.disabled = true; });

    if (finishIfComplete()) {
      // The sixth line arrives before the reading opens: a slow ink
      // spread, then the hexagram's name. (A pause is not motion, so a
      // shortened beat remains under reduced motion; see pause().)
      if (!quick) {
        let named = false;
        try {
          const data = await loadData();
          const arrived = data.byNumber.get(numberForValues(cast.values));
          const arrival = document.getElementById('cast-arrival');
          if (arrival && arrived && run === castRun) {
            arrival.innerHTML = `<span class="arrival-ink" aria-hidden="true"></span>
              <p class="arrival-number">${arrived.number} · <span lang="zh-Hant">第${chineseNumeral(arrived.number)}卦</span></p>
              <p class="arrival-name" lang="zh-Hant">${escapeHtml(arrived.name_zh)}</p>
              <p class="arrival-gloss">${escapeHtml(arrived.name_pinyin)}${arrived.name_en ? ` · ${escapeHtml(arrived.name_en)}` : ''}</p>`;
            arrival.hidden = false;
            announce(`${nameLabel(arrived)}.`);
            named = true;
          }
        } catch { /* texts still loading: the reading will open unnamed */ }
        await pause(named ? 1750 : 950);
      }
      if (run !== castRun) return true;
      window.location.hash = encodeReading(cast.method, cast.values);
    }
    return true;
  }

  button.addEventListener('click', () => { castOne(); });
  allBtn.addEventListener('click', async () => {
    if (animating) return;
    while (run === castRun && cast.values.length < 6) {
      const ok = await castOne({ quick: true });
      if (!ok) break;
      await delay(160);
    }
  });
  undoBtn.addEventListener('click', () => {
    if (animating || cast.values.length === 0) return;
    cast.values.pop();
    cast.detail.pop();
    saveCast(cast);
    detail.innerHTML = '';
    redraw();
    if (undoBtn.disabled) button.focus({ preventScroll: true });
    if (cast.values.length === 0) {
      questionInput.disabled = false;
      document.querySelectorAll('[data-method]').forEach((b) => { b.disabled = false; });
    }
    announce(`Line ${cast.values.length + 1} removed.`);
  });
  restartBtn.addEventListener('click', () => {
    if (animating) return;
    cast.values = [];
    cast.detail = [];
    saveCast(cast);
    detail.innerHTML = '';
    questionInput.disabled = false;
    document.querySelectorAll('[data-method]').forEach((b) => { b.disabled = false; });
    redraw();
    button.focus({ preventScroll: true });
    announce('Cast cleared.');
  });

  app.querySelectorAll('[data-method]').forEach((btn) => {
    btn.addEventListener('click', () => {
      cast.method = btn.dataset.method;
      saveCast(cast);
      app.querySelectorAll('[data-method]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      redraw();
    });
  });

  questionInput.addEventListener('input', () => {
    cast.question = questionInput.value;
    saveCast(cast);
  });

  document.getElementById('manual-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const values = [1, 2, 3, 4, 5, 6].map((pos) => Number(document.getElementById(`manual-${pos}`).value));
    if (!values.every((v) => [6, 7, 8, 9].includes(v))) return;
    session.set(S_LAST, {
      code: encodeReading('manual', values).slice(4), method: 'manual', values, detail: [], question: '',
    });
    session.remove(S_CAST);
    window.location.hash = encodeReading('manual', values);
  });

  redraw();
  focusHeading();
}

// ------------------------------------------------------------ reading view
function castRecordHtml(route, last) {
  const rows = route.values.map((v, i) => {
    let detailText = `<span class="v">${v}</span> · ${describeValue(v)}`;
    const d = last && last.detail && last.detail[i];
    if (d && d.kind === 'coins' && Array.isArray(d.faces)) {
      detailText += ` — coins: ${coinFacesPhrase(d.faces)}`;
    } else if (d && d.kind === 'yarrow') {
      const divs = (d.splits || []).map((s) => `${s.heap} → ${s.left}·${s.right} (−${s.removed})`).join('; ');
      detailText += ` — yarrow: ${divs}; ${d.remaining} remain`;
    }
    return `<tr><th scope="row">Line ${i + 1}</th><td>${detailText}</td></tr>`;
  }).join('');
  const methodName = { coins: 'three coins', yarrow: 'yarrow stalks', manual: 'entered by hand' }[route.method];
  return `<details class="quiet">
    <summary>The cast, line by line</summary>
    <div class="cast-record"><p>Cast by ${methodName}.</p>
    <table>${rows}</table></div>
  </details>`;
}

function readingView(route) {
  withData(() => {
    const render = (preservePlace = false) => {
      const anchor = preservePlace ? captureAnchor() : null;
      const primary = DATA.byNumber.get(numberForValues(route.values));
      const relNumber = relatingNumber(route.values);
      const relating = relNumber ? DATA.byNumber.get(relNumber) : null;
      const shown = relating ? [primary, relating] : [primary];
      const tr = shown.every((h) => h.texts[defaultTranslation()]) ? defaultTranslation() : pickTranslation(primary);
      const facingEn = facingFor(shown, tr);
      setBodyTranslation(tr, facingEn);
      const changing = changingIndices(route.values);
      const allChanging = changing.length === 6;
      const specialCase = allChanging && (primary.number === 1 || primary.number === 2);
      const last = session.get(S_LAST);
      const inSession = last && last.code === `${route.letter}${route.values.join('')}`;

      document.title = `${primary.name_zh} ${primary.name_pinyin}${relating ? ` → ${relating.name_zh} ${relating.name_pinyin}` : ''} — Yijing 易經`;

      // One DOM, two readings of it: a centred column on narrow screens,
      // a book spread (sticky figure | text) on wide ones.
      let body = '';
      if (inSession && last.question) {
        body += `<p class="question-echo">“${escapeHtml(last.question)}”</p>`;
      }
      body += `<div class="spread">${spreadSide(primary, { values: route.values, relating })}<div class="spread-main">`;
      body += translationBar(shown, tr, facingEn);

      if (specialCase) {
        // All six changing on 1/2: 用九/用六 is the primary text (PLAN.md M9).
        body += slotBlock(
          `<span class="zh" lang="zh-Hant">${specialLabel(primary.number)}</span> · when all six lines change`,
          primary, tr, 'special', facingEn, 'special', 'h2');
      } else {
        body += judgmentBlock(primary, tr, 'judgment', 'h2', facingEn);
        body += imageBlock(primary, tr, 'image', 'h2', facingEn);
        if (changing.length > 0) {
          body += `<section><h2 class="layer-label">Changing lines · <span class="zh" lang="zh-Hant">爻辭</span></h2>`;
          body += changing.map((i) => lineEntry(primary, tr, i, { changing: true, facingEn })).join('');
          body += '</section>';
          body += `<p class="small soft">Every changing line is shown, without choosing among them — <a href="#/about">why, in About</a>.</p>`;
        } else {
          body += `<p class="small soft">No changing lines. The hexagram stands as it is.</p>`;
        }
      }

      if (relating) {
        // Both figures already stand at the head (spreadSide); the
        // relating texts follow the primary's under a quiet heading.
        body += `<section class="relating-section">
          <h2 class="relating-heading"><span class="rh-zhi" lang="zh-Hant">之</span> · becoming ${relating.number} <span class="rh-name" lang="zh-Hant">${escapeHtml(relating.name_zh)}</span> ${escapeHtml(relating.name_pinyin)}${relating.name_en ? ` · ${escapeHtml(relating.name_en)}` : ''}</h2>`;
        if (allChanging && !specialCase) {
          body += `<p class="question-echo small">All six lines change; the relating hexagram carries the reading.</p>`;
        }
        body += judgmentBlock(relating, tr, 'relating-judgment', 'h3', facingEn);
        body += imageBlock(relating, tr, 'relating-image', 'h3', facingEn);
        body += `<p class="small soft"><a href="${hexagramHash(relating.number)}">Read hexagram ${relating.number} in full</a></p>
        </section>`;
      }

      if (specialCase) {
        body += `<details class="quiet">
          <summary>The judgment, image, and six lines of ${escapeHtml(primary.name_pinyin)}</summary>
          ${judgmentBlock(primary, tr, 'judgment-full', 'p')}
          ${imageBlock(primary, tr, 'image-full', 'p')}
          ${changing.map((i) => lineEntry(primary, tr, i, { changing: true, anchor: false, focusable: false })).join('')}
        </details>`;
      }

      body += castRecordHtml(route, inSession ? last : null);
      body += `<div class="actions">
        <button type="button" class="btn-primary" id="cast-again">Cast again</button>
        <button type="button" class="quiet-link" id="share-button">share this reading</button>
        <a class="quiet-link" href="${hexagramHash(primary.number)}">hexagram ${primary.number} in the book</a>
        <span class="copied-note" id="share-note" role="status"></span>
      </div>`;
      body += '</div></div>';

      app.innerHTML = `<div class="view">${body}</div>`;
      bindTranslationBar(render);
      bindLineHighlight();
      bindWideRerender(routeSeq, render);
      restoreAnchor(anchor);

      document.getElementById('cast-again').addEventListener('click', () => {
        // The question clears here (PLAN.md S4); it never leaves the device.
        session.remove(S_LAST);
        session.remove(S_CAST);
        window.location.hash = '#/';
      });
      document.getElementById('share-button').addEventListener('click', async () => {
        const note = document.getElementById('share-note');
        const url = window.location.href;
        const title = `${primary.name_zh} ${primary.name_pinyin} — Yijing`;
        try {
          if (navigator.share) { await navigator.share({ title, url }); return; }
          throw new Error('no share');
        } catch (e) {
          if (e && e.name === 'AbortError') return;
          try {
            await navigator.clipboard.writeText(url);
            note.textContent = 'Link copied.';
          } catch {
            note.textContent = 'Copy the address from the address bar to share it.';
          }
        }
      });
    };
    render();
    focusHeading();
  });
}

// ----------------------------------------------------------- hexagram page
function hexagramView(number) {
  withData(() => {
    const h = DATA.byNumber.get(number);
    const render = (preservePlace = false) => {
      const anchor = preservePlace ? captureAnchor() : null;
      const tr = pickTranslation(h);
      const facingEn = facingFor([h], tr);
      setBodyTranslation(tr, facingEn);
      document.title = `${h.name_zh} ${h.name_pinyin}${h.name_en ? ` · ${h.name_en}` : ''} — Yijing 易經`;
      const prev = number > 1 ? DATA.byNumber.get(number - 1) : null;
      const next = number < 64 ? DATA.byNumber.get(number + 1) : null;

      let body = `<div class="spread">${spreadSide(h)}<div class="spread-main">`;
      body += translationBar([h], tr, facingEn);
      body += judgmentBlock(h, tr, 'judgment', 'h2', facingEn);
      body += imageBlock(h, tr, 'image', 'h2', facingEn);
      body += `<section><h2 class="layer-label">The Lines · <span class="zh" lang="zh-Hant">爻辭</span> <span class="soft">(from the bottom)</span></h2>`;
      body += [0, 1, 2, 3, 4, 5].map((i) => lineEntry(h, tr, i, { facingEn })).join('');
      if (h.texts[tr].special || (facingEn && h.texts.zh.special)) {
        const specialText = facingEn
          ? `<div class="facing-cols"><div class="facing-zh">${zhVerticalText(h.texts.zh.special)}</div><div class="facing-en">${slotText(h.texts[facingEn].special, facingEn)}</div></div>`
          : slotText(h.texts[tr].special, tr);
        body += `<article class="line-entry${facingEn ? ' facing-pair' : ''}" data-anchor="special">
          <p class="line-tag"><span class="line-tag-name zh" lang="zh-Hant">${specialLabel(number)}</span><span class="line-tag-sep" aria-hidden="true"> · </span><span class="line-tag-sub">when all six lines change</span></p>
          <div class="line-text">${specialText}</div>
        </article>`;
      }
      body += '</section></div></div>';
      body += `<nav class="prev-next" aria-label="Neighbouring hexagrams">
        ${prev ? `<a href="${hexagramHash(prev.number)}">← ${prev.number} <span class="pn-name" lang="zh-Hant">${escapeHtml(prev.name_zh)}</span> ${escapeHtml(prev.name_pinyin)}</a>` : '<span></span>'}
        ${next ? `<a class="next" href="${hexagramHash(next.number)}">${next.number} <span class="pn-name" lang="zh-Hant">${escapeHtml(next.name_zh)}</span> ${escapeHtml(next.name_pinyin)} →</a>` : '<span></span>'}
      </nav>`;

      app.innerHTML = `<div class="view">${body}</div>`;
      bindTranslationBar(render);
      bindLineHighlight();
      bindWideRerender(routeSeq, render);
      restoreAnchor(anchor);
    };
    render();
    focusHeading();
  });
}

// ----------------------------------------------------------------- library
function foldPinyin(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/v/g, 'u').replace(/[^a-z0-9\u3400-\u9fff]/g, '');
}

function libraryCell(h) {
  const preview = firstJudgmentLine(h);
  return `<a class="library-cell" href="${hexagramHash(h.number)}" aria-label="${escapeHtml(nameLabel(h))}">
      ${hexagramSVG({ bits: h.bits, plain: true })}
      <span class="num">${h.number}</span>
      <span class="name" lang="zh-Hant">${escapeHtml(h.name_zh)}</span>
      <span class="pinyin">${escapeHtml(h.name_pinyin)}</span>
      ${h.name_en ? `<span class="en">${escapeHtml(h.name_en)}</span>` : ''}
      ${preview ? `<span class="lib-preview" aria-hidden="true"${preview.id === 'zh' ? ' lang="zh-Hant"' : ''}>${escapeHtml(preview.text)}</span>` : ''}
    </a>`;
}

function trigramAxisHead(t, scope) {
  return `<th scope="${scope}" class="matrix-axis">${trigramFigure(t)}<span class="matrix-axis-name"><span lang="zh-Hant">${escapeHtml(t.name_zh)}</span> ${escapeHtml(t.name_pinyin)}</span><span class="matrix-axis-image"><span lang="zh-Hant">${escapeHtml(t.image_zh)}</span> ${IMAGE_EN[t.image_zh] || escapeHtml(t.image_pinyin)}</span></th>`;
}

function libraryMatrixHtml() {
  const { order, cells } = buildTrigramMatrix(DATA.hexagrams, DATA.trigrams);
  const head = `<tr><th class="matrix-corner"><span class="matrix-corner-upper">upper <span lang="zh-Hant">上卦</span></span><span class="matrix-corner-lower">lower <span lang="zh-Hant">下卦</span></span></th>${order.map((t) => trigramAxisHead(t, 'col')).join('')}</tr>`;
  const rows = cells.map((row, ui) => `<tr>${trigramAxisHead(order[ui], 'row')}${row.map((h) => `<td class="matrix-cell"><a href="${hexagramHash(h.number)}" aria-label="${escapeHtml(nameLabel(h))}">${hexagramSVG({ bits: h.bits, plain: true })}<span class="num">${h.number}</span><span class="name" lang="zh-Hant">${escapeHtml(h.name_zh)}</span><span class="pinyin">${escapeHtml(h.name_pinyin)}</span></a></td>`).join('')}</tr>`).join('');
  return `<div class="matrix-wrap"><table class="trigram-matrix">
    <caption class="visually-hidden">The sixty-four hexagrams by upper and lower trigram. Rows are the upper trigram, columns the lower.</caption>
    <thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
}

function libraryView() {
  withData(() => {
    document.title = 'The 64 hexagrams — Yijing 易經';
    setBodyTranslation('');
    const render = () => {
      const mode = libraryMode(local.get(L_LIBRARY), WIDE_MQ.matches);
      const grid = mode === 'trigrams'
        ? libraryMatrixHtml()
        : `<div class="library-grid">${DATA.hexagrams.map(libraryCell).join('')}</div>`;

      app.innerHTML = `<div class="view">
      <h1 class="page-title" tabindex="-1">The sixty-four hexagrams</h1>
      <p class="lede">${mode === 'trigrams' ? 'By their two trigrams — the upper down the side, the lower across the top.' : 'In King Wen order — the order of the book.'}</p>
      <div class="library-toggle" role="group" aria-label="Library arrangement">
        <button type="button" data-library-view="kingwen" aria-pressed="${mode === 'kingwen'}">King Wen order</button>
        <span class="sep" aria-hidden="true">·</span>
        <button type="button" data-library-view="trigrams" aria-pressed="${mode === 'trigrams'}">By trigrams</button>
      </div>
      <form class="jump-field" id="jump-form">
        <label for="jump">Go to a hexagram — number, pinyin, or name</label>
        <div class="row">
          <input id="jump" type="search" autocomplete="off" placeholder="29, Kan, 坎…">
          <button type="submit" class="btn-primary" style="min-height:2.9rem;padding:0.4rem 1.4rem">Go</button>
        </div>
        <p class="jump-msg" id="jump-msg" role="status"></p>
      </form>
      ${grid}
    </div>`;

      app.querySelectorAll('[data-library-view]').forEach((btn) => {
        btn.addEventListener('click', () => {
          local.set(L_LIBRARY, btn.dataset.libraryView);
          render();
          announce(btn.dataset.libraryView === 'trigrams' ? 'Hexagrams by trigrams shown.' : 'King Wen order shown.');
          const again = app.querySelector(`[data-library-view="${btn.dataset.libraryView}"]`);
          if (again) again.focus({ preventScroll: true });
        });
      });
      bindWideRerender(routeSeq, render);
      bindJump();
    };

    function bindJump() {
    document.getElementById('jump-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('jump').value.trim();
      const msg = document.getElementById('jump-msg');
      msg.textContent = '';
      if (!q) return;
      const asNumber = /^\d+$/.test(q) ? Number(q) : null;
      if (asNumber !== null && asNumber >= 1 && asNumber <= 64) {
        window.location.hash = hexagramHash(asNumber);
        return;
      }
      const fq = foldPinyin(q);
      const exact = DATA.hexagrams.filter((h) => h.name_zh === q
        || foldPinyin(h.name_pinyin) === fq
        || (h.name_en && foldPinyin(h.name_en) === fq));
      const partial = DATA.hexagrams.filter((h) => h.name_zh.includes(q)
        || foldPinyin(h.name_pinyin).includes(fq)
        || (h.name_en && foldPinyin(h.name_en).includes(fq)));
      const matches = exact.length ? exact : partial;
      if (matches.length === 1) {
        window.location.hash = hexagramHash(matches[0].number);
      } else if (matches.length > 1) {
        msg.innerHTML = 'Several match: ' + matches.map((h) => `<a href="${hexagramHash(h.number)}">${h.number} <span lang="zh-Hant">${escapeHtml(h.name_zh)}</span> ${escapeHtml(h.name_pinyin)}</a>`).join(' · ');
      } else {
        msg.textContent = `No hexagram answers to “${q}”.`;
      }
    });
    }
    render();
    focusHeading();
  });
}

// ------------------------------------------------------------------- about
async function aboutView() {
  const seq = routeSeq;
  document.title = 'About — Yijing 易經';
  setBodyTranslation('');
  try {
    const { aboutHtml } = await import('./about.js');
    if (seq !== routeSeq) return;
    app.innerHTML = aboutHtml();
  } catch {
    if (seq !== routeSeq) return;
    app.innerHTML = `<div class="view state-msg">
      <h1 class="page-title" tabindex="-1">About this book</h1>
      <p class="soft">This page could not be loaded. <a href="#/">Return to the cast</a>.</p>
    </div>`;
  }
  focusHeading();
}

// ---------------------------------------------------------------- not found
function notFoundView() {
  document.title = 'Not found — Yijing 易經';
  setBodyTranslation('');
  app.innerHTML = `<div class="view state-msg">
    <p class="big-zh" lang="zh-Hant">無</p>
    <h1 class="page-title" tabindex="-1">Nothing here</h1>
    <p class="soft">That address does not lead to a page in this book.</p>
    <p><a href="#/">Return to the cast</a> · <a href="#/library">the 64 hexagrams</a></p>
  </div>`;
  focusHeading();
}

// ------------------------------------------------------------------- router
function route() {
  const r = parseRoute(window.location.hash);
  routeSeq += 1; // invalidate any async view still loading
  castRun += 1; // cancel any cast animation in flight
  app.scrollTop = 0;
  window.scrollTo(0, 0);

  document.querySelector('main').classList.toggle('library-wide', r.name === 'library');
  document.body.classList.toggle('route-library', r.name === 'library');
  document.body.dataset.route = r.name;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === r.name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (r.name !== 'reading' && r.name !== 'hexagram') setBodyTranslation('');

  switch (r.name) {
    case 'cast': castView(); break;
    case 'reading': readingView(r); break;
    case 'hexagram': hexagramView(r.number); break;
    case 'library': libraryView(); break;
    case 'about': aboutView(); break;
    default: notFoundView();
  }
}

// Print the whole reading, including what sits inside closed <details>.
let printOpened = [];
window.addEventListener('beforeprint', () => {
  printOpened = [...app.querySelectorAll('details:not([open])')];
  printOpened.forEach((d) => { d.open = true; });
});
window.addEventListener('afterprint', () => {
  printOpened.forEach((d) => { d.open = false; });
  printOpened = [];
});

// Skip link (a <button>: a hash href would be eaten by the router).
document.getElementById('skip-link')?.addEventListener('click', () => focusHeading());

window.addEventListener('hashchange', route);
route();

