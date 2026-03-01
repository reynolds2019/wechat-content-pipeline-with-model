# wechat-content-suite

> 微信公众号一站式内容生产套件 -- 从选题到发布，AI 驱动全流程

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-3.0.1-blue.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)

## 功能亮点

- Markdown → 微信 HTML 一键转换（3 套精美主题：杂志风 / 商务风 / 终端风）
- AI 全流程管线：选题 → 写作 → 质量门禁 → 排版 → 发布，3 个用户确认点
- AI 封面图生成（Gemini API）：5 种风格、6 种配色、多种比例
- AI 智能配图：按章节自动插图，支持 5 种风格 + 3 种密度
- 8 种 AI 润色：grammar / style / title / structure / deai / readability / summary / seo
- 信息图生成：20 种布局 x 20 种风格，数据驱动可视化
- 小红书系列图：9:16 竖版卡片，10 种风格 + 8 种布局
- URL → Markdown 采集（Puppeteer 无头浏览器）
- 微信公众号发布 API：一键发布到草稿箱
- KaTeX 数学公式 + Mermaid 图表渲染
- 中文文本全量规范化（引号 / 标题 / 空行 / 列表 / 标点 / 间距）
- AI 写作：从观点到完整文章，5 种类型（观点 / 教程 / 盘点 / 评论 / 故事）
- 质量门禁：5 维度 100 分制自动评估，最多 3 轮修改循环

## 架构

```
┌─────────────────────────────────────────────────┐
│            wechat-content-router                │
│         (智能路由，自动分派子 SKILL)              │
└──────────┬──────────┬──────────┬────────────────┘
           │          │          │
    ┌──────▼───┐ ┌────▼────┐ ┌──▼──────────┐
    │ pipeline │ │  writer  │ │   topic      │
    │ 全流程   │ │  AI写作  │ │   选题       │
    └────┬─────┘ └────┬────┘ └─────────────┘
         │            │
    ┌────▼────┐  ┌────▼────────────┐
    │evaluator│  │   formatter     │
    │质量门禁 │  │ 排版+封面+配图  │
    └─────────┘  │ +信息图+XHS     │
                 │ +采集+发布      │
                 └────────┬───────┘
                          │
                 ┌────────▼───────┐
                 │   wx-format    │
                 │   CLI 工具     │
                 └────────────────┘
```

**6 个 Claude Code SKILL** 协同工作：路由器接收用户意图，分派到管线（全流程）、写作、选题、评估、排版等子 SKILL。底层 CLI 工具 `wx-format` 提供实际的 Markdown 转换和渲染能力。

## 快速开始

### 安装

```bash
git clone https://github.com/HeroAshacker/wechat-content-suite.git
cd wechat-content-suite
npm install
```

### 基本使用

```bash
# Markdown → 微信 HTML（杂志风主题）
node index.js article.md -t simple

# 商务风主题 + 浏览器预览
node index.js article.md -t business -p

# AI 润色（去 AI 味）+ 排版
node index.js article.md --polish gemini --polish-type deai -t simple

# 生成封面图（英雄风格 + 暖色调）
node index.js article.md --cover --cover-style hero --cover-palette warm -t tech

# 全量中文规范化 + 数学公式 + 目录
node index.js article.md --normalize-full --math --toc -t simple

# 发布到微信草稿箱
node index.js article.md -t simple --publish wechat --draft-only
```

### Claude Code SKILL 集成

```bash
# 安装全部 SKILL 到 Claude Code
cd /path/to/wechat-content-suite
for skill in skills/wechat-*/; do
  ln -sf "$(pwd)/$skill" ~/.claude/skills/$(basename $skill)
done

# 重启 Claude Code 生效
```

安装后在 Claude Code 中直接用自然语言触发：

- "帮我写一篇关于 AI 编程的公众号文章" → 触发 `wechat-writer`
- "全流程写一篇文章" → 触发 `wechat-pipeline`
- "帮我排版这篇 Markdown" → 触发 `wechat-formatter`
- "最近有什么热门选题" → 触发 `wechat-topic`

## CLI 完整参考

