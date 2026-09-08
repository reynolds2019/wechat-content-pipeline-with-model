---
name: wechat-formatter
description: |
  微信公众号 Markdown 排版工具 v3.0。支持 3 套主题、自定义主题、AI 配图(Gemini)、8 种 AI 润色(grammar/style/title/structure/deai/readability/summary/seo)、
  封面图生成(cover)、数学公式(math/KaTeX)、Mermaid图表、目录导航(toc)、全量规范化(normalize-full)、
  信息图(infographic)、小红书系列图(xhs)、URL采集(scrape)、微信发布(publish)。
  Use when 公众号排版, 微信排版, wx-format, normalize, !important, 去AI味, 润色链,
  微信文章格式化, Markdown转微信HTML, AI润色文章, 公众号文章美化, AI配图, 文章配图,
  封面图, cover, 数学公式, math, KaTeX, mermaid, 目录, toc, 信息图, infographic,
  小红书, xhs, 红书图, 网页抓取, scrape, URL转MD, 微信发布, publish.
allowed-tools: Read, Write, Bash(node:*), Bash(cat:*), Bash(open:*)
---

# 微信公众号排版工具 (wechat-formatter v3.0)

## Instructions

将 Markdown 转换为微信公众号兼容的内联样式 HTML，支持封面图、增强渲染、信息图、小红书系列图、网页采集和微信发布。

### Step 1: 获取输入

- **文件路径**: `.md` 文件 → 直接使用
- **内联文本**: 保存为 `/tmp/wx-format-temp.md`
- **URL 采集**: 使用 `scrape` 子命令先转换为 Markdown
- **无输入**: 提示用户提供内容

### Step 2: 确定参数

#### 基础参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| theme | simple | simple/business/tech 或 JSON 路径 |
| output | 无 | 输出 HTML 文件路径 (-o) |
| clipboard | true | 复制到剪贴板 (-c)，--no-clipboard 禁用 |
| preview | false | 在浏览器中预览 (-p) |
| list-themes | false | 列出所有可用主题 (-l) |
| normalize | false | 中文文本规范化 |
| normalize-full | false | 全量规范化 (引号/标题/空行/列表/标点/间距) |
| important | false | 样式添加 !important |

#### AI 润色参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| polish | 无 | AI provider: gemini/deepseek/openai/claude |
| polish-type | grammar | grammar/style/title/structure/deai/readability/summary/seo |
| model | 无 | 自定义大模型名称 (覆盖默认模型) |
| base-url | 无 | 自定义 API Base URL |
| api-key | 无 | AI API Key |
| dry-run | false | 仅打印 prompt，不调用 API |
| prompt-file | 无 | 自定义 prompt 文件路径 |
| polish-only | false | 仅润色，输出 Markdown |

#### 封面图参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| cover | false | 生成 AI 封面图 |
| cover-style | 无 | hero/conceptual/typography/metaphor/minimal |
| cover-palette | 无 | warm/cool/dark/vivid/pastel/mono |
| cover-ratio | 2.35:1 | 2.35:1/16:9/1:1 |

#### 配图参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| images | false | 生成 AI 配图 (Gemini) |
| image-model | gemini-3-pro-image-preview | 图像生成模型 |
| image-density | balanced | minimal/balanced/rich |
| image-style | 无 | notion/warm/minimal/blueprint/watercolor |

#### 增强渲染参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| math | false | KaTeX 数学公式渲染 ($..$ 行内, $$...$$ 块级) |
| mermaid | false | Mermaid 图表渲染 |
| toc | false | 生成目录导航 |

#### 发布参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| publish | 无 | 发布目标平台 (wechat) |
| publish-method | api | 发布方式 |
| publish-title | 无 | 文章标题 (可从 frontmatter 读取) |
| publish-author | 无 | 文章作者 |
| draft-only | true | 仅保存为草稿 |

### Step 3: 执行转换

基础排版：
```bash
cd ~/Claude/🧪\ 小项目与测试/wx-format
node index.js <input.md> -t <theme> -o <output.html> --no-clipboard [--normalize] [--important]
```

全量规范化 + 增强渲染：
```bash
node index.js <input.md> --normalize-full --math --mermaid --toc -t simple -o <output.html> --no-clipboard
```

封面图生成：
```bash
node index.js <input.md> --cover --cover-style conceptual --cover-palette warm -t simple -o <output.html> --no-clipboard
```

