# Phase 1 collation report

What the sources disagreed about, how each disagreement was resolved, and what OCR
damage had to be repaired. Raw machine reports are regenerated on every build in
`scripts/.cache/` (`collation-zh.txt`, `collation-legge.txt`, plus plain-text dumps
of all final slots, `dump-zh.txt` / `dump-legge.txt`). All inputs are pinned in
`scripts/provenance.json`; every post-parse correction is in `scripts/overrides.json`
(145 entries: 7 Chinese, 138 Legge; 7 whole-slot replacements, 138 substring fixes).

**Spot-check statement.** I personally spot-checked hexagrams **1, 2, 3, 29, 30, 31,
52, 63, 64** — every `zh` and `legge` slot, including 用九/用六 and the 30/31
（上經/下經， Text Section I/II) boundary — against the raw sources (Gutenberg text,
IA DjVu XML/plain text, both Wikisources) after overrides were applied. All nine
agree with their sources under the editorial policies below. I also read the full
final `zh` and `legge` dumps (all 64 × 8 slots) end to end; the Legge corrections
below come from that read plus the Wikisource collation, not from trusting the parser.

## Chinese: Gutenberg #25501 (base) vs zh Wikisource

514 slots compared (64 × judgment/image/6 lines + 2 specials), ignoring punctuation
and folding known graphic variants （无/無， 于/於， 羣/群， 遯/遁， 恒/恆）:

- **69 slots** still differ in characters; a further **178 slots** differ only in
  punctuation or folded variants (kept: Gutenberg punctuation throughout, per plan).
- Neither source names a printed edition, and the 69 are the expected mix for two
  unedited transcriptions of the received text: glyph variants （眾/衆， 御/禦，
  塗/涂， 系/繫…), synonym variants （娶/取， 既/即， 臘/昔…), small additions/
  omissions （大畜九三 吉， 渙初六 悔亡）, and a handful of outright errors on each side.
