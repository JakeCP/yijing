# Poem fidelity review (Phase 5, Part A)

Independent slot-by-slot review of `data/poem/NN.json` against `texts.zh` in
`data/hexagrams.json`, checked against the glossary and voice rules in
[POEM_STYLE.md](POEM_STYLE.md). Only six fault types were in scope:
mistranslation, omission, added image, glossary inconsistency, slot
misalignment, and gloss-ese. Sound lines were left alone; interpretive
choices documented in a file's `notes` were kept unless the Chinese
contradicts them. Legge was not used as evidence.

## Result

- **79 slots fixed** in 44 hexagram files: added-image 11, gloss-ese 4, glossary 17, mistranslation 32, omission 15, slot misalignment 0.
- **Slot misalignment: none.** Every line statement was in its own slot in all 64.
- **Clean (no fault found):** 1, 5, 8, 13, 15, 23, 25, 30, 31, 41, 44, 45, 49, 50, 52, 53, 54, 56, 58, 64.
- Supplied pronouns for 其/之/爾 (`his`, `your` where a pronoun is present) are the
  corpus convention and were not treated as faults; second person was removed
  only where the Chinese has no pronoun or possessive at all (e.g. 27 judgment,
  35 L6, 38 L2) or a glossary-fixed string pins the wording (不可貞).
- Remaining generic `you` as a supplied verb subject (18 L4, 44 L1, 47 L6,
  62 L3, 62 L4; 40 L4 rests on the documented 而 = 爾 reading) was left for the
  lead: the style sheet prefers no supplied subject, but each line reads
  soundly and a corpus-wide sweep would be taste, not fidelity.
- After these edits, `node scripts/build.mjs` was re-run so
  `data/hexagrams.json` carries the corrected rendering (`notes` stripped),
  and `DATA_VERSION` in `js/app.js` was bumped to `3`.

## Changes (one line each)

