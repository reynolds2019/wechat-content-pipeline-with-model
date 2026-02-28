/**
 * WeChat Official Account API Publisher
 * Handles image uploading, draft creation, and publishing via WeChat MP API.
 */

const path = require('path');

const BASE_URL = 'https://api.weixin.qq.com';

class WeChatApiPublisher {
  constructor(options = {}) {
    this.appId = options.appId || process.env.WECHAT_APP_ID;
    this.appSecret = options.appSecret || process.env.WECHAT_APP_SECRET;
    if (!this.appId || !this.appSecret) {
      throw new Error(
        '缺少微信公众号凭据。请设置环境变量 WECHAT_APP_ID 和 WECHAT_APP_SECRET，' +
        '或通过 options 传入 appId/appSecret。'
      );
    }
    this.accessToken = null;
  }

  /**
   * Get access token from WeChat API.
   */
  async getAccessToken() {
    if (this.accessToken) return this.accessToken;

    const url = `${BASE_URL}/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(this.appId)}&secret=${encodeURIComponent(this.appSecret)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.errcode) {
      throw new Error(`获取 access_token 失败: [${data.errcode}] ${data.errmsg}`);
    }

    this.accessToken = data.access_token;
    return this.accessToken;
  }

  /**
   * Upload permanent material image (for thumb/cover).
   * Returns media_id for use as thumb_media_id.
   */
  async uploadImage(accessToken, imageBuffer, filename = 'cover.png') {
    const url = `${BASE_URL}/cgi-bin/material/add_material?access_token=${accessToken}&type=image`;

    const boundary = '----WxFormatBoundary' + Date.now().toString(36);
    const ext = path.extname(filename).slice(1) || 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;

    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="media"; filename="${filename}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, imageBuffer, footer]);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });
    const data = await res.json();

    if (data.errcode) {
      throw new Error(`上传素材失败: [${data.errcode}] ${data.errmsg}`);
    }

    return { media_id: data.media_id, url: data.url };
  }

  /**
   * Upload image for use inside article content (inline images).
   * Returns a URL that can be used in article HTML.
   */
  async uploadNewsImage(accessToken, imageBuffer, filename = 'image.png') {
    const url = `${BASE_URL}/cgi-bin/media/uploadimg?access_token=${accessToken}`;

    const boundary = '----WxFormatBoundary' + Date.now().toString(36);
    const ext = path.extname(filename).slice(1) || 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;

    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="media"; filename="${filename}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, imageBuffer, footer]);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });
    const data = await res.json();

    if (data.errcode) {
      throw new Error(`上传图文图片失败: [${data.errcode}] ${data.errmsg}`);
    }

    return data.url;
  }

  /**
   * Create a draft article.
   * Returns media_id of the draft.
   */
  async addDraft(accessToken, article) {
    const url = `${BASE_URL}/cgi-bin/draft/add?access_token=${accessToken}`;

    const payload = {
      articles: [{
        title: article.title || '未命名文章',
        author: article.author || '',
        content: article.content,
        thumb_media_id: article.thumb_media_id || '',
        digest: article.digest || '',
        content_source_url: article.content_source_url || '',
        need_open_comment: article.need_open_comment || 0,
        only_fans_can_comment: article.only_fans_can_comment || 0,
      }],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.errcode) {
      throw new Error(`创建草稿失败: [${data.errcode}] ${data.errmsg}`);
    }

    return { media_id: data.media_id };
  }

  /**
   * Submit a draft for publishing (free publish).
   * Returns publish_id for tracking.
   */
  async publish(accessToken, mediaId) {
    const url = `${BASE_URL}/cgi-bin/freepublish/submit?access_token=${accessToken}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_id: mediaId }),
    });
    const data = await res.json();

    if (data.errcode) {
      throw new Error(`发布失败: [${data.errcode}] ${data.errmsg}`);
    }

    return { publish_id: data.publish_id };
  }

  /**
   * Extract base64 images from HTML, upload each via uploadNewsImage,
   * and replace the src with the returned WeChat URL.
   * Also uploads the first image as permanent material for thumb_media_id.
   * @returns {{ html: string, thumbMediaId: string }}
   */
  async extractAndUploadImages(html, accessToken) {
    const base64Regex = /(<img\s[^>]*src\s*=\s*")data:image\/([^;]+);base64,([^"]+)("[^>]*>)/gi;
    const matches = [...html.matchAll(base64Regex)];

    if (matches.length === 0) return { html, thumbMediaId: '' };

    console.log(`发现 ${matches.length} 张 base64 图片，正在上传...`);

    let result = html;
    let uploadCount = 0;
    let thumbMediaId = '';

    for (const match of matches) {
      const [fullMatch, prefix, imgType, base64Data, suffix] = match;
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = imgType === 'jpeg' ? 'jpg' : imgType;
        const filename = `article-img-${++uploadCount}.${ext}`;
        const imageUrl = await this.uploadNewsImage(accessToken, buffer, filename);
        result = result.replace(fullMatch, `${prefix}${imageUrl}${suffix}`);
        console.log(`  [${uploadCount}/${matches.length}] 已上传: ${filename}`);

        // 第一张图片额外上传为永久素材，作为封面缩略图
        if (uploadCount === 1 && !thumbMediaId) {
          try {
            const perm = await this.uploadImage(accessToken, buffer, `thumb.${ext}`);
            thumbMediaId = perm.media_id;
            console.log(`  封面缩略图已上传: media_id=${thumbMediaId}`);
          } catch (err) {
            console.error(`  封面缩略图上传失败: ${err.message}`);
          }
        }
      } catch (err) {
        console.error(`  [${uploadCount + 1}/${matches.length}] 上传失败: ${err.message}`);
      }
    }

    return { html: result, thumbMediaId };
  }
}

module.exports = { WeChatApiPublisher };
