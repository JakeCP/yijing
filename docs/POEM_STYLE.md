# Poem rendering — voice, glossary, names

Phase 4 style sheet for the `poem` translation ("A rendering").
Source of record is the Chinese in `data/hexagrams.json` (`texts.zh`).
Legge is a collation witness only; wording is never taken from him.
Slot shapes are defined in [SCHEMA.md](SCHEMA.md); the rendering brief is in
[PLAN.md](PLAN.md) (the `poem` rendering paragraph).

Pilot: hexagrams 1, 3, 29, 52 in `data/poem/`. Batches of 8 follow this sheet.
Any change to a glossary rendering is changed here first, then in every file
already written — no local synonyms for a fixed formula.

## Voice

Spare, modern, imagistic English verse. The Chinese is mostly concrete —
dragons, deer, jars, toes, thorns — plus terse mantic verdicts （吉， 凶， 無咎）.
Keep both registers: physical images at full strength, verdicts as short tags.
Do not explain an image, moralise it, or turn it into advice.

- Concrete first. If the text says fat, mud, a window, a tail, keep fat, mud,
  window, tail. Never upgrade a thing into an abstraction ("bounty",
  "adversity", "revelation") unless the Chinese is itself abstract.
- Short words, plain syntax. Prefer Anglo-Saxon monosyllables where they are
  accurate. Cut every word that only smooths.
- Fragments are allowed. The Chinese drops subjects and verbs; English verse
  may too. A fragment that matches the Chinese beats a padded full sentence.
- No added imagery. No metaphors, landscapes, seasons, or feelings that are
  not in the slot. Review test: every English content word answers to a
  Chinese content word, or is listed as supplied grammar (see Mechanics).
- Parallelism in, parallelism out. Where the Chinese repeats a structure or a
  whole phrase (refrains, body sequences, 利… / 不利… pairs), repeat the same
  English words. Variation for elegance is a fault here.

### Banned

- New-Age and self-help tone. Banned words and frames include: *the universe,
  cosmic, energy* (as a vibe), *journey* (as self-improvement metaphor;
  literal travel is 旅 "travelling"), *destiny, fate* (unless rendering 命，
  which is a charge/decree, not fate), *soul, spiritual, inner truth, higher
  self, lesson, growth, abundance, manifest, synchronicity, shadow work*.
- Advice-column voice. No "you should", no second-person supplied where the
  Chinese has no subject, no reassurance ("all will be well"), no turning a
  verdict into a tip.
- Archaism. No *thee/thou/doth/hath*, no *o'er, ere, lo, behold*, no
  fortune-teller diction (*auspicious, inauspicious, felicitous, portent*).
- Victorians, ours or Legge's. No *superior man, inferior man, correct and
  firm, good fortune, evil* (as verdict), *advantageous, there will be
  occasion for repentance*, and no Legge line preambles ("In the first line,
  undivided, we see its subject as…").
- Wilhelm/Baynes signatures. No *The Creative, The Receptive, perseverance
  furthers, no blame, the great man, inner truth, the time* as a mystic noun.
  (Plain shared words — heaven, earth, danger, good — are not signatures.)
- Rhyme bought with padding. No end-rhyme scheme. Sound comes from phrase
  length and repetition; if two lines happen to echo, fine — never bend a
  word to make them.

## Mechanics

- **Slots and length.** Judgment: a few verse lines. Image: 2–4 lines.
  Each line statement: 1–4 short lines. Special （用九/用六）: like a line
  statement. A verse line is one breath — usually one clause or image.
  A verdict （吉， 無咎) normally gets a line or half-line of its own.
- **Line breaks** are meaning breaks: image / turn / verdict. Do not break
  mid-phrase for looks. Lineation may vary; glossary *wording* may not.
- **Capitals.** Sentence capitals only. A verse line that continues a sentence
  begins lower-case. `heaven`, `earth` are lower-case mid-line (see
  glossary); capitals appear only at sentence starts and in `name_en`.
- **Punctuation.** Modern, minimal. Colon for name labels and verdict pivots
  ("Going: good."), em dash for a held breath or turn, full stop at slot end.
  No semicolons inside a verse line if a line break will do.
- **Spelling.** British, as in the other docs (*favours, favourable,
  honoured, practises* for the verb).
- **Pronouns and supplied words.** Chinese 其/之 and dropped subjects are
  rendered by structure, not by padding. Do not supply *you, he, she* for a
  generic subject. Body parts take *the* ("Stilling the back"), not a
  gendered possessive. Where a pronoun is unavoidable and the referent is
  human-generic, use singular *they*. Small supplied verbs (*come, get, keep*)
  are allowed only where English has no fragment equivalent; note any that
  carry meaning in the file's `notes`.
