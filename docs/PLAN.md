# Yijing 易經 — Plan

A beautiful, quiet, ad-free Yijing (I Ching) for the web. Cast with three coins or yarrow
stalks, receive the hexagram as a poem, in several translations and the original Chinese.
Hosted as a static site on GitHub Pages.

## Principles

1. **Beauty and stillness over features.** Every element must earn its place. No ads, no
   trackers, no analytics, no cookie banners, no social widgets.
2. **Mobile first.** Designed at 375px wide first, then scaled up. Thumb-reachable controls.
3. **Static, no build step.** Plain HTML + CSS + ES modules. Opens from `index.html` served by
   any static server; deploys to GitHub Pages from the repo root. Node is used only for
   dev scripts (data build, tests), never required to serve.
4. **Correct.** Correct probabilities, correct texts, correct hexagram/trigram mapping.
5. **Legally clean.** Only public-domain sources plus our own original writing.

## Texts / translations

| id      | label               | source                                         | status        |
|---------|---------------------|------------------------------------------------|---------------|
| `zh`    | 原文 Chinese         | Received text of the Zhouyi (Wikisource 周易 / ctext.org) | public domain |
| `legge` | James Legge (1882)  | Sacred Books of the East vol. 16 (sacred-texts.com) | public domain |
| `poem`  | A rendering         | New, original poetic rendering written for this site | ours (CC BY 4.0) |

Do NOT use Wilhelm/Baynes, Hinton, Huang, Ritsema/Karcher, Lynn, Rutt, Minford — all in copyright.

Per hexagram, store: King Wen number, Chinese name, pinyin (with tones), English name,
6-bit line pattern (bottom→top), lower/upper trigram, judgment 卦辭, image 象 (大象),
the six line statements 爻辭 (with their labels 初九/六二/… ), and 用九 / 用六 for hexagrams 1 and 2.
Legge's judgment/image/lines map onto the same slots. Legge's Commentary (Tuan/Xiang
appendices) is optional; include the Great Image (大象) only.

Pinyin for the Chinese text is a stretch goal (toggle), generated once at build time and
stored; not computed at runtime.

The `poem` rendering: spare, modern, imagistic, faithful to the Chinese (not to Legge's
Victorian glosses). Consistent voice across all 64. Each hexagram gets: a short title,
judgment as a few lines of verse, image as 2–4 lines, each moving line as 1–4 lines.
No mysticism-industry clichés ("the universe wants you to…"), no advice-column tone.

## Data

- `data/hexagrams.json` — array of 64 objects (schema in `scripts/schema.md`).
- `data/trigrams.json` — the 8 trigrams (symbol, name zh/pinyin/en, image, bits).
- Build scripts in `scripts/` fetch and parse sources into JSON; raw downloads cached in
  `scripts/.cache/` (gitignored). The committed JSON is the source of truth for the site.
- `scripts/validate.mjs` checks: 64 entries; numbers 1–64 unique; 64 unique bit patterns;
  bits consistent with trigrams; 6 lines each with correct 九/六 labels matching the bits
  (yang line ⇒ 九, yin line ⇒ 六; positions 初二三四五上); hexagrams 1 & 2 have 用九/用六;
  every translation has every slot non-empty.

## Casting

Randomness: `crypto.getRandomValues` only (unbiased integer helper, rejection sampling).

- **Three coins:** each coin heads=3 / tails=2; sum 6/7/8/9.
  P(6)=1/8, P(7)=3/8, P(8)=3/8, P(9)=1/8.
- **Yarrow stalks:** simulate the actual procedure: 50 stalks, set one aside, 49 divided into
  two heaps at a random point, one taken from the right and placed between fingers, count off
  each heap by fours, remainders, three changes per line → 6/7/8/9.
  Must yield P(6)=1/16, P(7)=5/16, P(8)=7/16, P(9)=3/16. (Division point uniform over a
  sensible range, e.g. each heap ≥ 1.)
- 6 = old yin (changing), 7 = young yang, 8 = young yin, 9 = old yang (changing).
- Lines are cast bottom → top. Primary hexagram from all six; relating hexagram 之卦 flips the
  changing lines. No changing lines ⇒ no relating hexagram.
