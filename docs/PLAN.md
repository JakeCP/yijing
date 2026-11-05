# Yijing 易經 — Plan

A beautiful, quiet, ad-free Yijing (I Ching) for the web. Cast with three coins or yarrow
stalks, receive the hexagram as a poem, in several translations and the original Chinese.
Hosted as a static site on GitHub Pages.

This plan is the spec. It incorporates [PLAN_REVIEW.md](PLAN_REVIEW.md) as decided in
[DECISIONS.md](DECISIONS.md) (Must-fix M1–M15, Should-consider S1–S11, Nitpicks N1–N7).
The data contract lives in [SCHEMA.md](SCHEMA.md); the Phase 1 source report lives in
[COLLATION.md](COLLATION.md).

## Principles

1. **Beauty and stillness over features.** Every element must earn its place. No ads, no
   trackers, no analytics, no cookie banners, no social widgets — and no third-party
   requests at all (fonts are self-hosted; see Design).
2. **Mobile first.** Designed at 375px wide first, then scaled up. Thumb-reachable controls.
3. **Static, no build step to serve.** Plain HTML + CSS + ES modules, served by any static
   server from the repo root; deploys to GitHub Pages. `file://` will not work (ES modules
   and JSON `fetch` need a server) — the README gives a serve command. Node is used only
   for dev scripts (data build, validation, engine tests).
4. **Correct.** Correct probabilities, correct texts, correct hexagram/trigram mapping.
5. **Legally clean.** Only public-domain sources plus our own original writing. Per-source
   terms are in the licence table below.

## Texts / translations

| id | label | source of record | status |
|---|---|---|---|
| `zh` | 原文 Chinese | Received 易經 text (周易 core + 大象傳): [Project Gutenberg #25501](https://www.gutenberg.org/ebooks/25501), collated against zh Wikisource 周易 | public domain (see licence table) |
| `legge` | James Legge (1882) | *Sacred Books of the East* vol. 16, 1st ed. (Oxford: Clarendon Press, 1882), Internet Archive item `I-Ching` DjVu text; en Wikisource collation for hexagrams 1–32 (Text only) | public domain |
| `poem` | A rendering | New, original poetic rendering written for this site (Phase 4) | ours (CC BY 4.0) |

Do NOT use the Wilhelm/Baynes English (1950), Hinton, Huang, Ritsema/Karcher, Lynn,
Rutt, or Minford — all in copyright (N6).

Notes on sources (M5, M6, N1):

- `ctext.org` and `sacred-texts.com` are **not** build sources (bot protection; terms).
  They may be used by a human in a browser for spot-checks only.
- Chinese base text is Gutenberg #25501 with Project Gutenberg branding stripped.
  Canonical script is **traditional**. Gutenberg's modern editorial punctuation is kept,
  normalized only for whitespace/line-joining consistency (the received text itself is
  unpunctuated). zh Wikisource is collation only, which also keeps the JSON free of
  CC BY-SA encumbrance (M14).
- Legge's edition of record is **1882** (the `I-Ching` scan's title page). Never mix
  editions mid-corpus. Legge's parentheses are his supplied wording and are retained
  verbatim. Legge is parsed by order/sequence only, never by name (乾 and 謙 are both
  headed "The *Kh*ien Hexagram").
- Every download is pinned in `scripts/provenance.json` (URL, SHA-256, Wikisource
  `oldid`s, IA file hashes). Corrections after parsing go in `scripts/overrides.json`
  (slot → replacement + reason), never by hand-editing generated JSON.

Per hexagram we store: King Wen number, Chinese name, hand-checked name pinyin,
English name (authored by us in Phase 4; `null` until then), line pattern, lower/upper
trigrams, judgment 卦辭, Great Image 大象, the six line statements 爻辭, and 用九/用六
for hexagrams 1 and 2. The textual layers are labelled honestly in UI and About (S6):
卦辭/爻辭 are the Zhou core; the 大象 is from the much later 象傳 (Ten Wings).

**Legge slot map (M7).** Legge's book traverses the 64 three times. The join is:

