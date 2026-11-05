# Content licences — texts, rendering, fonts, seal

`LICENSE` (MIT) covers the site's code. This file covers everything else.
It records what we rely on; it is not legal advice. Source pins and hashes
live in [scripts/provenance.json](scripts/provenance.json); the collation
history is in [docs/COLLATION.md](docs/COLLATION.md).

## Chinese text (`zh`) — public domain

The received 易經 text (周易 core + 大象傳) is an ancient work in the public
domain. Our transcription comes via Project Gutenberg #25501, with Project
Gutenberg branding and licence text stripped, collated against zh Wikisource
（周易）. Wikisource was used for collation only — no Wikisource wording
(CC BY-SA) is copied into the base text; residual variants were resolved
editorially in [scripts/overrides.json](scripts/overrides.json).

Attribution shown: “Chinese text: received 易經, via Project Gutenberg #25501.”

## James Legge translation (`legge`) — public domain

James Legge (d. 1897), *Sacred Books of the East* vol. 16, first edition
(Oxford: Clarendon Press, 1882). Our transcription is from Internet Archive
item `I-Ching` page scans (DjVu OCR, hand-corrected via `overrides.json`);
en Wikisource was used for collation of hexagrams 1–32 only.

Attribution shown: “English translation: James Legge (1882).”

## The rendering (`poem`) and English names — CC BY 4.0

The poetic rendering and the English hexagram names (Phase 4) are
original work for this site, © the site authors, licensed
under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Attribution shown: “A rendering — © the site authors, CC BY 4.0.”

## Fonts — SIL Open Font License 1.1

The self-hosted subset WOFF2 fonts in `fonts/` are derived from:

- **EB Garamond** — Copyright 2017 The EB Garamond Project Authors.
  Licence: [fonts/EBGaramond-OFL.txt](fonts/EBGaramond-OFL.txt).
- **Noto Serif TC** — Copyright 2012 Google Inc. All Rights Reserved.
  Licence: [fonts/NotoSerifTC-OFL.txt](fonts/NotoSerifTC-OFL.txt).

Subsets are built by [scripts/build-fonts.py](scripts/build-fonts.py),
which also verifies that every character the site renders is present.

## Seal / favicon — OFL glyph, CC BY 4.0 arrangement

`favicon.svg` (and the 易 seal in the page header) uses the outline of the
**易** glyph from **Noto Serif TC**, extracted by `scripts/build-fonts.py`
and set in a cinnabar (`#b23a2b`) rounded-square seal. The glyph outline
remains under the Noto Serif TC OFL terms above; the seal composition is
original to this site and CC BY 4.0.