- **Tense.** Present and fragment by default. Future only where the verdict
  is predictive and English needs it （有悔 "There will be regret.").
- **Numbers and measures** are written out (*ten years, three years*), as in
  the Chinese. Ritual vessels get plain equivalents (*jar, vessels, bowls*);
  where the equivalent is approximate （簋）, `notes` says so.
- **Ambiguity.** Keep the literal ambiguous image; argue the reading in
  `notes`, not in the verse. Never footnote inside a verse line, and no
  brackets or parentheses in verse text.

## File format (`data/poem/NN.json`)

One file per hexagram, `NN` zero-padded King Wen number. UTF-8 JSON,
2-space indent, trailing newline. Keys in this order:

```json
{
  "number": 1,
  "name_en": "Heaven",
  "judgment": ["…"],
  "image": ["…"],
  "lines": [["…"]],
  "special": ["…"],
  "notes": { "judgment": "…", "L1": "…" }
}
```

- `judgment`, `image`, `special` are arrays of verse lines (strings, no `\n`);
  `lines` is an array of 6 such arrays, bottom→top (`lines[0]` = Line 1).
  Together with `name_en` this is exactly SCHEMA.md's `texts.poem` object
  plus the hexagram's English name, for the build to merge.
- `special` is the verse array for hexagrams 1–2, `null` for the other 62.
- `notes` is review-only and never displayed; the build must strip it.
  Keys: `name_en`, `judgment`, `image`, `L1`…`L6` (for `lines[0]`…`lines[5]`),
  `special`. Only slots with an interpretive choice need a note. Notes name
  the Chinese characters at issue and the rejected alternative in a phrase.
- Verse slots contain no CJK characters and no markup. Chinese belongs in
  `notes` only.

## Glossary — fixed renderings

Use exactly these words for these formulae, inflected only for grammar
(capital at sentence start, verb agreement). "Verdict" lines keep the colon
pivot where shown. The base text writes 無 throughout; 无 in other editions
is the same word and takes the same rendering.

### Core mantic words

