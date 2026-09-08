/**
 * 共享 AI Provider 配置
 * 支持 HTTP_PROXY/HTTPS_PROXY 环境变量自动代理
 */
const OpenAI = require('openai');
const { HttpsProxyAgent } = require('https-proxy-agent');

const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;

const PROVIDERS = {
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-3.1-pro-preview',
    envKey: 'GEMINI_API_KEY',
    needsProxy: true,
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    envKey: 'DEEPSEEK_API_KEY',
    needsProxy: false,
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    envKey: 'OPENAI_API_KEY',
    needsProxy: true,
  },
  claude: {
    baseURL: 'https://api.lvis.lol/v1',
    model: 'claude-sonnet-4-20250514',
    envKey: 'CLAUDE_API_KEY',
    needsProxy: false,
  },
};

function createClient(provider, options = {}) {
  const optsObj = typeof options === 'string' ? { apiKey: options } : (options || {});
  const config = PROVIDERS[provider] || {};

  const apiKey = optsObj.apiKey || (config.envKey ? process.env[config.envKey] : undefined);
  const baseURL = optsObj.baseUrl || optsObj.baseURL || config.baseURL;
  const model = optsObj.model || config.model;

  if (!PROVIDERS[provider] && !baseURL) {
    throw new Error(`不支持的 provider: ${provider}。可选: ${Object.keys(PROVIDERS).join(', ')}，或指定 --base-url`);
  }

  if (!apiKey || !apiKey.trim()) {
    const envInfo = config.envKey ? ` 或环境变量 ${config.envKey}` : '';
    throw new Error(`缺少 API Key，请通过 --api-key${envInfo} 提供`);
  }

  if (!baseURL) {
    throw new Error(`缺少 Base URL，请通过 --base-url 提供`);
  }

  if (!model) {
    throw new Error(`缺少 Model，请通过 --model 提供`);
  }

  const clientOpts = { baseURL, apiKey };
  if ((config.needsProxy || optsObj.needsProxy) && PROXY_URL) {
    clientOpts.httpAgent = new HttpsProxyAgent(PROXY_URL);
  }
  return { client: new OpenAI(clientOpts), model, baseURL };
}

/**
 * 共享 AI 调用函数 — 带重试和超时
 */
async function callAI(client, model, prompt, { temperature = 0.7, timeout = 120000, retries = 2 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await client.chat.completions.create(
        { model, messages: [{ role: 'user', content: prompt }], temperature },
        { timeout }
      );
      const result = resp.choices?.[0]?.message?.content?.trim();
      if (!result) throw new Error('AI 返回内容为空');
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        console.error(`AI 调用失败，2秒后重试: ${err.message}`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  throw new Error(`AI 调用失败: ${lastError.message}`);
}

module.exports = { PROVIDERS, createClient, callAI };
