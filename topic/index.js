/**
 * 选题功能入口
 * 聚合热点 → 过滤 → AI分析 → 输出
 */

const fs = require('fs');
const { fetchTrending, SOURCES } = require('./sources');
const { analyzeTopic } = require('./analyzer');

async function runTopic(options = {}) {
  const {
    niche,
    sources: srcStr,
    count = 20,
    analyze = false,
    provider = 'gemini',
    apiKey,
    dryRun = false,
    json = false,
    output,
    format = 'table',
  } = options;

  // Parse sources
  const sourceKeys = srcStr
    ? srcStr.split(',').map(s => s.trim())
    : Object.keys(SOURCES);

  console.log(`正在获取热点数据 [${sourceKeys.join(', ')}] ...`);
  let topics = await fetchTrending(sourceKeys);

  if (topics.length === 0) {
    console.log('未获取到任何热点数据，请检查网络连接。');
    return;
  }

  // Filter by niche keyword
  if (niche) {
    const keywords = niche.split(',').map(k => k.trim().toLowerCase());
    const filtered = topics.filter(t =>
      keywords.some(k => t.title.toLowerCase().includes(k))
    );
    if (filtered.length > 0) topics = filtered;
    else console.log(`未找到与"${niche}"相关的热点，显示全部结果。`);
  }

  // Limit count
  topics = topics.slice(0, count);

  // Structured format output
  if (format === 'structured') {
    const structured = {
      metadata: { niche: niche || null, timestamp: new Date().toISOString(), sources: sourceKeys },
      topics: topics.map(t => ({ title: t.title, source: t.source, heat: t.heat, url: t.url })),
    };
    if (analyze) {
      console.log('正在进行 AI 选题分析...\n');
      const result = await analyzeTopic({ topics, niche, provider, apiKey, dryRun });
      if (result) structured.analyzed = result;
    }
    const jsonStr = JSON.stringify(structured, null, 2);
    if (output) {
      fs.writeFileSync(output, jsonStr, 'utf-8');
      console.log(`结构化结果已保存: ${output}`);
    } else {
      console.log(jsonStr);
    }
    return structured;
  }

  // Output
  if (json) {
    console.log(JSON.stringify(topics, null, 2));
  } else {
    console.log(`\n热点话题 (共 ${topics.length} 条):\n`);
    console.log('序号  来源    热度      标题');
    console.log('─'.repeat(60));
    topics.forEach((t, i) => {
      const src = t.source.padEnd(6);
      const heat = String(t.heat).padStart(8);
      console.log(`${String(i + 1).padStart(3)}   ${src}  ${heat}  ${t.title}`);
    });
  }

  // Save to file (table/json mode)
  if (output && !analyze) {
    const data = json
      ? JSON.stringify(topics, null, 2)
      : topics.map(t => `${t.source}\t${t.heat}\t${t.title}`).join('\n');
    fs.writeFileSync(output, data, 'utf-8');
    console.log(`结果已保存: ${output}`);
  }

  // AI analysis
  if (analyze) {
    console.log('\n正在进行 AI 选题分析...\n');
    const result = await analyzeTopic({ topics, niche, provider, apiKey, dryRun });
    if (result) console.log(result);
  }
}

module.exports = { runTopic };
