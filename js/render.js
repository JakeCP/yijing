// SVG hexagram drawing: brush-like lines from precomputed irregular profiles.
// No SVG filters (PLAN.md S1). Plain geometry for the library grid.

// Fixed brush profiles: thickness + centreline wobble sampled left→right.
// Deterministic — the same line always draws the same stroke, like print.
const PROFILES = [
  { t: [0.30, 0.62, 0.88, 1.00, 0.96, 0.92, 0.95, 0.90, 0.84, 0.88, 0.78, 0.52, 0.16], w: [0.10, -0.06, -0.14, -0.04, 0.08, 0.14, 0.04, -0.08, -0.12, -0.02, 0.06, 0.10, 0.02] },
  { t: [0.24, 0.55, 0.84, 0.97, 1.00, 0.90, 0.86, 0.92, 0.96, 0.85, 0.72, 0.44, 0.12], w: [-0.08, 0.04, 0.12, 0.02, -0.10, -0.14, -0.04, 0.06, 0.12, 0.04, -0.06, -0.10, 0.00] },
  { t: [0.36, 0.70, 0.92, 0.98, 0.90, 0.94, 0.99, 0.88, 0.93, 0.90, 0.74, 0.46, 0.18], w: [0.04, 0.12, 0.02, -0.12, -0.06, 0.08, 0.14, 0.02, -0.08, -0.14, -0.04, 0.06, 0.10] },
  { t: [0.28, 0.58, 0.86, 0.94, 1.00, 0.95, 0.88, 0.84, 0.90, 0.96, 0.80, 0.50, 0.14], w: [-0.12, -0.02, 0.08, 0.14, 0.04, -0.08, -0.12, 0.00, 0.10, 0.06, -0.04, -0.08, -0.02] },
  { t: [0.32, 0.66, 0.90, 1.00, 0.93, 0.88, 0.92, 0.97, 0.86, 0.82, 0.76, 0.48, 0.15], w: [0.06, -0.10, -0.04, 0.10, 0.14, 0.02, -0.12, -0.06, 0.08, 0.12, 0.02, -0.06, 0.04] },
];

function sampleProfile(p, u) {
  const n = p.t.length - 1;
  const x = Math.min(Math.max(u, 0), 1) * n;
  const i = Math.min(Math.floor(x), n - 1);
  const f = x - i;
  return {
    t: p.t[i] + (p.t[i + 1] - p.t[i]) * f,
    w: p.w[i] + (p.w[i + 1] - p.w[i]) * f,
  };
}

// Smooth closed brush stroke for segment [u0,u1] of the unit line, where the
// segment's own ends taper (so yin halves look like two brush touches).
function brushPath(profile, x0, width, cy, maxThick, u0, u1) {
  const STEPS = 14;
  const top = [];
  const bottom = [];
  for (let s = 0; s <= STEPS; s += 1) {
    const local = s / STEPS;
    const u = u0 + (u1 - u0) * local;
    const { t, w } = sampleProfile(profile, u);
    const endTaper = Math.min(1, Math.min(local, 1 - local) * 5 + 0.12);
    const half = (maxThick * t * endTaper) / 2;
    const x = x0 + u * width;
    const y = cy + w * maxThick * 0.55;
    top.push([x, y - half]);
    bottom.push([x, y + half]);
  }
  const pts = [...top, ...bottom.reverse()];
  // Quadratic smoothing through midpoints.
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x0p, y0p] = pts[i - 1];
    d += ` Q ${x0p.toFixed(1)} ${y0p.toFixed(1)} ${((x0p + x1) / 2).toFixed(1)} ${((y0p + y1) / 2).toFixed(1)}`;
  }
  return `${d} Z`;
}

// Profile depends only on position + line kind, so a line never changes
// shape while a cast is still being built above it.
function variantFor(bits, indexFromBottom) {
  return PROFILES[(indexFromBottom * 2 + bits[indexFromBottom] * 3 + indexFromBottom) % PROFILES.length];
}

/**
 * Hexagram (or trigram) figure as an SVG string.
 * bits: bottom→top 0/1 array (length 6, or 3 for a trigram).
 * values: optional 6/7/8/9 cast values — draws a circle (old yang) or a
 * cross (old yin) beside changing lines (accent is decoration; shapes differ).
 * plain: crisp rectangles instead of brush strokes (library grid).
 * label: accessible name, e.g. 'Hexagram 3, 屯 Zhūn'.
 * className: extra class on the <svg>.
 * freshIndex: 0-based line just cast (gets the ink-in class), or -1.
 */
