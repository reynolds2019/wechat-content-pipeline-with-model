/**
 * 调研素材收集模块 — V2.4 单轮深度调研（去 STORM）
 * 两步: 多平台搜索(+可选全文提取) → AI 深度调研
 */
const fs = require('fs');
const { createClient, callAI } = require('../providers');
const { findSimilarContent } = require('./content-finder');
const { buildResearchPrompt } = require('./prompts');

async function runResearch({ topic, niche, provider = 'gemini', apiKey, dryRun, output, extract }) {
  if (!topic) throw new Error('请提供调研主题');

  // Step 1: 搜索同类型内容参考 + 可选全文提取
  console.error('正在搜索同类型内容参考...');
  let references = [];
  try {
    references = await findSimilarContent(topic, niche, { extractContent: !!extract });
    console.error(`获取到 ${references.length} 篇参考内容`);
  } catch (err) {
    console.error(`内容搜索失败，继续调研: ${err.message}`);
  }

  // Step 2: AI 深度调研
  const researchPrompt = buildResearchPrompt(topic, niche, references);

  if (dryRun) {
    console.log('=== DRY RUN: 调研 Prompt ===');
    console.log(researchPrompt.slice(0, 500));
    console.log('=== END DRY RUN ===');
    return null;
  }

  const { client, model } = createClient(provider, apiKey);
  console.error('正在进行深度调研...');

  try {
    const result = await callAI(client, model, researchPrompt, { temperature: 0.7 });

    if (output) {
      fs.writeFileSync(output, result, 'utf-8');
      console.error(`调研素材已保存: ${output}`);
    }
    console.error('调研完成！');
    return result;
  } catch (err) {
    throw new Error(`调研失败: ${err.message}`);
  }
}

module.exports = { runResearch };
