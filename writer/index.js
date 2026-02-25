/**
 * 写作流程编排: 大纲→确认→全文
 */
const fs = require('fs');
const path = require('path');
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

async function runWrite({ viewpoints, type = 'opinion', provider = 'gemini', apiKey, dryRun, noConfirm, research, outlineOnly, titleCandidates = 5 }) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`不支持的 provider: ${provider}。可选: ${Object.keys(PROVIDERS).join(', ')}`);

  let researchMaterial;
  if (research) {
    const researchPath = path.resolve(research);
    if (!fs.existsSync(researchPath)) throw new Error(`调研素材文件不存在: ${researchPath}`);
    researchMaterial = fs.readFileSync(researchPath, 'utf-8').trim();
    console.error(`已加载调研素材: ${researchPath} (${researchMaterial.length} 字)`);
  }

  const outlinePrompt = buildOutlinePrompt(type, viewpoints, { researchMaterial, titleCandidates });

  if (dryRun) {
    console.log('=== DRY RUN: 写作 Prompt ===');
    console.log(`Provider: ${provider} (${config.model})`);
    console.log(`文章类型: ${type}`);
    console.log('--- 大纲 Prompt ---');
    console.log(outlinePrompt.slice(0, 500) + (outlinePrompt.length > 500 ? '\n...(truncated)' : ''));
    console.log('=== END DRY RUN ===');
    return null;
  }

  const { client, model } = createClient(provider, apiKey);

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
