/**
 * 信息图生成模块 — InfographicGenerator
 * 21 布局 × 20 风格，基于 Gemini 图像生成 API
 */
const { createImageClient } = require('../image-client-factory');
const { LAYOUTS, recommendLayouts } = require('./layouts');
const { STYLES, RATIOS, buildInfographicPrompt } = require('./prompts');

class InfographicGenerator {
  constructor({ apiKey, model, dryRun, baseUrl, provider } = {}) {
    this.client = createImageClient({ apiKey, model, dryRun, baseUrl, provider });
    this.dryRun = dryRun || false;
  }

  /**
   * 分析 markdown 内容，提取关键数据点和结构特征
   */
  analyzeContent(markdown) {
    const text = markdown.replace(/[#*_`>\[\]()]/g, '');
    const lines = markdown.split('\n');

    // Detect structural features
    const hasTimeline = /\d{4}年|\d{4}-\d{2}|时间线|阶段|里程碑|phase|milestone/i.test(text);
    const hasComparison = /对比|比较|VS|区别|差异|优劣|versus/i.test(text);
    const hasHierarchy = /层次|层级|上级|下级|分类|分层|hierarchy/i.test(text);
    const hasProcess = /步骤|流程|过程|第一步|然后|接着|最终|step/i.test(text);
    const hasList = (text.match(/^[-*]\s/gm) || []).length > 3;
    const hasData = /\d+%|\d+\.\d+|增长|下降|数据|统计|KPI/i.test(text);

    // Extract key data points
    const dataPoints = [];
    const numberMatches = text.match(/[\u4e00-\u9fff]+[：:]\s*\d+[\d.]*%?/g) || [];
    dataPoints.push(...numberMatches.slice(0, 10));

    // Extract headings as key concepts
    const headings = lines
      .filter(l => /^#{2,3}\s/.test(l))
      .map(l => l.replace(/^#+\s*/, '').trim())
      .slice(0, 10);

    // Extract list items as key points
    const listItems = lines
      .filter(l => /^[-*]\s/.test(l.trim()))
      .map(l => l.replace(/^[-*]\s*/, '').replace(/[*_`]/g, '').trim())
      .slice(0, 15);

    // Identify content features for layout recommendation
    const features = [];
    if (hasTimeline) features.push('timeline');
    if (hasComparison) features.push('comparison');
    if (hasHierarchy) features.push('hierarchy');
    if (hasProcess) features.push('process');
    if (hasList) features.push('list');
    if (hasData) features.push('data');

    // Build content summary for the prompt
    let contentSummary = '';
    if (headings.length > 0) {
      contentSummary += `Key sections:\n${headings.map(h => `- ${h}`).join('\n')}\n\n`;
    }
    if (dataPoints.length > 0) {
      contentSummary += `Data points:\n${dataPoints.map(d => `- ${d}`).join('\n')}\n\n`;
    }
    if (listItems.length > 0) {
      contentSummary += `Key points:\n${listItems.map(l => `- ${l}`).join('\n')}`;
    }
    if (!contentSummary) {
      contentSummary = text.slice(0, 500);
    }

    return {
      features,
      hasTimeline,
      hasComparison,
      hasHierarchy,
      hasProcess,
      hasList,
      hasData,
      headings,
      dataPoints,
      listItems,
      contentSummary,
    };
  }

  /**
   * 推荐布局+风格组合
   */
  recommend(markdown) {
    const analysis = this.analyzeContent(markdown);
    const layouts = recommendLayouts(analysis);
    return layouts.map(layoutKey => ({
      layout: layoutKey,
      layoutLabel: LAYOUTS[layoutKey]?.label || layoutKey,
      description: LAYOUTS[layoutKey]?.description || '',
    }));
  }

  /**
   * 生成信息图
   * @param {string} markdown - 源内容
   * @param {object} options - { layout, style, ratio }
   * @returns {{ mimeType: string, data: string } | null}
   */
  async generate(markdown, options = {}) {
    const analysis = this.analyzeContent(markdown);
    const layout = options.layout || recommendLayouts(analysis)[0] || 'bento-grid';
    const style = options.style || 'minimal';
    const ratio = options.ratio || '16:9';

    const prompt = buildInfographicPrompt(analysis.contentSummary, layout, style, ratio);

    if (this.dryRun) {
      console.error('[dry-run] 信息图生成 prompt:');
      console.error(`  布局: ${layout} (${LAYOUTS[layout]?.label || layout})`);
      console.error(`  风格: ${style} (${STYLES[style]?.label || style})`);
      console.error(`  比例: ${ratio}`);
      console.error(`  推荐布局: ${recommendLayouts(analysis).join(', ')}`);
      console.error(prompt);
      return null;
    }

    console.error(`正在生成信息图 [${LAYOUTS[layout]?.label || layout}/${STYLES[style]?.label || style}/${ratio}]...`);
    const response = await this.client.callGemini(prompt);
    const images = this.client.extractImages(response);

    if (images.length === 0) {
      console.error('警告: Gemini 未返回信息图');
      return null;
    }
    console.error('信息图生成完成');
    return images[0];
  }
}

module.exports = { InfographicGenerator, LAYOUTS, STYLES, RATIOS };
