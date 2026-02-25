/**
 * 调研素材 prompt 模板 — V2.4 单轮深度调研（去 STORM）
 */

/**
 * 深度调研 prompt — 融合同类内容参考（含可选全文）
 */
function buildResearchPrompt(topic, niche, references) {
  const refSection = references && references.length > 0
    ? `\n\n【同类高质量内容参考】（多平台搜索结果，按质量评分排序）\n${references.map((r, i) => {
        const platform = r.platform || 'unknown';
        const scoreTag = r.qualityScore ? ` ⭐${r.qualityScore}` : '';
        const srcLabel = r.source || platform;
        let line = `${i + 1}. [${srcLabel}/${platform}] 《${r.title}》${scoreTag}`;
        if (r.fullContent) {
          line += `\n   全文摘要: ${r.fullContent.slice(0, 500)}`;
        } else if (r.summary) {
          line += `\n   摘要: ${r.summary}`;
        }
        return line;
      }).join('\n')}`
    : '';

  return `你是一个深度调研专家，擅长为公众号写作收集高质量素材。

请围绕以下主题进行深度调研：

主题：${topic}
${niche ? `领域：${niche}` : ''}
${refSection}

请输出以下 6 个板块的结构化素材（Markdown 格式）：

## 一、背景与趋势
- 这个话题当前的热度和关注度
- 近期相关的关键事件或转折点
- 行业/社会层面的趋势走向
- 用具体数据说话（时间、数字、来源）

## 二、核心数据
提供 3-5 个可直接引用的数据点，每个包含：
- 数据内容（具体数字）
- 数据来源（机构/报告名称）
- 数据时间（越新越好）
- 一句话解读

## 三、故事素材钩子
提供 3 个可展开为文章案例的方向，每个包含：
- 故事梗概（50字以内）
- 为什么适合这个主题
- [待补充: 需要作者补充的真实细节，如个人经历、身边案例]

## 四、对立观点
提供 2-3 个可能的反对意见：
- 反对观点内容
- 持此观点的典型人群
- 建议的回应策略（不是反驳，是理解后的升华）

## 五、参考链接
列出 5-8 个相关的高质量文章/报告/视频，每个包含：
- 标题
- 来源/作者
- 核心观点（一句话）
- 链接（如有）

## 六、争议度评估
对本话题的争议程度打分（1-5分）：
- 1分：共识性话题，几乎无争议
- 3分：有不同声音，但主流观点明确
- 5分：高度争议，正反观点势均力敌
评分：X/5
理由：一句话说明

【要求】
- 数据要真实可查，不要编造
- 故事钩子要有画面感，不要抽象概括
- 对立观点要真实存在，不要稻草人论证
- 分析同类参考内容的写作角度，找到差异化切入点
- 整体素材要服务于"写一篇有深度的公众号文章"这个目标`;
}

module.exports = { buildResearchPrompt };