### 主命令：`wx-format [input]`

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-t, --theme <name>` | 主题（simple / business / tech / 自定义 JSON 路径） | simple |
| `-o, --output <path>` | 输出文件路径 | 同名 .html |
| `-c, --clipboard` | 复制到剪贴板 | true |
| `-p, --preview` | 浏览器预览 | - |
| `--polish <provider>` | AI 润色（gemini / deepseek / openai / claude） | - |
| `--polish-type <type>` | 润色类型（见下表） | grammar |
| `--normalize` | 中文文本基本规范化 | - |
| `--normalize-full` | 全量规范化（引号 / 标题 / 空行 / 列表 / 标点 / 间距） | - |
| `--important` | !important 样式强化（提升微信兼容性） | - |
| `--math` | KaTeX 数学公式渲染 | - |
| `--mermaid` | Mermaid 图表渲染 | - |
| `--toc` | 生成目录导航 | - |
| `--images` | AI 智能配图 | - |
| `--image-density <d>` | 配图密度（minimal / balanced / rich） | balanced |
| `--image-style <s>` | 配图风格（notion / warm / minimal / blueprint / watercolor） | - |
| `--cover` | 生成 AI 封面图 | - |
| `--cover-style <s>` | 封面风格（hero / conceptual / typography / metaphor / minimal） | - |
| `--cover-palette <p>` | 封面配色（warm / cool / dark / vivid / pastel / mono） | - |
| `--cover-ratio <r>` | 封面比例（2.35:1 / 16:9 / 1:1） | 2.35:1 |
| `--publish <target>` | 发布目标（wechat） | - |
| `--draft-only` | 仅保存为草稿 | true |
| `--publish-title <t>` | 发布文章标题 | - |
| `--publish-author <a>` | 发布文章作者 | - |

#### 润色类型说明

| 类型 | 说明 |
|------|------|
| `grammar` | 语法修正 |
| `style` | 风格优化 |
| `title` | 标题优化 |
| `structure` | 结构调整 |
| `deai` | 去 AI 味（降低 AI 痕迹） |
| `readability` | 可读性提升 |
| `summary` | 摘要生成 |
| `seo` | SEO 优化 |

### 子命令

#### `wx-format topic` -- 选题分析

从热点平台获取选题灵感，支持结构化输出。

```bash
# 基本用法
node index.js topic --niche "AI 编程"

# JSON 格式输出
node index.js topic --niche "AI 编程" --json

# 表格格式
node index.js topic --niche "AI 编程" --format table
```

| 参数 | 说明 |
|------|------|
| `--niche <keywords>` | 领域关键词 |
| `--provider <name>` | AI 服务商 |
| `--json` | JSON 格式输出 |
| `--format <type>` | 输出格式（table / structured） |

#### `wx-format write <viewpoints>` -- AI 写作

从观点或想法生成完整公众号文章。

```bash
# 观点文
node index.js write "AI 不会取代程序员，但会取代不用 AI 的程序员" --type opinion

# 教程文（仅输出大纲）
node index.js write "如何用 Claude Code 提升开发效率" --type tutorial --outline-only

# 写作 + 排版一步到位
node index.js write "2026年最值得学的编程语言" --type listicle -t business
```

| 参数 | 说明 |
|------|------|
| `--type <type>` | 文章类型（opinion / tutorial / listicle / commentary / story） |
| `--outline-only` | 仅输出大纲，不生成全文 |
| `--title-candidates <n>` | 生成标题候选数量 |
| `--polish <provider>` | 写完后自动润色 |
| `-t, --theme <name>` | 写完后自动排版 |

#### `wx-format infographic <input>` -- 信息图生成

基于 Markdown 或文本内容生成数据可视化信息图。

```bash
# 自动推荐布局
node index.js infographic data.md --recommend

# 指定布局和风格
node index.js infographic data.md --layout timeline --style glassmorphism

# 竖版信息图
node index.js infographic data.md --layout flowchart --ratio 9:16
```

| 参数 | 说明 |
|------|------|
| `--layout <layout>` | 布局（timeline / flowchart / comparison / pyramid 等 20 种） |
| `--style <style>` | 风格（glassmorphism / neon / watercolor 等 20 种） |
| `--ratio <ratio>` | 比例（16:9 / 9:16 / 1:1 / 4:3） |
| `--recommend` | AI 推荐最佳布局 |

#### `wx-format xhs <input>` -- 小红书系列图

生成适合小红书平台的 9:16 竖版卡片图。

```bash
# 基本用法
node index.js xhs article.md --count 5

# 指定风格
node index.js xhs article.md --style magazine --layout cards --count 8
```

| 参数 | 说明 |
|------|------|
| `--style <style>` | 风格（magazine / polaroid / scrapbook 等 10 种） |
| `--layout <layout>` | 布局（cards / grid / story 等 8 种） |
| `--count <n>` | 生成数量（1-10） |

#### `wx-format scrape <url>` -- URL 采集

使用 Puppeteer 抓取网页内容，转换为干净的 Markdown。

```bash
# 基本采集
node index.js scrape https://example.com/article

# 指定输出文件
node index.js scrape https://example.com/article -o output.md

