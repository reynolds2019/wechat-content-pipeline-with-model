/**
 * Gemini AI 配图模块 — 支持多图生成与智能插入
 */
const { ProxyAgent } = require('undici');

const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  || process.env.https_proxy || process.env.http_proxy;

const THEME_STYLES = {
  simple: '暖色调水彩插画风格，柔和的米色和金色调，温馨优雅',
  business: '蓝色调几何商务风格，专业简洁，扁平化设计',
  tech: '暗色调科技电路风格，翠绿色霓虹光效，赛博朋克感',
};

const TONE_KEYWORDS = {
  casual: '口语化、真实感、亲切',
  narrative: '叙事性、故事感、沉浸',
  technical: '技术性、精确、专业',
  reflective: '反思性、哲理、深度',
};

class ImageGenerator {
  constructor({ apiKey, model, dryRun } = {}) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    this.model = model || 'gemini-3-pro-image-preview';
    this.dryRun = dryRun || false;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  _detectTone(text) {
    const casual = (text.match(/[啊吧呢嘛哈呀]/g) || []).length;
    const technical = (text.match(/API|代码|框架|系统|架构|算法/g) || []).length;
    const narrative = (text.match(/那天|后来|结果|经历|故事/g) || []).length;
    const reflective = (text.match(/本质|意义|深层|思考|理解/g) || []).length;
    const scores = { casual, technical, narrative, reflective };
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }

  _extractMetaphors(text) {
    const metaphors = [];
    const patterns = [
      /像(.{2,15})/g, /就像(.{2,15})/g, /好比(.{2,15})/g,
      /如同(.{2,15})/g, /仿佛(.{2,15})/g,
    ];
    for (const p of patterns) {
      for (const m of text.matchAll(p)) metaphors.push(m[1].trim());
    }
    // Extract key nouns as visual elements
    const nouns = text.match(/套娃|镜子|画家|河流|翻译|悉达多|递归|进化|阶梯|迭代/g);
    if (nouns) metaphors.push(...new Set(nouns));
    return metaphors.slice(0, 5);
  }

