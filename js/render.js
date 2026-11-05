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
 * values: optional 6/7/8/9 cast values — draws ○ (old yang) / × (old yin)
 * markers beside changing lines (accent is decoration; the shapes differ).
 * plain: crisp rectangles instead of brush strokes (library grid).
 * label: accessible name, e.g. 'Hexagram 3, 屯 Zhūn'.
 * className: extra class on the <svg>.
 * freshIndex: 0-based line just cast (gets the ink-in class), or -1.
 */
export function hexagramSVG({ bits, values = null, plain = false, label = '', className = '', freshIndex = -1 } = {}) {
  const n = bits.length;
  const W = 100;
  const lineH = 12;
  const gap = 7.5;
  const H = n * lineH + (n - 1) * gap;
  const hasMarkers = Array.isArray(values) && values.some((v) => v === 6 || v === 9);
  const totalW = hasMarkers ? W + 20 : W;
  const parts = [];
  // Draw top line first in SVG coordinates; bits[0] is the bottom line.
  for (let row = 0; row < n; row += 1) {
    const idx = n - 1 - row;
    const bit = bits[idx];
    const cy = row * (lineH + gap) + lineH / 2;
    const fresh = idx === freshIndex ? ' class="line-fresh"' : '';
    if (plain) {
      const h = 7;
      const y = cy - h / 2;
      if (bit === 1) parts.push(`<rect${fresh} x="1" y="${y}" width="${W - 2}" height="${h}"/>`);
      else {
        const seg = (W - 2) * 0.43;
        parts.push(`<g${fresh}><rect x="1" y="${y}" width="${seg}" height="${h}"/><rect x="${W - 1 - seg}" y="${y}" width="${seg}" height="${h}"/></g>`);
      }
    } else {
      const profile = variantFor(bits, idx);
      if (bit === 1) {
        parts.push(`<path${fresh} d="${brushPath(profile, 1, W - 2, cy, 9.5, 0, 1)}"/>`);
      } else {
        parts.push(`<g${fresh}><path d="${brushPath(profile, 1, W - 2, cy, 9.5, 0, 0.43)}"/><path d="${brushPath(profile, 1, W - 2, cy, 9.5, 0.57, 1)}"/></g>`);
      }
    }
    if (values) {
      const v = values[idx];
      const mx = W + 11;
      if (v === 9) {
        parts.push(`<circle class="marker" cx="${mx}" cy="${cy}" r="4.6" fill="none" stroke-width="1.7"><title>changing line</title></circle>`);
      } else if (v === 6) {
        const r = 3.9;
        parts.push(`<path class="marker" d="M ${mx - r} ${cy - r} L ${mx + r} ${cy + r} M ${mx + r} ${cy - r} L ${mx - r} ${cy + r}" fill="none" stroke-width="1.7" stroke-linecap="round"><title>changing line</title></path>`);
      }
    }
  }
  const aria = label ? ` role="img" aria-label="${escapeAttr(label)}"` : ' aria-hidden="true"';
  return `<svg class="hexagram${plain ? ' hexagram-plain' : ''}${className ? ` ${escapeAttr(className)}` : ''}" viewBox="0 0 ${totalW} ${H.toFixed(1)}"${aria} focusable="false">${parts.join('')}</svg>`;
}

export function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** One coin face: character side carries 文 and a square hole; blank is bare. */
export function coinSVG(side) {
  const character = side === 'character';
  const glyphs = character
    ? '<text x="50" y="21" class="coin-char">文</text><text x="50" y="90" class="coin-char">字</text>'
    : '';
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
