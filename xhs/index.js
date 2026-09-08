/**
 * 小红书系列图生成模块 — XhsGenerator
 * 生成 9:16 竖版卡片系列，10 风格 × 8 布局
 * 支持视觉一致性参考链
 */
const { GeminiClient } = require('../gemini-client');
const { STYLES, LAYOUTS, buildXhsPrompt } = require('./prompts');

/** API 调用间隔 (ms)，避免速率限制 */
const API_DELAY = 5000;

class XhsGenerator {
  constructor({ apiKey, model, dryRun, baseUrl } = {}) {
    this.client = new GeminiClient({ apiKey, model, dryRun, baseUrl });
    this.dryRun = dryRun || false;
  }

  /**
   * 分析 markdown 内容，拆分为关键点
   * @param {string} markdown
   * @param {number} count - 目标卡片数量
   * @returns {Array<{title: string, content: string}>}
   */
  analyzeContent(markdown, count) {
    const lines = markdown.split('\n');
    const points = [];

    // Extract title
    let articleTitle = '';
    for (const line of lines) {
      if (line.startsWith('# ')) {
        articleTitle = line.replace(/^#+\s*/, '').trim();
        break;
      }
    }

    // Extract sections based on headings
    const hasH2 = lines.some(l => /^## [^#]/.test(l));
    const headingRe = hasH2 ? /^## ([^#].*)/ : /^### ([^#].*)/;
    let currentTitle = '';
    let currentBody = [];

    for (const line of lines) {
      const m = line.match(headingRe);
      if (m) {
        if (currentTitle && currentBody.length > 0) {
          points.push({
            title: currentTitle,
            content: currentBody
              .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('```'))
              .map(l => l.replace(/[*_`>\[\]()]/g, '').trim())
              .join(' ')
              .slice(0, 200),
          });
        }
        currentTitle = m[1].replace(/[—–\-].+$/, '').trim();
        currentBody = [];
      } else if (currentTitle) {
        currentBody.push(line);
      }
    }
    // Push last section
    if (currentTitle && currentBody.length > 0) {
      points.push({
        title: currentTitle,
        content: currentBody
          .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('```'))
          .map(l => l.replace(/[*_`>\[\]()]/g, '').trim())
          .join(' ')
          .slice(0, 200),
      });
    }

    // Also extract list items as potential points
    const listPoints = lines
      .filter(l => /^\s*[-*]\s/.test(l))
      .map(l => l.replace(/^\s*[-*]\s*/, '').replace(/[*_`]/g, '').trim())
      .filter(l => l.length > 10);

    // If we have fewer sections than desired, supplement with list items
    if (points.length < count && listPoints.length > 0) {
      const remaining = count - points.length;
      for (let i = 0; i < Math.min(remaining, listPoints.length); i++) {
        points.push({
          title: listPoints[i].slice(0, 30),
          content: listPoints[i],
        });
      }
    }

    // First card is always the cover/intro
    const coverPoint = {
      title: articleTitle || '导读',
      content: markdown
        .split('\n')
        .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('```') && !l.startsWith('-'))
        .slice(0, 3)
        .map(l => l.replace(/[*_`>\[\]()]/g, '').trim())
        .join(' ')
        .slice(0, 200) || articleTitle,
    };

    // Build final list: cover + content points, trimmed to count
    const result = [coverPoint, ...points].slice(0, count);

    // If still fewer than count, pad by splitting longer sections
    while (result.length < count && points.length > 0) {
      const longest = points.reduce((a, b) => a.content.length > b.content.length ? a : b);
      result.push({
        title: `${longest.title} (续)`,
        content: longest.content.slice(100),
      });
      if (result.length >= count) break;
    }

    return result.slice(0, count);
  }

  /**
   * 生成小红书系列图
   * @param {string} markdown - 源内容
   * @param {object} options - { style, layout, count }
   * @returns {Array<{mimeType: string, data: string}>}
   */
  async generateSeries(markdown, options = {}) {
    const style = options.style || 'warm';
    const layout = options.layout || 'balanced';
    const count = Math.min(10, Math.max(1, options.count || 5));

    const points = this.analyzeContent(markdown, count);
    const styleLabel = STYLES[style]?.label || style;
    const layoutLabel = LAYOUTS[layout]?.label || layout;

    console.error(`小红书系列图: ${points.length} 张卡片 [${styleLabel}/${layoutLabel}]`);

    // Build prompts
    const prompts = points.map((point, i) => ({
      point: { ...point, index: i + 1, total: points.length },
      prompt: buildXhsPrompt(
        { ...point, index: i + 1, total: points.length },
        style,
        layout,
        i === 0  // isFirst
      ),
    }));

    if (this.dryRun) {
      console.error(`[dry-run] 将生成 ${prompts.length} 张小红书卡片:`);
      prompts.forEach((p, i) => {
        console.error(`\n--- 卡片 ${i + 1}/${prompts.length}: ${p.point.title} ---`);
        console.error(p.prompt);
      });
      return [];
    }

    console.error(`正在生成 ${prompts.length} 张小红书卡片...`);
    const results = [];

    for (let i = 0; i < prompts.length; i++) {
      const p = prompts[i];
      console.error(`  [${i + 1}/${prompts.length}] ${p.point.title}`);

      try {
        const response = await this.client.callGemini(p.prompt);
        const images = this.client.extractImages(response);
        if (images.length > 0) {
          results.push(images[0]);
        } else {
          console.error(`    警告: 未返回图片`);
        }
      } catch (err) {
        console.error(`    错误: ${err.message}`);
      }

      // Rate limiting delay between requests (except after last)
      if (i < prompts.length - 1) {
        await new Promise(r => setTimeout(r, API_DELAY));
      }
    }

    console.error(`已生成 ${results.length}/${prompts.length} 张小红书卡片`);
    return results;
  }
}

module.exports = { XhsGenerator, STYLES, LAYOUTS };