| Chinese | Rendering | Why (one line) |
|---|---|---|
| 元 | Great | 元 is head/first/source; "great" keeps primacy without "supreme" inflation. |
| 亨 | goes through / through | An offering received, a passage opening — physical "through", not abstract "success". |
| 小亨 | goes through a little | Same verb, small measure kept; no separate word invented. |
| 利 | favours / favourable | Circumstances favour an act (harvest-cut benefit); not moral "advantage". |
| 不利 | does not favour / no favour in | Straight negation of 利; never softened to "unwise". |
| 貞 | hold firm / holding firm | What divination fixes, held to; not "correct" （正） nor endurance-cliché "perseverance". |
| 元亨利貞 | Great, through, favourable — hold firm. | Four mantic words kept as four beats; wording fixed, line breaks may vary. |
| 元亨 | Great, and through. | Built from the fixed parts; no fused paraphrase. |
| 利貞 | Favours holding firm. | Fixed phrase from fixed parts; never "perseverance furthers". |
| 吉 | Good. | Single-word verdict; no luck machinery ("good fortune") added. |
| 元吉 / 大吉 | Great good. | 元 adds firstness, 大 size; English "great" honestly covers both. |
| 終吉 / 終凶 | In the end, good. / In the end, ill. | 終 is outcome at the end, kept temporal and plain. |
| 凶 | Ill. | The outcome is ill; "evil" imports a moral agent the text does not name. |
| 厲 | danger / Danger. | Grindstone-pressing threat; distinct from terrain-word 險 "peril". |
| 險 | peril / perilous | Steep, exposed ground （坎險）; kept for the place-word, not merged with 厲. |
| 吝 | shame / Shame. | A grudging outcome that diminishes; distinct from regret （悔） and ill （凶）. |
| 貞吉 | Holding firm: good. | Colon verdict: the holding stated, the outcome tagged — no supplied "if". |
| 貞凶 | Holding firm: ill. | Same frame as 貞吉； the pair must stay visibly a pair. |
| 貞厲 | Holding firm: danger. | Same frame; danger is present threat, not final outcome. |
| 貞吝 | Holding firm: shame. | Same frame; completes the 貞 + verdict set without new syntax. |
| 永貞 / 利永貞 | holding firm long / Favours holding firm, long. | 永 is length of time laid after the fixed phrase, not "eternal firmness". |
| 利居貞 | Favours staying, holding firm. | 居 is stay/dwell; staying is the act favoured, holding firm its manner. |
| 不可貞 | cannot hold firm | Prohibition kept as inability of the course, not a moral ban. |
| 悔 / 有悔 | regret / There will be regret. | Plain human regret; never "repentance" (no sin/confession frame). |
| 悔亡 | Regret gone. | 亡 = gone/lost: regret that was there leaves — unlike 無悔. |
| 無悔 | No regret. | Absence, not departure; the 悔亡/無悔 contrast must survive. |
| 無咎 （无咎） | No harm. | 咎 is fault landing as harm; not inner "blame", guilt, or "error". |
| 何咎 | What harm? | Rhetorical question kept as a question, same noun as 無咎. |
| 無不利 | Nothing unfavourable. | Double negative preserved; never flattened to "everything favourable". |
| 無攸利 | No favour anywhere. | 攸 = anywhere (cf. 有攸往）; stronger and vaguer than 無不利, kept distinct. |

### Going, crossing, acting

| Chinese | Rendering | Why (one line) |
|---|---|---|
| 有攸往 | having somewhere to go | 攸 is a where; literal "somewhere" keeps the destination open. |
| 利有攸往 | Favours having somewhere to go. | Fixed phrase; never "furthers to have a goal". |
| 不利有攸往 | Does not favour having somewhere to go. | Straight negation, same somewhere. |
| 往 / 來 | going, go / coming, come | Plain direction words; verdicts stay tags ("Going: good."). |
| 征 | march | 征 is a punitive expedition, not generic travel; kept military. |
| 行 | go, walk, move (by syntax) | Feet first; 行有尚 (29) is "Going is honoured." （尚 = honoured/valued). |
| 利涉大川 | Favours fording the great river. | 涉 is wading a crossing, hence "ford"; 大川 one great river, kept singular. |
| 不利涉大川 | Does not favour fording the great river. | Same crossing, negated; the pair must mirror exactly. |
| 勿用 (standalone) | Do not act. | Mantic prohibition with no object: refrain from action/employment. |
| 勿用 + verb phrase | Do not + verb | Object cases stay literal （勿用取女 "Do not take the woman."). |
| 勿用有攸往 (3, J) | Do not set out anywhere. | One idiom for the fused phrase; glossed in 03 notes, not generalised. |
| 見 | see; (read xiàn) appear | 見龍 is the dragon appearing; 利見大人 is seeing — syntax decides, notes mark it. |
| 利見大人 | Favours seeing the great person. | An audience in plain words; no "meeting with" padding. |
| 有孚 / 孚 | There is trust. / trust | Trust as credit held between people; not private "sincerity" or "inner truth". |
| 用見大人 (46) | Seek to see the great person. | 用 here is purposive (thereby see), kept distinct from 利見 by "seek". |

### People, powers, world-words

| Chinese | Rendering | Why (one line) |
|---|---|---|
| 大人 | the great person | A person with stature and power to act; 人 is person — not "man", sage, or "superior". |
| 君子 | the noble one | Lord's son become model actor; "noble" keeps the root without class import. |
| 小人 | the small person | Literal small against great; petty scope, not an "inferior" caste. |
| 王 | the king | Plain title, no paraphrase. |
| 先王 | the early kings | Ancestor-kings of the Image layer; "early" keeps time, not bureaucracy. |
| 王假有廟 | The king comes to the temple. | 假 here reads gé "comes to"; arrival kept, borrowings noted per file. |
| 侯 / 諸侯 | a lord, lords / the lords | Enfeoffed lords in plain English; no "feudal princes". |
| 建侯 | setting up lords | 建 is set up/establish; helpers installed, not "appointing officials". |
| 丈人 (7) | the elder | A senior of experience (army context), kept distinct from 大人/君子. |
| 帝 / 上帝 | Di (in names, e.g. Di Yi) / the god on high | A high ancestral power distinct from 天； lower-case "god" avoids importing God. |
| 天 | heaven | Sky as ordering power; lower-case avoids Heaven the afterlife. |
| 地 | earth | Ground/earth lower-case, paired with heaven. |
| 心 | heart | Thinking-feeling centre in one word; no mind/heart split supplied. |
| 德 | virtue | Character that works, in Image-layer moral contexts （德行）; not "power". |
| 道 | road / way (lower-case, by syntax) | A literal road stays a road; never capped as "the Way". |
| 女子 / 女 | the girl / the woman (by age in story) | Plain age words; no "maiden", "lady", or "young woman" padding. |

