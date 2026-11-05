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

Below 1024px the site stays a single quiet column. Readings with
changing lines are the one deliberate exception to the old order at
every size: both figures stand together at the head, then the primary
texts, then the relating texts (see Reading). The paper grain and
vignette live at every size, and the sixth line "arrives" everywhere.

## Atmosphere (all sizes, subtle)

- **Paper grain** — one 160×160 sparse-speckle PNG (3,277 bytes),
  generated once (seeded Python, stdlib only), embedded as a data URI in
  [css/style.css](../css/style.css) (`body::after`, fixed, pointer-events
  none). No runtime SVG filters anywhere. Dark mode inverts the same
  tile (`filter: invert(1)`, lower opacity): pale dust on an ink-stone,
  not a negative of the paper.
- **Vignette** — a radial gradient (7% ink at the edges) on
  `body::before`, a fixed full-viewport layer like the grain, so both
  cover the window at every scroll position with no seam. (A
  full-page screenshot still shows them once, at viewport height —
  that is the capture, not the page.)
- **Ink-wash landscape** — hand-placed SVG ridges/water/sun
  (`INK_WASH` in [js/app.js](../js/app.js)), `currentColor` at
  2.8–7% opacity (the small cinnabar sun at 10%), in its own reserved
  band below the cast ritual — never under a control — and masked on
  every edge so it dissolves into the paper. Desktop cast page only.
  Dark mode needs no second asset: `--ink` is pale there, so the wash
  inverts with the palette.

New decorative transfer: grain ≈3.3 KB (inside the CSS gzip) + wash
≈0.7 KB gzip (inside app.js) + Noto subset +708 B for 太極 — well under
the 60 KB budget. Full re-measured table in the
[README](../README.md#performance-measured-phase-5).

## Per page

### Cast `#/` (≥1024px)

Two-part grid (`.cast-layout`). Left, sticky, behind a hairline: the
title slip 題簽 — 易經 set vertically inside a double-ruled frame —
beside the 繫辭上 passage in `writing-mode: vertical-rl` (upright
glyphs, soft ink), a source line, and a quiet English gloss beneath.
The passage is two deliberate columns broken at the phrase boundary
（易有太極，是生兩儀， / 兩儀生四象，四象生八卦。); a column never wraps,
so nothing orphans. Right: the ritual as before, larger — title
4.6rem, forming hexagram 10.5rem, coins 3.9rem, stalks 6.6rem, a
wider cast button. The stage (18rem reserved) is sized so **Cast the
coins stands above the fold at 1440×900 before casting**; at
≤880px window height the ritual compacts further (title 3.5rem,
stage 15rem, figure 9.2rem) so the same holds at 1280×800. The
ink-wash band follows the whole layout, below the hand-cast entry.

DOM order is ritual first, passage second (grid places it left), so
screen readers meet the task before the epigraph; the passage itself
is one `<p lang="zh-Hant">` whose two column spans stay in sentence
order.

**Sixth line arrival (all sizes):** after line six, before navigating,
an ink disc spreads (`.arrival-ink`, radial gradient scale, 1.5s) and
the hexagram's number/name/pinyin/English name fade in inside it;
`aria-live` announces the name; then the reading opens (~1.75s total;
`cast all six` still goes straight through; reduced motion keeps only
the short naming beat).

### Reading `#/r/…` and hexagram `#/h/…` (≥1024px)

A book spread (`.spread`): left, a sticky figure column; right, the
text. A single hexagram stands large (12.5rem, 14rem at ≥1280px),
name at 4.3rem with pinyin and English name, then, under a double
rule, the two trigrams each with its drawn figure, name, pinyin, and
image （天 heaven…).

