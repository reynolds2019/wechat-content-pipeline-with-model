/**
 * PublishManager - Routes publishing to appropriate publisher.
 * Currently supports: wechat (via WeChat Official Account API)
 */

const { WeChatApiPublisher } = require('./wechat-api');

class PublishManager {
  /**
   * Publish HTML content to the specified target.
   *
   * @param {string} html - The formatted HTML content to publish
   * @param {object} options
   * @param {string} options.target - Publish target ('wechat')
   * @param {string} [options.method='api'] - Publish method ('api')
   * @param {string} [options.title] - Article title
   * @param {string} [options.author] - Article author
   * @param {string} [options.digest] - Article digest/summary
   * @param {string} [options.contentSourceUrl] - Original content URL
   * @param {string} [options.appId] - WeChat App ID (or use env var)
   * @param {string} [options.appSecret] - WeChat App Secret (or use env var)
   * @param {boolean} [options.draftOnly=true] - Only save as draft, don't publish
   * @returns {object} { media_id, publish_id?, status }
   */
  async publish(html, options = {}) {
    const target = options.target || 'wechat';
    const method = options.method || 'api';

    if (target !== 'wechat') {
      throw new Error(`不支持的发布目标: ${target}。当前仅支持: wechat`);
    }
    if (method !== 'api') {
      throw new Error(`不支持的发布方式: ${method}。当前仅支持: api`);
    }

    return this._publishWeChatApi(html, options);
  }

  async _publishWeChatApi(html, options) {
    const publisher = new WeChatApiPublisher({
      appId: options.appId,
      appSecret: options.appSecret,
    });

    console.log('正在获取 access_token...');
    const accessToken = await publisher.getAccessToken();

    // Extract and upload inline base64 images
    console.log('正在处理文章图片...');
    const { html: processedHtml, thumbMediaId } = await publisher.extractAndUploadImages(html, accessToken);

    if (!thumbMediaId) {
      console.error('警告: 未能获取封面缩略图 media_id。文章中没有图片，或封面上传失败。');
      console.error('微信草稿需要 thumb_media_id，请确保文章包含至少一张图片（如使用 --cover 生成封面图）。');
    }

    // Create draft
    console.log('正在创建草稿...');
    const article = {
      title: options.title || '未命名文章',
      author: options.author || '',
      content: processedHtml,
      thumb_media_id: thumbMediaId,
      digest: options.digest || '',
      content_source_url: options.contentSourceUrl || '',
    };

    const draft = await publisher.addDraft(accessToken, article);
    console.log(`草稿已创建，media_id: ${draft.media_id}`);

    const result = {
      media_id: draft.media_id,
      status: 'draft',
    };

    // Optionally publish (default is draft-only)
    if (options.draftOnly === false) {
      console.log('正在提交发布...');
      const pub = await publisher.publish(accessToken, draft.media_id);
      result.publish_id = pub.publish_id;
      result.status = 'submitted';
      console.log(`已提交发布，publish_id: ${pub.publish_id}`);
    }

    return result;
  }
}

module.exports = { PublishManager };
