/**
 * 封面图 Prompt 构建模块
 * 5 styles × 6 palettes × 3 ratios
 */

const STYLES = {
  hero: {
    name: 'hero',
    label: '大气视觉',
    prompt: 'Bold dramatic full-bleed photographic composition, cinematic lighting with strong focal point, '
      + 'depth of field effect, professional magazine cover quality, high impact visual storytelling',
  },
  conceptual: {
    name: 'conceptual',
    label: '抽象概念',
    prompt: 'Abstract concept visualization, surreal artistic composition, symbolic visual elements, '
      + 'creative metaphorical imagery, thought-provoking abstract design with layered meaning',
  },
  typography: {
    name: 'typography',
    label: '字体艺术',
    prompt: 'Text-focused artistic design with creative typography as the main visual element, '
      + 'decorative letterforms, elegant typographic composition, letters integrated with graphic elements',
  },
  metaphor: {
    name: 'metaphor',
    label: '视觉隐喻',
    prompt: 'Visual metaphor illustration, one core object or scene that symbolically represents the concept, '
      + 'clever visual analogy, storytelling through a single powerful image, editorial illustration style',
  },
  minimal: {
    name: 'minimal',
    label: '极简设计',
    prompt: 'Clean minimalist design, generous white space, single focal element, '
      + 'restrained color use, geometric simplicity, modern Swiss design influence, less is more',
  },
};

const PALETTES = {
  warm: {
    name: 'warm',
    label: '暖色调',
    prompt: 'warm color palette with amber, coral, terracotta, golden yellow tones',
  },
  cool: {
    name: 'cool',
    label: '冷色调',
    prompt: 'cool color palette with teal, slate blue, silver, ice blue tones',
  },
  dark: {
    name: 'dark',
    label: '深色调',
    prompt: 'dark moody palette with deep navy, charcoal, midnight purple, rich blacks with subtle highlights',
  },
  vivid: {
    name: 'vivid',
    label: '鲜艳色',
    prompt: 'vivid saturated colors, bold primary and secondary color combinations, high contrast, energetic palette',
  },
  pastel: {
    name: 'pastel',
    label: '柔和色',
    prompt: 'soft pastel palette with muted pink, lavender, mint, light peach, low saturation, gentle and calming',
  },
  mono: {
    name: 'mono',
    label: '单色调',
    prompt: 'monochromatic color scheme, single hue with varied tones and shades, sophisticated and unified',
  },
};

const RATIOS = {
  '2.35:1': { width: 1200, height: 510, label: '宽银幕 (公众号推荐)' },
  '16:9':   { width: 1200, height: 675, label: '标准宽屏' },
  '1:1':    { width: 1080, height: 1080, label: '方形' },
};

/**
 * 根据标题和摘要自动推荐风格
 */
function recommendStyle(title, summary) {
  const text = `${title} ${summary}`;
  // 技术/架构类 → conceptual
  if (/架构|系统|技术|API|框架|算法|工程|设计模式/.test(text)) return 'conceptual';
  // 故事/人物类 → hero
  if (/故事|人物|经历|旅程|成长|回忆|那天/.test(text)) return 'hero';
  // 思考/哲理类 → metaphor
  if (/思考|本质|意义|深层|哲学|反思|智慧|人生/.test(text)) return 'metaphor';
  // 数据/对比类 → minimal
  if (/数据|对比|排名|指南|清单|工具/.test(text)) return 'minimal';
  // 默认 → hero
  return 'hero';
}

/**
 * 构建封面图生成 prompt
 * @param {string} title - 文章标题
 * @param {string} summary - 文章摘要
 * @param {string} style - 风格 key
 * @param {string} palette - 配色 key
 * @param {string} ratio - 比例 key
 * @returns {string} 完整 prompt
 */
function buildCoverPrompt(title, summary, style, palette, ratio) {
  const s = STYLES[style] || STYLES.hero;
  const p = PALETTES[palette] || PALETTES.warm;
  const r = RATIOS[ratio] || RATIOS['2.35:1'];

  return [
    `Design a professional article cover image.`,
    ``,
    `Article title: ${title}`,
    `Article summary: ${summary}`,
    ``,
    `Visual style: ${s.prompt}`,
    `Color palette: ${p.prompt}`,
    ``,
    `Technical requirements:`,
    `- Aspect ratio: ${ratio || '2.35:1'}, resolution: ${r.width}x${r.height}`,
    `- No text, no watermarks, no logos — pure visual design`,
    `- The image should visually convey the core idea of the article`,
    `- Professional quality, suitable for a WeChat public account header image`,
    `- Single cohesive composition with clear visual hierarchy`,
  ].join('\n');
}

module.exports = {
  STYLES,
  PALETTES,
  RATIOS,
  buildCoverPrompt,
  recommendStyle,
};
