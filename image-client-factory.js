/**
 * 图像客户端工厂 — 集中管理 GeminiClient 与 OpenAIImageClient 的选择与实例化
 */
const { GeminiClient } = require('./gemini-client');
const { OpenAIImageClient } = require('./openai-image-client');

/**
 * 创建合适图像客户端实例
 * @param {object} options
 * @returns {GeminiClient | OpenAIImageClient}
 */
function createImageClient(options = {}) {
  const model = options.model || '';
  const provider = options.provider || '';
  const baseUrl = options.baseUrl || '';

  // 如果模型名称为 wan2.7-image，或明确非 Gemini 并且提供了 baseUrl/model
  const isGeminiNative = (model.includes('gemini') || provider === 'gemini') && !baseUrl.includes('3002') && !baseUrl.includes('3001');

  if (isGeminiNative) {
    return new GeminiClient(options);
  } else {
    return new OpenAIImageClient(options);
  }
}

module.exports = { createImageClient };