  _buildHeroPrompt(title, fullText, theme) {
    const style = THEME_STYLES[theme] || THEME_STYLES.simple;
    const tone = this._detectTone(fullText);
    const toneDesc = TONE_KEYWORDS[tone] || TONE_KEYWORDS.casual;
    const metaphors = this._extractMetaphors(fullText);
    const summary = fullText.replace(/[#*_`>\[\]()]/g, '').slice(0, 300);
    return [
      `基于以下文章内容，设计一张公众号头图。`,
      ``,
      `文章标题：${title}`,
      `文章核心内容：${summary}`,
      `文章风格：${toneDesc}`,
      `核心视觉意象：${metaphors.join('、') || title}`,
      ``,
      `视觉要求：`,
      `- 16:9 横版，适合公众号`,
      `- 不包含任何文字，纯视觉`,
      `- 风格：${style}，贴合文章的${toneDesc}基调`,
      `- 画面应传达文章的核心隐喻`,
    ].join('\n');
  }

  _buildChapterPrompt(chTitle, chBody, theme) {
    const style = THEME_STYLES[theme] || THEME_STYLES.simple;
    const tone = this._detectTone(chBody);
    const toneDesc = TONE_KEYWORDS[tone] || TONE_KEYWORDS.casual;
    const metaphors = this._extractMetaphors(chBody);
    const summary = chBody.replace(/[#*_`>\[\]()]/g, '').slice(0, 300);
    return [
      `基于以下文章章节内容，设计一张配图。`,
      ``,
      `章节标题：${chTitle}`,
      `章节核心内容：${summary}`,
      `核心视觉意象：${metaphors.join('、') || chTitle}`,
      ``,
      `视觉要求：`,
      `- 16:9 横版，适合公众号`,
      `- 不包含任何文字，纯视觉插画`,
      `- 风格：${style}，贴合${toneDesc}的情感基调`,
      `- 画面应传达本章节的核心场景或隐喻`,
    ].join('\n');
  }

  async _callGemini(prompt) {
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

  _extractImages(response) {
    const images = [];
    const parts = response?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        images.push({
          mimeType: part.inlineData.mimeType || 'image/png',
          data: part.inlineData.data,
        });
      }
    }
    return images;
  }

  _extractTitleAndSummary(markdown) {
    const lines = markdown.split('\n').filter(l => l.trim());
    let title = 'untitled';
    let summary = '';
    for (const line of lines) {
      if (line.startsWith('# ')) {
        title = line.replace(/^#+\s*/, '');
        continue;
      }
      if (!summary && !line.startsWith('#') && !line.startsWith('```')) {
        summary = line.replace(/[*_`>\[\]()]/g, '').slice(0, 200);
      }
      if (title !== 'untitled' && summary) break;
    }
    return { title, summary: summary || title };
  }

  /** 解析 markdown 中的 h2 章节 */
  _extractChapters(markdown) {
    const lines = markdown.split('\n');
    const chapters = [];
    let current = null;
    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (current) chapters.push(current);
        current = {
          title: line.replace(/^##\s*/, '').replace(/[—–\-].+$/, '').trim(),
          body: [],
        };
      } else if (current) {
        current.body.push(line);
      }
    }
    if (current) chapters.push(current);
    // 为每个章节生成摘要（取前3行非空文本）+ 保留完整body
    return chapters.map(ch => ({
      title: ch.title,
      body: ch.body.join('\n'),
      summary: ch.body
        .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('```'))
        .slice(0, 3)
        .map(l => l.replace(/[*_`>\[\]()]/g, ''))
        .join(' ')
        .slice(0, 150),
    }));
  }

  /** 单图生成（兼容旧接口） */
  async generate(markdown, theme = 'simple') {
    const { title, summary } = this._extractTitleAndSummary(markdown);
    const prompt = this._buildHeroPrompt(title, markdown, theme);

    if (this.dryRun) {
      console.error('[dry-run] 图片生成 prompt:');
      console.error(prompt);
      return null;
    }

    console.error('正在生成 AI 配图...');
    const response = await this._callGemini(prompt);
    const images = this._extractImages(response);

    if (images.length === 0) {
      console.error('警告: Gemini 未返回图片');
      return null;
    }
    console.error(`已生成 ${images.length} 张配图`);
    return images[0];
  }

  /** 多图生成：头图 + 选定章节配图 */
  async generateMultiple(markdown, theme = 'simple') {
    const { title, summary } = this._extractTitleAndSummary(markdown);
    const chapters = this._extractChapters(markdown);

    // 选择需要配图的章节（跳过"写在最后"等收尾章节）
    const skipPatterns = /写在最后|总结|结语|结尾|最后|参考|附录|致谢|引用|注释/;
    const imageChapters = chapters.filter(ch => !skipPatterns.test(ch.title));

    // 头图 prompt
    const prompts = [{
      type: 'hero',
      title: title,
      prompt: this._buildHeroPrompt(title, markdown, theme),
    }];

    // 章节配图 prompts
    for (const ch of imageChapters) {
      prompts.push({
        type: 'chapter',
        title: ch.title,
        prompt: this._buildChapterPrompt(ch.title, ch.body || ch.summary, theme),
      });
    }

    if (this.dryRun) {
      console.error(`[dry-run] 将生成 ${prompts.length} 张配图:`);
      prompts.forEach((p, i) => {
        console.error(`\n--- 图 ${i + 1} (${p.type}: ${p.title}) ---`);
        console.error(p.prompt);
      });
      return [];
    }

    console.error(`正在生成 ${prompts.length} 张 AI 配图...`);
    const results = [];
    for (let i = 0; i < prompts.length; i++) {
      const p = prompts[i];
      console.error(`  [${i + 1}/${prompts.length}] ${p.type}: ${p.title}`);
      try {
        const response = await this._callGemini(p.prompt);
        const images = this._extractImages(response);
        if (images.length > 0) {
          results.push({ ...p, image: images[0] });
        } else {
          console.error(`    警告: 未返回图片`);
        }
      } catch (err) {
        console.error(`    错误: ${err.message}`);
      }
    }
    console.error(`已生成 ${results.length} 张配图`);
    return results;
  }

  /** 单图插入（兼容旧接口） */
  insertHeroImage(html, image) {
    if (!image) return html;
    const imgTag = this._makeImgTag(image);
    const h1End = html.indexOf('</section>');
    if (h1End !== -1) {
      const insertPos = h1End + '</section>'.length;
      return html.slice(0, insertPos) + '\n' + imgTag + '\n' + html.slice(insertPos);
    }
    return imgTag + '\n' + html;
  }

  /** 多图插入：头图插 h1 后，章节图插对应 h2 前 */
  insertImages(html, imageResults) {
    if (!imageResults || imageResults.length === 0) return html;
    let result = html;

    for (const item of imageResults) {
      const imgTag = this._makeImgTag(item.image);
      if (item.type === 'hero') {
        // 头图：插入 h1 wrapper </section> 之后
        const h1End = result.indexOf('</section>');
        if (h1End !== -1) {
          const pos = h1End + '</section>'.length;
          result = result.slice(0, pos) + '\n' + imgTag + '\n' + result.slice(pos);
        }
      } else {
        // 章节图：插入对应 h2 之前
        const escaped = item.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const h2Regex = new RegExp(`(<h2[^>]*>(?:<span[^>]*>[^<]*</span>)?\\s*${escaped})`);
        const match = result.match(h2Regex);
        if (match && match.index !== undefined) {
          result = result.slice(0, match.index) + imgTag + '\n' + result.slice(match.index);
        }
      }
    }
    return result;
  }

  _makeImgTag(image) {
    return `<img src="data:${image.mimeType};base64,${image.data}" `
      + `style="width:100%;border-radius:8px;margin:16px 0;" />`;
  }
}

module.exports = { ImageGenerator };