| HX | Slot | Type | Was → Now | Reason |
|---|---|---|---|---|
| 2 | judgment | omission | Begin greatly, and go through. / It is good to hold firm, as a mare does. / The noble one has somewhere to go: / first lost, then a master is found. / In the south-west, friends are found; / in the north-east, friends are lost. / At rest, holding firm: good. → **Begin greatly, and go through. / It is good to hold firm, as a mare does. / The noble one has somewhere to go: / first lost, then a master is found. / It is good to find friends in the south-west; / in the north-east, friends are lost. / At rest, holding firm: good.** | 利 in 利西南得朋 had no English counterpart. (元，亨，利牝馬之貞。君子有攸往，先迷後得主，利西南得朋，東北喪朋。安貞，吉。) |
| 2 | L3 | omission | A brightness held inside: hold firm. / In the king's service, perhaps — / nothing completed, yet brought to an end. → **A brightness held inside: can hold firm. / In the king's service, perhaps — / nothing completed, yet brought to an end.** | 可貞 is modal (can/may hold firm), not a bare imperative. (含章可貞。或從王事，無成有終。) |
| 3 | L1 | mistranslation | Circling a great rock. / It is good to stay and hold firm. / It is good to set up lords. → **Pacing back and forth. / It is good to stay and hold firm. / It is good to set up lords.** | 磐桓 (盤桓) is pacing/hesitating, not circling a rock. (磐桓；利居貞，利建侯。) |
| 3 | L5 | glossary | Its fat stored up. / Holding firm in small things: good. / In great things: misfortune. → **Its fat stored up. / Holding firm in small things: good. / Holding firm in great things: misfortune.** | 大貞凶 repeats 貞; restore the elided "Holding firm" parallel to 小貞吉. (屯其膏，小貞吉，大貞凶。) |
| 4 | L1 | mistranslation | To open up the untaught, / it is good to use punishments — / to strike off fetters and cords. / To go on with it: shame. → **To open up the untaught, / it is good to use punishments — / to take off fetters and shackles. / To go on with it: shame.** | 說 = 脫 "take off"; 桎梏 are shackles, not cords. (發蒙，利用刑人，用說桎梏，以往吝。) |
| 6 | judgment | glossary | There is trust, and it is blocked. / Wary, and held to the middle: good. / Pressed to the end: misfortune. / It is good to see the great person. / It is not good to ford the great river. → **There is trust, and it is blocked. / Wary, and held to the middle: good. / In the end, misfortune. / It is good to see the great person. / It is not good to ford the great river.** | 終凶 is glossary-fixed as "In the end, misfortune."; "Pressed" has no Chinese source. (有孚，窒。惕中吉。終凶。利見大人，不利涉大川。) |
| 7 | L5 | glossary | Game in the field — seize it, and speak out. / No harm. / The eldest leads the army; the younger carts corpses. / Holding firm: misfortune. → **Game in the field — it is good to seize it, and speak out. / No harm. / The eldest leads the army; the younger carts corpses. / Holding firm: misfortune.** | 利執言 takes the fixed "It is good to…" frame; bare imperative dropped 利. (田有禽，利執言，無咎。長子帥師，弟子輿尸，貞凶。) |
| 9 | L6 | glossary | Rain has come, and rest. / The wife carried on honoured virtue: holding firm, danger. / The moon is almost full. / For the noble one to march: misfortune. → **Rain has come, and rest. / The wife carried on honoured virtue. Holding firm: danger. / The moon is almost full. / For the noble one to march: misfortune.** | 貞厲 takes the colon pivot "Holding firm: danger." (既雨既處，尚德載婦，貞厲。月幾望，君子征凶。) |
| 10 | judgment | omission | Treading on the tiger's tail — / it does not bite. / It goes through. → **Treading on the tiger's tail — / it does not bite the person. / It goes through.** | 人, object of 咥, was dropped. (履虎尾，不咥人，亨。) |
| 10 | L3 | omission | One-eyed, and sees; lame, and treads. / Treading the tiger's tail: it bites. Misfortune. / A fighting man acting the great ruler. → **One-eyed, and can see; lame, and can tread. / Treading the tiger's tail: it bites the person. Misfortune. / A fighting man acting the great ruler.** | 能 (twice) and 人 were dropped. (眇能視，跛能履，履虎尾，咥人，凶。武人為于大君。) |
| 11 | L3 | mistranslation | No flat without a slope, no going without return. / Holding firm in hardship: no harm. / Do not grieve — trust holds. / In food there is blessing. → **No flat without a slope, no going without return. / Holding firm in hardship: no harm. / Do not grieve over its trust. / In food there is blessing.** | 其孚 is object of 恤 "grieve over", not subject of invented "holds". (無平不陂，無往不復，艱貞無咎。勿恤其孚，于食有福。) |
| 11 | L4 | mistranslation | Fluttering down, not rich, / with the neighbours — / no warning needed, where trust is. → **Fluttering, not rich, / with the neighbours — / no warning, through trust.** | 以孚 is "through trust"; 以 gives no "down", no "needed", no "where". (Two findings merged.) (翩翩不富，以其鄰，不戒以孚。) |
| 11 | L6 | mistranslation | The city wall falls back into the moat. / Do not use the army. / Orders go out from your own town. / Holding firm: shame. → **The city wall falls back into the moat. / Do not use the army. / Orders are announced from the town. / Holding firm: shame.** | 自 is "from"; 告 is "announce", not "go out". (城復于隍，勿用師。自邑告命，貞吝。) |
| 12 | L2 | glossary | Taking orders. / For the small person: good. / For the great person: blocked — and through. → **Taking orders. / For the small person: good. / For the great person: blocked — and goes through.** | 亨 embedded is "goes through"; bare "through" drops the verb. (包承。小人吉，大人否亨。) |
| 14 | L1 | omission | Nothing done that harms — that is not harm. / Through hardship: no harm. → **No dealings that harm — that is not harm. / Through hardship: no harm.** | 交 "dealings" was dropped; "done" has no Chinese source. (無交害，匪咎，艱則無咎。) |
| 16 | L3 | glossary | Delight with eyes raised: regret. / Slow — and there is regret. → **Delight with eyes raised: regret. / Slow — and there will be regret.** | 有悔 is glossary-fixed as "There will be regret." (盱豫，悔。遲有悔。) |
| 17 | L1 | added-image | The office changes. / Holding firm: good. / Out of the gate, dealings bear fruit. → **The office changes. / Holding firm: good. / Out of the gate, dealings have merit.** | 功 is merit; "bear fruit" adds a fruit image. (官有渝，貞吉。出門交有功。) |
| 18 | L2 | glossary | Sorting out the mother's spoiling: / you cannot hold firm. → **Sorting out the mother's spoiling: / cannot hold firm.** | 不可貞 is glossary-fixed as "cannot hold firm"; no second person. Found on editor rescan. (幹母之蠱，不可貞。) |
| 18 | L5 | mistranslation | Sorting out the father's spoiling: / used, and praised. → **Sorting out the father's spoiling: / praise follows.** | 用譽 is thereby-praised; 用 is not passive "used". (幹父之蠱，用譽。) |
| 19 | L3 | mistranslation | Coming near sweetly: / no good anywhere. / Grieve over it, and there is no harm. → **Coming near sweetly: / no good anywhere. / Already grieving over it — no harm.** | 既憂之 is "already grieving", not an imperative. (甘臨，無攸利。既憂之，無咎。) |
| 20 | judgment | added-image | Hands washed, the offering not yet made — / there is trust, grave and held high. → **Hands washed, the offering not yet made — / there is trust, in grave reverence.** | 顒若 is grave reverence; "held high" has no Chinese source. (盥而不薦，有孚顒若。) |
| 21 | L1 | mistranslation | Shoes of fetters, toes crushed. / No harm. → **Shoes of fetters, toes gone. / No harm.** | 滅 is gone/destroyed; it does not say crushed. (履校滅趾，無咎。) |
| 21 | L2 | mistranslation | Biting skin, nose crushed. / No harm. → **Biting skin, nose gone. / No harm.** | 滅 is gone/destroyed; it does not say crushed. (噬膚滅鼻，無咎。) |
| 21 | L6 | mistranslation | Shouldering fetters, ears crushed. / Misfortune. → **Shouldering fetters, ears gone. / Misfortune.** | 滅 is gone/destroyed; it does not say crushed. (何校滅耳，凶。) |
| 22 | L3 | mistranslation | Adorned, glistening. / Holding firm, long: good. → **Adorned, wet. / Holding firm, long: good.** | 濡 is wet/moist, not glistening. (賁如濡如，永貞吉。) |
| 24 | L6 | omission | Coming back, lost: misfortune, disaster on disaster. / Marching out ends in great defeat, / ruin for the ruler. Misfortune. / Ten years, and no marching again. → **Coming back, lost: misfortune, disaster on disaster. / Sending out the army ends in great defeat, / for the state's ruler: misfortune. / For ten years, unable to march.** | 師, 國, 克 were unrendered; "ruin"/"again" have no Chinese basis. (迷復，凶，有災眚。用行師，終有大敗，以其國君，凶；至于十年，不克征。) |
| 26 | image | omission | Heaven inside the mountain: Great Store. / So the noble one grows rich in former words and past deeds, / storing up virtue. → **Heaven inside the mountain: Great Store. / So the noble one knows many former words and past deeds, / storing up virtue.** | 識 "know" was dropped; "grows rich in" answers to nothing (多 = many). (天在山中，大畜；君子以多識前言往行，以畜其德。) |
| 27 | judgment | mistranslation | Holding firm: good. / Watch the jaws, / and seek what fills your own mouth. → **Holding firm: good. / Watch the jaws, / and seek for oneself what fills the mouth.** | 自 is reflexive "oneself"; there is no second person. (貞吉。觀頤，自求口實。) |
| 27 | L3 | glossary | Against the jaws: holding firm, misfortune. / Ten years, do not act. / No good anywhere. → **Against the jaws. / Holding firm: misfortune. / Ten years, do not act. / No good anywhere.** | 貞凶 takes the colon pivot "Holding firm: misfortune." (拂頤，貞凶，十年勿用，無攸利。) |
| 27 | L5 | mistranslation | Against the constant way: / staying, holding firm: good. / You cannot ford the great river. → **Against the constant way: / staying, holding firm: good. / Cannot ford the great river.** | 不可 is subjectless; supplied "You" removed. (拂經，居貞吉，不可涉大川。) |
| 28 | L6 | mistranslation | Fording too far, / the water over your head. / Misfortune — no harm. → **Fording too far, / the water over the head. / Misfortune — no harm.** | 頂 has no possessive; body parts take "the" (style sheet). (過涉滅頂，凶，無咎。) |
| 29 | L3 | glossary | Coming, going: pit, pit. / Peril for a pillow. / Down into the pit inside the pit. / Do not act. → **Coming, going: pit, pit. / Peril for a pillow. / Down into a pit inside the pit. / Do not act.** | 入于坎窞 repeats L1 verbatim; English must repeat "a pit" (parallelism rule). (來之坎坎，險且枕，入于坎窞，勿用。) |
| 32 | image | added-image | Thunder and wind: Lasting. / So the noble one stands firm / and does not change direction. → **Thunder and wind: Lasting. / So the noble one stands / and does not change direction.** | 立 is only "stands"; "firm" (貞's word) has no source. (雷風，恆；君子以立不易方。) |
| 32 | L1 | mistranslation | Sinking deep for lasting: / holding firm, misfortune. / No good anywhere. → **Digging deep for lasting. / Holding firm: misfortune. / No good anywhere.** | 浚 is transitive "dig deep" (per file note), not "sinking"; 貞凶 colon pivot restored. (Two findings merged.) (浚恆，貞凶，無攸利。) |
| 32 | L6 | added-image | Shaking lasting to pieces. / Misfortune. → **Shaking lasting. / Misfortune.** | 振 is only "shaking"; "to pieces" is added destruction. (振恆，凶。) |
| 33 | image | mistranslation | Heaven, with a mountain under it: Withdrawal. / So the noble one keeps the small person far off — / not hateful, but stern. → **Heaven, with a mountain under it: Withdrawal. / So the noble one keeps the small person far off — / without hate, but stern.** | 不惡 (惡 wù, verb) is "does not hate"; "hateful" reverses it. (天下有山，遯；君子以遠小人，不惡而嚴。) |
| 33 | L1 | glossary | At the tail of the withdrawal: danger. / Do not set out anywhere. → **At the tail of the withdrawal: danger. / Do not have somewhere to go.** | "Do not set out anywhere." is glossary-restricted to HX3 judgment; here 勿用 + 有攸往 take the plain forms. (遯尾，厲，勿用有攸往。) |
| 33 | L2 | mistranslation | Holding it fast with yellow oxhide — / nothing can tear it free. → **Holding it fast with yellow oxhide — / nothing can loosen it.** | 勝說 (說 = 脫) is loosen/shed, not tear. (執之用黃牛之革，莫之勝說。) |
| 33 | L3 | added-image | A withdrawal held back, haltered: / sickness, danger. / Keeping servants and maids: good. → **A withdrawal tied fast: / sickness, danger. / Keeping servants and maids: good.** | 係 is "tied"; no halter is in the Chinese. (係遯，有疾厲，畜臣妾吉。) |
| 33 | L4 | mistranslation | A good withdrawal: / for the noble one, good; / for the small person, blocked. → **A good withdrawal: / for the noble one, good; / for the small person, not.** | 否 negates the elided 吉; "blocked" imports 否 pǐ (HX12). (好遯君子吉，小人否。) |
| 34 | L1 | glossary | Strong in the toes. / To march: misfortune — and that is sure. → **Strong in the toes. / To march: misfortune. / There is trust.** | 有孚 is glossary-fixed as "There is trust."; "that is sure" is a local synonym. (壯于趾，征凶，有孚。) |
| 34 | L4 | mistranslation | Holding firm: good. Regret gone. / The fence breaks open, nothing stuck — / strong as the axle of a great cart. → **Holding firm: good. Regret gone. / The fence breaks open, nothing stuck — / strong in the axle of a great cart.** | 壯于 is locative "strong in" (cf. L1), not simile "as". (貞吉悔亡，藩決不羸，壯于大輿之輹。) |
| 35 | L2 | omission | Rising, and grieving. / Holding firm: good. / Great blessing received from the king's mother. → **Rising, and grieving. / Holding firm: good. / This great blessing received from the king's mother.** | 茲 "this" in 受茲介福 was dropped. (晉如，愁如，貞吉。受茲介福，于其王母。) |
| 35 | L6 | gloss-ese | Rising to the horns: / use it only to strike your own town. / Danger, good, no harm. / Holding firm: shame. → **Rising to the horns: / use it only to strike a town. / Danger, yet good: no harm. / Holding firm: shame.** | 伐邑 has no "your own"; 厲吉無咎 as comma strung verdicts is banned gloss-ese. (Two findings merged.) (晉其角，維用伐邑，厲吉無咎，貞吝。) |
| 36 | image | mistranslation | Light goes into the earth: Wounded Light. / So the noble one, among the many, / is darkened, and still bright. → **Light goes into the earth: Wounded Light. / So the noble one, presiding over the many, / uses darkness, and is still bright.** | 蒞眾 is preside over; 用晦 is active "uses darkness", not "is darkened". (明入地中，明夷；君子以蒞眾，用晦而明。) |
| 36 | L2 | omission | Wounded in the left thigh. / Rescue with a strong horse: good. → **Wounded light — wounded in the left thigh. / Rescue with a strong horse: good.** | Leading 明夷 was dropped; only the second 夷 was rendered. (明夷，夷于左股，用拯馬壯，吉。) |
| 36 | L3 | glossary | Wounded light, hunting in the south — / the great head taken. / You cannot hold firm in haste. → **Wounded light, hunting in the south — / the great head taken. / Cannot hold firm in haste.** | 不可貞 is glossary-fixed as "cannot hold firm", no second person. (明夷于南狩，得其大首，不可疾貞。) |
| 36 | L4 | omission | Into the left side of the belly, / to the heart of the wounded light — / and out by gate and courtyard. → **Into the left side of the belly, / reaching the heart of the wounded light — / and out by gate and courtyard.** | 獲 "reach/get" was dropped. (入于左腹，獲明夷之心，于出門庭。) |
| 37 | L2 | added-image | Nothing longingly pursued — / at the cooking in the middle rooms. / Holding firm: good. → **Nothing pursued — / at the cooking in the middle. / Holding firm: good.** | 遂 has no "longingly"; 中饋 has no "rooms". (無攸遂，在中饋，貞吉。) |
| 37 | L3 | gloss-ese | The household, stern, stern: / regret, danger — good. / Wife and children, laughing, laughing: / in the end, shame. → **The household, stern, stern: / regret and danger — yet good. / Wife and children, laughing, laughing: / in the end, shame.** | 悔厲吉 as "regret, danger — good." is banned comma strung gloss-ese. (家人嗃嗃，悔厲吉；婦子嘻嘻，終吝。) |
| 37 | L5 | glossary | The king comes to have a household. / Do not grieve: good. → **The king comes to the household. / Do not grieve: good.** | 王假有家 parallels fixed 王假有廟 "comes to the temple"; 假 gé is arrival, not acquiring. (王假有家，勿恤吉。) |
| 38 | L2 | mistranslation | Meeting your lord in a lane. / No harm. → **Meeting the lord in a lane. / No harm.** | 主 has no possessive; "your" is supplied. (遇主于巷，無咎。) |
| 38 | L3 | omission | A cart dragged back, / its ox pulled up short; / the man branded, his nose cut off. / No beginning — there is an end. → **Seen: a cart dragged back, / its ox pulled up short; / the man branded, his nose cut off. / No beginning — there is an end.** | 見, governing verb of 見輿曳, was dropped. (見輿曳，其牛掣，其人天且劓，無初有終。) |
| 38 | L5 | mistranslation | Regret gone. / Your kin bite through the skin. / Going: what harm? → **Regret gone. / His kin bite through the skin. / Going: what harm?** | 厥 is third-person possessive, not "your". (悔亡，厥宗噬膚，往何咎。) |
| 38 | L6 | omission | Estranged, alone: a pig carrying dirt, a cartload of ghosts. / First the bow is drawn on them, then the bow is laid down. / Not raiders: suitors. / Going, and meeting rain: good. → **Estranged, alone: seeing a pig carrying dirt, a cartload of ghosts. / First the bow is drawn on them, then the bow is laid down. / Not raiders: suitors. / Going, and meeting rain: good.** | 見 in 見豕負塗 was dropped; the mis-seeing is the point (cf. 匪寇婚媾). (睽孤，見豕負塗，載鬼一車，先張之弧，後說之弧，匪寇婚媾，往遇雨則吉。) |
| 39 | image | mistranslation | Water on the mountain: Limping. / So the noble one turns back on himself / and mends his virtue. → **Water on the mountain: Limping. / So the noble one turns back to himself / and mends his virtue.** | 反身 is turning back to oneself; "turns back on himself" means betrays himself. (山上有水，蹇；君子以反身修德。) |
| 39 | L3 | gloss-ese | Going on limps; coming, turn back. → **Going: limping. Coming: turning back.** | Match the 往蹇來… refrain of L1/L6; "Going on limps" does not parse; 來反 is not imperative. (往蹇來反。) |
| 39 | L4 | gloss-ese | Going on limps; coming, join together. → **Going: limping. Coming: joining.** | Match the 往蹇來… refrain of L1/L6; 來連 is not imperative. (往蹇來連。) |
| 40 | L2 | mistranslation | In the field, three foxes caught, / a yellow arrowhead found. / Holding firm: good. → **In the field, three foxes caught, / a yellow arrow found. / Holding firm: good.** | 矢 is the whole arrow, not the head. (田獲三狐，得黃矢，貞吉。) |
| 40 | L5 | mistranslation | Only the noble one can untie: good. / There is trust, even with the small person. → **Only the noble one can untie: good. / There is trust with the small person.** | 有孚于小人 carries no concessive "even". (君子維有解，吉；有孚于小人。) |
| 42 | L2 | glossary | Someone adds to it — / a tortoise of ten strings, not to be refused. / Holding firm, long: good. / The king offers to the god on high: good. → **Someone adds to it — / a tortoise worth ten strings of cowries — cannot be refused. / Holding firm, long: good. / The king offers to the god on high: good.** | 十朋之龜弗克違 repeats 41 L5 verbatim, so the English must repeat; 克 needs "cannot". (或益之，十朋之龜弗克違，永貞吉。王用享于帝，吉。) |
| 42 | L4 | mistranslation | Walking the middle: / tell the duke — he follows. / It is good to use this, in trust, / to move the state. → **Walking the middle: / tell the duke — he follows. / It is good to use this support / to move the state.** | 依 is support/reliance, not 孚 "trust". (中行，告公從。利用為依遷國。) |
| 43 | judgment | mistranslation | Held up in the king's court, / trust cried aloud. There is danger. / Word goes out from your own town: / it is not good to go straight to arms. / It is good to have somewhere to go. → **Held up in the king's court, / trust cried aloud. There is danger. / Word is announced from the town: / it is not good to go straight to arms. / It is good to have somewhere to go.** | 告自邑： 自 is "from" and 告 is "announce", as fixed at 11 L6 自邑告命； kept consistent. (揚于王庭，孚號，有厲，告自邑，不利即戎，利有攸往。) |
| 46 | L6 | added-image | Climbing in the dark: / good in nothing but unceasing holding firm. → **Climbing in the dark: / It is good to hold firm without ceasing.** | 利于…貞 has no exclusive; "nothing but" has no 唯/但/無 behind it. (冥升，利于不息之貞。) |
| 47 | L3 | omission | Hemmed in by stone, / leaning on thorns. / Into your own palace — / and your wife not there. Misfortune. → **Hemmed in by stone, / leaning on thorns. / Into your own palace — / and your wife not seen. Misfortune.** | 不見 is "not seen"; 見 was dropped for an unspoken "there". (困于石，據于蒺藜，入于其宮，不見其妻，凶。) |
| 48 | image | mistranslation | Water up in the trees: Well. / So the noble one toils with the people, / urging them to help each other. → **Water up in the trees: Well. / So the noble one comforts the people, / urging them to help each other.** | 勞民 is verb–object (勞 lào, comfort); no comitative "with". (木上有水，井；君子以勞民勸相。) |
| 51 | judgment | added-image | It goes through. / Thunder comes, shock upon shock — / and laughter and talk again. / Thunder startles a hundred miles; / the sacrificial ladle is not dropped. → **It goes through. / Thunder comes, shock upon shock — / and laughter and talk. / Thunder startles a hundred miles; / the sacrificial ladle is not dropped.** | 笑言啞啞 has no "again" (後 is only in L1). (亨。震來虩虩，笑言啞啞。震驚百里，不喪匕鬯。) |
| 51 | L6 | mistranslation | Thunder: shrinking back, eyes darting. / To march: misfortune. / It strikes not you but your neighbour: no harm. / Over marriages, there is talk. → **Thunder: shrinking back, eyes darting. / To march: misfortune. / Thunder not at the body, at the neighbour's: no harm. / Over marriages, there is talk.** | 其躬 is "the body", not "you"; 震…于 places thunder, does not say "strikes". (震索索，視矍矍，征凶。震不于其躬，于其鄰，無咎。婚媾有言。) |
| 55 | L4 | mistranslation | Fullness screened off: / at midday the Dipper is seen. / Meeting his lord in the half-light: good. → **Fullness screened off: / at midday the Dipper is seen. / Meeting the lord, his equal: good.** | 夷主 is the level/equal lord (parallel 配主, L1); no word for light in the slot. (豐其蔀，日中見斗，遇其夷主，吉。) |
| 57 | image | omission | Wind upon wind: Wind. / So the noble one repeats the charge / and carries business through. → **Wind following wind: Wind. / So the noble one repeats the charge / and carries business through.** | 隨 is "following"; there is no "upon" (上). (隨風，巽；君子以申命行事。) |
| 57 | L2 | omission | Yielding, under the bed, / with scribes and shamans in hosts. / Good. No harm. → **Yielding, under the bed, / using scribes and shamans in hosts. / Good. No harm.** | 用 governs 史巫 as verb "using"; "with" drops it. (巽在床下，用史巫紛若，吉無咎。) |
| 59 | L4 | added-image | Scattering the flock: great good. / Scattered, they make a hill — / more than common minds could think. → **Scattering the flock: great good. / Scattered, there is a hill — / not what is commonly thought.** | 有 is "there is" (no "they make"); 匪 is plain negation (no "more than"); 思 has no "minds". (渙其群，元吉。渙有丘，匪夷所思。) |
| 59 | L5 | mistranslation | Scattering like sweat, his great cry goes out; / scattering from where the king lives. / No harm. → **Scattering like sweat, his great cry goes out; / scattering the king's dwelling. / No harm.** | 王居 is object of 渙 (parallel 渙其群); no "from"; 居 is "dwelling", not "lives". (渙汗其大號，渙王居，無咎。) |
| 60 | judgment | glossary | It goes through. / Bitter measure: you cannot hold firm. → **It goes through. / Bitter measure: cannot hold firm.** | 不可貞 is glossary-fixed as "cannot hold firm"; no subject "you". (亨。苦節不可貞。) |
| 60 | L6 | glossary | Bitter measure: / holding firm, misfortune. / Regret gone. → **Bitter measure. / Holding firm: misfortune. / Regret gone.** | 貞凶 takes the colon pivot "Holding firm: misfortune." (苦節，貞凶，悔亡。) |
| 61 | L1 | added-image | At rest and prepared: good. / Anything else is not rest. → **Prepared: good. / Anything else is not rest.** | 虞 alone is preparedness; "rest" belongs to 燕 only. (虞吉，有他不燕。) |
| 61 | L2 | added-image | A crane crying in the shade; / its young answer it. / I have a good cup of wine — / I will share it with you, to the dregs. → **A crane crying in the shade; / its young answer it. / I have a good cup of wine — / I will share it with you.** | 靡之 is only "share it"; "to the dregs" answers to nothing. (鳴鶴在陰，其子和之，我有好爵，吾與爾靡之。) |
| 62 | L4 | glossary | No harm. / Not passing, you meet it. / Going: danger — take warning. / Do not act on holding firm for ever. → **No harm. / Not passing, you meet it. / Going: danger — take warning. / Do not hold firm, long.** | 勿用永貞 is object form "Do not…" + 永貞 "holding firm, long"; 永 is "long", not "for ever". (無咎，弗過遇之。往厲必戒，勿用永貞。) |
| 63 | L5 | mistranslation | The eastern neighbour slaughters an ox; / it is nothing beside the western neighbour's simple offering, / which truly receives the blessing. → **The eastern neighbour slaughters an ox; / it does not match the western neighbour's simple offering, / which truly receives the blessing.** | 不如 is comparative "not equal to"; "nothing beside" overstates it. (東鄰殺牛，不如西鄰之禴祭，實受其福。) |

## Reviewer disagreements / judgment calls

- 11 L4, 32 L1 and 35 L6 each raised two findings on one slot; merged above.
- 33 L1: "Do not have somewhere to go." reads plainly but awkwardly. It is what
  the glossary prescribes once the HX3 idiom is not generalised; flagged for
  the lead rather than silently re-idiomatised.
- 55 L4 夷主: rendered "the lord, his equal" (夷 = level, parallel 配主 in L1),
  replacing an unsupported "in the half-light". Other readings exist; the file
  note should be re-checked against this.
- 38 L5 厥: rendered "His" (third person, corpus convention), not "Their".
- 63 L5 不如: rendered "does not match" (reviewer proposed "does not equal").
- 18 L2 and 43 judgment were found on the editor's rescan after the batch
  reviews (glossary-fixed 不可貞; consistency of 自邑/告 with 11 L6).

## Follow-up: 有攸往 family re-rendered (desktop-design)

The "have somewhere to go" family read awkwardly, so the whole family was
re-rendered on "set out" (glossary in POEM_STYLE.md updated to match).
This also resolves the flagged 33 L1 awkwardness above: both 勿用有攸往
slots (3 judgment, 33 L1) now read "Do not set out." 無攸利 keeps
"No good anywhere." unchanged (4 L3, 19 L3, 25 L6, 27 L3, 32 L1, 34 L6,
45 L3, 54 judgment/L6, 64 judgment). After these edits
`node scripts/build.mjs` was re-run and `DATA_VERSION` in `js/app.js`
was bumped to `4`.

| HX | Slot | Was → Now |
|---|---|---|
| 2 | judgment | The noble one has somewhere to go: → **The noble one sets out:** （君子有攸往） |
| 3 | judgment | Do not set out anywhere. → **Do not set out.** （勿用有攸往； 03 note updated to match) |
| 14 | L2 | Having somewhere to go: → **Setting out:** （有攸往） |
| 22 | judgment | It is a little good / to have somewhere to go. → **It is a little good / to set out.** （小利有所往） |
| 23 | judgment | It is not good to have somewhere to go. → **It is not good to set out.** （不利有攸往） |
| 24 | judgment | It is good to have somewhere to go. → **It is good to set out.** （利有攸往） |
| 25 | judgment | It is not good to have somewhere to go. → **It is not good to set out.** （不利有攸往） |
| 25 | L2 | then it is good to have somewhere to go. → **then it is good to set out.** （則利有攸往） |
| 26 | L3 | It is good to have somewhere to go. → **It is good to set out.** （利有攸往） |
| 28 | judgment | It is good to have somewhere to go. → **It is good to set out.** （利有攸往） |
| 32 | judgment | It is good to have somewhere to go. → **It is good to set out.** （利有攸往） |
| 33 | L1 | Do not set out anywhere. → **Do not set out.** （勿用有攸往） |
| 36 | L1 | He has somewhere to go; → **He sets out;** （有攸往） |
| 40 | judgment | With nowhere to go, / coming back: good. / With somewhere to go: → **Not setting out, / coming back: good. / Setting out:** （無所往 / 有攸往 pair kept as a pair) |
| 41 | judgment, L6 | It is good to have somewhere to go. → **It is good to set out.** （利有攸往， twice) |
| 42 | judgment | It is good to have somewhere to go. → **It is good to set out.** （利有攸往） |
| 43 | judgment | It is good to have somewhere to go. → **It is good to set out.** （利有攸往） |
| 44 | L1 | With somewhere to go, you meet misfortune. → **Setting out, you meet misfortune.** （有攸往，見凶） |
| 45 | judgment | It is good to have somewhere to go. → **It is good to set out.** （利有攸往） |
| 57 | judgment | It is good to have somewhere to go. → **It is good to set out.** （利有攸往） |

