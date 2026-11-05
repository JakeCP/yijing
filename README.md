# Yijing 易經

A beautiful, quiet, ad-free Yijing (I Ching) for the web — see [docs/PLAN.md](docs/PLAN.md).
Cast with three coins or yarrow stalks; read the received Chinese text,
a new poetic rendering, and James Legge's 1882 translation. No trackers, no third-party requests;
everything happens on your device.

Status: **Phases 1–5 complete** (data, engine + tests, UI + design,
original poetic rendering + English names, fidelity review + polish).
The rendering is the default English text (Chinese by default for `zh`
browser languages); the rendering and names are CC BY 4.0 (see
[LICENSE-content.md](LICENSE-content.md)). The Phase 5 slot-by-slot
fidelity review of the rendering against the Chinese is logged in
[docs/POEM_REVIEW.md](docs/POEM_REVIEW.md).

## Run the site locally

No build step. Serve the repo root with any static server (ES modules and
`fetch` need `http://`; `file://` will not work):

```bash
python3 -m http.server 8000
# then open http://localhost:8000 in a browser
```

Routes: `#/` cast · `#/r/{c|y|m}{six digits 6–9}` reading ·
`#/h/{1–64}` hexagram · `#/library` · `#/about`. Anything else shows the
not-found view (routing is strict; see `parseRoute` in `js/engine.js`).

## Deploy to GitHub Pages

No build step and no Actions workflow are needed to publish — the repo
root *is* the site:

1. Push the repo to GitHub (branch `main`).
2. In the repo: **Settings → Pages → Build and deployment →**
   Source: **Deploy from a branch** → branch **`main`**, folder **`/ (root)`** → Save.
3. Wait for the Pages build, then open `https://<user>.github.io/<repo>/`.

`.nojekyll` is present (so `_`-free paths and dotfiles are served as-is),
all asset paths are relative (the site works under a `/repo/` prefix),
and CI (`.github/workflows/`) runs the tests + data validation + font
check on every push — it does not deploy.

**Before launch:** fill in the final absolute URL. `index.html` contains
a clearly marked `TODO(launch)` placeholder (search for
`FINAL-URL.invalid`): replace it with the production origin (e.g.
`https://<user>.github.io/<repo>/`) and uncomment the `og:image`,
`og:url`, and canonical tags. They are left commented out because Open
Graph URLs must be absolute and the origin is not known until deploy.

## Performance (measured, Phase 5; desktop book layouts re-measured)

Per-route transfer over the wire, gzip for text (HTML/CSS/JS/JSON) and
as-is for the already-compressed WOFF2 fonts. Measured on the committed
artifacts (`gzip -9`); fonts and JSON are fetched once and cached across
routes, so later routes add only their delta.

| Route | First visit (compressed) | What it adds |
|---|---|---|
| `#/` cast, first paint | ~532 KB | HTML 1.9 KB + CSS 12.2 KB + JS 24.2 KB (app/engine/render/book) + EB Garamond 117 KB + Noto Serif TC 376 KB |
| any page with italics | +133 KB | EB Garamond Italic, on first italic text |
| `#/r/…`, `#/h/…`, `#/library` | +60 KB | `data/hexagrams.json` 59.4 KB gzip (265 KB raw) + `data/trigrams.json` 0.4 KB |
| `#/about` | +2.5 KB | `js/about.js`, loaded lazily by dynamic `import()`; no JSON |

Notes:

- Initial-route JS is 76 KB unminified (`js/app.js` 48 KB +
  `js/engine.js` 13 KB + `js/render.js` 11 KB + `js/book.js` 3.5 KB);
  the About copy (5.6 KB) lives in `js/about.js` and loads only on
  `#/about`. There is no bundler and no minifier, by design (PLAN.md:
  no build step to serve). This misses the plan's aspirational
  “JS < 40 KB unminified” — the gzip wire size (24.2 KB) is the number
  visitors actually pay.
