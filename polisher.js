const fs = require('fs');
const { PROVIDERS, createClient, callAI } = require('./providers');

// 禁用词库 — AI 高频词和模板句式
const BANNED_WORDS = [
  '赋能', '助力', '深度', '维度', '底层逻辑', '认知升级', '范式转移',
  '不可否认', '毋庸置疑', '众所周知', '在当今社会', '值得注意的是',
  '需要指出的是', '不难发现', '显而易见', '综上所述', '总而言之',
  '首先', '其次', '最后', '一方面', '另一方面',
  '让我们一起', '期待未来', '展望未来', '不言而喻',
  '毫无疑问', '事实上', '实际上', '本质上', '归根结底',
];

const BANNED_WORDS_STR = BANNED_WORDS.join('/');

const PROMPTS = {
  grammar: '你是专业的中文编辑。请对以下 Markdown 文本进行语法纠错和表达优化。保持原文结构和格式不变，只修正语法错误、改善表达。直接返回修改后的 Markdown，不要添加解释。\n\n',
  style: '你是资深的内容编辑。请优化以下 Markdown 文本的文笔和风格，使其更加流畅、专业。保持原文核心内容和结构，提升文字质量。直接返回优化后的 Markdown。\n\n',
  title: '你是标题优化专家。请为以下文章生成 3 个优化后的标题建议，每行一个。标题要吸引读者、准确概括内容。只返回 3 个标题，每行一个。\n\n',
  structure: '你是内容架构师。请优化以下 Markdown 文本的段落结构和逻辑组织。可以调整段落顺序、添加过渡句、优化层次结构。直接返回优化后的 Markdown。\n\n',
  deai: '__PIPELINE__', // 标记：自动展开为 deai_detect → deai_rewrite → deai_verify
  deai_detect: `你是AI文本检测专家。逐句分析以下文章，标注每句的AI味指数(1-10分)。

检测维度：
- 模板句式（"首先/其次/最后"、"一方面/另一方面"）
- AI高频词（${BANNED_WORDS_STR}）
- 过度对称结构（连续段落句式雷同）
- 缺乏个人化表达（无"我"视角、无口语）
- 可预测的段落走向（总分总、并列罗列）

输出格式（每句一行）：
[分数] 原句 → 问题描述（无问题则写"OK"）

最后统计：AI味≥6的句子数 / 总句数 = AI味占比

`,
  deai_rewrite: `你是去AI味改写专家。根据上一步的检测结果改写文章。

【核心规则】
- 只改写AI味≥6的句子，其余保持原样
- 保持原意不变，字数浮动±15%
- 改写后的句子AI味必须降到3以下

【改写手法】
1. 替换禁用词：${BANNED_WORDS_STR} → 用日常口语替代
2. 打破对称：连续并列改为递进/转折/插叙
3. 注入人味：加入"说实话"/"我觉得"/"有意思的是"等口语
4. 降低可预测性：调整段落顺序，加入意外转折或自嘲
5. 删除元评论："总之"/"综上"/"让我们一起" → 直接收束

直接输出改写后的完整 Markdown，不要输出解释。

`,
  deai_verify: `你是文本质量校验专家。对比原文和改写版，逐项检查：

1. 核心观点是否完整保留（不能丢失任何论点）
2. 事实数据是否准确（数字、人名、时间不能改动）
3. 整体语气是否一致（不能前半口语后半书面）
4. 是否引入了新的AI味表达（改写过程中可能产生新的模板句式）
5. Markdown 格式是否完整（标题层级、列表、加粗等）

如发现问题，直接修正并输出最终版本。
如无问题，直接输出改写版本。
不要输出检查过程，只输出最终 Markdown。

`,
  readability: '你是可读性优化专家。请优化以下文本的可读性：1)长句拆短，每句不超过30字 2)段落节奏交替（长短段搭配）3)添加自然过渡词连接段落 4)降低信息密度，适当留白。直接返回优化后的 Markdown。\n\n',
  summary: '你是摘要专家。请为以下文章生成一段100字以内的精炼摘要，抓住核心观点和关键信息。只返回摘要文本。\n\n',
  seo: '你是SEO优化专家。请优化以下文章的SEO表现：1)在标题和首段自然融入核心关键词 2)优化小标题使其包含搜索意图 3)生成meta description（150字内）4)在文末添加相关关键词标签建议。直接返回优化后的 Markdown，末尾附上meta description和关键词建议。\n\n',
};

class ContentPolisher {
  constructor(options = {}) {
    this.provider = options.provider || 'gemini';
    this.apiKey = options.apiKey;
    this.polishType = options.polishType || 'grammar';
    this.dryRun = options.dryRun || false;
    this.promptFile = options.promptFile || null;
    if (!PROVIDERS[this.provider]) {
      throw new Error(`不支持的 provider: ${this.provider}。可选: ${Object.keys(PROVIDERS).join(', ')}`);
    }
    this.config = PROVIDERS[this.provider];
  }

  _getPrompt() {
    if (this.promptFile) {
      const content = fs.readFileSync(this.promptFile, 'utf-8');
      return content.includes('{{content}}') ? content : content + '\n\n';
    }
    return PROMPTS[this.polishType] || PROMPTS.grammar;
  }

  async polish(markdown) {
    // deai 自动展开为三步管线
    if (this.polishType === 'deai' && !this.promptFile) {
      const steps = ['deai_detect', 'deai_rewrite', 'deai_verify'];
      let result = markdown;
      for (const step of steps) {
        const label = step.replace('deai_', '');
        console.error(`去AI味管线: [${label}] ...`);
        this.polishType = step;
        result = await this._polishSingle(result);
        if (this.dryRun) { this.polishType = 'deai'; return result; }
      }
      this.polishType = 'deai';
      return result;
    }
    // Chain support: comma-separated polish types
    if (this.polishType.includes(',') && !this.promptFile) {
      const types = this.polishType.split(',').map(t => t.trim());
      let result = markdown;
      for (const type of types) {
        console.log(`润色链: 执行 [${type}] ...`);
        this.polishType = type;
        result = await this._polishSingle(result);
        if (this.dryRun) return result;
      }
      return result;
    }
    return this._polishSingle(markdown);
  }

  async _polishSingle(markdown) {
    const prompt = this._getPrompt();
    const fullPrompt = prompt.includes('{{content}}')
      ? prompt.replace('{{content}}', markdown)
      : prompt + markdown;

    if (this.dryRun) {
      console.log('=== DRY RUN: 润色 Prompt ===');
      console.log(`Provider: ${this.provider} (${this.config.model})`);
      console.log(`类型: ${this.polishType}`);
      console.log('--- Prompt ---');
      console.log(fullPrompt.slice(0, 500) + (fullPrompt.length > 500 ? '\n...(truncated)' : ''));
      console.log('=== END DRY RUN ===');
      return markdown;
    }

    const { client, model } = createClient(this.provider, this.apiKey);
    const temperature = ['style', 'deai_rewrite'].includes(this.polishType) ? 0.5 : 0.3;

    try {
      const result = await callAI(client, model, fullPrompt, { temperature });
      console.log(`润色完成 (${this.provider}/${this.polishType})`);
      return result;
    } catch (err) {
      throw new Error(`润色失败 (${this.provider}): ${err.message}`);
    }
  }
}

module.exports = { ContentPolisher };
