// Independent King Wen lookup table (PLAN.md M3) — transcribed by hand, NOT derived
// from bits and NOT parsed from any source file. Build checks it against two oracles:
// Chinese source line labels and zh Wikisource trigram headers. See docs/SCHEMA.md.

export const TRIGRAMS = [
  { name_zh: '乾', name_pinyin: 'Qián', symbol: '☰', image_zh: '天', image_pinyin: 'Tiān', bits: [1, 1, 1] },
  { name_zh: '坤', name_pinyin: 'Kūn', symbol: '☷', image_zh: '地', image_pinyin: 'Dì', bits: [0, 0, 0] },
  { name_zh: '震', name_pinyin: 'Zhèn', symbol: '☳', image_zh: '雷', image_pinyin: 'Léi', bits: [1, 0, 0] },
  { name_zh: '巽', name_pinyin: 'Xùn', symbol: '☴', image_zh: '風', image_pinyin: 'Fēng', bits: [0, 1, 1] },
  { name_zh: '坎', name_pinyin: 'Kǎn', symbol: '☵', image_zh: '水', image_pinyin: 'Shuǐ', bits: [0, 1, 0] },
  { name_zh: '離', name_pinyin: 'Lí', symbol: '☲', image_zh: '火', image_pinyin: 'Huǒ', bits: [1, 0, 1] },
  { name_zh: '艮', name_pinyin: 'Gèn', symbol: '☶', image_zh: '山', image_pinyin: 'Shān', bits: [0, 0, 1] },
  { name_zh: '兌', name_pinyin: 'Duì', symbol: '☱', image_zh: '澤', image_pinyin: 'Zé', bits: [1, 1, 0] },
];

export const TRIGRAM_BY_NAME = Object.fromEntries(TRIGRAMS.map((t) => [t.name_zh, t]));

// [number, name_zh, name_pinyin, lower, upper]
export const KINGWEN = [
  [1, '乾', 'Qián', '乾', '乾'], [2, '坤', 'Kūn', '坤', '坤'],
  [3, '屯', 'Zhūn', '震', '坎'], [4, '蒙', 'Méng', '坎', '艮'],
  [5, '需', 'Xū', '乾', '坎'], [6, '訟', 'Sòng', '坎', '乾'],
  [7, '師', 'Shī', '坎', '坤'], [8, '比', 'Bì', '坤', '坎'],
  [9, '小畜', 'Xiǎo Xù', '乾', '巽'], [10, '履', 'Lǚ', '兌', '乾'],
  [11, '泰', 'Tài', '乾', '坤'], [12, '否', 'Pǐ', '坤', '乾'],
  [13, '同人', 'Tóng Rén', '離', '乾'], [14, '大有', 'Dà Yǒu', '乾', '離'],
  [15, '謙', 'Qiān', '艮', '坤'], [16, '豫', 'Yù', '坤', '震'],
  [17, '隨', 'Suí', '震', '兌'], [18, '蠱', 'Gǔ', '巽', '艮'],
  [19, '臨', 'Lín', '兌', '坤'], [20, '觀', 'Guān', '坤', '巽'],
  [21, '噬嗑', 'Shì Hé', '震', '離'], [22, '賁', 'Bì', '離', '艮'],
  [23, '剝', 'Bō', '坤', '艮'], [24, '復', 'Fù', '震', '坤'],
  [25, '無妄', 'Wú Wàng', '震', '乾'], [26, '大畜', 'Dà Xù', '乾', '艮'],
  [27, '頤', 'Yí', '震', '艮'], [28, '大過', 'Dà Guò', '巽', '兌'],
  [29, '坎', 'Kǎn', '坎', '坎'], [30, '離', 'Lí', '離', '離'],
  [31, '咸', 'Xián', '艮', '兌'], [32, '恆', 'Héng', '巽', '震'],
  [33, '遯', 'Dùn', '艮', '乾'], [34, '大壯', 'Dà Zhuàng', '乾', '震'],
  [35, '晉', 'Jìn', '坤', '離'], [36, '明夷', 'Míng Yí', '離', '坤'],
  [37, '家人', 'Jiā Rén', '離', '巽'], [38, '睽', 'Kuí', '兌', '離'],
  [39, '蹇', 'Jiǎn', '艮', '坎'], [40, '解', 'Xiè', '坎', '震'],
  [41, '損', 'Sǔn', '兌', '艮'], [42, '益', 'Yì', '震', '巽'],
  [43, '夬', 'Guài', '乾', '兌'], [44, '姤', 'Gòu', '巽', '乾'],
  [45, '萃', 'Cuì', '坤', '兌'], [46, '升', 'Shēng', '巽', '坤'],
  [47, '困', 'Kùn', '坎', '兌'], [48, '井', 'Jǐng', '巽', '坎'],
  [49, '革', 'Gé', '離', '兌'], [50, '鼎', 'Dǐng', '巽', '離'],
  [51, '震', 'Zhèn', '震', '震'], [52, '艮', 'Gèn', '艮', '艮'],
  [53, '漸', 'Jiàn', '艮', '巽'], [54, '歸妹', 'Guī Mèi', '兌', '震'],
  [55, '豐', 'Fēng', '離', '震'], [56, '旅', 'Lǚ', '艮', '離'],
  [57, '巽', 'Xùn', '巽', '巽'], [58, '兌', 'Duì', '兌', '兌'],
  [59, '渙', 'Huàn', '坎', '巽'], [60, '節', 'Jié', '兌', '坎'],
  [61, '中孚', 'Zhōng Fú', '兌', '巽'], [62, '小過', 'Xiǎo Guò', '艮', '震'],
  [63, '既濟', 'Jì Jì', '離', '坎'], [64, '未濟', 'Wèi Jì', '坎', '離'],
];

export function bitsFor(lower, upper) {
  return [...TRIGRAM_BY_NAME[lower].bits, ...TRIGRAM_BY_NAME[upper].bits];
}

export function bitsString(bits) {
  return bits.join('');
}

// Line labels (PLAN.md M4). Index: position 1..6 (bottom->top), then yang/yin.
const LABELS = {
  1: { 1: '初九', 0: '初六' },
  2: { 1: '九二', 0: '六二' },
  3: { 1: '九三', 0: '六三' },
  4: { 1: '九四', 0: '六四' },
  5: { 1: '九五', 0: '六五' },
  6: { 1: '上九', 0: '上六' },
};

export function labelFor(position, bit) {
  return LABELS[position][bit];
}

export const ALL_LABELS = Object.values(LABELS).flatMap((o) => Object.values(o));

// King Wen test vectors (PLAN.md M3), bottom->top bit strings.
export const TEST_VECTORS = {
  1: '111111', 2: '000000', 3: '100010', 11: '111000',
  12: '000111', 29: '010010', 63: '101010', 64: '010101',
};

export function hexagramSymbol(number) {
  return String.fromCodePoint(0x4dc0 + number - 1);
}