| Legge locus | Slot |
|---|---|
| Text, unnumbered paragraph (king Wăn) | `judgment` |
| Text, numbered paragraphs 1–6 (duke of Kâu) | `lines[0..5]` |
| Text, numbered paragraph 7 (hexagrams 1–2 only) | `special` (用九/用六) |
| Appendix II, first (unnumbered) paragraph — Great Symbolism | `image` |
| Appendix I (彖傳); Appendix II paragraphs 1–6/7 (小象); all discursive notes | excluded |

The `poem` rendering: spare, modern, imagistic, faithful to the Chinese (not to Legge's
Victorian glosses). Consistent voice across all 64, including fixed handling of repeated
formulae (貞吉, 无咎, 利涉大川, 大人/君子/小人, 元亨利貞). Each hexagram gets: a short
title (which is also the English name, M10), judgment as a few lines of verse, image as
2–4 lines, each line statement as 1–4 lines. No mysticism-industry clichés, no
advice-column tone. Phase 4 starts with pilot hexagrams 1, 3, 29, 52 plus a formulae
glossary and independent Chinese-literate review, then batches of 8 (S7). Poem text is
authored in `data/poem/NN.json` files and merged at build time so reviews read as text
diffs. There is **no generated pinyin** anywhere: name pinyin is a hand-checked 64-row
table (SCHEMA.md); body-text pinyin is cut (M10).

## Data

- `data/hexagrams.json` — array of 64 objects. `data/trigrams.json` — the 8 trigrams.
  Schema: [SCHEMA.md](SCHEMA.md). Text slots are stored as **arrays of lines** for every
  translation; `special` (用九/用六) is `null` for 62 hexagrams (M8).
- Build scripts (Node, no npm dependencies) in `scripts/` fetch and parse sources into
  JSON. Raw downloads are cached in `scripts/.cache/` (gitignored). The committed JSON
  is the site's source of truth; `build → validate → git diff` is empty on a re-run
  (idempotent build, M8).

### Bit convention and King Wen policy (M3, normative)

- `bits` is an array of six 0/1. Index 0 is the **bottom** line; yang = 1, yin = 0.
  Any string form is written in that same bottom→top order.
- Lower trigram = indices 0–2, upper trigram = indices 3–5 (each bottom→top).
- The King Wen number is **not derivable** from bits (it is not Fuxi/Shao Yong binary
  order). It comes from an explicit 64-entry lookup table transcribed independently in
  `scripts/lib/kingwen.mjs` (number, name, pinyin, lower, upper). At build time the
  table is checked against two independent oracles: the Chinese source's own line
  labels (384 checks) and zh Wikisource's trigram headers (e.g. 震下坎上).
- Fixed test vectors (bottom→top): 1 乾 = `111111`, 2 坤 = `000000`,
  3 屯 = `100010`, 11 泰 = `111000`, 12 否 = `000111`, 29 坎 = `010010`,
  63 既濟 = `101010`, 64 未濟 = `010101`.

### Line labels (M4, normative)

Labels are generated from this table and never stored with the text. Line text is stored
with the label stripped; parsing asserts the stripped source prefix equals the generated
label (this is also the bit-oracle above).

| position (bottom→top) | yang (1) | yin (0) |
|---|---|---|
| 1 | 初九 | 初六 |
| 2 | 九二 | 六二 |
| 3 | 九三 | 六三 |
| 4 | 九四 | 六四 |
| 5 | 九五 | 六五 |
| 6 | 上九 | 上六 |

Note the order flips: positions 1 and 6 put the position first (初九, 上六); positions
2–5 put 九/六 first (九二, 六五). Judgment text is stored without its `Name：` prefix,
image text without `象曰：`, special text without `用九：`/`用六：`.

### Validation (M8)

`scripts/validate.mjs` uses staged gates: `--require zh,legge` for Phases 1–3, adding
`poem` in Phase 4. Checks include: 64 entries; numbers 1–64 unique; 64 unique bit
patterns; bits consistent with the King Wen table and trigram composition; King Wen
test vectors; generated labels consistent with bits; hexagrams 1–2 have `special`, the
rest `null`; every required translation has every slot non-empty; no markup leakage
(`-{`, `{{`, `[[`, HTML tags/entities); script purity (Chinese slots contain no Latin
words, Legge slots contain no CJK); per-slot length outliers reported for human review.

## Casting

