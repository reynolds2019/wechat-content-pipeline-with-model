# wechat-content-suite SKILLs

Claude Code SKILL 安装与使用指南。

## 概览

| SKILL | 版本 | 说明 |
|-------|------|------|
| `wechat-content-router` | 1.0.0 | 套件入口路由器，分析用户意图并自动分派到子 SKILL |
| `wechat-pipeline` | 3.0 | 全流程编排：选题 → 写作 → 门禁 → 排版 → 发布 |
| `wechat-writer` | 2.0 | AI 写作（5 种文章类型，大纲 → 全文） |
| `wechat-topic` | 1.1 | 热点选题（微博 / 知乎 / 百度 / 36氪） |
| `wechat-article-evaluator` | 2.0 | 质量门禁（5 维度 100 分制，pass / fail） |
| `wechat-formatter` | 3.0 | 排版 + 封面 + 配图 + 信息图 + XHS + 采集 + 发布 |

## 安装

### 方式一：批量符号链接（推荐）

```bash
cd /path/to/wechat-content-suite
for skill in skills/wechat-*/; do
  ln -sf "$(pwd)/$skill" ~/.claude/skills/$(basename $skill)
done
```

### 方式二：手动安装

```bash
ln -sf /path/to/wechat-content-suite/skills/wechat-content-router ~/.claude/skills/wechat-content-router
ln -sf /path/to/wechat-content-suite/skills/wechat-pipeline ~/.claude/skills/wechat-pipeline
ln -sf /path/to/wechat-content-suite/skills/wechat-writer ~/.claude/skills/wechat-writer
ln -sf /path/to/wechat-content-suite/skills/wechat-topic ~/.claude/skills/wechat-topic
ln -sf /path/to/wechat-content-suite/skills/wechat-article-evaluator ~/.claude/skills/wechat-article-evaluator
ln -sf /path/to/wechat-content-suite/skills/wechat-formatter ~/.claude/skills/wechat-formatter
```

安装后需**重启 Claude Code** 才能生效。SKILL 列表在 Session 启动时加载，运行中新增的 SKILL 不会自动出现。

## 路由架构

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

用户请求 → 路由器分析意图 → 分派到对应 SKILL → SKILL 调用 CLI 工具执行。

## 各 SKILL 详解

### wechat-content-router

套件统一入口。分析用户意图的关键词和上下文，路由到最合适的子 SKILL。

- **触发词**: 公众号、微信内容、微信文章
- **路由规则**:
  - 提到"全流程"、"一键" → `wechat-pipeline`
  - 提到"写"、"生成文章" → `wechat-writer`
  - 提到"选题"、"热点" → `wechat-topic`
  - 提到"评估"、"打分" → `wechat-article-evaluator`
  - 提到"排版"、"格式"、"封面"、"发布" → `wechat-formatter`

### wechat-pipeline

全流程编排器，单入口驱动完整内容生产管线。包含 3 个用户确认点，确保内容质量。

- **触发词**: 全流程、一键写文、pipeline
- **流程**: 选题 → 写作（大纲 → 全文） → 质量门禁（>=90 分，最多 3 轮） → 排版 → 发布
- **确认点**: 选题确认 → 大纲确认 → 终稿确认
- **门禁规则**: 5 维度评估，总分 >=90 且标题 >=20/20 视为通过

### wechat-writer

从观点或想法生成完整文章。支持大纲独立输出，可提供标题候选。

- **触发词**: 写公众号、AI 写作、想法变文章
- **文章类型**:
  - `opinion` -- 观点文（立论 → 论据 → 升华）
  - `tutorial` -- 教程文（问题 → 步骤 → 总结）
  - `listicle` -- 盘点文（引入 → 逐条展开 → 点评）
  - `commentary` -- 热点评论（事件 → 分析 → 观点）
  - `story` -- 故事文（开篇 → 冲突 → 结局 → 启示）

### wechat-topic

热点选题分析，聚合多平台趋势数据。

- **触发词**: 选题、热点分析、trending
- **数据源**: 微博热搜、知乎热榜、百度热点、36氪
- **输出格式**: 表格 / 结构化 / JSON

### wechat-article-evaluator

5 维度质量评估系统，支持自动门禁模式。

- **触发词**: 文章评估、打分、质量门禁
- **评估维度**:
  - 标题吸引力（20 分）
  - 内容深度（25 分）
  - 结构逻辑（20 分）
  - 可读性（20 分）
  - 传播潜力（15 分）
- **门禁模式**: `--gate` 自动判定 pass/fail，`--gate-json` 输出 JSON
- **标题评估**: `--title-only` 仅评估标题

### wechat-formatter

核心排版引擎，集成 CLI 工具的全部能力。

- **触发词**: 排版、格式化、封面图、信息图、发布
- **能力范围**:
  - Markdown → 微信 HTML 排版（3 套主题）
  - AI 封面图生成（Gemini）
  - AI 智能配图
  - 信息图生成（20 布局 x 20 风格）
  - 小红书系列图
  - URL → Markdown 采集
  - 微信发布 API
  - KaTeX / Mermaid / 目录 / 规范化

## 常见问题

### SKILL 安装后没有出现

SKILL 列表在 Claude Code Session 启动时生成。如果在运行中安装了新 SKILL，需要退出并重启 Claude Code。

### 如何只安装部分 SKILL

只链接需要的 SKILL 即可。建议至少安装 `wechat-content-router` 和 `wechat-formatter` 作为基础组合。

### SKILL 与 CLI 工具的关系

SKILL 是 Claude Code 的自然语言接口，底层调用 `wx-format` CLI 工具执行实际操作。也可以不安装 SKILL，直接在终端使用 CLI 命令。
