# Decisions on PLAN_REVIEW.md (by the reviewer/lead)

Accept ALL Must-fix items M1–M15 as recommended, specifically:
- M1: yarrow = direct sampling of the three changes (1/4 → remove 9 else 5; then 1/2 each 8 or 4). Optionally synthesize a consistent split for display. About page calls these "the conventional yarrow odds".
- M2: injected randomness; exact-enumeration tests; no gating chi-square.
- M3/M4: normative bit convention + independent King Wen lookup table + the test vectors; label table; validate against source labels and trigram headers.
- M5: Chinese base = Project Gutenberg #25501 (strip PG branding), collated against zh Wikisource; overrides file; provenance manifest with hashes/oldids. Canonical script: traditional. Keep the base text's punctuation, normalized consistently.
- M6/M7: Legge from Internet Archive DjVu text (pin item + edition, cite the actual edition), en Wikisource for collation of 1–32. Slot map as described. Retain Legge's parentheses. Key by order only. Fix OCR via overrides where needed.
- M8: staged validation gates, leakage/script-purity checks, overrides.json, idempotent build. Text slots stored as arrays of lines.
- M9: as recommended.
- M10: English hexagram names authored by us (part of the rendering voice); hand-checked 64-row pinyin table for names; NO body-text pinyin.
- M11: as recommended (real button, undo, restart, sessionStorage, cast record).
- M12: strict routes, not-found view, noscript, load error, relative paths; method letter in URL: `#/r/c789876`, `#/r/y789876`, also accept `m` for manually-entered casts.
- M13: self-hosted subset WOFF2, EB Garamond + Noto Serif TC, cmap coverage check. No Google Fonts.
- M14: licence table; LICENSE (MIT code) + LICENSE-content.md.
- M15: as recommended.

Should-consider:
- S1 accept: one translation at a time; library King Wen only; precomputed brush paths, no SVG filters.
- S2 accept.
- S3 accept all, including a simple "enter a cast made by hand" (six selectors).
- S4 accept.
- S5 default = Rendering once it exists (Legge until then); zh if browser language starts with zh.
- S6 accept.
- S7 accept: pilot 1, 3, 29, 52 with a glossary of formulae; poem authored in `data/poem/NN.json` (or similar) merged at build.
- S8: keep hash routing (decided). Per-route document.title, generic OG tags.
- S9 accept (GitHub Action, .nojekyll, cache-busting).
- S10 accept.
- S11 accept as far as tooling allows (browser screenshots at those widths).

Nitpicks N1–N7: accept all.
