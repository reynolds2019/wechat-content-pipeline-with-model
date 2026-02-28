/**
 * 小红书系列图 Prompt 构建模块
 * 10 styles × 8 layouts
 */

const STYLES = {
  warm: {
    name: 'warm',
    label: '暖色调',
    prompt: '暖色调、柔和光影, warm amber and coral tones, soft diffused lighting, cozy inviting atmosphere, '
      + 'cream and golden accents, gentle gradients',
  },
  cute: {
    name: 'cute',
    label: '可爱卡通',
    prompt: '卡通风格、圆角设计、可爱元素, kawaii cartoon style, rounded corners and shapes, '
      + 'pastel colors, cute decorative elements like stars and hearts, playful and friendly',
  },
  minimal: {
    name: 'minimal',
    label: '极简留白',
    prompt: '大量留白、细线条, generous white space, thin precise lines, limited color palette, '
      + 'clean typography, modern minimalist layout, calm and elegant',
  },
  bold: {
    name: 'bold',
    label: '粗字大色块',
    prompt: '粗字体、强对比、大色块, bold heavy typography, high contrast colors, large solid color blocks, '
      + 'impactful and attention-grabbing, dynamic composition',
  },
  pastel: {
    name: 'pastel',
    label: '莫兰迪色系',
    prompt: '莫兰迪色系、低饱和, Morandi muted palette, desaturated soft tones, dusty pink beige and sage, '
      + 'sophisticated and understated, gallery-like aesthetic',
  },
  neon: {
    name: 'neon',
    label: '霓虹发光',
    prompt: '霓虹发光效果、深色背景, neon glow effects on dark background, electric blue and hot pink, '
      + 'glowing outlines and text, cyberpunk atmosphere, vibrant night-city feel',
  },
  vintage: {
    name: 'vintage',
    label: '复古纸质',
    prompt: '复古纸质纹理、旧报纸感, vintage paper texture, aged newspaper aesthetic, sepia and cream tones, '
      + 'retro typography, distressed edges, nostalgic old-world charm',
  },
  clean: {
    name: 'clean',
    label: '现代简洁',
    prompt: '现代简洁、几何分割, modern clean design, geometric section dividers, crisp lines, '
      + 'professional sans-serif typography, blue and white color scheme, structured and organized',
  },
  gradient: {
    name: 'gradient',
    label: '渐变玻璃',
    prompt: '渐变色背景、玻璃质感, gradient color backgrounds, glassmorphism frosted glass elements, '
      + 'transparent overlays, smooth color transitions, contemporary and trendy',
  },
  'hand-drawn': {
    name: 'hand-drawn',
    label: '手绘风格',
    prompt: '手绘风格、铅笔/水彩质感, hand-drawn illustration style, pencil and watercolor textures, '
      + 'organic imperfect lines, sketch-like decorations, artistic and personal touch',
  },
};

const LAYOUTS = {
  balanced: {
    name: 'balanced',
    label: '均衡图文',
    prompt: 'balanced layout with image and text equally distributed, visual on top, key text below',
  },
  'text-heavy': {
    name: 'text-heavy',
    label: '文字为主',
    prompt: 'text-dominant layout, large readable typography, minimal imagery, focus on content delivery',
  },
  'image-focus': {
    name: 'image-focus',
    label: '图片为主',
    prompt: 'image-dominant layout, full-bleed visual with overlay text, minimal text, visual storytelling',
  },
  split: {
    name: 'split',
    label: '左右分割',
    prompt: 'split layout, left and right panels, one side image one side text, clean dividing line',
  },
  card: {
    name: 'card',
    label: '卡片',
    prompt: 'card layout, content in a centered card with rounded corners, shadow, background color behind card',
  },
  list: {
    name: 'list',
    label: '列表',
    prompt: 'list layout, numbered or bulleted items, each point clearly separated, structured information',
  },
  quote: {
    name: 'quote',
    label: '引言',
    prompt: 'quote layout, large quotation marks, centered impactful text, decorative borders, inspirational feel',
  },
  comparison: {
    name: 'comparison',
    label: '对比',
    prompt: 'comparison layout, two-column or before-after structure, clear visual distinction between items',
  },
};

/**
 * 构建小红书卡片 prompt
 * @param {object} point - { title, content, index, total }
 * @param {string} styleKey - 风格 key
 * @param {string} layoutKey - 布局 key
 * @param {boolean} isFirst - 是否为首张（定义风格基调）
 * @returns {string}
 */
function buildXhsPrompt(point, styleKey, layoutKey, isFirst) {
  const style = STYLES[styleKey] || STYLES.warm;
  const layout = LAYOUTS[layoutKey] || LAYOUTS.balanced;

  const consistencyNote = isFirst
    ? 'This is the FIRST card in the series. Establish the visual identity and color scheme for all subsequent cards.'
    : 'IMPORTANT: Maintain strict visual consistency with the first card in this series — same color scheme, typography style, decorative elements, and overall aesthetic.';

  return [
    `Design a Xiaohongshu (小红书) content card image.`,
    ``,
    `Card ${point.index} of ${point.total}`,
    `Title: ${point.title}`,
    `Content: ${point.content}`,
    ``,
    `Visual style: ${style.prompt}`,
    `Layout: ${layout.prompt}`,
    ``,
    `Technical requirements:`,
    `- Portrait 9:16 format, 1080x1920 pixels`,
    `- Illustration/cartoon style — NOT photographic`,
    `- Chinese text in the image must be clear and readable`,
    `- Include: title text, key content, decorative elements, slide number (${point.index}/${point.total})`,
    `- The card should feel like a premium Xiaohongshu post`,
    ``,
    consistencyNote,
  ].join('\n');
}

module.exports = { STYLES, LAYOUTS, buildXhsPrompt };
