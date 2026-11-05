#!/usr/bin/env python3
"""Build the self-hosted subset WOFF2 fonts (PLAN.md design table).

Downloads the OFL source fonts (EB Garamond, Noto Serif TC) from the
google/fonts repo into scripts/.cache/fonts/, subsets them, writes
fonts/*.woff2 + the OFL licence files, derives favicon.svg from the
Noto Serif TC 易 glyph, and verifies cmap coverage:

- every character used by the Chinese corpus (data/hexagrams.json,
  data/trigrams.json) and every Han character in the rendered source
  (index.html, css/style.css, js/*.js) is in the Noto subset;
- every character used by the Legge texts, pinyin names, and every
  non-Han character in the rendered source is in the EB Garamond subsets;
- the 繫辭 vertical passage on the desktop cast page is in the Noto
  subset (it reaches the scan through js/app.js, and is also named
  below so the requirement survives a move);
- the eight trigram symbols (U+2630..U+2637, carried by NEITHER source
  font, verified below) are drawn as SVG by js/render.js, so they must
  never appear as literals in the rendered source.

The source scan is deliberately wholesale (comments included), so a
character that appears anywhere in the JS/HTML/CSS the browser runs
cannot slip past the check when it later moves into a rendered string.
Keep comments free of glyphs neither source font carries.

Usage:
  python3 scripts/build-fonts.py           # download (if needed) + build + check
  python3 scripts/build-fonts.py --check   # only verify the shipped subsets

Requires fontTools + brotli (dev only; the site itself has no build step):
  python3 -m venv scripts/.cache/fontenv
  scripts/.cache/fontenv/bin/pip install fonttools brotli
  scripts/.cache/fontenv/bin/python scripts/build-fonts.py
"""
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache" / "fonts"
FONTS_DIR = ROOT / "fonts"

SOURCES = {
    "eb-roman.ttf": "https://github.com/google/fonts/raw/main/ofl/ebgaramond/EBGaramond%5Bwght%5D.ttf",
    "eb-italic.ttf": "https://github.com/google/fonts/raw/main/ofl/ebgaramond/EBGaramond-Italic%5Bwght%5D.ttf",
    "eb-OFL.txt": "https://github.com/google/fonts/raw/main/ofl/ebgaramond/OFL.txt",
    "noto-tc.ttf": "https://github.com/google/fonts/raw/main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf",
    "noto-OFL.txt": "https://github.com/google/fonts/raw/main/ofl/notoseriftc/OFL.txt",
}

# Rendered source files scanned for characters, beyond the JSON corpus.
# (js/about.js renders too, and js/book.js feeds the desktop layouts.)
SOURCE_FILES = ("index.html", "css/style.css", "js/app.js", "js/engine.js",
                "js/render.js", "js/about.js", "js/book.js")

# Desktop cast-page vertical passage (繫辭上) + title-slip characters.
# Named here as well as scanned from js/app.js, so the Noto requirement
# is explicit and survives the markup moving.
VERTICAL_PASSAGE = "易有太極，是生兩儀，兩儀生四象，四象生八卦。繫辭上易經"

# Trigram symbols from data/trigrams.json "symbol" fields. Neither OFL
# source carries U+2630..U+2637 (checked against the full fonts), so
# the site draws them (trigramFigure in js/render.js). They are listed
# here only so the check can fail if one is ever typeset instead.
TRIGRAM_SYMBOLS = "".join(chr(cp) for cp in range(0x2630, 0x2638))


def corpus_chars():
    """Rendered characters from the data files, split by script.

    Parses the JSON and collects only text the site renders: names,
    pinyin, and the zh/legge slots. The unicode hexagram/trigram
    `symbol` fields are never rendered (figures are drawn as SVG),
    so they are excluded — neither font carries them.
    """
    han, latin = set(), set()

    def add(s):
        for c in s or "":
            if c.isspace():
                continue
            (han if ord(c) >= 0x2E80 else latin).add(c)

    def add_slot(slot):
        for line in slot or []:
            add(line)

    hexagrams = json.loads((ROOT / "data/hexagrams.json").read_text(encoding="utf-8"))
    trigrams = json.loads((ROOT / "data/trigrams.json").read_text(encoding="utf-8"))
    for h in hexagrams:
        add(h["name_zh"]); add(h["name_pinyin"]); add(h.get("name_en"))
        add(h["lower"]); add(h["upper"])
        for texts in h["texts"].values():
            add_slot(texts["judgment"]); add_slot(texts["image"])
            add_slot(texts["special"])
            for line in texts["lines"]:
                add_slot(line)
    for t in trigrams:
        add(t["name_zh"]); add(t["name_pinyin"]); add(t.get("name_en"))
        add(t["image_zh"]); add(t["image_pinyin"])
    return han, latin


