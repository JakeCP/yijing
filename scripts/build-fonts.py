#!/usr/bin/env python3
"""Build the self-hosted subset WOFF2 fonts (PLAN.md design table).

Downloads the OFL source fonts (EB Garamond, Noto Serif TC) from the
google/fonts repo into scripts/.cache/fonts/, subsets them, writes
fonts/*.woff2 + the OFL licence files, derives favicon.svg from the
Noto Serif TC 易 glyph, and verifies cmap coverage:

- every character used by the Chinese corpus (data/hexagrams.json,
  data/trigrams.json) and the UI's Han strings is in the Noto subset;
- every character used by the Legge texts and pinyin names is in the
  EB Garamond subset.

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

# Han characters the UI itself renders (js/app.js, index.html, coin faces),
# beyond whatever the corpus contains.
UI_HAN = "易經未卜無之第卦辭爻大象傳用九六初上二三四五原文陰陽以決疑文字"


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


def noto_unicodes():
    han, _ = corpus_chars()
    wanted = han | set(UI_HAN)
    # Fullwidth/CJK punctuation the received text and UI lean on.
    wanted |= set("，。、；：？！·…—「」『』（）《》〈〉")
    return sorted(wanted)


def eb_unicodes():
    _, latin = corpus_chars()
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
        print(f"  ok      Noto subset covers all {len(noto_unicodes())} corpus+UI characters")

    _, latin = corpus_chars()
    for fname in ("eb-garamond.woff2", "eb-garamond-italic.woff2"):
        cmap = TTFont(str(FONTS_DIR / fname)).getBestCmap()
        missing = [c for c in sorted(latin) if ord(c) not in cmap]
        if missing:
            ok = False
            print(f"  FAIL    {fname} missing: {''.join(missing[:40])}")
        else:
            print(f"  ok      {fname} covers the Legge/pinyin characters")
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