# 手动交互模式（需要登录的页面）
node index.js scrape https://example.com/article --wait
```

| 参数 | 说明 |
|------|------|
| `-o, --output <path>` | 输出文件路径 |
| `--wait` | 手动交互模式（打开可视浏览器，手动操作后按回车继续采集） |

## 主题预览

| 主题 | 风格 | 适用场景 |
|------|------|----------|
| `simple` | 杂志风 — 清新留白，衬线标题 | 通用文章、生活方式、文化评论 |
| `business` | 商务风 — 深色标题栏，数据表格 | 商业分析、行业报告、市场洞察 |
| `tech` | 终端风 — 深色代码块，等宽字体 | 技术教程、编程分享、开发工具 |

支持通过 JSON 文件自定义主题。将主题文件路径传给 `-t` 参数即可。

## AI Provider 配置

通过环境变量配置 AI 服务商密钥：

```bash
# Gemini（推荐，支持图像生成）
export GEMINI_API_KEY="your-key"

# DeepSeek
export DEEPSEEK_API_KEY="your-key"

# OpenAI / 兼容 API
export OPENAI_API_KEY="your-key"
export OPENAI_API_BASE="https://api.openai.com/v1"  # 可选，自定义端点

# Claude
export CLAUDE_API_KEY="your-key"
```

> Gemini 是图像生成（封面图、配图、信息图、小红书卡片）的唯一 Provider。文本润色和写作支持全部 4 种 Provider。

### 微信发布配置

```bash
export WECHAT_APP_ID="your-app-id"
export WECHAT_APP_SECRET="your-app-secret"
```

需要在微信公众平台开通开发者权限并配置 IP 白名单。

## SKILL 集成

本套件包含 6 个 Claude Code SKILL，安装后可在 Claude Code 中通过自然语言触发完整的内容生产工作流。

| SKILL | 版本 | 功能 | 触发词示例 |
|-------|------|------|------------|
| `wechat-content-router` | 1.0.0 | 智能路由，自动分派请求 | "公众号"、"微信内容" |
| `wechat-pipeline` | 3.0 | 全流程：选题 → 写作 → 门禁 → 排版 → 发布 | "全流程"、"一键写文" |
| `wechat-writer` | 2.0 | AI 写作（5 种文章类型） | "写公众号"、"AI 写作" |
| `wechat-topic` | 1.1 | 热点选题分析 | "选题"、"热点分析" |
| `wechat-article-evaluator` | 2.0 | 质量门禁（5 维度 100 分制） | "文章评估"、"打分" |
| `wechat-formatter` | 3.0 | 排版 + 封面 + 配图 + 信息图 + XHS + 采集 + 发布 | "排版"、"封面图" |

详见 [skills/README.md](skills/README.md)。

## 技术栈

| 模块 | 技术 |
|------|------|
| CLI 框架 | [Commander.js](https://github.com/tj/commander.js) |
| Markdown 解析 | [Marked](https://github.com/markedjs/marked) + [marked-footnote](https://github.com/bent10/marked-extensions) |
| CSS 内联 | [Juice](https://github.com/Automattic/juice) |
| 代码高亮 | [highlight.js](https://github.com/highlightjs/highlight.js) |
| 数学公式 | [KaTeX](https://github.com/KaTeX/KaTeX) |
| AI 接口 | [OpenAI SDK](https://github.com/openai/openai-node)（多 Provider 兼容） |
| 图像生成 | Gemini API（imagen 模型） |
| 网页采集 | [Puppeteer](https://github.com/puppeteer/puppeteer) |
| HTTP 代理 | [undici](https://github.com/nodejs/undici) ProxyAgent |
| 微信 API | 公众号素材管理 + 草稿箱 API |

## 项目结构

```
wx-format/
├── index.js              # CLI 入口
├── converter.js          # Markdown → HTML 转换核心
├── normalizer.js         # 中文文本规范化
├── polisher.js           # AI 润色引擎
├── providers.js          # AI Provider 统一接口
├── gemini-client.js      # Gemini API 共享客户端（重试 + 代理）
├── image-gen.js          # AI 智能配图
├── themes/               # 主题样式
├── cover/                # 封面图生成
├── infographic/          # 信息图生成
├── xhs/                  # 小红书卡片生成
├── scraper/              # URL → Markdown 采集
├── publish/              # 微信发布模块
├── topic/                # 选题分析
├── writer/               # AI 写作
├── skills/               # Claude Code SKILL 定义
└── test/                 # 测试用例
```

## 致谢

- [baoyu-skills](https://github.com/nicepkg/baoyu-skills) -- 封面图、信息图、小红书卡片等能力的参考与灵感来源
- [JimLiu](https://github.com/nicepkg) -- 图像生成方案设计参考

## 作者

本项目由 **Claude Code** (Anthropic) 全程编写 -- 从架构设计、代码实现到文档撰写，均由 AI 完成。

## License

[MIT](LICENSE) &copy; 2025-2026
