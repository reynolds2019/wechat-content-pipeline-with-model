/**
 * 选题功能入口
 * 纯 AI 选题：根据领域关键词直接生成选题建议
 */

const fs = require('fs');
const { analyzeTopic } = require('./analyzer');

async function runTopic(options = {}) {
  const {
    niche = '通用',
    provider = 'gemini',
    apiKey,
    dryRun = false,
    json = false,
    output,
    format = 'table',
  } = options;

  console.log(`正在生成选题建议 [领域: ${niche}] ...`);

  const result = await analyzeTopic({ niche, provider, apiKey, dryRun });

  if (dryRun) return;

  if (!result) {
    console.log('未获取到选题建议。');
    return;
  }

  // JSON output
  if (json) {
    const structured = {
      metadata: { niche, timestamp: new Date().toISOString(), provider },
      suggestions: result,
    };
    const jsonStr = JSON.stringify(structured, null, 2);
    if (output) {
      fs.writeFileSync(output, jsonStr, 'utf-8');
      console.log(`结果已保存: ${output}`);
    } else {
      console.log(jsonStr);
    }
    return structured;
  }

  // Structured format
  if (format === 'structured') {
    const structured = {
      metadata: { niche, timestamp: new Date().toISOString(), provider },
      suggestions: result,
    };
    const jsonStr = JSON.stringify(structured, null, 2);
    if (output) {
      fs.writeFileSync(output, jsonStr, 'utf-8');
      console.log(`结构化结果已保存: ${output}`);
    } else {
      console.log(jsonStr);
    }
    return structured;
  }

  // Default text output
  console.log(`\n选题建议 [领域: ${niche}]:\n`);
  console.log(result);

  if (output) {
    fs.writeFileSync(output, result, 'utf-8');
    console.log(`\n结果已保存: ${output}`);
  }
}

module.exports = { runTopic };