export function hexagramSVG({ bits, values = null, plain = false, label = '', className = '', freshIndex = -1, interactive = false, lineNames = null } = {}) {
  const n = bits.length;
  const W = 100;
  const lineH = 12;
  const gap = 7.5;
  const H = n * lineH + (n - 1) * gap;
  const hasMarkers = Array.isArray(values) && values.some((v) => v === 6 || v === 9);
  const totalW = hasMarkers ? W + 20 : W;
  const parts = [];
  // Draw top line first in SVG coordinates; bits[0] is the bottom line.
  // Each line (stroke + changing marker) sits in its own <g class="hex-line">
  // so the spread layout can light a line and its text together.
  for (let row = 0; row < n; row += 1) {
    const idx = n - 1 - row;
    const bit = bits[idx];
    const cy = row * (lineH + gap) + lineH / 2;
    const fresh = idx === freshIndex ? ' line-fresh' : '';
    const lineParts = [];
    if (plain) {
      const h = 7;
      const y = cy - h / 2;
      if (bit === 1) lineParts.push(`<rect x="1" y="${y}" width="${W - 2}" height="${h}"/>`);
      else {
        const seg = (W - 2) * 0.43;
        lineParts.push(`<rect x="1" y="${y}" width="${seg}" height="${h}"/><rect x="${W - 1 - seg}" y="${y}" width="${seg}" height="${h}"/>`);
      }
    } else {
      const profile = variantFor(bits, idx);
      if (bit === 1) {
        lineParts.push(`<path d="${brushPath(profile, 1, W - 2, cy, 9.5, 0, 1)}"/>`);
      } else {
        lineParts.push(`<path d="${brushPath(profile, 1, W - 2, cy, 9.5, 0, 0.43)}"/><path d="${brushPath(profile, 1, W - 2, cy, 9.5, 0.57, 1)}"/>`);
      }
    }
    if (values) {
      const v = values[idx];
      const mx = W + 11;
      if (v === 9) {
        lineParts.push(`<circle class="marker" cx="${mx}" cy="${cy}" r="4.6" fill="none" stroke-width="1.7"><title>changing line</title></circle>`);
      } else if (v === 6) {
        const r = 3.9;
        lineParts.push(`<path class="marker" d="M ${mx - r} ${cy - r} L ${mx + r} ${cy + r} M ${mx + r} ${cy - r} L ${mx - r} ${cy + r}" fill="none" stroke-width="1.7" stroke-linecap="round"><title>changing line</title></path>`);
      }
    }
    // Invisible fat hit-band so hover/focus finds the line, not just its ink.
    const hit = interactive ? `<rect class="hex-line-hit" x="0" y="${(cy - lineH / 2 - gap / 2).toFixed(1)}" width="${totalW}" height="${lineH + gap}" fill="transparent"/>` : '';
    const name = lineNames && lineNames[idx] ? lineNames[idx] : `Line ${idx + 1}`;
    const focus = interactive ? ` tabindex="0" role="img" aria-label="${escapeAttr(name)}"` : '';
    parts.push(`<g class="hex-line${fresh}" data-line="${idx + 1}"${focus}>${hit}${lineParts.join('')}</g>`);
  }
  // Interactive figures contain focusable lines, so the outer figure is a
  // labelled group, not a single image (its lines name themselves).
  const outerRole = interactive ? 'group' : 'img';
  const aria = label ? ` role="${outerRole}" aria-label="${escapeAttr(label)}"` : ' aria-hidden="true"';
  return `<svg class="hexagram${plain ? ' hexagram-plain' : ''}${className ? ` ${escapeAttr(className)}` : ''}" viewBox="0 0 ${totalW} ${H.toFixed(1)}"${aria} focusable="false">${parts.join('')}</svg>`;
}

/**
 * A trigram as a small crisp figure. The Unicode trigram block
 * (U+2630..U+2637) is in neither self-hosted font, so the symbol is
 * drawn, never typeset: three plain lines from the trigram bits.
 */
export function trigramFigure(trigram, { className = '' } = {}) {
  return hexagramSVG({
    bits: trigram.bits,
    plain: true,
    className: `trigram-figure${className ? ` ${className}` : ''}`,
    label: `Trigram ${trigram.name_zh} ${trigram.name_pinyin}`,
  });
}

