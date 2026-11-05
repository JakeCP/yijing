// Yijing 易經 — routing, views, casting interaction. Pure logic lives in engine.js.

import {
  parseRoute, castLine, cryptoRandomInt, synthesizeYarrowSplits,
  encodeReading, numberForValues, relatingNumber, bitsFromValues,
  changingIndices, isChanging, describeValue, labelFor, specialLabel,
  chineseNumeral, hexagramHash,
} from './engine.js';
import { hexagramSVG, coinSVG, stalksSVG, escapeHtml } from './render.js';

const DATA_VERSION = '1'; // bump when data/*.json changes (PLAN.md S9)
const app = document.getElementById('app');
const liveRegion = document.getElementById('live');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

// Trigram natural-image names (UI copy; data carries the characters).
const IMAGE_EN = { '天': 'heaven', '地': 'earth', '雷': 'thunder', '風': 'wind', '水': 'water', '火': 'fire', '山': 'mountain', '澤': 'lake' };

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

// ------------------------------------------------------------------ data
let DATA = null; // { hexagrams, trigrams, byNumber, trigramByName }
let loadPromise = null;
let loadFailed = false;

function loadData() {
  if (DATA) return Promise.resolve(DATA);
  if (loadPromise) return loadPromise;
  loadFailed = false;
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
    loadFailed = true;
    throw err;
  });
  return loadPromise;
}

// Texts load lazily: on idle after first paint, or on the first cast tap.
if ('requestIdleCallback' in window) window.requestIdleCallback(() => { loadData().catch(() => {}); }, { timeout: 2500 });
else window.setTimeout(() => { loadData().catch(() => {}); }, 1200);

// ------------------------------------------------------------ translation
function availableTranslations(hexagram) {
  return ['zh', 'legge', 'poem'].filter((id) => hexagram.texts[id]);
}

function defaultTranslation() {
  const saved = local.get(L_TRANSLATION);
  if (saved === 'zh' || saved === 'legge' || saved === 'poem') return saved;
  if ((navigator.language || '').toLowerCase().startsWith('zh')) return 'zh';
  // Rendering becomes the default once it exists (Phase 4); Legge until then.
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

function translationBar(hexagrams, currentId) {
  // Offer an option only when every hexagram on the page has it.
  const ids = ['zh', 'legge', 'poem'].filter((id) => hexagrams.every((h) => h.texts[id]));
  const buttons = ids.map((id) => (
    `<button type="button" data-translation="${id}" aria-pressed="${id === currentId}">${id === 'zh' ? `<span lang="zh-Hant">原文</span>` : TRANSLATION_LABELS[id]}</button>`
  )).join('<span class="sep" aria-hidden="true">·</span>');
  return `<div class="translation-bar" role="group" aria-label="Translation">${buttons}</div>`;
}

function bindTranslationBar(rerender) {
  app.querySelectorAll('[data-translation]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.translation;
      local.set(L_TRANSLATION, id);
      rerender(true); // preserve the reader's place (per-line anchors)
      const next = app.querySelector(`[data-translation="${id}"]`);
      if (next) next.focus({ preventScroll: true });
    });
  });
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

function hexaHead(h, { values = null, big = true, headingLevel = 1 } = {}) {
  const upper = DATA.trigramByName.get(h.upper);
  const lower = DATA.trigramByName.get(h.lower);
  const tag = `h${headingLevel}`;
  return `<header class="hexa-head">
    ${hexagramSVG({ bits: h.bits, values, label: nameLabel(h) })}
    <p class="hexa-number">${h.number} · <span lang="zh-Hant">第${chineseNumeral(h.number)}卦</span></p>
    <${tag} class="hexa-name"${headingLevel === 1 ? ' tabindex="-1"' : ''} lang="zh-Hant">${escapeHtml(h.name_zh)}</${tag}>
    <p class="hexa-pinyin">${escapeHtml(h.name_pinyin)}</p>
    ${h.name_en ? `<p class="hexa-en">${escapeHtml(h.name_en)}</p>` : ''}
    <p class="hexa-trigrams">${trigramPhrase(upper)} above · ${trigramPhrase(lower)} below</p>
  </header>`;
}