- Reading shown: primary judgment + image, every changing line's text (highlighted), then the
  relating hexagram's judgment + image. Special case: all six changing on 1 or 2 ⇒ show 用九/用六.
  (Keep it simple: show all changing lines; don't apply Zhu Xi's selection rules, but the About
  page may mention them.)
- Engine is pure, DOM-free, in `js/engine.js`, with Node tests in `tests/` (`node --test`),
  including chi-square distribution tests for both methods over ≥ 200k samples, and an
  exhaustive check that yarrow's procedure gives exactly the expected distribution
  (enumerate or compute analytically).

## Site structure (hash routing, single page)

- `#/` — **Cast.** Near-empty page. Small title 易. Optional input "Hold your question in mind"
  (never leaves the device). Choose Coins / Yarrow. Then tap (or Space/Enter) once per line;
  each line inks in from the bottom up with the coin faces or stalk counts shown briefly.
  A subtle "cast all six" link for the impatient.
- `#/r/{six digits}` — **Reading**, e.g. `#/r/789876` (bottom→top digits 6–9). Fully
  reconstructable from the URL, so readings are shareable/bookmarkable. Question is not in URL.
- `#/h/{n}` — **Hexagram** page for browsing (1–64).
- `#/library` — grid of the 64, in King Wen order, with optional trigram arrangement view.
- `#/about` — what the Yijing is (briefly), how casting works, sources and licenses.

Translation selector: a small, unobtrusive control (e.g. `原文 · Legge · Rendering`) at the top
of reading/hexagram pages; selection remembered in `localStorage` (wrapped in try/catch).
On wide screens (≥ 960px) allow two columns: Chinese beside a chosen translation.

## Design

- **Mood:** ink on paper. Lots of whitespace. A page you could look at for a minute in silence.
- **Palette (CSS custom properties on `:root`):** paper `#f4efe6`-ish warm off-white,
  ink near-black `#1d1b19`, soft ink grey for secondary text, one accent: cinnabar seal red
  `#b23a2b`-ish used sparingly (changing lines, the seal). Dark mode via
  `prefers-color-scheme` plus a manual toggle: deep ink `#121110` with paper-coloured text.
- **Type:** Latin — EB Garamond or Cormorant Garamond (Google Fonts). Chinese — Noto Serif SC
  (Google Fonts serves unicode-range slices) or LXGW WenKai. Generous line-height, measure
  ~34em max. Hexagram names in large Chinese characters.
- **Hexagram drawing:** SVG lines with a slight brush texture (SVG filter or subtle
  irregular path), not flat rectangles. Changing lines marked with a small red ○ (old yang) or
  × (old yin) — or a red tint — tastefully.
- **Motion:** slow fades and ink-spread; coin flip ≈ 600ms; respect `prefers-reduced-motion`.
- **No chrome:** no heavy header/footer. A tiny nav (易 · Library · About) that stays out of the way.
- Accessible: semantic HTML, focus states, aria-live for cast results, contrast ≥ AA,
  hexagram SVG has text alternative ("Hexagram 3, Zhun, Difficulty at the Beginning").
- Performance: total JS small (< 40KB unminified excluding data), JSON loaded once,
  fonts with `display=swap`. Lighthouse mobile ≥ 95 performance/accessibility.

## File layout

```
index.html
css/style.css
js/app.js        # routing, views, DOM
js/engine.js     # pure casting + hexagram logic
js/render.js     # SVG hexagram drawing
data/hexagrams.json
data/trigrams.json
scripts/         # build/validate (Node, dev only)
tests/           # node --test
docs/PLAN.md
README.md
LICENSE          # code MIT; poem rendering CC BY 4.0; source texts public domain
```

## Phases (each ends with a git commit and a review)

1. **Data** — build + validate `hexagrams.json` with `zh` and `legge`. Spot-check hexagrams
   1, 2, 3, 29, 63, 64 against sources.
2. **Engine + tests** — casting, mapping, relating hexagram, URL encoding; tests green.
3. **UI + design** — all routes, casting interaction, reading view, library, about; light/dark;
   mobile-first. Screenshots at 375px and 1280px reviewed.
4. **Poem rendering** — written in batches of 8 hexagrams, reviewed against the Chinese.
5. **Polish** — a11y pass, reduced motion, keyboard, performance, README, GitHub Pages notes.

## Out of scope (for now)

Reading journal/history, PWA/offline, accounts, interpretations beyond the texts themselves.
