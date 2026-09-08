if (typeof globalThis.File === 'undefined') {
  try { globalThis.File = require('node:buffer').File; } catch (_) {}
}

/**
 * OpenAI / 通用文生图 API 客户端 (支持 wan2.7-image 等大模型网关)
 * 保持与 GeminiClient 相同的公开接口，实现透明替代
 */
const { ProxyAgent } = require('undici');

const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  || process.env.https_proxy || process.env.http_proxy;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

class OpenAIImageClient {
  constructor({ apiKey, model, dryRun, baseUrl } = {}) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    this.model = model || 'wan2.7-image';
    this.dryRun = dryRun || false;
    let base = baseUrl || 'http://192.168.8.206:3002/v1';
    this.baseUrl = base.replace(/\/+$/, '');
  }

  /**
   * 调用文生图 API，带指数退避重试
   * @param {string} prompt
   * @returns {object} 标准化图像响应格式
   */
  async callGemini(prompt) {
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const resp = await this._doCall(prompt);
        const images = await this.extractImagesAsync(resp);
        resp._extractedImages = images;
        return resp;
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt) + Math.random() * 1000;
          console.error(`  生图 API 调用失败，重试 ${attempt + 1}/${MAX_RETRIES - 1}，延迟 ${Math.round(delay)}ms... (${err.message})`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  }

  async _doCall(prompt) {
    if (!this.apiKey) {
      throw new Error('需要 API Key (--api-key 或环境变量 OPENAI_API_KEY / GEMINI_API_KEY)');
    }
    const url = `${this.baseUrl}/images/generations`;
    const fetchOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        n: 1,
        size: '1024x1024',
      }),
    };
    if (PROXY_URL) fetchOpts.dispatcher = new ProxyAgent(PROXY_URL);

    const res = await fetch(url, fetchOpts);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI Image API 错误 (${res.status}): ${err}`);
    }
    const jsonResp = await res.json();
    return jsonResp;
  }

  /**
   * 从生图响应中提取图片，并统一转换为 Base64 格式
   * @param {object} response - API 响应
   * @returns {Promise<Array<{mimeType: string, data: string}>>}
   */
  async extractImagesAsync(response) {
    const dataList = response?.data || [];
    const results = [];

    for (const item of dataList) {
      if (item.b64_json) {
        results.push({
          mimeType: 'image/png',
          data: item.b64_json,
        });
      } else if (item.url) {
        try {
          const imgRes = await fetch(item.url);
          if (!imgRes.ok) throw new Error(`无法下载生成的图片: ${imgRes.status}`);
          const arrayBuffer = await imgRes.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString('base64');
          const contentType = imgRes.headers.get('content-type') || 'image/png';
          results.push({
            mimeType: contentType,
            data: base64Data,
          });
        } catch (err) {
          console.error(`下载生成的图片失败: ${err.message}`);
        }
      }
    }
    return results;
  }

  /**
   * 兼容 GeminClient 提取接口
   */
  extractImages(response) {
    if (response?._extractedImages) return response._extractedImages;
    return [];
  }
}

module.exports = { OpenAIImageClient };
