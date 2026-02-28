/**
 * 信息图 Prompt 构建模块
 * 20 styles × 21 layouts × 4 ratios
 */
const { LAYOUTS } = require('./layouts');

const STYLES = {
  'hand-drawn': { label: '手绘', prompt: 'hand-drawn sketch style, pencil and ink illustration, organic lines, imperfect charming aesthetic' },
  cyberpunk: { label: '赛博朋克', prompt: 'cyberpunk neon style, dark background with glowing cyan and magenta accents, futuristic digital aesthetic' },
  minimal: { label: '极简', prompt: 'minimalist clean design, ample white space, thin lines, restrained color palette, Swiss design influence' },
  watercolor: { label: '水彩', prompt: 'watercolor painting style, soft color blending, visible brush strokes, artistic and expressive' },
  neon: { label: '霓虹', prompt: 'neon glow effect, dark background with vibrant glowing elements, electric and energetic' },
  retro: { label: '复古', prompt: 'retro vintage style, muted earth tones, halftone dots, 1970s poster aesthetic' },
  corporate: { label: '商务', prompt: 'professional corporate style, clean blue and gray tones, structured layout, business presentation quality' },
  editorial: { label: '编辑', prompt: 'editorial magazine style, sophisticated typography, elegant layout, premium publication feel' },
  flat: { label: '扁平', prompt: 'flat design style, solid colors without gradients, simple geometric shapes, modern UI aesthetic' },
  gradient: { label: '渐变', prompt: 'gradient color style, smooth color transitions, modern glassmorphism touches, vibrant and contemporary' },
  glassmorphism: { label: '玻璃态', prompt: 'glassmorphism style, frosted glass effect, transparency, backdrop blur, soft shadows, modern UI' },
  brutalist: { label: '粗犷', prompt: 'brutalist design, raw bold typography, high contrast, unconventional layout, punk aesthetic' },
  'art-deco': { label: '装饰艺术', prompt: 'art deco style, geometric patterns, gold and black, 1920s glamour, ornate decorative elements' },
  'pop-art': { label: '波普艺术', prompt: 'pop art style, bold primary colors, Ben-Day dots, comic book aesthetic, bold outlines' },
  'line-art': { label: '线条艺术', prompt: 'line art style, single-weight clean lines, no fill, technical drawing precision, elegant simplicity' },
  duotone: { label: '双色调', prompt: 'duotone color style, two complementary colors only, high contrast, modern graphic design' },
  '3d-render': { label: '3D渲染', prompt: '3D rendered style, soft lighting, clay-like material, smooth rounded shapes, Pixar-quality rendering' },
  'paper-craft': { label: '纸艺', prompt: 'paper craft style, layered paper cut-out effect, shadows between layers, textured paper surface' },
  'pixel-art': { label: '像素', prompt: 'pixel art style, retro 8-bit game aesthetic, blocky graphics, limited color palette, nostalgic' },
  sketch: { label: '素描', prompt: 'pencil sketch style, graphite drawing, cross-hatching shading, artist notebook feel' },
};

const RATIOS = {
  '16:9':  { width: 1920, height: 1080, label: '横版宽屏' },
  '9:16':  { width: 1080, height: 1920, label: '竖版' },
  '1:1':   { width: 1080, height: 1080, label: '方形' },
  '4:3':   { width: 1440, height: 1080, label: '经典横版' },
};

/**
 * 构建信息图生成 prompt
 * @param {string} content - 内容摘要/关键数据
 * @param {string} layoutKey - 布局类型 key
 * @param {string} styleKey - 风格 key
 * @param {string} ratioKey - 比例 key
 * @returns {string} 完整 prompt
 */
function buildInfographicPrompt(content, layoutKey, styleKey, ratioKey) {
  const layout = LAYOUTS[layoutKey] || LAYOUTS['bento-grid'];
  const style = STYLES[styleKey] || STYLES.minimal;
  const ratio = RATIOS[ratioKey] || RATIOS['16:9'];

  return [
    `Create a professional infographic image based on the following content.`,
    ``,
    `Content to visualize:`,
    content,
    ``,
    `Layout: ${layout.label} (${layout.name})`,
    `- Structure: ${layout.visualStructure}`,
    `- Best suited for: ${layout.bestFor.join(', ')}`,
    ``,
    `Visual style: ${style.prompt}`,
    ``,
    `Technical requirements:`,
    `- Aspect ratio: ${ratioKey}, resolution: ${ratio.width}x${ratio.height}`,
    `- Data zero-loss: Include ALL data points from the content, never abbreviate or omit`,
    `- Text in the image should be clearly readable`,
    `- Professional quality infographic suitable for publication`,
    `- Use visual hierarchy to guide the reader's eye`,
    `- Include a clear title at the top of the infographic`,
  ].join('\n');
}

module.exports = { STYLES, RATIOS, buildInfographicPrompt };
