/**
 * Gemini AI 配图模块 — 支持多图生成、智能插入与风格控制
 */
const { GeminiClient } = require('./gemini-client');

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

/** 5 种智能配图风格 */
const IMAGE_STYLES = {
  notion: {
    name: 'notion',
    label: 'Notion 图标风',
    prompt: 'Clean icon-style illustration, flat design, simple geometric shapes, '
      + 'limited color palette, Notion-style graphics, friendly and modern, white background',
  },
  warm: {
    name: 'warm',
    label: '暖色水彩',
    prompt: 'Warm watercolor illustration, soft amber and golden tones, gentle brush strokes, '
      + 'cozy and inviting atmosphere, hand-painted feel, cream paper texture',
  },
  minimal: {
    name: 'minimal',
    label: '黑白线描',
    prompt: 'Black and white line art, minimal pen drawing, clean precise lines, '
      + 'high contrast, editorial illustration style, elegant simplicity',
  },
  blueprint: {
    name: 'blueprint',
    label: '蓝图技术',
    prompt: 'Technical blueprint style, dark blue background with white line drawings, '
      + 'engineering diagram aesthetic, grid lines, precise measurements, technical drafting feel',
  },
  watercolor: {
    name: 'watercolor',
    label: '水彩画',
    prompt: 'Full watercolor painting, rich colors blending naturally, visible brush strokes, '
      + 'artistic wet-on-wet technique, expressive and painterly, gallery-quality illustration',
  },
};

/** 配图密度配置 */
const DENSITY_CONFIG = {
  minimal: { maxImages: 2, minScore: 3, label: '精简 (1-2张)' },
  balanced: { maxImages: 5, minScore: 2, label: '均衡 (3-5张)' },
  rich: { maxImages: 10, minScore: 1, label: '丰富 (6+张)' },
};

/** 章节内容类型 */
const CHAPTER_TYPES = {
  infographic: {
    keywords: /数据|统计|百分比|增长|下降|趋势|图表|报告|指标|KPI|\d+%/,
    prompt: 'data visualization infographic style, charts and graphs feel',
  },
  scene: {
    keywords: /故事|经历|那天|现场|走进|看到|眼前|记得|回忆|场景/,
    prompt: 'narrative scene illustration, storytelling moment captured',
  },
  flowchart: {
    keywords: /步骤|流程|过程|方法|阶段|先后|第一步|然后|接着|最终/,
    prompt: 'process flow visualization, step-by-step visual guide',
  },
  comparison: {
    keywords: /对比|比较|区别|差异|优劣|VS|不同|相同|选择|还是/,
    prompt: 'comparison visualization, side-by-side contrast layout',
  },
  diagram: {
    keywords: /架构|系统|模块|组件|层次|结构|网络|连接|接口|拓扑/,
    prompt: 'technical architecture diagram, system structure visualization',
  },
};

/** API 调用间隔 (ms)，避免速率限制 */
const API_DELAY = 5000;

