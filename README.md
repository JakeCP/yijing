# Yijing 易經

A beautiful, quiet, ad-free Yijing (I Ching) for the web — see [docs/PLAN.md](docs/PLAN.md).
Cast with three coins or yarrow stalks; read the received Chinese text,
a new poetic rendering, and James Legge's 1882 translation. No trackers, no third-party requests;
everything happens on your device.

Status: **Phases 1–4 complete** (data, engine + tests, UI + design,
original poetic rendering + English names). The rendering is the default
English text (Chinese by default for `zh` browser languages); the rendering
and names are CC BY 4.0 (see [LICENSE-content.md](LICENSE-content.md)).

## Run the site locally

No build step. Serve the repo root with any static server (ES modules and
`fetch` need `http://`; `file://` will not work):

```bash
python3 -m http.server 8000
# then open http://localhost:8000 in a browser
```

Deployment: GitHub Pages from the default branch root (`.nojekyll` is
present; CI runs the tests + validation on every push).

Routes: `#/` cast · `#/r/{c|y|m}{six digits 6–9}` reading ·
`#/h/{1–64}` hexagram · `#/library` · `#/about`.

## Tests & validation

Requires Node ≥ 20. There are no npm dependencies (and no `package.json`);
everything uses Node's standard library.

```bash
node --test                                 # engine: exact distributions, King Wen vectors, routing
node scripts/validate.mjs --require zh,legge,poem
scripts/.cache/fontenv/bin/python scripts/build-fonts.py --check   # font cmap coverage
```

## Data build (Phase 1)

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
- Data contract: [docs/SCHEMA.md](docs/SCHEMA.md). How the sources were collated and
  what was corrected: [docs/COLLATION.md](docs/COLLATION.md).
- Outputs: `data/hexagrams.json` (64 hexagrams × 原文 + Legge 1882 + the rendering,
  merged from `data/poem/NN.json` with `notes` stripped),
  `data/trigrams.json`. When the data changes, bump `DATA_VERSION` in
  `js/app.js` so browsers pick up the new corpus.

## Fonts

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
fails if any rendered character is missing from a subset.

## Licences

Code: MIT ([LICENSE](LICENSE)). Texts, rendering, fonts, and the seal:
[LICENSE-content.md](LICENSE-content.md). The About page mirrors these
attributions.