function slotText(lines, translation) {
  if (translation === 'poem' && lines.length > 1) {
    return `<p class="slot-text">${lines.map((l) => `<span class="verse-line">${escapeHtml(l)}</span>`).join('')}</p>`;
  }
  return lines.map((l) => `<p class="slot-text">${escapeHtml(l)}</p>`).join('');
}

function textBlock(labelHtml, lines, translation, anchor) {
  return `<section class="text-block" data-anchor="${anchor}">
    <p class="layer-label">${labelHtml}</p>
    ${slotText(lines, translation)}
  </section>`;
}

function judgmentBlock(h, tr, anchor = 'judgment') {
  return textBlock(`The Judgment · <span class="zh" lang="zh-Hant">卦辭</span>`, h.texts[tr].judgment, tr, anchor);
}
function imageBlock(h, tr, anchor = 'image') {
  return textBlock(`The Image · <span class="zh" lang="zh-Hant">大象</span> <span class="soft">(from the later <span class="zh" lang="zh-Hant">象傳</span>)</span>`, h.texts[tr].image, tr, anchor);
}

function lineEntry(h, tr, index, { changing = false, anchor = true } = {}) {
  const label = labelFor(index + 1, h.bits[index]);
  return `<article class="line-entry"${anchor ? ` data-anchor="line-${index + 1}"` : ''}>
    <p class="line-tag"><span class="zh" lang="zh-Hant">${label}</span> · line ${index + 1}${changing ? ' · <span class="changing-note">changing</span>' : ''}</p>
    ${slotText(h.texts[tr].lines[index], tr)}
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

async function withData(render) {
  if (!DATA) {
    loadingView();
    try { await loadData(); } catch { errorView(); return; }
  }
  render();
}

function announce(message) {
  liveRegion.textContent = '';
  window.setTimeout(() => { liveRegion.textContent = message; }, 40);
}

function setBodyTranslation(tr) { document.body.dataset.translation = tr; }

function delay(ms) {
  return REDUCED.matches ? Promise.resolve() : new Promise((res) => { window.setTimeout(res, ms); });
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

function castView() {
  const cast = currentCast();
  saveCast(cast);
  const started = cast.values.length > 0;
  document.title = 'Yijing 易經 — cast';

  app.innerHTML = `<div class="view cast-wrap">
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
  </div>`;

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
      figure.innerHTML = '<p class="cast-placeholder" lang="zh-Hant">未卜</p>';
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
    allBtn.disabled = animating || cast.values.length >= 6;
    button.disabled = animating;
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
      if (!quick) await delay(950);
      if (run !== castRun) return true;
      window.location.hash = encodeReading(cast.method, cast.values);
    }
    return true;
  }

  button.addEventListener('click', () => { castOne(); });
  allBtn.addEventListener('click', async () => {
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
      setBodyTranslation(tr);
      const changing = changingIndices(route.values);
      const allChanging = changing.length === 6;
      const specialCase = allChanging && (primary.number === 1 || primary.number === 2);
      const last = session.get(S_LAST);
      const inSession = last && last.code === `${route.letter}${route.values.join('')}`;

      document.title = `${primary.name_zh} ${primary.name_pinyin}${relating ? ` → ${relating.name_zh} ${relating.name_pinyin}` : ''} — Yijing 易經`;

      let body = '';
      if (inSession && last.question) {
        body += `<p class="question-echo">“${escapeHtml(last.question)}”</p>`;
      }
      body += translationBar(shown, tr);
      body += hexaHead(primary, { values: route.values });

      if (specialCase) {
        // All six changing on 1/2: 用九/用六 is the primary text (PLAN.md M9).
        body += textBlock(
          `<span class="zh" lang="zh-Hant">${specialLabel(primary.number)}</span> · when all six lines change`,
          primary.texts[tr].special, tr, 'special');
      } else {
        body += judgmentBlock(primary, tr);
        body += imageBlock(primary, tr);
        if (changing.length > 0) {
          body += `<section><p class="layer-label">Changing lines · <span class="zh" lang="zh-Hant">爻辭</span></p>`;
          body += changing.map((i) => lineEntry(primary, tr, i, { changing: true })).join('');
          body += '</section>';
          body += `<p class="small soft">Every changing line is shown, without choosing among them — <a href="#/about">why, in About</a>.</p>`;
        } else {
          body += `<p class="small soft">No changing lines. The hexagram stands as it is.</p>`;
        }
      }

      if (relating) {
        body += `<p class="relating-arrow"><span lang="zh-Hant">之</span> · <span class="relating-gloss">becoming</span><span aria-hidden="true"> ↓</span></p>`;
        body += hexaHead(relating, { headingLevel: 2 });
        if (allChanging && !specialCase) {
          body += `<p class="question-echo small">All six lines change; the relating hexagram carries the reading.</p>`;
        }
        body += judgmentBlock(relating, tr, 'relating-judgment');
        body += imageBlock(relating, tr, 'relating-image');
        body += `<p class="small soft"><a href="${hexagramHash(relating.number)}">Read hexagram ${relating.number} in full</a></p>`;
      }

      if (specialCase) {
        body += `<details class="quiet">
          <summary>The judgment, image, and six lines of ${escapeHtml(primary.name_pinyin)}</summary>
          ${judgmentBlock(primary, tr, 'judgment')}
          ${imageBlock(primary, tr, 'image')}
          ${changing.map((i) => lineEntry(primary, tr, i, { changing: true, anchor: false })).join('')}
        </details>`;
      }

      body += castRecordHtml(route, inSession ? last : null);
      body += `<div class="actions">
        <button type="button" class="btn-primary" id="cast-again">Cast again</button>
        <button type="button" class="quiet-link" id="share-button">share this reading</button>
        <a class="quiet-link" href="${hexagramHash(primary.number)}">hexagram ${primary.number} in the book</a>
        <span class="copied-note" id="share-note" role="status"></span>
      </div>`;

      app.innerHTML = `<div class="view">${body}</div>`;
      bindTranslationBar(render);
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
      setBodyTranslation(tr);
      document.title = `${h.name_zh} ${h.name_pinyin}${h.name_en ? ` · ${h.name_en}` : ''} — Yijing 易經`;
      const prev = number > 1 ? DATA.byNumber.get(number - 1) : null;
      const next = number < 64 ? DATA.byNumber.get(number + 1) : null;

      let body = translationBar([h], tr);
      body += hexaHead(h);
      body += judgmentBlock(h, tr);
      body += imageBlock(h, tr);
      body += `<section><p class="layer-label">The Lines · <span class="zh" lang="zh-Hant">爻辭</span> <span class="soft">(from the bottom)</span></p>`;
      body += [0, 1, 2, 3, 4, 5].map((i) => lineEntry(h, tr, i)).join('');
      if (h.texts[tr].special) {
        body += `<article class="line-entry" data-anchor="special">
          <p class="line-tag"><span class="zh" lang="zh-Hant">${specialLabel(number)}</span> · when all six lines change</p>
          ${slotText(h.texts[tr].special, tr)}
        </article>`;
      }
      body += '</section>';
      body += `<nav class="prev-next" aria-label="Neighbouring hexagrams">
        ${prev ? `<a href="${hexagramHash(prev.number)}">← ${prev.number} <span class="pn-name" lang="zh-Hant">${escapeHtml(prev.name_zh)}</span> ${escapeHtml(prev.name_pinyin)}</a>` : '<span></span>'}
        ${next ? `<a class="next" href="${hexagramHash(next.number)}">${next.number} <span class="pn-name" lang="zh-Hant">${escapeHtml(next.name_zh)}</span> ${escapeHtml(next.name_pinyin)} →</a>` : '<span></span>'}
      </nav>`;

      app.innerHTML = `<div class="view">${body}</div>`;
      bindTranslationBar(render);
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

function libraryView() {
  withData(() => {
    document.title = 'The 64 hexagrams — Yijing 易經';
    setBodyTranslation('');
    const cells = DATA.hexagrams.map((h) => `<a class="library-cell" href="${hexagramHash(h.number)}" aria-label="${escapeHtml(nameLabel(h))}">
      ${hexagramSVG({ bits: h.bits, plain: true })}
      <span class="num">${h.number}</span>
      <span class="name" lang="zh-Hant">${escapeHtml(h.name_zh)}</span>
      <span class="pinyin">${escapeHtml(h.name_pinyin)}</span>
      ${h.name_en ? `<span class="en">${escapeHtml(h.name_en)}</span>` : ''}
    </a>`).join('');

    app.innerHTML = `<div class="view">
      <h1 class="page-title" tabindex="-1">The sixty-four hexagrams</h1>
      <p class="lede">In King Wen order — the order of the book.</p>
      <form class="jump-field" id="jump-form">
        <label for="jump">Go to a hexagram — number, pinyin, or name</label>
        <div class="row">
          <input id="jump" type="search" autocomplete="off" placeholder="29, Kan, 坎…">
          <button type="submit" class="btn-primary" style="min-height:2.9rem;padding:0.4rem 1.4rem">Go</button>
        </div>
        <p class="jump-msg" id="jump-msg" role="status"></p>
      </form>
      <div class="library-grid">${cells}</div>
    </div>`;

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
    focusHeading();
  });
}

// ------------------------------------------------------------------- about
function aboutView() {
  document.title = 'About — Yijing 易經';
  setBodyTranslation('');
  app.innerHTML = `<div class="view about-body">
    <h1 class="page-title" tabindex="-1">About this book</h1>
    <p class="lede">A quiet Yijing <span lang="zh-Hant">易經</span> — the Book of Changes — for the web.
    No accounts, no advertisements, no tracking: casting happens entirely on your device.</p>

    <h2>What the Yijing is</h2>
    <p>The Yijing is one of the oldest books in the world: a divination manual built from
    sixty-four hexagrams — figures of six broken (<span lang="zh-Hant">陰</span>) and unbroken
    (<span lang="zh-Hant">陽</span>) lines. A cast is made line by line, from the bottom up. Some
    lines are “old” — about to change into their opposite — and flipping those gives a second,
    relating hexagram (<span lang="zh-Hant">之卦</span>, zhī guà), the shape the moment is turning into.</p>
    <p>The book was not written at once. Its layers are labelled honestly on every page here:</p>
    <table>
      <tr><th scope="row">The Judgment <span lang="zh-Hant">卦辭</span> and the Lines <span lang="zh-Hant">爻辭</span></th>
          <td>The Zhou core, roughly 9th–8th century BCE. Terse oracular statements.</td></tr>
      <tr><th scope="row">The Image <span lang="zh-Hant">大象</span></th>
          <td>From the <span lang="zh-Hant">象傳</span>, one of the “Ten Wings” — commentaries added centuries
          later (Warring States to Han). Moral reflections on each figure.</td></tr>
      <tr><th scope="row"><span lang="zh-Hant">用九</span> / <span lang="zh-Hant">用六</span></th>
          <td>Seventh statements for hexagrams 1 and 2 only, read when all six lines change.</td></tr>
    </table>
    <p>This site is offered <em>for reflection</em> — a way of sitting with a question and an
    old image for a while. It is not advice, and it does not predict the future. For decisions
    about health, money, or law, please talk to a person qualified to help.</p>

    <h2>How casting works here</h2>
    <p>Each line is one of four values: 6 old yin (changing), 7 young yang, 8 young yin,
    9 old yang (changing).</p>
    <table>
      <tr><th scope="row">Three coins</th>
          <td>Character side counts 3, blank side 2. The three coins sum to 6, 7, 8, or 9
          with chances 1/8, 3/8, 3/8, 1/8.</td></tr>
      <tr><th scope="row">Yarrow stalks</th>
          <td>Forty-nine stalks are divided and counted off three times (“the three changes”);
          what remains — 36, 32, 28, or 24 — is divided by four. This site samples
          <em>the conventional yarrow odds</em> directly: 1/16, 5/16, 7/16, 3/16 for 6, 7, 8, 9.
          When a division is shown, it is a true division consistent with the numbers drawn.</td></tr>
      <tr><th scope="row">By hand</th>
          <td>Cast with real coins or stalks, then enter the six numbers on the cast page.</td></tr>
    </table>
    <p>Randomness comes from your browser’s cryptographic generator. When several lines
    change, older commentators gave rules for choosing among them; this site shows every
    changing line equally and lets you weigh them. If all six lines change in hexagram 1 or 2,
    the special <span lang="zh-Hant">用九</span> / <span lang="zh-Hant">用六</span> statement is the primary text.</p>
    <p>Every reading has its own address, like <code>#/r/c789876</code>: the letter is the
    method (<code>c</code> coins, <code>y</code> yarrow, <code>m</code> by hand) and the six
    digits are the line values from the bottom. A reading can be shared by sharing that link.
    Your question is never in the link and never leaves your device — it is kept only for this
    visit and is cleared when you cast again.</p>

    <h2>Sources &amp; licences</h2>
    <table>
      <tr><th scope="row"><span lang="zh-Hant">原文</span> — the Chinese text</th>
          <td>The received <span lang="zh-Hant">易經</span> (Zhou core and <span lang="zh-Hant">大象傳</span>),
          via Project Gutenberg #25501, collated against zh Wikisource. Public domain.</td></tr>
      <tr><th scope="row">James Legge (1882)</th>
          <td><em>Sacred Books of the East</em> vol. 16, first edition (Oxford, 1882), transcribed
          from Internet Archive page scans. Legge’s parentheses are his supplied wording,
          kept verbatim. Public domain.</td></tr>
      <tr><th scope="row">A rendering</th>
          <td>A new poetic rendering is being written for this site; until it arrives,
          Legge is the default English text and hexagrams are named in Chinese and pinyin.
          The rendering will be © the site authors, CC BY 4.0.</td></tr>
      <tr><th scope="row">Type</th>
          <td>EB Garamond and Noto Serif TC, self-hosted subsets under the SIL Open Font
          License 1.1 (licence files ship with the fonts). This page makes no requests
          to third parties at all.</td></tr>
      <tr><th scope="row">Code &amp; seal</th>
          <td>Site code is MIT (see <code>LICENSE</code>); the seal mark is CC BY 4.0
          (see <code>LICENSE-content.md</code>).</td></tr>
    </table>

    <hr class="rule">
    <p class="small soft" style="text-align:center"><span lang="zh-Hant">卜以決疑</span> — “to cast is to settle a doubt,”
    and then to sit with what comes for a while.</p>
  </div>`;
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
const NAV_ROUTES = { cast: '#/', library: '#/library', about: '#/about' };

function route() {
  const r = parseRoute(window.location.hash);
  castRun += 1; // cancel any cast animation in flight
  app.scrollTop = 0;
  window.scrollTo(0, 0);

  document.querySelector('main').classList.toggle('library-wide', r.name === 'library');
  document.body.classList.toggle('route-library', r.name === 'library');
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

window.addEventListener('hashchange', route);
route();

