// About page copy, loaded lazily by app.js only on the #/about route
// (keeps the long static text out of every other route's JS).

export function aboutHtml() {
  return `<div class="view about-body">
    <h1 class="page-title" tabindex="-1">About this book</h1>
    <p class="lede">A quiet Yijing <span lang="zh-Hant">易經</span> — the Book of Changes — for the web.
    No accounts, no advertisements, no tracking: casting happens entirely on your device.</p>

    <h2>What the Yijing is</h2>
    <p>The Yijing is one of the oldest books in the world: a divination manual built from
    sixty-four hexagrams — figures of six broken (<span lang="zh-Hant">陰</span>) and unbroken
    (<span lang="zh-Hant">陽</span>) lines. A cast is made line by line, from the bottom up. Some
    lines are “old” — about to change into their opposite — and flipping those gives a second,
    relating hexagram (<span lang="zh-Hant">之卦</span>, zhī guà), the shape the moment is turning into.</p>
    <p>The book was not written at once. Its layers are labelled honestly on every page here:</p>
    <table>
      <tr><th scope="row">The Judgment <span lang="zh-Hant">卦辭</span> and the Lines <span lang="zh-Hant">爻辭</span></th>
          <td>The Zhou core, roughly 9th–8th century BCE. Terse oracular statements.</td></tr>
      <tr><th scope="row">The Image <span lang="zh-Hant">大象</span></th>
          <td>From the <span lang="zh-Hant">象傳</span>, one of the “Ten Wings” — commentaries added centuries
          later (Warring States to Han). Moral reflections on each figure.</td></tr>
      <tr><th scope="row"><span lang="zh-Hant">用九</span> / <span lang="zh-Hant">用六</span></th>
          <td>Seventh statements for hexagrams 1 and 2 only, read when all six lines change.</td></tr>
    </table>
    <p>This site is offered <em>for reflection</em> — a way of sitting with a question and an
    old image for a while. It is not advice, and it does not predict the future. For decisions
    about health, money, or law, please talk to a person qualified to help.</p>

    <h2>How casting works here</h2>
    <p>Each line is one of four values: 6 old yin (changing), 7 young yang, 8 young yin,
    9 old yang (changing).</p>
    <table>
      <tr><th scope="row">Three coins</th>
          <td>Character side counts 3, blank side 2. The three coins sum to 6, 7, 8, or 9
          with chances 1/8, 3/8, 3/8, 1/8.</td></tr>
      <tr><th scope="row">Yarrow stalks</th>
          <td>Forty-nine stalks are divided and counted off three times (“the three changes”);
          what remains — 36, 32, 28, or 24 — is divided by four. This site samples
          <em>the conventional yarrow odds</em> directly: 1/16, 5/16, 7/16, 3/16 for 6, 7, 8, 9.
          When a division is shown, it is a true division consistent with the numbers drawn.</td></tr>
      <tr><th scope="row">By hand</th>
          <td>Cast with real coins or stalks, then enter the six numbers on the cast page.</td></tr>
    </table>
    <p>Randomness comes from your browser’s cryptographic generator. When several lines
    change, older commentators gave rules for choosing among them; this site shows every
    changing line equally and lets you weigh them. If all six lines change in hexagram 1 or 2,
    the special <span lang="zh-Hant">用九</span> / <span lang="zh-Hant">用六</span> statement is the primary text.</p>
    <p>Every reading has its own address, like <code>#/r/c789876</code>: the letter is the
    method (<code>c</code> coins, <code>y</code> yarrow, <code>m</code> by hand) and the six
    digits are the line values from the bottom. A reading can be shared by sharing that link.
    Your question is never in the link and never leaves your device — it is kept only for this
    visit and is cleared when you cast again.</p>

    <h2>Sources &amp; licences</h2>
    <table>
      <tr><th scope="row"><span lang="zh-Hant">原文</span> — the Chinese text</th>
          <td>The received <span lang="zh-Hant">易經</span> (Zhou core and <span lang="zh-Hant">大象傳</span>),
          via Project Gutenberg #25501, collated against zh Wikisource. Public domain.</td></tr>
      <tr><th scope="row">James Legge (1882)</th>
          <td><em>Sacred Books of the East</em> vol. 16, first edition (Oxford, 1882), transcribed
          from Internet Archive page scans. Legge’s parentheses are his supplied wording,
          kept verbatim. Public domain.</td></tr>
      <tr><th scope="row">A rendering</th>
          <td>An original poetic rendering written for this site from the Chinese text above,
          with its own short English hexagram names. It is the default English text;
          switches to <span lang="zh-Hant">原文</span> or Legge hold for your next visit.
          © the site authors, licensed under
          <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</td></tr>
      <tr><th scope="row">Type</th>
          <td>EB Garamond and Noto Serif TC, self-hosted subsets under the SIL Open Font
          License 1.1 (licence files ship with the fonts). This page makes no requests
          to third parties at all.</td></tr>
      <tr><th scope="row">Code &amp; seal</th>
          <td>Site code is MIT (see <code>LICENSE</code>); the seal mark is CC BY 4.0
          (see <code>LICENSE-content.md</code>).</td></tr>
    </table>

    <hr class="rule">
    <p class="small soft" style="text-align:center"><span lang="zh-Hant">卜以決疑</span> — “to cast is to settle a doubt,”
    and then to sit with what comes for a while.</p>
  </div>`;
}
