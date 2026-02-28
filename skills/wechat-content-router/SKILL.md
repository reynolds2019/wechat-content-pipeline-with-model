---
name: wechat-content-router
description: |
  微信公众号内容创作套件路由器。根据用户意图自动分派到最合适的子 SKILL：
  wechat-pipeline(全流程)、wechat-formatter(排版/封面/信息图/小红书/采集/发布)、
  wechat-writer(写作)、wechat-topic(选题)、wechat-article-evaluator(质量评估)。
  支持跨套件路由到 utility-suite 的 x-to-markdown(X/Twitter采集)。
  Use when 公众号, 微信文章, 微信内容, wechat, 写文章, 排版, 选题, 评估,
  封面图, 信息图, 小红书, 采集, 发布, 全流程, pipeline, 一键写文.
allowed-tools: Read, Skill
---

# 微信公众号内容套件路由器 (wechat-content-router)

> 版本: v1.0.0 | 创建日期: 2026-02-28

## Instructions

### Step 1: 意图分析

解析用户输入，识别核心意图：

| 意图类别 | 识别信号 | 置信度阈值 |
|---------|---------|-----------|
| 全流程创作 | "帮我写一篇文章"、"一键写文"、"从想法到发布" | 90% |
| 排版美化 | "排版"、"格式化"、"转微信HTML" | 95% |
| AI写作 | "写大纲"、"扩写观点"、"生成文章" | 95% |
| 热点选题 | "热点"、"选题"、"趋势分析" | 95% |
| 质量评估 | "评分"、"评估"、"质量门禁" | 95% |
| 封面图生成 | "封面图"、"cover"、"封面" | 90% |
| 信息图生成 | "信息图"、"infographic"、"数据可视化" | 90% |
| 小红书系列图 | "小红书"、"xhs"、"红书图" | 90% |
| 网页采集 | "采集"、"scrape"、"URL转Markdown" | 90% |
| 微信发布 | "发布"、"publish"、"草稿" | 90% |
| X/Twitter采集 | "推文"、"X内容"、"Twitter" | 90% |

### Step 2: 路由匹配

根据意图分析结果，匹配目标 SKILL：

| 用户意图 | 目标 SKILL | 调用方式 |
|---------|-----------|---------|
| 全流程创作 | `wechat-pipeline` | `/wechat-pipeline "主题"` |
| 排版美化 | `wechat-formatter` | `/wechat-formatter` |
| AI写作 | `wechat-writer` | `/wechat-writer` |
| 热点选题 | `wechat-topic` | `/wechat-topic` |
| 质量评估 | `wechat-article-evaluator` | `/wechat-article-evaluator` |
| 封面图生成 | `wechat-formatter` | `/wechat-formatter` (cover子功能) |
| 信息图生成 | `wechat-formatter` | `/wechat-formatter` (infographic子命令) |
| 小红书系列图 | `wechat-formatter` | `/wechat-formatter` (xhs子命令) |
| 网页采集 | `wechat-formatter` | `/wechat-formatter` (scrape子命令) |
| 微信发布 | `wechat-formatter` | `/wechat-formatter` (--publish) |
| X/Twitter采集 | `x-to-markdown` | `/x-to-markdown` (utility-suite) |

### Step 3: 分派执行

1. **单一意图**: 直接调用匹配的 SKILL
2. **复合意图**: 拆解为步骤，按依赖顺序调用多个 SKILL
3. **模糊意图**: 置信度 < 80% 时，向用户确认意图后再分派

**复合意图处理示例**:
- "写一篇文章并排版" → wechat-writer → wechat-formatter
- "选题后写文章" → wechat-topic → wechat-writer
- "全流程写作" → wechat-pipeline (内部已编排全流程)

### 错误处理

| 场景 | 处理方式 |
|------|---------|
| 意图不明确 | 列出可用 SKILL，请用户选择 |
| SKILL 未激活 | 提示用户激活对应 SKILL |
| 跨套件路由 | 检查目标 SKILL 是否可用 |
| 多意图冲突 | 优先处理前置依赖，再处理后续步骤 |

---

## Examples

### Example 1: 全流程创作

**输入**: "帮我写一篇关于AI教育的公众号文章"

**路由决策**:
- 意图: 全流程创作
- 置信度: 92%
- 目标: wechat-pipeline

**执行**: `/wechat-pipeline "AI教育趋势" --type opinion`

### Example 2: 排版美化

**输入**: "我有一篇Markdown文章，帮我排版成微信格式"

**路由决策**:
- 意图: 排版美化
- 置信度: 96%
- 目标: wechat-formatter

**执行**: `/wechat-formatter`，按排版流程处理用户提供的 Markdown

### Example 3: 质量评估

**输入**: "帮我看看这篇文章质量怎么样，能不能发"

**路由决策**:
- 意图: 质量评估
- 置信度: 95%
- 目标: wechat-article-evaluator

**执行**: `/wechat-article-evaluator --gate`，执行质量门禁评估

### Example 4: 复合意图

**输入**: "采集这个推文然后排版发到公众号"

**路由决策**:
- 意图: X采集 + 排版 + 发布 (复合)
- 步骤:
  1. `/x-to-markdown` → 采集推文内容
  2. `/wechat-formatter` → 排版 + `--publish wechat --draft-only`

### Example 5: 小红书系列图

**输入**: "把这段内容做成小红书系列图"

**路由决策**:
- 意图: 小红书系列图
- 置信度: 95%
- 目标: wechat-formatter (xhs子命令)

**执行**: `/wechat-formatter`，使用 xhs 子命令生成系列图

---

## Quick Reference

### 请求→SKILL 快速映射

| 用户说... | 路由到 |
|----------|--------|
| "帮我写一篇公众号文章" | wechat-pipeline |
| "我有文章，帮我排版" | wechat-formatter |
| "帮我写个大纲/扩写观点" | wechat-writer |
| "今天有什么热点/选题" | wechat-topic |
| "文章质量怎么样/评分" | wechat-article-evaluator |
| "做信息图/数据图" | wechat-formatter (infographic) |
| "做小红书系列图" | wechat-formatter (xhs) |
| "采集这个网页/URL" | wechat-formatter (scrape) |
| "采集推文/X内容" | x-to-markdown (utility-suite) |
| "一键写文/全流程" | wechat-pipeline |
| "发布到微信/保存草稿" | wechat-formatter (--publish) |
| "生成封面图" | wechat-formatter (--cover) |

### 套件内 SKILL 版本

| SKILL | 版本 | 主要功能 |
|-------|------|---------|
| wechat-pipeline | v3.0 | 选题→写作→门禁→排版→发布 |
| wechat-formatter | v3.0 | 排版+封面+信息图+XHS+采集+发布 |
| wechat-writer | v2.0 | 大纲+全文+5种类型 |
| wechat-topic | v1.1 | 热点聚合+AI分析+结构化输出 |
| wechat-article-evaluator | v2.0 | 5维评估+质量门禁 |

---

## Related Skills

**套件内 SKILL**:
- `wechat-pipeline` v3.0 — 全流程编排器
- `wechat-formatter` v3.0 — 排版+多功能工具
- `wechat-writer` v2.0 — AI写作
- `wechat-topic` v1.1 — 选题分析
- `wechat-article-evaluator` v2.0 — 质量评估

**跨套件 SKILL**:
- `x-to-markdown` (utility-suite) — X/Twitter 内容采集

**上游路由**:
- `smart-router` — 全局智能路由，可将微信相关请求路由到本 SKILL
