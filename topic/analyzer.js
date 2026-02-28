/**
 * 选题 AI 分析模块
 * 纯 AI 选题 — 根据领域关键词生成选题建议
 */
const { createClient, callAI } = require('../providers');

async function analyzeTopic({ niche = '通用', provider = 'gemini', apiKey, dryRun }) {
  const prompt = `你是微信公众号选题专家。请根据以下领域生成 5 个最适合公众号创作的选题建议：

目标领域：${niche}

每个选题包含：
- 标题（吸引力强，不超过25字）
- 切入角度（独特视角）
- 潜力评分（1-10）
- 推荐理由（一句话）

按评分从高到低排列。直接输出选题列表。`;

  if (dryRun) {
    console.log('=== DRY RUN: 选题分析 Prompt ===');
    console.log(`Provider: ${provider}`);
    console.log(`领域: ${niche}`);
    console.log('--- Prompt ---');
    console.log(prompt.slice(0, 600) + (prompt.length > 600 ? '\n...(truncated)' : ''));
    console.log('=== END DRY RUN ===');
    return null;
  }

  const { client, model } = createClient(provider, apiKey);
  return await callAI(client, model, prompt, { temperature: 0.7 });
}

module.exports = { analyzeTopic };
