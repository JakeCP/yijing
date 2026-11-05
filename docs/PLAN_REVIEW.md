# Review of `docs/PLAN.md` — Yijing static site

Reviewed 2026-11-05. I read the whole plan and spot-checked the named sources
from a scripted HTTP client, which is what a `scripts/` build would actually
see. I also enumerated the yarrow procedure exactly. This is not legal advice.

**Verdict: the shape is right, but do not start Phase 1 or 2 as written.**
The coin maths, line categories (6/7/8/9), bottom→top casting, relating-flip
rule, and the exclusion list of in-copyright translations are all correct.
Two things are not: the yarrow spec contradicts its own probability target,
and two of the named text sources (ctext, sacred-texts) are not reliably
fetchable by a script — while the third (zh Wikisource) is fetchable but is
not an identified edition.
Both are fixable in the plan before any code is written — see M1, M5, M6.

## Must fix

**M1. Yarrow: "simulate the actual procedure" and "must yield 1/16, 5/16, 7/16, 3/16" are incompatible (lines 59–63, 73–74).**
The textbook probabilities come from treating the possible remainder
combinations as equiprobable, not from a uniform random split of a finite
heap. I enumerated every split under the plan's own model (split uniform,
each heap ≥ 1). Two plausible readings of the underspecified edge case
(right heap reduced to 0 stalks by 掛一) give two different wrong answers:

| model | P(6) | P(7) | P(8) | P(9) |
|---|---|---|---|---|
| target in plan | 0.0625 | 0.3125 | 0.4375 | 0.1875 |
| uniform split, empty heap remainder = 0 | 0.0478 | 0.2783 | 0.4519 | 0.2220 |
| uniform split, empty heap remainder = 4 | 0.0589 | 0.3030 | 0.4412 | 0.1968 |

The procedure description also omits every step an implementer can get wrong:
stalks reset to 49 for each new line; surviving stalks are recombined before
each of the three changes; a heap divisible by 4 leaves remainder **4, not 0**;
first change removes 5 or 9, later changes remove 4 or 8; final count
36/32/28/24 ÷ 4 maps to 9/8/7/6 (note 32→8 is yin, 28→7 is yang).
*Change:* pick one and say so. Recommended: drop the physical simulation and
sample the three changes directly — change 1 removes 9 with probability 1/4
else 5; changes 2–3 remove 8 or 4 with probability 1/2 each; line =
(49 − removed)/4. That yields the target exactly and is exhaustively testable.
If you want heap counts on screen, generate a split consistent with the drawn
removal afterwards. Describe it in About as "the conventional yarrow odds",
not as a simulation of hands. The alternative — keep a split model, publish
its true non-textbook probabilities, delete the exact assertion — is
defensible but will confuse every reader who knows 1/16–5/16–7/16–3/16.

**M2. The engine cannot be both "pure" and wired to `crypto`, and the chi-square gate will flake (lines 55, 71–74).**
A stochastic chi-square test over 200k samples fails intermittently whatever
α you pick, and with `crypto.getRandomValues` hard-wired it cannot be seeded
to investigate a failure. It is also redundant once M1 lands: the coin method
has 8 equiprobable outcomes and the yarrow method has 8 weighted paths, so
both distributions can be asserted by exact enumeration in milliseconds.
*Change:* give the engine an injected `randomInt(bound)` (or `nextByte`)
parameter; production passes a `crypto` adapter, tests pass scripted
sequences. Replace the 200k chi-square gate with exact enumeration tests plus
one seeded smoke test that a full cast consumes randomness in the expected
order. Keep a long-run frequency check, if at all, as a non-gating script.
Note with M1's sampling, rejection sampling is barely needed: bounds are
powers of two or tiny — say so and simplify.