- **Resolution policy:** Gutenberg is the base text of record. Its reading is kept
  unless it is demonstrably erroneous (nonsense character, omission, or contradiction
  of the same book's 彖/小象）, in which case the Wikisource reading is adopted via
  `overrides.json` with the evidence cited. That happened **7 times**:

  | slot | PG → adopted | why |
  |---|---|---|
  | 2 上六 | 戰龍於野 → 龍戰於野 | transposition; WS + Legge ("dragons fighting") |
  | 4 卦辭 | 初噬告 → 初筮告 | 噬 "bite" for 筮 "divination"; WS + Legge |
  | 18 九三 | 幹父小有晦 → 幹父之蠱，小有悔 | 之蠱 dropped, 悔 miswritten 晦； WS + Legge + parallel 六二 |
  | 24 初九 | 不復遠 → 不遠復 | against PG's own 小象 不遠之復 and 繫辭 quote; WS agrees |
  | 48 九三 | 為我民惻 → 為我心惻 | WS + Legge ("Our hearts are sorry") |
  | 48 上六 | 有孚無吉 → 有孚元吉 | PG's own 小象 says 元吉在上； WS + Legge agree |
  | 57 卦辭 | 利攸往 → 利有攸往 | 有 dropped against PG's own 彖 quote; WS agrees |

- Wikisource-side errors kept out by the same policy include 剝上九 德車 （輿 as 德）,
  大畜六四 童牛之告 （牿 as 告）, 離九三 大耋之差 （嗟 as 差）, 晉六五 矢得 （失 as 矢）,
  艮六五 言有孚 （序 as 孚）. Notable true variants left as Gutenberg reads, for the
  record: 屯六三 既鹿 (WS 即鹿， the PLAN_REVIEW example), 革 己日 (WS 已日）,
  漸上九 于逵 (WS 于陸）, 中孚六四 月幾望 (WS 月既望）.
- Structural validation during parsing: all 384 Gutenberg line labels and all 64
  Wikisource trigram headers （震下坎上…) agree with the independent King Wen table —
  no hexagram is transposed or mirrored in either source transcription.
- Gutenberg quirks handled in the parser: hexagram 1 orders its blocks differently
  (lines before 彖/象）; hexagram 32 omits the bare name line; 文言 (1–2), 彖 and 小象
  are skipped by label/section rules; nothing from 繫辭 onward enters the corpus.

## Legge: IA DjVu OCR (base) vs en Wikisource

Source of record: IA item `I-Ching`, *Sacred Books of the East* vol. XVI (Clarendon
Press, **1882**, per the scan's title page). The printed page sets the translation in
large type above discursive notes in small type, and the plain DjVu text interleaves
the two streams page by page. The parser therefore works from the DjVu **XML** of the
same OCR and separates the streams by type size (paragraph median word height:
translation ≈ 72–76 units, notes ≈ 58–62, running heads ≈ 51), then applies the
PLAN slot map by order only. Appendix I and all notes are excluded; Appendix II
contributes only the Great Image paragraph.

Collation scope and results:

- en Wikisource's proofread Text exists for hexagrams 1–32 as main pages, but
  Hexagram 32's page is mid-migration to ProofreadPage and its inline text breaks off
  mid-line-1. Effective collation is therefore **31 hexagrams** (250 slots), Text
  only — Appendix II (all 64 Great Images) has no en Wikisource transcription and was
  verified by read-through against the Chinese 大象 instead.
- **50 of 250 slots** differed after normalization (diacritics/case/quote-style
  ignored). All but four were IA OCR faults, fixed in `overrides.json`.
- The four exceptions are Wikisource-side transcription slips; IA was kept:
  §6.3 "perchance perchance", §13.6 "representative representative",
  §17.1 "there will he good fortune", §29 judgment "mind is. penetrating"
  (words agree with the corrected IA reading).

OCR failure modes found and fixed (138 Legge overrides):

- **Romanized names garbled** by diacritic/ligature confusion: `Kfi/Ffi` (Kû/Fû),
  digits for letters (`Z4n`, `T4`, `3in/3ing/3hui`, `1s`, `If` for li), split or merged
  words (`K hwAn`, `Inthe`, `Ifthe`), dropped initials (`Aun`, `Kt`, `Lt`, `Fa`, `Yt`).
  Correct spellings were established from the Wikisource collation (1–32), clean
  occurrences elsewhere in the same scan (Great Images, the book's own Contents list,
  discursive notes — e.g. "Ting and Zing (48)", "Ta Kwang"), and Legge's consistent
  system. Per the SCHEMA policy they are stored in **plain letters** (Khwan, Hsu,
  Ki Zi…) — see "open issues" below.
- **Printer's signatures and page furniture inside sentences** (`[16] F`, `(16] H`,
  `{16} M`, trailing ` |`), running heads, and hexagram-figure OCR garbage —
  separated by the type-size filter where possible, removed by override where the
  OCR had already glued them into a translation paragraph.
- **Page-break fragmentation:** paragraphs split across pages (even between
  sentences) are rejoined, including hexagram 5 line 6, §30 judgment, §59 line 5.
  One middle fragment was lost by extraction and restored from Wikisource
  (§16 line 2 "firm as a rock…"); one leaked note sentence appended to §2's 用六
  paragraph was removed (Wikisource confirms the true ending).
- **Single-word/character OCR errors:** sich→sixth, lime→line, wovld→would,
  shali→shall, meetinz→meeting, civided→divided, mdo→mao, diffculty→difficulty,
  dissatished→dissatisfied, trigfam→trigram, plus stray punctuation (terminal `,:`
  confusions, orphan quotes, `SUCCESS` from small-caps emphasis).
- **Two larger recoveries** used the second IA scan (`cu31924060466921`, 1899) as an
  eyeball witness for the *same printed words* where the 1882 OCR drops text —
  §52 judgment ("like that of the **back**", missing in 1882 OCR) and §50 line 2's
  closing quote. The 1882 scan remains the only build input; the 1899 file was
  consulted by hand only and is not in the provenance manifest.
- Retained as printed (verified against Wikisource): Legge's parentheses everywhere,
  including the genuinely unbalanced parenthesis in §4 line 2, which the proofread
  Wikisource text reproduces exactly.

Parser warnings still emitted on every build (all reviewed, all benign or handled
above): 4 continuation/post-completion appends (§2, §5, §30, §59), 6 Great Images
accepted by formula rather than roman numeral (§29, 33, 38, 39, 52, 53 — numerals
garbled as e.g. `X XIX.`, `LIl.`), 2 discarded garbage tokens (§1 figure OCR,
§16 `_7~` number ornament).

## Open issues / judgement calls for review

1. **Plain-letter Legge names.** Storing Khwan/Hsu/Ki Zi instead of Khwăn/Hsü/Kî Zî
   is a transcription-policy choice (SCHEMA.md). It is fully reversible through
   `overrides.json` if the lead prefers restored diacritics; for 33–64 that would
   require fixing each mark by Legge's system without a proofread witness.
2. **§45 name "Zhui"** （萃） rests on OCR-graphic inference (`3hui` in both scans;
   `Z` is Legge's initial for this group, cf. Zin/Zing; Contents small-caps `Shui`
   with Z misread as S). High confidence, but it is an inference, flagged in the
   override reason.
3. **Chinese 既鹿/即鹿-type variants** follow Gutenberg as base of record (69 − 7 = 62
   character-level divergences from Wikisource remain in the shipped text by policy).
   If a named printed edition is later adopted, these are the slots to re-decide;
   the full list is in `scripts/.cache/collation-zh.txt`.
4. Legge §29 line 4's "(as his ruler's) intelligence admits" reads oddly but shows
   no OCR-garble pattern in either scan and matches Legge's interpretive style;
   left verbatim.