def source_chars():
    """Non-ASCII characters in the rendered source, split by script
    with the same U+2E80 boundary corpus_chars() uses."""
    han, latin = set(), set()
    for rel in SOURCE_FILES:
        for c in (ROOT / rel).read_text(encoding="utf-8"):
            if ord(c) < 0x80 or c.isspace():
                continue
            (han if ord(c) >= 0x2E80 else latin).add(c)
    return han, latin


def required_chars():
    """Characters the coverage check demands: corpus + rendered source."""
    han, latin = corpus_chars()
    src_han, src_latin = source_chars()
    return han | src_han, latin | src_latin


def noto_unicodes():
    han, _ = required_chars()
    wanted = set(han) | {c for c in VERTICAL_PASSAGE if not c.isspace()}
    # Fullwidth/CJK punctuation the received text and UI lean on.
    wanted |= set("，。、；：？！·…—「」『』（）《》〈〉")
    return sorted(wanted)


def eb_unicodes():
    _, latin = required_chars()
    wanted = set(latin)
    wanted |= {chr(cp) for cp in range(0x20, 0x7F)}        # printable ASCII
    wanted |= {chr(cp) for cp in range(0xA0, 0x180)}       # Latin-1 + Ext-A (pinyin)
    wanted |= set("‘’“”–—…·←→↓×○〈〉«»")              # quotes, dashes, arrows
    return sorted(wanted)


def download():
    CACHE.mkdir(parents=True, exist_ok=True)
    for name, url in SOURCES.items():
        dest = CACHE / name
        if dest.exists() and dest.stat().st_size > 0:
            print(f"  cached  {name} ({dest.stat().st_size} bytes)")
            continue
        print(f"  fetch   {name} <- {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "yijing-font-build"})
        with urllib.request.urlopen(req) as r, open(dest, "wb") as f:
            f.write(r.read())
        print(f"          {dest.stat().st_size} bytes")


def subset(src, dest, chars):
    unicodes = ",".join(f"U+{ord(c):04X}" for c in chars)
    cmd = [
        sys.executable, "-m", "fontTools.subset", str(src),
        f"--output-file={dest}",
        f"--unicodes={unicodes}",
        "--flavor=woff2",
        "--layout-features=*",
        "--name-IDs=*",
        "--notdef-glyph",
        "--desubroutinize",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout)
        print(r.stderr)
        raise SystemExit(f"subset failed for {src}")
    print(f"  wrote   {dest.relative_to(ROOT)} ({dest.stat().st_size} bytes)")


def make_favicon():
    """favicon.svg: cinnabar seal with the 易 glyph outline from Noto Serif TC."""
    from fontTools.ttLib import TTFont
    from fontTools.pens.boundsPen import BoundsPen
    from fontTools.pens.svgPathPen import SVGPathPen

    font = TTFont(str(CACHE / "noto-tc.ttf"))
    glyph_name = font.getBestCmap()[ord("易")]
    glyph_set = font.getGlyphSet()
    pen = SVGPathPen(glyph_set)
    glyph_set[glyph_name].draw(pen)
    # Centre on the glyph's ink bounds (not the em box, which sits the
    # character noticeably low), flipping y for SVG's y-down space.
    bp = BoundsPen(glyph_set)
    glyph_set[glyph_name].draw(bp)
    x_min, y_min, x_max, y_max = bp.bounds
    scale = 74 / max(x_max - x_min, y_max - y_min)
    tx = 50 - (x_min + x_max) / 2 * scale
    ty = 50 + (y_min + y_max) / 2 * scale
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="易">\n'
        "<title>易 — Yijing</title>\n"
        '<rect width="100" height="100" rx="14" fill="#b23a2b"/>\n'
        f'<g transform="translate({tx:.2f} {ty:.2f}) scale({scale:.5f} {-scale:.5f})">'
        f'<path d="{pen.getCommands()}" fill="#f4efe6"/></g>\n'
        "</svg>\n"
    )
    (ROOT / "favicon.svg").write_text(svg, encoding="utf-8")
    print(f"  wrote   favicon.svg ({len(svg)} bytes)")