**M3. There is no normative bit convention, and King Wen number cannot be derived from bits (lines 28–30, 48–50).**
Reversed bit order is the single most common bug in I Ching software, and
"6-bit line pattern (bottom→top)" leaves string order, integer order, and
yang encoding to guesswork. The validator can also be made circular: bits
checked against trigrams that were derived from the same bits prove nothing.
*Change:* write the convention into the plan/schema now: `bits` is an array of
six 0/1, index 0 = bottom line, yang = 1; any string form is written in that
same order; lower trigram = indices 0–2, upper = 3–5. The King Wen number is
an explicit 64-entry lookup table transcribed from an independent printed
table — state that it is *not* binary (Fuxi/Shao Yong) order. Add fixed test
vectors: 1 = `111111`, 2 = `000000`, 3 屯 = `100010`, 11 泰 = `111000`,
12 否 = `000111`, 29 坎 = `010010`, 63 既濟 = `101010`, 64 未濟 = `010101`.
During the Chinese parse, keep each source line's own label (初九, 六二, …) and
the Wikisource page's trigram header (震下坎上 etc.) and validate bits against
*those* — 384 independent oracle checks, not self-consistency.

**M4. Line labels are not generated the way line 50 implies.**
"Positions 初二三四五上" plus 九/六 does not specify word order, and the order
is not uniform: lines 1 and 6 are 初九/初六 and 上九/上六 (position first),
lines 2–5 are 九二/六二 … 九五/六五 (九/六 first). A naive concatenation
invents 九初 or 二九. *Change:* put the twelve forms (six positions × 九/六) in
a table in the schema, generate labels from it, store line text with the
label stripped, and assert the stripped source prefix equals the generated
label during parsing (this is also M3's oracle).

**M5. Chinese source: ctext.org is not usable as a build source; Wikisource is fetchable but is not a named edition (line 22).**
Checked live: every `ctext.org` URL I tried returns a Cloudflare Turnstile
interstitial to a scripted client, its unauthenticated API returns
`ERR_REQUIRES_AUTHENTICATION`, and the site states that scraping violates its
terms and that API access is by institutional subscription. Removing it costs
nothing — do it now; keep it only as a human eyeball cross-check in a browser.
[Zh Wikisource 周易](https://zh.wikisource.org/wiki/%E5%91%A8%E6%98%93) is
properly fetchable: 64 per-hexagram subpages (e.g. `周易/乾`) come back 200 via
`?action=raw` and the MediaWiki API. But the raw wikitext carries
language-conversion syntax (`-{无}-`), variant templates (`{{另|磐|盤}}`),
colour markup, a "Textquality 50%" banner, and no identified base edition.
A better primary candidate the plan misses:
[Project Gutenberg #25501 易經](https://www.gutenberg.org/files/25501/25501-0.txt) —
one stable UTF-8 file (~55k characters, all 64 hexagrams) in regular
Wang Bi order (卦辭, 彖, 大象, then line/小象 pairs; hexagram 1 differs).
Neither source names its printed edition, and they genuinely disagree, e.g.
hexagram 3, line 3: Wikisource 即鹿…以從禽也 vs Gutenberg 既鹿…以縱禽也.
*Change:* make Phase 1 start with a short collation spike: parse *both*
sources into slots, diff them ignoring punctuation and known graphic variants
(无/無, 于/於, 羣/群), and decide the base edition of record plus an
`overrides` file for the residual true variants. Decide in the plan: canonical
script is traditional; punctuation is modern editorial (the received text is
unpunctuated) — say whose punctuation you keep. Pin every download (file hash
for Gutenberg, Wikisource `oldid` per page) in a committed provenance manifest
so a re-run next year reproduces the same JSON.

**M6. Legge source: sacred-texts.com will not support a build script (line 23).**
Checked live: `sacred-texts.com/ich/` now redirects to a category page on a
rebuilt site; the old files live on `archive.sacred-texts.com`, which served
one request and then Cloudflare 403-blocked my client (`/ich/ic01.htm`). Its
[copyright page](https://archive.sacred-texts.com/cnote.htm) also conditions
reuse of copied portions on retaining attribution notices, and reserves rights
in its own index/graphic material — awkward for text extracted into JSON.
*Change:* rebase on pinned Internet Archive scans of the printed book, e.g.
[the `I-Ching` item's `_djvu.txt`](https://archive.org/download/I-Ching/JamesLegge-IChing_djvu.txt)
plus an independent second scan
([`cu31924060466921`](https://archive.org/metadata/cu31924060466921), 1899, is
one candidate; I verified these items exist and expose DjVu text, not their
OCR quality). Use
[en Wikisource SBE vol. 16](https://en.wikisource.org/wiki/Sacred_Books_of_the_East/Volume_16)
as collation only: it is human-proofread but, as checked, only hexagrams 1–32
of the Text are assembled as main pages, page-level transcription is
continuous only to about DjVu p.161 of 529 (a few isolated, mostly unproofed
pages beyond that), so it cannot supply hexagrams 33–64 or Appendix II. Before committing, pick the
edition — the plan says 1882, sacred-texts labels its copy 1899 (2nd ed.) —
and never mix editions mid-corpus. Spike the OCR error rate on a few Text and
Appendix II pages in Phase 1; if it is bad, budget manual correction or obtain
the sacred-texts transcription by permission/browser, rather than trying to
evade its bot protection. Sacred-texts by hand in a browser remains fine for
spot-checks.

**M7. Legge does not "map onto the same slots" page-by-page (lines 31–32).**
Legge's book is organised as the Text (all 64: judgment paragraph, then six —
for hexagrams 1–2, seven — line paragraphs) followed by the Appendices
traversing all 64 again: Appendix I = 彖傳, Appendix II = 象傳. So the slot
join is: Text ¶0 → judgment; Text ¶1–6 → lines; Text ¶7 (hexagrams 1–2) →
用九/用六; Appendix II ¶0 → Great Image; Appendix I and Appendix II ¶1–6
(小象) are excluded. Mishandled, the parser will put 彖傳 prose in the
judgment slot or a 小象 line in the image slot. Three more parser traps to
specify now: parse Legge by sequence/roman numeral, never by name —
乾 (hexagram 1) and 謙 (hexagram 15) are both headed "The *Kh*ien Hexagram";
text paragraphs are interrupted by page breaks and footnote blocks, which must
be separated; and Legge's parentheses are his supplied wording — decide to
retain them verbatim (recommended; deleting them silently rewrites his
translation).
*Change:* write the five-line slot map above into the plan's Data section, and
require the parser to key hexagrams by order only.

**M8. The validator contradicts the phase plan and proves less than it claims (lines 48–51, 131–137).**
"Every translation has every slot non-empty" fails from Phase 1 until the poem
is finished in Phase 4, so either Phases 1–3 run red or the check gets quietly
dropped. Non-emptiness also misses the realistic failure modes: adjacent
hexagrams swapped, a 小象 in the image slot, footnote text bled into a line,
wikitext (`-{`, `{{`, `[[`) leaked into JSON, OCR garbage. And since the
committed JSON is "the source of truth" yet is regenerated by scripts, the
first hand-correction will be clobbered by the next build unless there is an
overrides mechanism.
*Change:* stage the gates (`validate --require zh,legge` for Phases 1–3, add
`poem` at Phase 4); add checks for markup-token leakage, script purity
(Chinese slots contain no Latin words, Legge slots no CJK), and per-slot
length outliers reported for human review. Extend the Phase 1 spot-checks
with hexagrams 30/31 (the 上經/下經 and Legge Section I/II boundary, a classic
off-by-one site) and rely on the M5 collation diff rather than six eyeballs as
the main correctness evidence. Add `scripts/overrides.json` (slot → replacement
+ reason) applied after parsing, and require `build → validate → git diff` to
be empty on a re-run. While here, settle the schema questions the plan defers:
poem verse needs line breaks (store text slots as arrays of lines/paragraphs
for *all* translations, or define `\n` handling now), and the 用九/用六 slot is
`null` for 62 hexagrams.

**M9. The reading rule is defensible but underspecified where it matters most (lines 67–70).**
With either method each line changes with probability 1/4, so 46.6% of casts
have ≥ 2 changing lines and 16.9% have ≥ 3 — the multi-line case is the common
case, not an edge case. "Show everything, equally weighted" is a legitimate
modern convention, but the plan keeps the only explanation in About, so a
reader arriving from Wilhelm/Zhu Xi practice (emphasis shifts to the relating
hexagram's *unchanged* lines at 4–5 changes, to its judgment at 6) gets no
hierarchy at all. The all-six-changing rule is likewise ambiguous: "show
用九/用六" — instead of, or on top of, six line texts plus the relating
judgment?
*Change:* keep the simple rule, but state the precedence in the reading view
itself (one quiet line: "All changing lines are shown, in casting order;
other traditions weight them — see About"). For all-six-changing on
hexagrams 1–2, show 用九/用六 as the primary text, then the relating
hexagram, with the six line texts demoted or collapsed. For other all-six
casts, head the relating judgment at least as prominently as the primary.
Specify that changing lines are listed bottom→top (casting order), each
labelled with its position (初九…, "line 1") so a first-time reader does not
count from the top of the drawing. On hexagram browse pages, 用九/用六 should
always appear as a seventh statement.

**M10. English names and pinyin have no provenance — and the plan already leaks Wilhelm (lines 28, 34–35, 108).**
"Difficulty at the Beginning" (line 108) is Wilhelm/Baynes' title for 屯,
not Legge's (Legge gives no English titles). Individual short titles are
unlikely to be copyrightable, but importing the familiar 64-name list from
Wikipedia/Wilhelm undermines the "legally clean, faithful to the Chinese"
stance and the poem's fresh voice. Generated pinyin will also be wrong where
it matters: polyphonic hexagram names (大畜/小畜 Xù not chù; 觀 Guān) and,
for body text, countless context readings (行, 長, 樂…).
*Change:* author the English names yourselves as part of the `poem` voice (or
omit English names in v1 and lead with Chinese + pinyin). Make name pinyin a
hand-checked 64-row table with the polyphones decided explicitly (including
乾 Qián, and hexagram 29's name 坎 Kǎn vs its judgment's 習坎). Cut generated
body-text pinyin from the plan — as a "stretch goal" it is a large editorial
QA burden hiding in one sentence; if it ever returns, it needs a per-line
review pass, not a library call.

**M11. The casting interaction has no state machine, and mobile will punish that (lines 78–81).**
Six deliberate taps on a phone is exactly where accidents happen, and the plan
specifies none of: a real button vs "tap the page" (page-wide taps fight
scrolling, text selection, and links); debounce during the 600 ms flip (one
double-tap = a ruined cast); undo of the last line or restart; what refresh,
screen-lock, or the back button does mid-cast; whether Space/Enter is a global
listener (it would fire while typing the question or tabbing the selector).
The coin faces / stalk counts shown "briefly" also vanish — the one record
that would let a reader trust or reproduce the cast.
*Change:* specify: one real `<button>` (≥ 48 px, thumb zone,
`touch-action: manipulation`), disabled while a line animates; native
Space/Enter via focus, no global key handler; an unobtrusive "undo line" and
"start again" before completion; in-progress cast persisted in
`sessionStorage` and restored on reload/back; history entries only on route
changes, with focus moved to the new heading and `document.title` updated;
the completed reading keeps a quiet, expandable cast record (per line: method
detail and 6/7/8/9) instead of transient display. Add the standard mobile
specifics the plan omits: question input at ≥ 16 px font (below that iOS
Safari auto-zooms on focus), safe-area insets, height in `dvh` units.

**M12. Routing has no error states, and the share URL silently drops the method (lines 82–86).**
Nothing defines behaviour for `#/r/123`, `#/r/78987a`, `#/h/0`, `#/h/65`,
`#/nonsense`, a failed JSON fetch, or no JavaScript at all — on a hash-routed
SPA each of these is currently a blank page. Also note the plan's "opens from
`index.html`" only works behind a server: ES modules and `fetch` of JSON fail
from `file://`, so the README must say "serve it", with a command. Finally,
`#/r/789876` encodes the outcome but not coins-vs-yarrow, while M11's cast
record and the on-screen faces/counts imply process detail that a recipient of
the link cannot reconstruct (several stalk paths, and for coins the odd coin's
identity, are not recoverable from the sum).
*Change:* validate routes strictly (reading = exactly six digits 6–9;
hexagram = integer 1–64) with a small not-found view linking home; add a
`<noscript>` and a data-load error message with retry; use relative asset
paths throughout so a GitHub *project* page under `/repo/` works. Either add
a method letter (`#/r/c789876`, `#/r/y789876` — cheap, do it) or state in
About that a shared link preserves the result, not the process.

**M13. The font plan contradicts principle 1 and risks wrong glyphs (lines 99–101).**
Loading Google Fonts sends every visitor's IP to Google on every view — hard
to square with "no trackers" as the site's first principle, whatever Google
does with it. Separately: the corpus is traditional characters, so
Noto Serif **TC** glyphs, not SC, are the right regional forms; SC will render
most traditional characters but with mainland glyph conventions, and the Yi
has enough rare characters (窞, 茀, 繻, 袽, 禴, 邅…) that silent fallback to a
second font mid-sentence is a real risk. LXGW WenKai is not on Google Fonts at
all — it means a self-host/CDN decision and its own licence bookkeeping.
*Change:* self-host subsetted WOFF2 (both EB Garamond and Noto are OFL; keep
the licence files). The corpus is small and closed, so subset to exactly the
characters used and add a build check that every character in
`hexagrams.json` exists in the subset's cmap — that turns tofu risk into a
test. Pick TC for a traditional text. If you keep Google Fonts anyway, say in
About that font loading contacts Google, and drop "no trackers" to a weaker
claim.

**M14. "Public domain" is doing more work than it can carry (lines 16, 20–24, 126).**
The underlying works are safely PD (ancient text; Legge d. 1897). But the
*transcriptions you would actually copy* sit in different positions:
Wikisource user contributions are CC BY-SA (its copyright policy), and the
punctuation/selection in a modern transcription is exactly the kind of thin
editorial layer that can attract rights or at least attribution expectations;
ctext's restrictions are contractual regardless of copyright; Project
Gutenberg's terms are trademark-based (strip PG branding/licence text from
what you redistribute); sacred-texts asks attribution for copied portions.
Meanwhile a single `LICENSE` file cannot express "MIT code + CC BY poem".
*Change:* add a licence table to the plan (per source: underlying work,
transcription source, terms you rely on, attribution you will show); if the
Chinese JSON derives from Wikisource, either licence that file CC BY-SA with
attribution or base it on the Gutenberg text stripped of PG marks; split
licences into `LICENSE` (code, MIT) and `LICENSE-content.md` (poem CC BY 4.0,
texts PD, fonts OFL), and mirror the attributions on the About page.

**M15. Accessibility is promised in general but unspecified at the three points it will actually fail (lines 97–108).**
(a) Changing lines marked by "a red tint — tastefully" would be colour-only
signalling; the traditional ○/× symbols must be the marker, with red as
decoration. (b) The single accent `#b23a2b` measures 5.19:1 on the paper
colour but only **3.17:1 on the dark background `#121110`** — fine for a bold
graphic, failing for any small text or thin glyph in dark mode; the plan has
no dark-mode accent variant. (c) `aria-live` on cast results plus hash routing
needs the details: Chinese spans need `lang="zh-Hant"` or screen readers will
mangle them with English phonetics; the question field needs a real `<label>`,
not placeholder text; the live region should announce one atomic summary per
line ("Line 3: old yang, changing"), not animation frames.
*Change:* decide ○ (old yang) / × (old yin) markers in the plan, drawn in SVG
with a text equivalent; add a dark accent token at ≥ 4.5:1 (e.g. `#e0785f`
measures 6.31:1 on `#121110`) and a contrast value for the "soft ink grey",
which is currently undefined and is where AA usually dies; write the
`lang`/label/live-region/focus rules into the Design section.

## Should consider

**S1. Cut or defer the three over-engineered features (lines 85, 90, 102–104).**
Two-column parallel text on wide screens forces line-by-line alignment between
a terse Chinese line, Legge's long sentence, and a 1–4-line verse — real layout
work for the least-used view. The trigram-arrangement library is a second view
state whose 8×8 matrix is near-unusable at 375 px. An SVG filter
(feTurbulence-style) per line will jank low-end phones, multiplied by 64
hexagrams on the library page.
*Change:* v1 = one translation at a time everywhere (stacked full texts on the
hexagram page if you want comparison); library in King Wen order only; brush
feel from a handful of precomputed irregular path geometries reused across
lines, no per-line filters (and plain geometry in the library grid).

**S2. Budget total page weight, and don't load the corpus to show the cast page (lines 109–110).**
"< 40 KB JS excluding data" excludes the two heaviest things (JSON for three
translations × 64 hexagrams, CJK font slices). The cast page needs no text
until line six is cast.
*Change:* set a per-route budget in compressed bytes (HTML+CSS+JS+JSON+fonts)
and check it in Phase 5 with the real artifacts; fetch the JSON lazily —
preload on first tap / idle after first paint — so the near-empty first page
stays near-empty on the wire.

**S3. The reading page is a dead end, and the library has no way in (lines 76–86).**
Missing: a share/copy-link control (on mobile the address bar is hidden;
`navigator.share` with a copy fallback is the natural fit), a "cast again"
action, prev/next hexagram on `#/h/{n}`, and any find-by-number/pinyin/name in
a 64-item library. Also missing for this audience: a way to enter a cast made
with physical coins/stalks (six 6/7/8/9 values) instead of hand-editing the
hash.
*Change:* add share + cast-again to the reading view, prev/next to the
hexagram view, one small jump field (number, pinyin, or name) on the library,
and either a minimal "enter a cast" row of six selectors or, at minimum,
document the `#/r/` format in About.

**S4. Give the question a lifecycle (lines 78–79, 83).**
"Never leaves the device" is good; undefined is whether it appears on the
reading, survives back/forward, or is cleared on a new cast. It is also the
most sensitive string on the site.
*Change:* keep it in `sessionStorage` only (never `localStorage`), show it
quietly atop the in-session reading, clear it on "cast again", and set
`autocomplete="off"`; note in About that shared links never contain it. One
line in About should also frame the site as presenting a classic text for
reflection — not a source of medical/financial/predictive advice.

**S5. Decide the default translation and selector behaviour (lines 88–90, 134–136).**
Phase 3 ships the selector before the poem exists, and no default is named
(first visit, per-page stickiness, what happens mid-reading on a phone when
the selector is at the top of a long page).
*Change:* default = Rendering once it exists, Legge before Phase 4 ships (and
say `zh` if the browser language is Chinese, if you want that — but decide);
switching replaces content in place and preserves scroll position per line
anchor; make the selector compact and sticky on reading pages.

**S6. Label the textual layers honestly (lines 22, 29–32).**
The site presents 卦辭/爻辭 (the Zhou core) and the 大象 (from the much later
象傳, one of the Ten Wings) as if one fabric, and "Received text of the
Zhouyi" is the wrong label for a corpus that includes Wings material. A
`poem` image "faithful to the Chinese" is in fact rendering commentary, which
is fine — if labelled.
*Change:* relabel the source row ("Received 易經 text: 周易 core + 大象傳"), add
one unobtrusive layer tag in the hexagram view ("Judgment · Lines · Image
(象傳)") and two sentences in About on the strata and their rough dates.

**S7. De-risk the poem before batching 64 (lines 37–40, 136).**
Consistent voice across 64 hexagrams mostly means consistent handling of the
repeated formulae (貞吉, 无咎, 利涉大川, 大人/君子/小人, 元亨利貞), none of
which the plan pins down; and reviewing verse inside one large JSON file will
produce unreadable diffs.
*Change:* pilot four contrasting hexagrams (e.g. 1, 3, 29, 52) with a short
glossary for the formulae and an independent Chinese-literate review *before*
the batches of 8; author the poem in its own small files (one per hexagram or
one `poem.json`) merged at build time, so Phase 4 reviews read as text diffs.

**S8. Reconsider hash-only routing for the 65 static pages (lines 76–86).**
Hash routing means no per-hexagram indexing, generic link previews, and no
usable `#line-2` deep links (the hash is taken). You already have a Node
build step for data, so pre-rendering the library + 64 hexagram pages to
committed static HTML — while cast/reading stay dynamic — is available
without betraying "static, no build step *to serve*".
*Change:* make this a conscious, recorded decision either way in the plan. If
hash-only stays, at least add per-route `document.title` (see M11) and a
generic OG description. If you pre-render, M12's no-JS story mostly solves
itself for browsing.

**S9. Deployment and CI specifics are absent (lines 129–137).**
GitHub Pages will happily publish a commit whose tests fail, and Pages'
default Jekyll processing can surprise a plain static tree.
*Change:* add a GitHub Action running `node --test` and `validate.mjs` on push;
add `.nojekyll`; name the Pages source (branch + root) in the README; decide a
cache story for `hexagrams.json` (e.g. a `?v=` version bumped when data
changes) so returning visitors don't get a stale corpus against new code.

**S10. Add print and basic metadata (Design section).**
A reading people sit with for a minute is a reading they will print or save as
PDF from the share sheet; dark mode printing is the usual disaster.
*Change:* a ten-line `@media print` (force light palette, hide nav/controls),
plus favicon (the seal), `theme-color` for both schemes, and
title/description/OG tags.

**S11. Widen the Phase 3 review matrix (lines 11, 135).**
375 px and 1280 px screenshots miss where this design will actually break:
320 px, landscape phones, 200% text zoom, and the on-screen keyboard over the
cast button.
*Change:* review at 320/375/430/768/1280, one landscape pass, one 200%-zoom
pass, and one real-device pass (iOS Safari and Android Chrome) including the
full six-tap cast with the keyboard opened and dismissed.

## Nitpicks

**N1. Fix the Legge citation once the edition is chosen (line 23).** The table
says "(1882)", the named source labels its copy 1899. *Change:* cite the
edition actually transcribed, in the table and on About.

**N2. Define which coin face is "heads" (line 57).** Heads = 3 / tails = 2 is
one convention; swapping it leaves all probabilities unchanged (the
distribution is symmetric) but changes which displayed faces mean 6 vs 9.
*Change:* name the faces shown on screen (e.g. character side = 3) so the cast
record is self-consistent.

**N3. Resolve the "-ish / or / tastefully" placeholders before Phase 3 (lines 95–104).**
Palette approximations, "EB Garamond or Cormorant", "○/× — or a red tint" are
decisions an implementer will otherwise make silently; Cormorant's hairlines
in particular are fragile at small sizes on phones.
*Change:* one decision table in the plan (font = EB Garamond recommended;
markers per M15; final hex values with measured contrasts).

**N4. First mention of "relating hexagram" should give its aliases (line 65).**
Readers also know it as the transformed/resulting hexagram (之卦, zhī guà; the
primary is 本卦). *Change:* one parenthetical on first use in UI copy and About.

**N5. `scripts/schema.md` is an odd home for the schema (line 44).**
*Change:* `docs/SCHEMA.md` (and link it from the README), so the data contract
is discoverable without opening the build tooling.

**N6. The Wilhelm exclusion note can be one clause more precise (line 26).**
It is the Baynes English (1950) that is unambiguously in copyright; Wilhelm's
German status varies by jurisdiction and is irrelevant here.
*Change:* "Do not use the Wilhelm/Baynes English…" — same effect, no
overclaim.

**N7. Give the seal/favicon a licence line too (lines 96–97, 126).** If the
seal graphic is generated or adapted from a font glyph, note its source in
`LICENSE-content.md` (per M14) so the one piece of "art" on the site is as
clean as the texts.