- Desktop decoration is nearly free: the paper-grain tile is a 3.3 KB
  PNG embedded in the CSS (inside its 12.2 KB gzip), the cast page's
  ink-wash landscape is ~0.7 KB gzip of SVG paths inside `js/app.js`,
  and the rebuilt Noto subset grew 708 B for the 繫辭 passage (太極）.
  Wide screens open the book — see `docs/DESKTOP_DESIGN.md`.
- Corpus JSON loads lazily (idle after first paint, or on the first
  cast tap), so the cast page paints without it. Fetches are
  cache-busted with `?v=<DATA_VERSION>` in `js/app.js` — bump
  `DATA_VERSION` whenever `data/*.json` changes.
- Fonts dominate transfer. Both are subset to exactly the rendered
  characters and `font-display: swap`, so text paints immediately in a
  fallback serif. Splitting the Chinese subset further (e.g. UI glyphs
  vs corpus glyphs) is the obvious next saving if it is ever needed.

## Accessibility (Phase 5)

Keyboard-only casting (real buttons; the cast button keeps focus while
a line animates), visible `:focus-visible` outlines in the accent
colour, a skip button to the page heading, focus moved to the new
heading on every route change, `lang="zh-Hant"` on all Chinese
(including body text when 原文 is selected), one atomic
`aria-live` announcement per cast line and per translation switch,
one `<h1>` per route with Judgment/Image/Lines as `<h2>` (relating
hexagram `<h2>`, its texts `<h3>`), `prefers-reduced-motion` respected
in CSS and in cast timing, and the PLAN.md palette (every text pair
≥ 4.5:1: ink 14.99:1, soft 6.34:1, accent 5.19:1 on paper; 16.47:1,
7.07:1, 6.31:1 on the dark background). Changing lines are marked
○/× in the SVG with text equivalents — colour is never the only
signal. Printing a reading forces the light palette, hides
navigation/controls, and expands collapsed details (cast record
included).

## Tests & validation

Requires Node ≥ 20. There are no npm dependencies (and no `package.json`);
everything uses Node's standard library.

```bash
node --test                                 # engine: exact distributions, King Wen vectors, routing
node scripts/validate.mjs --require zh,legge,poem
scripts/.cache/fontenv/bin/python scripts/build-fonts.py --check   # font cmap coverage
```

## Rebuilding the data

```bash
node scripts/build.mjs            # build data/*.json from the pinned cache
node scripts/build.mjs --fetch    # re-download sources and re-pin provenance (rare)
```

- Sources are pinned in [scripts/provenance.json](scripts/provenance.json) (URLs,
  SHA-256, Wikisource revision ids). Raw downloads live in `scripts/.cache/`
  (gitignored); a normal build verifies their hashes and never touches the network.
- Corrections to parsed texts belong in [scripts/overrides.json](scripts/overrides.json)
  (slot + replacement + reason) — never hand-edit `data/*.json`. Re-running the build
  is idempotent (byte-identical output).
- The poetic rendering is authored in `data/poem/NN.json` (one file per
  hexagram; `notes` are review-only and stripped at build). Voice and
  the fixed glossary: [docs/POEM_STYLE.md](docs/POEM_STYLE.md). After
  editing poem files, re-run the build, validate with
  `--require zh,legge,poem`, and bump `DATA_VERSION` in `js/app.js`.
- Data contract: [docs/SCHEMA.md](docs/SCHEMA.md). How the sources were collated and
  what was corrected: [docs/COLLATION.md](docs/COLLATION.md).
- Outputs: `data/hexagrams.json` (64 hexagrams × 原文 + Legge 1882 + the rendering),
  `data/trigrams.json`.

## Rebuilding the fonts

Self-hosted subset WOFF2 (EB Garamond + Noto Serif TC, OFL) in `fonts/`,
built only when the corpus or UI text changes:

```bash
python3 -m venv scripts/.cache/fontenv
scripts/.cache/fontenv/bin/pip install fonttools brotli
scripts/.cache/fontenv/bin/python scripts/build-fonts.py
```

The build downloads the OFL sources into `scripts/.cache/fonts/`, subsets
them to exactly the rendered characters, writes the OFL licence files next
to the fonts, derives `favicon.svg` from the Noto Serif TC 易 glyph, and
fails if any rendered character is missing from a subset. If poem or UI
wording changed, run this after the data build, then run it again with
`--check` to confirm coverage.

## Sources & licences

| Material | Source | Terms |
|---|---|---|
| Chinese text (原文) | Received 易經 via Project Gutenberg #25501, collated against zh Wikisource | Public domain |
| English translation | James Legge, *Sacred Books of the East* vol. 16 (1882), transcribed from Internet Archive scans | Public domain |
| Poetic rendering + English names | Written for this site from the Chinese | CC BY 4.0 |
| Code | This repository | MIT ([LICENSE](LICENSE)) |
| Fonts | EB Garamond; Noto Serif TC (subset WOFF2) | SIL OFL 1.1 (licences ship in `fonts/`) |
| Seal / favicon | Made for this site | CC BY 4.0 |

Full table with attributions as shown on the site:
[LICENSE-content.md](LICENSE-content.md) (mirrored on the About page).