**Reading order (every size).** When lines change, *both* figures
come first, before any text: primary → 之 → relating, changing lines
marked on the primary. On desktop the sticky column stacks them —
primary (11rem, 12rem at ≥1280px; name 3.6rem) with its names,
trigram phrase, and trigram rows, then 之 · becoming under a double
rule, then the relating figure at 75% size, brushed like the primary
and a touch lighter, linked to its page. On narrow screens the two
figures sit side by side at reduced size with 之 between and their
names beneath each. The texts follow in one order everywhere:
primary judgment, image, and changing lines; then a section break
and a quiet heading — *之 · becoming 31 咸 Xián · Feeling* — over the
relating judgment and image. No large relating figure appears
mid-text. When nothing changes, there is just the single hexagram,
as before. Everything of the reading — including *The cast, line by
line* and the Cast again / share row — stays inside the text column
(`.spread-main`) on desktop.

**Trigram symbols are drawn, not typed.** Neither OFL source font
carries U+2630–U+2637 (☰–☷) — verified against the full EB Garamond
and Noto Serif TC fonts — so `trigramFigure()` in
[js/render.js](../js/render.js) draws the three lines as SVG, exactly as
coins already draw their inscriptions. The font check now *fails* if a
trigram literal ever reaches the rendered source.

**Marginalia:** each line's label sits in a right-aligned margin
column as two clean lines — 初九 large, then *line 1 · changing*
beneath (on narrow screens the same label reads inline, as before).
Changing lines carry a cinnabar tick there (colour is never the only
signal — the word "changing" remains). Hovering or focusing a line
of the primary figure lights its text in a faint cinnabar wash and
vice versa; the relating figure never lights the texts (figure lines
become keyboard-focusable only at this width; `bindLineHighlight` in
app.js binds the interactive primary only).

**Facing pages (≥1280px only):** a *Facing pages* toggle joins the
translation selector (`localStorage: yi-facing`). Each judgment, image,
and line is then set as a small opening: English (the chosen Rendering
or Legge) on the left-hand page, the 原文 on the right in
`vertical-rl`, separated by a gutter rule, on a faint washed ground.
DOM order stays Chinese first per block, and the reading order above
is unchanged: the relating judgment and image are facing pairs under
their 之 · becoming heading. Choosing 原文 as the
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

`data/` untouched; routes, casting odds, storage lifecycle untouched.
The reading order above is the one intentional order change at every
size (on a phone the relating figure and its link now stand at the
head, beside the primary). Desktop focusables — figure lines, line
texts, both toggles — are still rendered or revealed only at their
widths. New pure logic is isolated in `js/book.js`
(matrix/preview/facing choices) with tests in `tests/book.test.js`;
`tests/render.test.js` covers trigram/interactive figures, the
brush-by-default rule, and the reading's section order.

## Screenshot checklist for the lead

Serve from repo root (`python3 -m http.server 8000`). Capture each in
light *and* dark unless noted. Suggested names under
`scripts/.cache/after/`.

### Cast `#/`

- [ ] 1440×900, untouched — two-column passage + slip left, ritual
      right, **Cast the coins above the fold**; then scrolled to the
      foot — the wash alone in its band below the hand-cast entry,
      edges dissolved, nothing under it
- [ ] 1280×800, untouched — cast button still above the fold
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

- [ ] 1440 top — sticky column holds **both** brushed figures
      (primary, trigram rows, 之 · becoming, relating at 75%)
- [ ] 1440 scrolled mid-lines — figures stay, two-line marginalia +
      cinnabar tick; relating texts under their 之 · becoming heading,
      no figure mid-text
- [ ] 1440 foot — *The cast, line by line* and the action row inside
      the text column, not full width
- [ ] 1440 hovering line 3 of the figure (text lights) and hovering a
      line text (figure line lights) — two shots
- [ ] 1440 with 原文 selected; with Legge selected
- [ ] 1280+ *Facing pages* on — judgment opening; a line opening; then
      toggle off again
- [ ] 1024 — spread without facing toggle visible
- [ ] 375 — both figures side by side at the top, 之 between, names
      under each; texts in the same order; still cast: single figure
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