Randomness is **injected** (M2): the engine takes a `randomInt(bound)` parameter.
Production passes a `crypto.getRandomValues` adapter (rejection sampling); tests pass
scripted sequences. Bounds are tiny (powers of two), so rejection is rarely exercised.

- **Three coins:** character side = 3, blank side = 2 (N2; the on-screen faces use these
  names so the cast record is self-consistent). Sum 6/7/8/9 with
  P(6)=1/8, P(7)=3/8, P(8)=3/8, P(9)=1/8.
- **Yarrow stalks (M1):** we do **not** simulate heap splits (a uniform split does not
  yield the textbook odds). We sample the three changes directly: change 1 removes 9
  stalks with probability 1/4, else 5; changes 2–3 each remove 8 or 4 with probability
  1/2 each; line value = (49 − total removed) / 4 (remaining 36/32/28/24 → 9/8/7/6).
  This yields exactly P(6)=1/16, P(7)=5/16, P(8)=7/16, P(9)=3/16. If heap counts are
  shown on screen, a split consistent with the drawn removals is synthesized afterwards.
  About calls these "the conventional yarrow odds".
- 6 = old yin (changing), 7 = young yang, 8 = young yin, 9 = old yang (changing).
- Lines are cast bottom → top. The primary hexagram (本卦) comes from all six lines; the
  relating hexagram (之卦, zhī guà — also called transformed/resulting, N4) flips the
  changing lines. No changing lines ⇒ no relating hexagram.
- **Reading shown (M9):** primary judgment + image, every changing line's text in
  bottom→top (casting) order, each labelled with its position (初九…, "line 1"), then the
  relating hexagram's judgment + image. All changing lines are shown equally (we do not
  apply Zhu Xi's selection rules); the reading view itself carries one quiet line saying
  so, with details in About. If all six lines change on hexagrams 1–2, 用九/用六 is the
  primary text, then the relating hexagram, with the six line texts demoted/collapsed.
  For other all-six casts, the relating judgment is headed at least as prominently as
  the primary. On hexagram browse pages, 用九/用六 always appears as a seventh statement.
- Engine is pure and DOM-free in `js/engine.js`, tested with Node (`node --test`).
  Distributions are asserted by **exact enumeration** (8 coin outcomes; 8 weighted
  yarrow paths), plus one seeded smoke test that a cast consumes randomness in order.
  There is no gating chi-square test; any long-run frequency check is a non-gating script.

## Site structure (hash routing, single page — S8: decided, kept)

| route | view |
|---|---|
| `#/` | **Cast.** Near-empty page, small title 易, optional question input, Coins/Yarrow choice, then one tap per line. Subtle "cast all six" link. Simple "enter a cast made by hand" (six 6/7/8/9 selectors, S3). |
| `#/r/{m}{dddddd}` | **Reading.** `m` is the method letter: `c` coins, `y` yarrow, `m` manual (M12). Digits are the six line values 6–9, bottom→top, e.g. `#/r/c789876`, `#/r/y789876`. Fully reconstructable from the URL; the question is never in the URL. A shared link preserves the result and method; per-line faces/counts beyond the value are in-session detail only. |
| `#/h/{n}` | **Hexagram** browse page, `n` an integer 1–64. Prev/next links (S3). Layer tags: Judgment · Lines · Image (象傳) (S6). |
| `#/library` | Grid of the 64 in **King Wen order only** (S1), with one jump field (number, pinyin, or name) (S3). |
| `#/about` | What the Yijing is (briefly, including textual strata and rough dates), how casting works (incl. "conventional yarrow odds", Zhu Xi weighting note, `#/r/` format), sources, licences, and a reflection-not-advice note (S4). |

Routing rules (M12): validate strictly — reading must match `^#/r/[cym][6-9]{6}$`,
hexagram `^#/h/([1-9]|[1-5][0-9]|6[0-4])$`; anything else (including `#/r/123`,
`#/h/0`, `#/h/65`, unknown hashes) shows a small not-found view linking home, never a
blank page. Relative asset paths throughout (GitHub project pages live under `/repo/`).
`<noscript>` message; data-load error message with retry. Per-route `document.title`;
generic Open Graph tags, title/description, favicon (the seal), `theme-color` for both
schemes (S8, S10). Corpus JSON is fetched lazily (preload on first tap / idle after
first paint) so the cast page needs no texts until line six (S2).