class ImageGenerator {
  constructor({ apiKey, model, dryRun } = {}) {
    this.client = new GeminiClient({ apiKey, model, dryRun });
    this.dryRun = dryRun || false;
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

  /** 识别章节内容类型 */
  _identifyChapterType(chapter) {
    const text = chapter.body || '';
    let bestType = null;
    let bestScore = 0;
    for (const [type, config] of Object.entries(CHAPTER_TYPES)) {
      const matches = (text.match(config.keywords) || []).length;
      if (matches > bestScore) {
        bestScore = matches;
        bestType = type;
      }
    }
    return bestType || 'scene'; // default to scene
  }

  _buildHeroPrompt(title, fullText, theme, imageStyle) {
    const styleOverride = imageStyle && IMAGE_STYLES[imageStyle];
    const style = styleOverride ? styleOverride.prompt : (THEME_STYLES[theme] || THEME_STYLES.simple);
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

  _buildChapterPrompt(chTitle, chBody, theme, imageStyle, chapterType) {
    const styleOverride = imageStyle && IMAGE_STYLES[imageStyle];
    const style = styleOverride ? styleOverride.prompt : (THEME_STYLES[theme] || THEME_STYLES.simple);
    const tone = this._detectTone(chBody);
    const toneDesc = TONE_KEYWORDS[tone] || TONE_KEYWORDS.casual;
    const metaphors = this._extractMetaphors(chBody);
    const summary = chBody.replace(/[#*_`>\[\]()]/g, '').slice(0, 300);
    const typeHint = chapterType && CHAPTER_TYPES[chapterType]
      ? `\n- 内容类型提示：${CHAPTER_TYPES[chapterType].prompt}` : '';
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
      `- 画面应传达本章节的核心场景或隐喻${typeHint}`,
    ].join('\n');
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

  /** 解析 markdown 中的章节标题（h2 或 h3） */
  _extractChapters(markdown) {
    const lines = markdown.split('\n');
    const chapters = [];
    let current = null;
    // 检测文章使用的章节级别：优先 h2，没有则用 h3
    const hasH2 = lines.some(l => /^## [^#]/.test(l));
    const headingRe = hasH2 ? /^## ([^#].*)/ : /^### ([^#].*)/;
    for (const line of lines) {
      const m = line.match(headingRe);
      if (m) {
        if (current) chapters.push(current);
        current = {
          title: m[1].replace(/[—–\-].+$/, '').trim(),
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
    const response = await this.client.callGemini(prompt);
    const images = this.client.extractImages(response);

    if (images.length === 0) {
      console.error('警告: Gemini 未返回图片');
      return null;
    }
    console.error(`已生成 ${images.length} 张配图`);
    return images[0];
  }

  /** 评估章节是否适合配图，返回分数 */
  _scoreChapterForImage(chapter) {
    let score = 0;
    const text = chapter.body || '';
    // 有比喻/意象 → 适合配图
    if (this._extractMetaphors(text).length > 0) score += 3;
    // 有具体场景描写（时间、地点）→ 适合
    if (/凌晨|早上|晚上|深夜|那天|现场|眼前|走进|打开|坐在/.test(text)) score += 2;
    // 有数据对比/极端数字 → 适合可视化
    if (/\d{3,}/.test(text)) score += 1;
    // 视觉潜力关键词加分
    if (/数据可视化|对比|流程|时间线|架构图|结构|层次/.test(text)) score += 2;
    if (/步骤|方法|过程|阶段|分类|排名/.test(text)) score += 1;
    // 太短的章节不配图
    if (text.length < 100) score -= 3;
    // 纯对话/引用章节不配图
    if ((text.match(/"/g) || []).length > 6) score -= 1;
    // 更积极地跳过结尾/FAQ章节
    const title = chapter.title || '';
    if (/FAQ|常见问题|问答|Q&A/i.test(title)) score -= 2;
    if (/小结|总结|结论|写在最后|结语|结尾|参考|附录|致谢|引用|注释/.test(title)) score -= 3;
    return score;
  }

  /** 多图生成：头图 + 选定章节配图，支持密度和风格控制 */
  async generateMultiple(markdown, theme = 'simple', options = {}) {
    const { density = 'balanced', imageStyle } = options;
    const densityCfg = DENSITY_CONFIG[density] || DENSITY_CONFIG.balanced;
    const { title, summary } = this._extractTitleAndSummary(markdown);
    const chapters = this._extractChapters(markdown);

    // 选择需要配图的章节（根据密度配置）
    const skipPatterns = /写在最后|总结|结语|结尾|最后|参考|附录|致谢|引用|注释|FAQ|常见问题/;
    const scoredChapters = chapters
      .filter(ch => !skipPatterns.test(ch.title))
      .map(ch => ({
        ...ch,
        imgScore: this._scoreChapterForImage(ch),
        chapterType: this._identifyChapterType(ch),
      }))
      .filter(ch => ch.imgScore >= densityCfg.minScore)
      .sort((a, b) => b.imgScore - a.imgScore)
      .slice(0, densityCfg.maxImages - 1); // -1 for hero image

    console.error(`章节配图筛选: ${chapters.length} 个章节 → ${scoredChapters.length} 个配图 [${densityCfg.label}]`);
    if (imageStyle) console.error(`配图风格: ${IMAGE_STYLES[imageStyle]?.label || imageStyle}`);

    // 头图 prompt
    const prompts = [{
      type: 'hero',
      title: title,
      prompt: this._buildHeroPrompt(title, markdown, theme, imageStyle),
    }];

    // 章节配图 prompts（按原文顺序排列）
    const orderedChapters = chapters.filter(ch =>
      scoredChapters.some(sc => sc.title === ch.title)
    ).map(ch => scoredChapters.find(sc => sc.title === ch.title));

    for (const ch of orderedChapters) {
      prompts.push({
        type: 'chapter',
        title: ch.title,
        prompt: this._buildChapterPrompt(
          ch.title, ch.body || ch.summary, theme, imageStyle, ch.chapterType
        ),
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
        const response = await this.client.callGemini(p.prompt);
        const images = this.client.extractImages(response);
        if (images.length > 0) {
          results.push({ ...p, image: images[0] });
        } else {
          console.error(`    警告: 未返回图片`);
        }
      } catch (err) {
        console.error(`    错误: ${err.message}`);
      }

      // Rate limiting delay between requests (except after last)
      if (i < prompts.length - 1) {
        await new Promise(r => setTimeout(r, API_DELAY));
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
        // 章节图：插入对应 h2/h3 之前
        const escaped = item.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const hRegex = new RegExp(`(<h[23][^>]*>(?:<span[^>]*>[^<]*</span>)?\\s*${escaped})`);
        const match = result.match(hRegex);
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

module.exports = { ImageGenerator, IMAGE_STYLES, DENSITY_CONFIG };