def check_coverage():
    from fontTools.ttLib import TTFont

    ok = True
    noto = TTFont(str(FONTS_DIR / "noto-serif-tc.woff2")).getBestCmap()
    missing = [c for c in noto_unicodes() if ord(c) not in noto]
    if missing:
        ok = False
        print(f"  FAIL    Noto subset missing {len(missing)}: {''.join(missing[:40])}")
    else:
        print(f"  ok      Noto subset covers all {len(noto_unicodes())} corpus+source characters")

    # Trigram symbols must be drawn, never typeset: no literal may reach
    # the rendered source (neither subset could show it). The data file
    # still carries them, so also confirm all eight are the data values.
    src_text = "".join((ROOT / rel).read_text(encoding="utf-8") for rel in SOURCE_FILES)
    leaked = [c for c in TRIGRAM_SYMBOLS if c in src_text]
    if leaked:
        ok = False
        print(f"  FAIL    trigram symbols typeset in rendered source: {''.join(leaked)} (draw them via trigramFigure)")
    else:
        print("  ok      trigram symbols are drawn SVG only (no U+2630 literals in source)")
    trigrams = json.loads((ROOT / "data/trigrams.json").read_text(encoding="utf-8"))
    if {t["symbol"] for t in trigrams} != set(TRIGRAM_SYMBOLS):
        ok = False
        print("  FAIL    data/trigrams.json symbols differ from U+2630..U+2637")
    render_src = (ROOT / "js/render.js").read_text(encoding="utf-8")
    if "trigramFigure" not in render_src:
        ok = False
        print("  FAIL    js/render.js no longer draws trigramFigure")

    # EB Garamond small caps back the desktop section labels.
    for fname in ("eb-garamond.woff2",):
        font = TTFont(str(FONTS_DIR / fname))
        feats = set()
        if "GSUB" in font:
            feats = {r.FeatureTag for r in font["GSUB"].table.FeatureList.FeatureRecord}
        if "smcp" not in feats:
            ok = False
            print(f"  FAIL    {fname} subset lost the smcp small-caps feature")
        else:
            print(f"  ok      {fname} keeps smcp (desktop small caps)")

    _, latin = required_chars()
    for fname in ("eb-garamond.woff2", "eb-garamond-italic.woff2"):
        cmap = TTFont(str(FONTS_DIR / fname)).getBestCmap()
        missing = [c for c in sorted(latin) if ord(c) not in cmap]
        if missing:
            ok = False
            print(f"  FAIL    {fname} missing: {''.join(missing[:40])}")
        else:
            print(f"  ok      {fname} covers the Legge/pinyin/source characters")
    return ok


def main():
    if "--check" in sys.argv:
        raise SystemExit(0 if check_coverage() else 1)
    print("sources:")
    download()
    FONTS_DIR.mkdir(exist_ok=True)
    print("subsets:")
    subset(CACHE / "eb-roman.ttf", FONTS_DIR / "eb-garamond.woff2", eb_unicodes())
    subset(CACHE / "eb-italic.ttf", FONTS_DIR / "eb-garamond-italic.woff2", eb_unicodes())
    subset(CACHE / "noto-tc.ttf", FONTS_DIR / "noto-serif-tc.woff2", noto_unicodes())
    (FONTS_DIR / "EBGaramond-OFL.txt").write_bytes((CACHE / "eb-OFL.txt").read_bytes())
    (FONTS_DIR / "NotoSerifTC-OFL.txt").write_bytes((CACHE / "noto-OFL.txt").read_bytes())
    print("  wrote   fonts/EBGaramond-OFL.txt, fonts/NotoSerifTC-OFL.txt")
    print("favicon:")
    make_favicon()
    print("coverage:")
    raise SystemExit(0 if check_coverage() else 1)


if __name__ == "__main__":
    main()
