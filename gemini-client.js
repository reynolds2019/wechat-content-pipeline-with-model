/**
 * 共享 Gemini API 客户端 — 带指数退避重试
 * 消除 xhs/cover/infographic/image-gen 四处重复代码
 */
const { ProxyAgent } = require('undici');

const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  || process.env.https_proxy || process.env.http_proxy;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

class GeminiClient {
  constructor({ apiKey, model, dryRun, baseUrl } = {}) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    this.model = model || 'gemini-3-pro-image-preview';
    this.dryRun = dryRun || false;
    this.baseUrl = baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * 调用 Gemini API，带指数退避重试
   * @param {string} prompt
   * @returns {object} Gemini API 响应
   */
  async callGemini(prompt) {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await this._doCall(prompt);
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt) + Math.random() * 1000;
          console.error(`  重试 ${attempt + 1}/${MAX_RETRIES - 1}，延迟 ${Math.round(delay)}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  }

  async _doCall(prompt) {
    if (!this.apiKey) {
      throw new Error('需要 GEMINI_API_KEY (--api-key 或环境变量 GEMINI_API_KEY)');
    }
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
    const fetchOpts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    };
    if (PROXY_URL) fetchOpts.dispatcher = new ProxyAgent(PROXY_URL);
    const res = await fetch(url, fetchOpts);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API 错误 (${res.status}): ${err}`);
    }
    return res.json();
  }

  /**
   * 从 Gemini 响应中提取图像
   * @param {object} response - Gemini API 响应
   * @returns {Array<{mimeType: string, data: string}>}
   */
  extractImages(response) {
    const parts = response?.candidates?.[0]?.content?.parts || [];
    return parts.filter(p => p.inlineData).map(p => ({
      mimeType: p.inlineData.mimeType || 'image/png',
      data: p.inlineData.data,
    }));
  }
}

module.exports = { GeminiClient };
