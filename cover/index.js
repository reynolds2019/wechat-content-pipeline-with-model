/**
 * 封面图生成模块 — CoverGenerator
 * 基于 Gemini 图像生成 API，支持 5 风格 × 6 配色 × 3 比例
 */
const { createImageClient } = require('../image-client-factory');
const { STYLES, PALETTES, RATIOS, buildCoverPrompt, recommendStyle } = require('./prompts');

class CoverGenerator {
  constructor({ apiKey, model, dryRun, baseUrl, provider } = {}) {
    this.client = createImageClient({ apiKey, model, dryRun, baseUrl, provider });
    this.dryRun = dryRun || false;
  }

  /**
   * 从 markdown 提取标题和摘要
   */
  _extractTitleAndSummary(markdown) {
    const lines = markdown.split('\n').filter(l => l.trim());
    let title = 'untitled';
    let summary = '';
    for (const line of lines) {
      if (line.startsWith('# ')) {
        title = line.replace(/^#+\s*/, '');
        continue;
      }
      if (!summary && !line.startsWith('#') && !line.startsWith('```')) {
        summary = line.replace(/[*_`>\[\]()]/g, '').slice(0, 200);
      }
      if (title !== 'untitled' && summary) break;
    }
    return { title, summary: summary || title };
  }

  /**
   * 生成封面图
   * @param {string} markdown - 文章 markdown 内容
   * @param {object} options - { style, palette, ratio }
   * @returns {{ mimeType: string, data: string } | null} base64 图像
   */
  async generate(markdown, options = {}) {
    const { title, summary } = this._extractTitleAndSummary(markdown);

    const style = options.style || recommendStyle(title, summary);
    const palette = options.palette || 'warm';
    const ratio = options.ratio || '2.35:1';

    const prompt = buildCoverPrompt(title, summary, style, palette, ratio);

    if (this.dryRun) {
      console.error('[dry-run] 封面图生成 prompt:');
      console.error(`  风格: ${style} (${(STYLES[style] || {}).label || style})`);
      console.error(`  配色: ${palette} (${(PALETTES[palette] || {}).label || palette})`);
      console.error(`  比例: ${ratio}`);
      console.error(prompt);
      return null;
    }

    console.error(`正在生成封面图 [${style}/${palette}/${ratio}]...`);
    const response = await this.client.callGemini(prompt);
    const images = this.client.extractImages(response);

    if (images.length === 0) {
      console.error('警告: Gemini 未返回封面图');
      return null;
    }
    console.error('封面图生成完成');
    return images[0];
  }

  /**
   * 将封面图插入 HTML 头部
   */
  insertCover(html, image) {
    if (!image) return html;
    const imgTag = `<img src="data:${image.mimeType};base64,${image.data}" `
      + `style="width:100%;border-radius:8px;margin:0 0 20px 0;" />`;

    // 插入到 wx-content div 内最前面
    const contentStart = html.indexOf('class="wx-content">');
    if (contentStart !== -1) {
      const insertPos = html.indexOf('>', contentStart) + 1;
      return html.slice(0, insertPos) + '\n' + imgTag + '\n' + html.slice(insertPos);
    }
    return imgTag + '\n' + html;
  }
}

module.exports = { CoverGenerator, STYLES, PALETTES, RATIOS };
