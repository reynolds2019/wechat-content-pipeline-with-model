/**
 * 选题 AI 分析模块
 */
const OpenAI = require('openai');
const { PROVIDERS } = require('../providers');
const { HttpsProxyAgent } = require('https-proxy-agent');

const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;

async function analyzeTopic({ topics, niche, provider = 'gemini', apiKey, dryRun }) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`不支持的 provider: ${provider}`);

  const topicList = topics.map((t, i) => `${i + 1}. [${t.source}] ${t.title} (热度:${t.heat})`).join('\n');
  const prompt = `你是微信公众号选题专家。以下是当前热点话题：\n\n${topicList}\n\n` +
    `目标领域：${niche || '通用'}\n\n` +
    `请推荐5个最适合公众号创作的选题，每个包含：\n` +
    `- 标题（吸引力强）\n- 切入角度（独特视角）\n- 潜力评分（1-10）\n- 推荐理由（一句话）\n\n` +
    `按评分从高到低排列。`;

  if (dryRun) {
    console.log('=== DRY RUN: 选题分析 Prompt ===');
    console.log(`Provider: ${provider} (${config.model})`);
    console.log(`领域: ${niche || '通用'}`);
    console.log('--- Prompt ---');
    console.log(prompt.slice(0, 600) + (prompt.length > 600 ? '\n...(truncated)' : ''));
    console.log('=== END DRY RUN ===');
    return null;
  }

  const key = apiKey || process.env[config.envKey];
  if (!key) throw new Error(`缺少 API Key，请通过 --api-key 或环境变量 ${config.envKey} 提供`);

  const client = new OpenAI({ baseURL: config.baseURL, apiKey: key,
    ...(config.needsProxy && PROXY_URL ? { httpAgent: new HttpsProxyAgent(PROXY_URL) } : {}),
  });
  const resp = await client.chat.completions.create({
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  }, { timeout: 60000 });

  return resp.choices?.[0]?.message?.content?.trim() || '分析结果为空';
}

module.exports = { analyzeTopic };