export function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Coin inscriptions are drawn as paths, not <text>: the 文 (top) and 字
// (bottom) outlines are taken from Noto Serif TC (OFL; see
// fonts/NotoSerifTC-OFL.txt and make_favicon in scripts/build-fonts.py),
// so the faces render even before the webfonts arrive.
const COIN_GLYPH_WEN = '<g class="coin-glyph" transform="translate(39.02 27.70) scale(0.02172 -0.02172)"><path d="M414 832Q467 810 500.5 785.5Q534 761 552.5 738.0Q571 715 577.0 695.5Q583 676 579.0 663.5Q575 651 565.0 647.5Q555 644 541 653Q532 681 509.5 712.5Q487 744 458.0 773.5Q429 803 402 823ZM783 612Q747 484 686.5 377.0Q626 270 537.5 184.5Q449 99 329.0 33.5Q209 -32 54 -77L45 -60Q237 4 373.5 101.0Q510 198 596.5 326.5Q683 455 723 612ZM875 672Q875 672 883.0 665.5Q891 659 903.5 649.0Q916 639 929.5 627.5Q943 616 954 605Q950 589 929 589H59L50 619H831ZM272 612Q306 486 368.0 382.5Q430 279 518.5 199.0Q607 119 719.5 62.5Q832 6 966 -26L963 -37Q946 -37 931.0 -46.5Q916 -56 908 -73Q779 -35 672.5 25.0Q566 85 483.0 168.5Q400 252 342.0 359.5Q284 467 252 599Z"/></g>';
const COIN_GLYPH_ZI = '<g class="coin-glyph" transform="translate(38.94 88.91) scale(0.02203 -0.02203)"><path d="M850 681 887 718 955 652Q950 648 940.5 646.5Q931 645 916 644Q897 617 865.0 584.5Q833 552 806 529L791 537Q803 557 816.5 583.0Q830 609 842.0 635.5Q854 662 861 681ZM169 730Q183 676 177.5 636.0Q172 596 156.0 570.5Q140 545 121 532Q110 524 97.0 520.0Q84 516 73.5 518.0Q63 520 57 529Q52 541 58.0 553.0Q64 565 77 573Q98 585 116.0 608.0Q134 631 143.5 662.5Q153 694 150 729ZM873 681V651H156V681ZM448 836Q488 821 512.5 802.5Q537 784 548.5 765.5Q560 747 561.5 731.5Q563 716 557.0 706.0Q551 696 540.5 694.0Q530 692 517 701Q511 733 486.5 769.5Q462 806 436 828ZM674 537 712 574 779 512Q773 507 763.0 505.5Q753 504 738 503Q695 473 637.0 440.0Q579 407 520 387H500Q535 405 571.0 432.0Q607 459 637.5 487.5Q668 516 686 537ZM557 402Q553 381 521 377V6Q521 -14 515.5 -30.5Q510 -47 490.5 -57.5Q471 -68 429 -72Q426 -62 421.0 -53.5Q416 -45 405 -39Q392 -33 369.0 -28.5Q346 -24 310 -21V-4Q310 -4 328.0 -5.5Q346 -7 371.5 -8.5Q397 -10 419.0 -11.5Q441 -13 450 -13Q466 -13 471.5 -8.0Q477 -3 477 10V412ZM869 340Q869 340 877.0 333.5Q885 327 897.5 317.0Q910 307 923.5 295.5Q937 284 949 273Q946 257 923 257H58L49 287H825ZM716 537V507H224L215 537Z"/></g>';

/** One coin face: character side is inscribed around a square hole; blank is bare. */
export function coinSVG(side) {
  const character = side === 'character';
  const glyphs = character ? COIN_GLYPH_WEN + COIN_GLYPH_ZI : '';
  return `<svg class="coin coin-${character ? 'character' : 'blank'}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">`
    + '<circle cx="50" cy="50" r="46" class="coin-rim"/><circle cx="50" cy="50" r="38" class="coin-inner"/>'
    + '<rect x="39" y="39" width="22" height="22" class="coin-hole"/>'
    + `${glyphs}</svg>`;
}

/** A small bundle of yarrow stalks: n thin strokes, slightly uneven (fixed table). */
const STALK_TILTS = [-2.2, 1.4, -0.8, 2.0, -1.6, 0.6, -2.0, 1.8, -1.0, 2.4, -0.4, 1.2, -1.8, 0.9, -2.4, 1.6, -0.6, 2.2, -1.3, 0.3];
export function stalksSVG(count) {
  const shown = Math.max(4, Math.min(20, Math.round(count / 2.5)));
  const parts = [];
  for (let i = 0; i < shown; i += 1) {
    const x = 8 + (i * 44) / Math.max(1, shown - 1);
    const tilt = STALK_TILTS[i % STALK_TILTS.length];
    parts.push(`<line x1="${x}" y1="34" x2="${(x + tilt).toFixed(1)}" y2="2"/>`);
  }
  return `<svg class="stalks" viewBox="0 0 60 36" aria-hidden="true" focusable="false">${parts.join('')}</svg>`;
}
