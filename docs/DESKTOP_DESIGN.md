# Desktop design — opening the book

Branch `desktop-design`. Companion to the lead's screenshot pass: what the
wide layouts are, where the code lives, and exactly which states to shoot.

## Concept

On a phone the site is a single quiet column; on a wide screen that column
used to float in an empty page. Now, at **≥1024px** the page becomes a
book: a ruled running head, two-part compositions, text set against a
figure in the margin. At **≥1280px** the book opens further — most
distinctively *facing pages*, the Chinese set vertically facing the
English. Nothing got busier; the same whitespace is simply inhabited:
paper you can feel, a landscape at the foot of the cast page, names set
large like a title page.

Below 1024px the layout, order, and tab sequence are the site as it was
(one exception, on purpose: the paper grain and vignette live at every
size, and the sixth line now "arrives" everywhere — see Cast).

## Atmosphere (all sizes, subtle)

- **Paper grain** — one 160×160 sparse-speckle PNG (3,277 bytes),
  generated once (seeded Python, stdlib only), embedded as a data URI in
  [css/style.css](../css/style.css) (`body::after`, fixed, pointer-events
  none). No runtime SVG filters anywhere. Dark mode inverts the same
  tile (`filter: invert(1)`, lower opacity): pale dust on an ink-stone,
  not a negative of the paper.
- **Vignette** — a fixed radial gradient on `body`, 7% ink at the edges.
- **Ink-wash landscape** — hand-placed SVG ridges/water/moon
  (`INK_WASH` in [js/app.js](../js/app.js)), `currentColor` at 5–13%
  opacity, fixed to the bottom edge of the cast page only, ≥1024px.
  Dark mode needs no second asset: `--ink` is pale there, so the wash
  inverts with the palette; the moon keeps the cinnabar token (which
  itself switches per scheme).

New decorative transfer: grain ≈3.3 KB (inside the CSS gzip) + wash
≈0.7 KB gzip (inside app.js) + Noto subset +708 B for 太極 — well under
the 60 KB budget. Full re-measured table in the
[README](../README.md#performance-measured-phase-5).

## Per page

### Cast `#/` (≥1024px)

Two-part grid (`.cast-layout`). Left, sticky, behind a hairline: the
title slip 題簽 — 易經 set vertically inside a double-ruled frame —
beside the 繫辭上 passage 易有太極，是生兩儀，兩儀生四象，四象生八卦。
in `writing-mode: vertical-rl` (upright glyphs, soft ink), a source
line, and a quiet English gloss beneath. Right: the ritual as before,
larger — title 4.6rem, forming hexagram 13rem, coins 4.4rem, stalks
6.6rem, a wider cast button.

DOM order is ritual first, passage second (grid places it left), so
screen readers meet the task before the epigraph; the passage itself is
one `<p lang="zh-Hant">` in sentence order.

**Sixth line arrival (all sizes):** after line six, before navigating,
an ink disc spreads (`.arrival-ink`, radial gradient scale, 1.5s) and
the hexagram's number/name/pinyin/English name fade in inside it;
`aria-live` announces the name; then the reading opens (~1.75s total;
`cast all six` still goes straight through; reduced motion keeps only
the short naming beat).

### Reading `#/r/…` and hexagram `#/h/…` (≥1024px)

A book spread (`.spread`): left, a sticky figure column — the hexagram
large (12.5rem, 14rem at ≥1280px), name at 4.3rem with pinyin and
English name, then, under a double rule, the two trigrams each with its
drawn figure, name, pinyin, and image （天 heaven…); on readings, the
relating hexagram miniature linked to its page. Right: the text.

**Trigram symbols are drawn, not typed.** Neither OFL source font
carries U+2630–U+2637 (☰–☷) — verified against the full EB Garamond
and Noto Serif TC fonts — so `trigramFigure()` in
[js/render.js](../js/render.js) draws the three lines as SVG, exactly as
coins already draw their inscriptions. The font check now *fails* if a
trigram literal ever reaches the rendered source.

**Marginalia:** each line's label （初九 · line 1) sits in a right-aligned
margin column; changing lines carry a cinnabar tick there (colour is
never the only signal — the word "changing" remains). Hovering or
focusing a line of the figure lights its text in a faint cinnabar wash
and vice versa (figure lines become keyboard-focusable only at this
width; `bindLineHighlight` in app.js).

**Facing pages (≥1280px only):** a *Facing pages* toggle joins the
translation selector (`localStorage: yi-facing`). Each judgment, image,
and line is then set as a small opening: English (the chosen Rendering
or Legge) on the left-hand page, the 原文 on the right in
`vertical-rl`, separated by a gutter rule, on a faint washed ground.
DOM order stays Chinese first per block. Choosing 原文 as the
translation pairs it with the Rendering. The mode is gated in JS
(`facingActive`, [js/book.js](../js/book.js)) as well as CSS, so a
stored "on" can never leak the paired layout onto a narrow screen;
crossing the width re-renders in place. Print drops the Chinese page
and prints the single English text, as before.