**Translation selector (S5):** one translation at a time everywhere (S1; no two-column
parallel view). Compact sticky control (`原文 · Legge · Rendering`) on reading/hexagram
pages; switching replaces content in place, preserving scroll via per-line anchors.
Selection persisted in `localStorage` (try/catch). Default: Rendering once it exists
(Legge before Phase 4); `zh` if the browser language starts with `zh`.

**Reading affordances (S3):** share/copy-link (`navigator.share` with copy fallback)
and "cast again" on the reading view.

**Question lifecycle (S4):** `sessionStorage` only (never `localStorage`, never leaves
the device), shown quietly atop the in-session reading, cleared on "cast again",
`autocomplete="off"`, real `<label>`, font ≥ 16px.

### Casting interaction (M11, normative)

- One real `<button>` (≥ 48px, thumb zone, `touch-action: manipulation`), disabled
  while a line animates (~600ms coin flip). No page-wide tap handler. Space/Enter work
  via native button focus only; no global key handler.
- Unobtrusive "undo line" and "start again" before completion.
- In-progress cast persisted in `sessionStorage`, restored on reload/back.
- Each line inks in bottom-up; faces/counts shown briefly, and the completed reading
  keeps a quiet expandable cast record (per line: method detail + 6/7/8/9).
- History entries only on route changes; on navigation, focus moves to the new heading
  and `document.title` updates. `dvh` heights, safe-area insets, ≥ 16px inputs.

## Design

Mood: ink on paper. Lots of whitespace. A page you could look at for a minute in
silence. No heavy header/footer; a tiny nav (易 · Library · About). Slow fades and
ink-spread; `prefers-reduced-motion` respected. Hexagrams are SVG from a handful of
precomputed irregular brush-path geometries (no per-line SVG filters, S1; plain
geometry in the library grid), each with a text alternative ("Hexagram 3, 屯 Zhūn"
plus the English title once authored). Print stylesheet forces the light palette and
hides nav/controls (S10).

### Design decision table (final — M13, M15, N3)

| decision | value |
|---|---|
| Latin font | EB Garamond, self-hosted subset WOFF2 (OFL licence kept) |
| Chinese font | Noto Serif **TC**, self-hosted subset WOFF2 (OFL licence kept); subset to exactly the corpus characters, with a build check that every character in `hexagrams.json` exists in the subset cmap. No Google Fonts, no third-party requests. |
| Paper (light bg) | `#f4efe6` |
| Ink (light text) | `#1d1b19` — 14.99:1 on paper |
| Soft ink (light secondary) | `#5c564d` — 6.34:1 on paper |
| Accent (light) | `#b23a2b` (cinnabar) — 5.19:1 on paper |
| Dark bg | `#121110` (via `prefers-color-scheme` + manual toggle) |
| Dark text | `#f4efe6` — 16.47:1 on dark bg |
| Soft ink (dark secondary) | `#a89d8c` — 7.07:1 on dark bg |
| Accent (dark) | `#e0785f` — 6.31:1 on dark bg (the light accent is only 3.17:1 on dark bg and must not be reused there) |
| Changing-line markers | ○ (old yang) / × (old yin) drawn in SVG with text equivalents; accent colour is decoration only, never the sole signal |
| Measure / type | ~34em max, generous line-height, large Chinese hexagram names, `display=swap` |

Contrasts are WCAG relative-luminance ratios measured from the hex values above; every
text/background pair in the table passes AA (≥ 4.5:1), most pass AAA. Accent tokens
switch with the colour scheme — cross-scheme reuse fails (see dark-accent note).

Accessibility (M15): semantic HTML, visible focus states, `lang="zh-Hant"` on Chinese
spans, real `<label>` for the question field, one atomic `aria-live` announcement per
cast line ("Line 3: old yang, changing"), focus/title management per M11, contrast per
the table above.

Performance (S2): per-route budget in compressed bytes (HTML+CSS+JS+JSON+fonts),
checked in Phase 5 with the real artifacts; JS excluding data stays small (< 40KB
unminified); Lighthouse mobile ≥ 95 performance/accessibility.

## Licences (M14, normative)

`LICENSE` covers code (MIT). `LICENSE-content.md` covers texts, rendering, fonts, and
the seal. The About page mirrors these attributions. (Not legal advice; this records
what we rely on.)