### The Image formula （大象）

The 大象 is later commentary （象傳）, labelled as such in the UI; render it
in the same voice, without archaising to mark the layer. Fixed frame:

- Image statement, then the hexagram name as a label after a colon where the
  Chinese names it: "Clouds and thunder: Sprouting."
- Pivot kept identical in all 64: "The noble one, by this," （君子以）,
  "The early kings, by this," （先王以）, "The great person, by this," （大人以）.
  以 is "by this / thereby" — never "in accordance with this".
- The closing action stays concrete: sorting threads, eating and drinking,
  closing passes. Do not gloss it into government, character, or advice.

## English hexagram names (`name_en`)

Short, ours, and never Wilhelm's — not his exact titles, and not close
paraphrases of them (*Keeping Still* → ~~Keeping Quiet~~ is still his).
The name is the browsing title (PLAN.md M10) and must read well beside the
Chinese name and pinyin at small size.

- Length: one word preferred, two allowed, three the maximum. No leading
  "The". Title Case for the content word(s); no other ornament.
- Translate what the Chinese name means *as used in its own judgment and
  lines*, not what later commentary made of it. If the name is an action,
  use the action ("Sprouting", "Stilling"); if it is a thing or a doubled
  trigram, use the thing ("Heaven", "Pit").
- Prefer a concrete noun or verb-form over an abstract -ness/-tion/-ity
  noun or an adjective personified as a force ("The Creative"). Take the
  abstraction only when the Chinese name is itself abstract and no concrete
  word in the text carries it.
- No pinyin as the English name, no untranslated Chinese, no added
  explanations in parentheses. Ambiguity in the Chinese name is argued in
  `notes` under `name_en`, not hedged in the title.
- The 64 names must be mutually distinct and must not collide in a confusing
  pair (check near-synonyms across the whole list before a batch lands).
- Trigrams, when their `name_en` is filled, take their natural images on the
  same principles: Heaven, Earth, Thunder, Wind, Water, Fire, Mountain,
  Marsh （澤）. Provisional until the batch that first needs them; single
  image nouns inevitably coincide with other translations and are not
  treated as signatures.

### Pilot names

| n | Chinese | `name_en` | Why |
|---|---|---|---|
| 1 | 乾 Qián | Heaven | Doubled trigram whose image is heaven; the thing named, not a force ("Creative"). |
| 3 | 屯 Zhūn | Sprouting | 屯 is a sprout forcing the ground (its gather/store sense is noted in 03). |
| 29 | 坎 Kǎn | Pit | 坎 is the pit/trap itself; water is its trigram image, "abyss" its commentary fate. |
| 52 | 艮 Gèn | Stilling | 艮 is used as a verb through the text (stilling toes, waist, jaws); mountain stays in the Image. |

## Line-label convention

Poem files store **no line labels** — exactly as `zh` and `legge` slots store
none (SCHEMA.md). Labels are generated from `bits` + position by the table
in PLAN.md M4 and are a display concern only.

- In files, reviews, and notes, refer to lines bottom→top as `L1`–`L6`
  (= `lines[0]`–`lines[5]`), plus the Chinese label where it matters:
  e.g. `L3 （六三）`. In prose for readers: "Line 1" … "Line 6".
- Never write Legge-style preambles into verse ("In the second line,
  divided, …"), and never put a label, number, or position word inside a
  verse string.
- `special` is referred to as 用九 (hexagram 1) / 用六 (hexagram 2); in
  notes, just `special`. Its verse contains the statement only, without the
  用九/用六 prefix — as the stripped `zh` slot does.
- Judgment and image verses likewise contain no "Judgment:" / "Image:"
  prefixes and do not repeat the hexagram name, except where the Chinese
  itself contains it （習坎 in 29's judgment; the name label in Images).

## Review checklist (each batch)

1. Read the Chinese slot first, the English second. Legge last, if at all —
   and only to check a variant reading, never for wording.
2. Account for every Chinese content character. List supplied English words;
   each must be grammar, a glossary inflection, or flagged in `notes`.
3. Search the batch for banned words and for glossary drift (same Chinese
   formula, different English). Refrains must match word for word.
4. Check lengths: image 2–4 lines, each line statement 1–4, judgment a few.
   Check no verse string contains CJK, brackets, or a label.
5. Read aloud. Cut any word whose removal loses nothing. If a line only
   works as prose explanation, re-break it around its image and verdict.
6. Confirm `name_en` against the name policy and the full 64-name list so
   far; confirm `notes` covers every non-literal choice in the file.