### Library `#/library` (≥1024px)

The King Wen grid opens out (to 82–88rem): figures 4.4–5rem, larger
names, `name_en` as before, and hovering or focusing a cell fades in
the first line of that hexagram's judgment in the Rendering (space is
reserved, so rows never jump; the preview is `aria-hidden` — the link's
name is unchanged).

A second arrangement, **By trigrams** (toggle hidden below 1024px,
choice kept in `localStorage: yi-library-view`): the full 8×8 matrix as
a real `<table>` — rows the upper trigram 上卦， columns the lower 下卦，
axes headed by drawn trigram figures with names and images, each cell a
linked hexagram. The matrix is built by the pure `buildTrigramMatrix`
in book.js and unit-tested against all 64 (including 11 泰 / 12 否 as
transposed neighbours).

### Typography & frame (≥1024px)

Body steps up to 1.1875rem with a proper scale over it (page titles
2.5rem, hexagram names 4.3rem…); the top bar gains a hairline so every
wide page reads as a running head over a ruled sheet. Section labels
(*The Judgment · 卦辭…*) switch from italic to true small caps —
EB Garamond's `smcp` feature survives subsetting
(`--layout-features=*`), now asserted by the font check; Chinese label
characters stay full size. All new motion (ink spread, preview fades)
sits behind `prefers-reduced-motion: no-preference` *and* the existing
global reduce kill-switch.

### Fonts

[scripts/build-fonts.py](../scripts/build-fonts.py): the scan now also
covers `js/about.js` and `js/book.js`; the 繫辭 passage is named
explicitly (`VERTICAL_PASSAGE`) as well as scanned; the check asserts
the trigram-drawn-not-typed rule and EB Garamond `smcp`. Subsets were
rebuilt: Noto 375,788 → 376,496 B （太極 join 934 covered characters);
both EB Garamond files came out byte-identical.

## What did not change

`data/` untouched; routes, casting odds, storage lifecycle untouched;
mobile DOM order and tab order untouched (desktop focusables — figure
lines, line texts, both new toggles — are rendered or revealed only at
their widths). New pure logic is isolated in `js/book.js`
(matrix/preview/facing choices) with tests in `tests/book.test.js`;
`tests/render.test.js` grew trigram/interactive-figure tests.

## Screenshot checklist for the lead

Serve from repo root (`python3 -m http.server 8000`). Capture each in
light *and* dark unless noted. Suggested names under
`scripts/.cache/after/`.

### Cast `#/`

- [ ] 1440×900, untouched — passage + slip left, ritual right, wash at foot
- [ ] 1024×768 — grid at its tightest; passage must not crowd the ritual
- [ ] 1440, after 3 coin casts — large forming hexagram, big coins
- [ ] 1440, after 2 yarrow casts — stalk bundle scale
- [ ] 1440, the sixth-line arrival (cast 6th line singly; shoot fast,
      ~1.75s window — or set emulated reduced-motion **off** and catch
      the ink spread mid-name)
- [ ] 375×812 — mobile regression check (aside/wash absent, arrival
      present after line 6)
- [ ] 1440 dark — ink-stone grain, pale wash

### Reading `#/r/c789876` (has changing lines + relating) and one still cast, e.g. `#/r/c777777`

- [ ] 1440 top — sticky figure, trigram rows, relating miniature
- [ ] 1440 scrolled mid-lines — figure stays, marginalia + cinnabar tick
- [ ] 1440 hovering line 3 of the figure (text lights) and hovering a
      line text (figure line lights) — two shots
- [ ] 1440 with 原文 selected; with Legge selected
- [ ] 1280+ *Facing pages* on — judgment opening; a line opening; then
      toggle off again
- [ ] 1024 — spread without facing toggle visible
- [ ] 375 — centred column unchanged
- [ ] Print preview (1440, facing on) — single column, no grain/wash

### Hexagram `#/h/29` and `#/h/1` （用九）

- [ ] 1440 top + scrolled to lines 4–6
- [ ] Keyboard: Tab to a figure line — visible focus + lit text
- [ ] 1280+ facing on `#/h/1` including the 用九 block at the foot
- [ ] 375 regression check

### Library `#/library`

- [ ] 1440 King Wen order, top rows
- [ ] 1440 hovering a cell (judgment preview faded in) + one with
      keyboard focus on a cell
- [ ] 1440 *By trigrams* — whole matrix (tall shot) + axis headers legible
- [ ] 1024 matrix (horizontal scroll affordance)
- [ ] 375 — 4-wide grid, **no** arrangement toggle, no previews
- [ ] 1440 dark, both arrangements

### Motion / a11y spot checks (no shots needed)

- [ ] Emulated `prefers-reduced-motion: reduce`: no ink spread growth,
      no preview fades, cast still names line six and moves on
- [ ] Narrow the window 1440 → 900 mid-reading with facing on: paired
      pages hand back to the single column without losing place
