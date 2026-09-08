/**
 * 写作流程编排: 大纲→确认→全文
 */
const readline = require('readline');
const { PROVIDERS, createClient, callAI } = require('../providers');
const { buildOutlinePrompt, buildExpandPrompt, listArchetypes } = require('./prompts');

async function askConfirm(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function runWrite({ viewpoints, type = 'opinion', provider = 'gemini', apiKey, baseUrl, model: customModel, dryRun, noConfirm, outlineOnly, titleCandidates = 5 }) {
  if (!PROVIDERS[provider] && !baseUrl) throw new Error(`不支持的 provider: ${provider}。可选: ${Object.keys(PROVIDERS).join(', ')}，或指定 baseUrl`);
  const config = PROVIDERS[provider] || { model: customModel, baseURL: baseUrl };
  const activeModel = customModel || config.model;

  const outlinePrompt = buildOutlinePrompt(type, viewpoints, { titleCandidates });

  if (dryRun) {
    console.log('=== DRY RUN: 写作 Prompt ===');
    console.log(`Provider: ${provider} (${activeModel})`);
    console.log(`文章类型: ${type}`);
    console.log('--- 大纲 Prompt ---');
    console.log(outlinePrompt.slice(0, 500) + (outlinePrompt.length > 500 ? '\n...(truncated)' : ''));
    console.log('=== END DRY RUN ===');
    return null;
  }

  const { client, model } = createClient(provider, { apiKey, baseUrl, model: customModel });

  // Step 1: 生成大纲
  console.error('正在生成大纲...');
  const outline = await callAI(client, model, outlinePrompt);
  console.error('\n=== 大纲 ===');
  console.error(outline);
  console.error('=============\n');

  // Step 2: 确认
  if (!noConfirm) {
    const answer = await askConfirm('按 Enter 继续扩写，输入 q 取消: ');
    if (answer === 'q') { console.error('已取消'); return null; }
  }

  if (outlineOnly) {
    console.error('大纲模式，跳过全文扩写');
    return outline;
  }

  // Step 3: 扩写全文
  const expandPrompt = buildExpandPrompt(type, outline);
  console.error('正在扩写全文...');
  const article = await callAI(client, model, expandPrompt);
  console.error('写作完成！');
  return article;
}

module.exports = { runWrite, listArchetypes };
