# Yijing 易經

A beautiful, quiet, ad-free Yijing (I Ching) for the web — see [docs/PLAN.md](docs/PLAN.md).

Status: **Phase 1 (Data) complete, awaiting review.** No UI yet.

## Data build (Phase 1)

Requires Node ≥ 20. There are no npm dependencies (and no `package.json`); the build
uses only Node's standard library, including global `fetch`.

```bash
node scripts/build.mjs            # build data/*.json from the pinned cache
node scripts/validate.mjs --require zh,legge
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
- Outputs: `data/hexagrams.json` (64 hexagrams × 原文 + Legge 1882),
  `data/trigrams.json`.