| material | underlying work | transcription / asset source | terms relied on | attribution shown |
|---|---|---|---|---|
| Chinese text (`zh`) | Ancient received text — public domain | Project Gutenberg #25501, PG branding/licence text stripped; zh Wikisource used for collation only (its contributions are CC BY-SA, so no Wikisource wording is copied into the base text; residual variants resolved editorially via `overrides.json`) | Public domain; PG trademark terms avoided by stripping PG marks | "Chinese text: received 易經, via Project Gutenberg #25501" (About + provenance) |
| Legge translation (`legge`) | James Legge (d. 1897), SBE vol. 16 (1882) — public domain | Our transcription from Internet Archive item `I-Ching` page scans (DjVu OCR, hand-corrected via `overrides.json`); en Wikisource (CC BY-SA) used for collation of 1–32 only | Public domain | "English translation: James Legge (1882)" |
| Poem rendering (`poem`) + English names | Original work for this site | Authored here (Phase 4) | CC BY 4.0 (`LICENSE-content.md`) | "Rendering © the site authors, CC BY 4.0" |
| Code | Original work for this site | Authored here | MIT (`LICENSE`) | `LICENSE` file |
| Fonts | EB Garamond; Noto Serif TC | Self-hosted subset WOFF2 derived from the OFL fonts | SIL Open Font License 1.1; licence files shipped with the subsets | `LICENSE-content.md` + font licence files |
| Seal / favicon (N7) | Original graphic for this site | Created here; if derived from a font glyph, the font and glyph are named in `LICENSE-content.md` | CC BY 4.0 (or font OFL terms if glyph-derived) | `LICENSE-content.md` |

## File layout

```
index.html
css/style.css
js/app.js            # routing, views, DOM
js/engine.js         # pure casting + hexagram logic (injected randomInt)
js/render.js         # SVG hexagram drawing
fonts/               # self-hosted subset WOFF2 + OFL licences
data/hexagrams.json
data/trigrams.json
data/poem/NN.json    # Phase 4 authoring files, merged at build time
scripts/             # build/validate (Node, no deps, dev only)
  build.mjs  validate.mjs  lib/
  provenance.json    # pinned sources (URLs, hashes, oldids) — committed
  overrides.json     # post-parse corrections with reasons — committed
  .cache/            # raw downloads — gitignored
tests/               # node --test (Phase 2)
docs/PLAN.md  docs/SCHEMA.md  docs/COLLATION.md
README.md            # serve command, build/validate commands, Pages source
LICENSE              # code, MIT
LICENSE-content.md   # poem CC BY 4.0; texts PD; fonts OFL; seal
.nojekyll
.github/workflows/   # node --test + validate.mjs on push (S9)
```

Deployment (S9): GitHub Pages from the default branch root (named in the README),
`.nojekyll` present, CI runs tests + validation on push, and `hexagrams.json` is
cache-busted with a `?v=` version bumped whenever the data changes.

## Phases (each ends with a git commit and a review)

1. **Data** — build + validate `hexagrams.json`/`trigrams.json` with `zh` and `legge`;
   collation report in `docs/COLLATION.md`. Spot-check hexagrams
   1, 2, 3, 29, 30, 31, 52, 63, 64 against sources (M8 adds the 30/31 boundary).
2. **Engine + tests** — casting (M1/M2), mapping, relating hexagram, URL encoding;
   exact-enumeration tests green.
3. **UI + design** — all routes, casting interaction (M11), reading view, library,
   about; light/dark; mobile-first. Reviewed with browser screenshots at
   320/375/430/768/1280px, one landscape pass, one 200%-zoom pass, and a real-device
   pass (iOS Safari, Android Chrome) incl. the six-tap cast with keyboard (S11).
4. **Poem rendering** — pilot 1, 3, 29, 52 + formulae glossary first, then batches of
   8, each reviewed against the Chinese; English names land here; validation gate
   becomes `--require zh,legge,poem`.
5. **Polish** — a11y pass, reduced motion, keyboard, per-route weight budget,
   performance, README, licence files, GitHub Pages + CI.

## Out of scope (for now)

Reading journal/history, PWA/offline, accounts, interpretations beyond the texts
themselves, body-text pinyin, parallel-text view, trigram-arrangement library view.