AI 润色（支持链式）：
```bash
node index.js <input.md> --polish gemini --polish-type grammar,deai -o <output.html> --no-clipboard
```

智能配图（控制密度和风格）：
```bash
node index.js <input.md> --images --image-density minimal --image-style notion -t simple -o <output.html> --no-clipboard
```

微信发布（草稿模式）：
```bash
node index.js <input.md> -t simple -o <output.html> --no-clipboard --publish wechat --draft-only
```

#### 子命令

信息图生成：
```bash
node index.js infographic <input.md> --layout timeline --style minimal -o <output.png>
node index.js infographic <input.md> --recommend  # 推荐布局
```

小红书系列图：
```bash
node index.js xhs <input.md> --count 5 --style warm -o <output-dir>/
```

URL→Markdown 采集：
```bash
node index.js scrape <url> -o <output.md>
node index.js scrape <url> --wait  # 手动交互模式
```

### Step 4: 返回结果

- 告知 HTML 文件路径
- 提示 `-c` 复制剪贴板、`-p` 浏览器预览
- 发布模式下报告 media_id

### Error Handling

- 文件不存在 → 检查路径
- 转换失败 → 检查 Markdown 格式
- 润色失败 → 检查 API Key，用 `--dry-run` 验证
- 封面图失败 → 检查 GEMINI_API_KEY 或 --api-key
- 发布失败 → 检查 WECHAT_APP_ID/WECHAT_APP_SECRET 环境变量
- 采集失败 → 检查 URL 可达性，尝试 --wait 模式

## Examples

### Example 1: 基础排版 + 全量规范化

**输入**: Markdown 技术文章，需要 tech 主题排版并全量规范化中文标点

**命令**:
```bash
node index.js article.md -t tech --normalize-full -o output.html --no-clipboard
```

**输出**: 全量规范化（引号、标题层级、空行、列表）后，以终端风主题输出 HTML 文件

### Example 2: 封面图 + 增强渲染 + 配图

**输入**: 需要封面图、数学公式渲染、目录导航和智能配图

**命令**:
```bash
node index.js article.md --cover --cover-style conceptual --math --toc --images --image-density minimal -t simple -o output.html --no-clipboard
```

**输出**: 带封面图、KaTeX 公式、目录导航和 AI 配图的完整 HTML

### Example 3: 信息图生成

**输入**: 从文章生成 timeline 布局信息图

**命令**:
```bash
node index.js infographic article.md --layout timeline --style minimal -o infographic.png
```

**输出**: 16:9 比例的信息图 PNG 文件

### Example 4: 小红书系列图

**输入**: 从文章生成 3 张小红书卡片

**命令**:
```bash
node index.js xhs article.md --count 3 --style warm -o ./xhs-cards/
```

**输出**: 3 张 9:16 比例的小红书卡片 PNG 文件

### Example 5: 全链路 + 发布

**输入**: 完整排版后发布到微信草稿箱

**命令**:
```bash
node index.js article.md --normalize-full --polish gemini --polish-type grammar --math --toc --cover --images --image-density minimal -t simple -o output.html --no-clipboard --publish wechat --draft-only
```

**输出**: 完整排版 HTML + 微信草稿 media_id

## Quick Reference

| 主题 | 风格 | 适用场景 |
|------|------|---------|
| simple | 杂志风 | 日常文章 |
| business | 商务风 | 企业内容 |
| tech | 终端风 | 技术教程 |

| 润色类型 | 说明 |
|----------|------|
| grammar | 语法纠错 |
| style | 文笔提升 |
| title | 标题生成 |
| structure | 结构优化 |
| deai | 去AI味 |
| readability | 可读性优化 |
| summary | 100字摘要 |
| seo | SEO优化 |

| 封面风格 | 说明 |
|----------|------|
| hero | 大图主视觉 |
| conceptual | 概念化设计 |
| typography | 文字排版 |
| metaphor | 隐喻插画 |
| minimal | 极简风格 |

| 子命令 | 说明 |
|--------|------|
| infographic | 信息图生成 (20种布局) |
| xhs | 小红书系列图 (9:16卡片) |
| scrape | URL→Markdown 采集 |

## Related Skills

- `wechat-topic` v1.1 - 公众号选题分析
- `wechat-writer` v2.0 - AI 写作
- `wechat-article-evaluator` v2.0 - 质量评估
- `wechat-pipeline` v3.0 - 全流程编排
- `x-to-markdown` v1.0 - X/Twitter 采集
