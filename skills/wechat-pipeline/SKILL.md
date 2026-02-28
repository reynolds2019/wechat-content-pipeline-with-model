---
name: wechat-pipeline
description: |
  微信公众号全流程编排器 v3.0。单入口驱动：选题→写作→质量门禁→排版→发布。
  3个用户确认点，质量门禁自动循环（最多3轮，达标条件：总分≥90且标题=20）。
  Use when 公众号全流程, 一键写文章, wechat-pipeline, 全自动写作, 公众号管线,
  从想法到文章, 一条龙写作, pipeline, wx-pipeline, content-pipeline, auto-write.
allowed-tools: Read, Write, Bash(node:*), WebSearch, WebFetch
---

# 微信公众号全流程编排器 (wechat-pipeline)

## Instructions

单入口驱动完整公众号创作管线。用户只需提供方向/想法，AI 全流程处理，关键节点确认。

## 入口模式

| 模式 | 命令 | 说明 |
|------|------|------|
| 完整流程 | `/wechat-pipeline "主题" --type opinion` | 从选题开始 |
| 从选题开始 | `/wechat-pipeline --from-topic` | 先获取热点再选题 |
| 从草稿开始 | `/wechat-pipeline --from-draft article.md` | 跳过写作，直接进门禁 |

## 参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| topic | 无 | 主题/方向/想法 |
| --type | opinion | 文章类型 (opinion/tutorial/listicle/commentary/story) |
| --provider | gemini | AI provider |
| --from-topic | false | 从选题阶段开始 |
| --from-draft | 无 | 从已有草稿进入门禁循环 |
| --theme | simple | 排版主题 |
| --max-rounds | 3 | 门禁最大迭代轮数 |

## 完整流程 (6 阶段)

### 阶段 1: 选题 (wechat-topic)

**触发**: 完整流程 或 `--from-topic`

```bash
cd ~/Claude/🧪\ 小项目与测试/wx-format
node index.js topic --niche "<主题关键词>" --analyze --format structured --output /tmp/pipeline-topic.json
```

读取 `/tmp/pipeline-topic.json`，向用户展示 AI 推荐的 5 个选题。

**🔴 确认点 1: 用户确认选题方向**
- 展示推荐选题列表
- 用户选择一个方向，或提供自己的方向
- 记录确认的选题到 `$PIPELINE_TOPIC`

### 阶段 2: 写作 - 大纲 (wechat-writer --outline-only)

```bash
node index.js write "$PIPELINE_TOPIC" --type <type> --provider <provider> \
  --outline-only --title-candidates 5 --no-confirm -o /tmp/pipeline-outline.md
```

**🔴 确认点 2: 用户确认大纲**
- 展示大纲 + 5 个标题候选
- 用户选择标题或提供自己的标题
- 用户可调整大纲结构
- 确认后进入全文扩写

### 阶段 3: 写作 - 全文 (wechat-writer)

```bash
node index.js write "$PIPELINE_TOPIC" --type <type> --provider <provider> \
  --no-confirm -o /tmp/pipeline-draft.md
```

注意：将确认后的大纲和选定标题注入到扩写 prompt 中。
输出保存到 `/tmp/pipeline-draft.md`。

### 阶段 4: 质量门禁循环

**入口**: 全文写完后 或 `--from-draft`

循环逻辑（最多 `--max-rounds` 轮）：

```
round = 0
WHILE round < max_rounds:
  round += 1

  // 评估当前版本
  读取 /tmp/pipeline-draft.md
  使用 wechat-article-evaluator 的 --gate-json 模式评估
  解析 JSON 结果

  IF passed == true:
    BREAK → 进入确认

  // 未通过：分析 fix_instructions
  IF body_score >= 90 AND title_score < 20:
    // 仅迭代标题
    生成 5 个候选标题
    用 --title-only 模式逐个评估
    选择最高分标题替换
  ELSE:
    // 按 priority 排序 fix_instructions
    // 构建定向修改 prompt，只改问题区域
    // AI 执行定向修改
    // 保存新版本到 /tmp/pipeline-draft.md

  输出: "第 {round} 轮门禁: {total}/100, 标题 {title_score}/20, 人味 {human_score}/10"

IF round == max_rounds AND NOT passed:
  输出警告: "已达最大迭代轮数，当前最佳版本: {total}/100"
```

**质量门禁评估方法**:

评估时，使用 wechat-article-evaluator 的评估维度和标准，以 `--gate-json` 模式输出：
- 读取文章内容
- 按 5 维度 15 子项逐一打分
- 额外评估人味指数（3 子项，满分 10）
- 输出 JSON: `{ total, grade, title_score, human_score, passed, fail_reasons, human_warning, fix_instructions }`
- passed 条件: total >= 90 AND title_score >= 20
- human_score < 5 时追加 human_warning 和对应 fix_instructions

**定向修改 prompt 构建规则**:

```
你是文章修改专家。请根据以下修改指令，对文章进行定向修改。

【修改指令】（按优先级排序）
1. [dimension]: [instruction]
2. [dimension]: [instruction]

【重要规则】
- 只修改指令涉及的部分，不要改动其他内容
- 保持文章整体风格和语气不变
- 保持文章字数在合理范围内（±10%）
- 修改后的内容要自然融入上下文

【当前文章】
{article_content}
```

**🔴 确认点 3: 用户最终确认**
- 展示最终评分报告（总分 + 各维度）
- 展示门禁迭代历史（每轮分数变化）
- 用户确认或要求额外修改

### 阶段 5: 排版 (wechat-formatter)

```bash
node index.js /tmp/pipeline-draft.md -t <theme> --important --cover --math --toc --images -o /tmp/pipeline-article.html
```

输出最终 HTML 文件，可直接粘贴到公众号编辑器。

### 阶段 6: 微信发布 (可选)

**触发**: 用户选择发布 或 使用 `--publish` 参数

```bash
node index.js /tmp/pipeline-article.html --publish wechat --draft-only \
  --publish-title "$PIPELINE_TITLE" --publish-author "$PIPELINE_AUTHOR"
```

注意: 需要设置 WECHAT_APP_ID 和 WECHAT_APP_SECRET 环境变量。
草稿模式下仅创建草稿，不会自动发布。发布成功后返回 media_id。

## --from-draft 模式

跳过选题/写作，直接从已有草稿进入质量门禁：

1. 读取草稿文件
2. 复制到 `/tmp/pipeline-draft.md`
3. 直接进入阶段 4（质量门禁循环）
4. 门禁通过后进入阶段 5（排版）

## --from-topic 模式

从选题开始，不需要预设主题：

1. 直接执行阶段 1（选题），不带 niche 过滤
2. 用户从热点中选择方向
3. 后续流程与完整模式相同

## Examples

### Example 1: 完整流程

**输入**: `/wechat-pipeline "AI套娃思维" --type opinion`

**执行流程**:
1. 选题: 获取 AI 相关热点 → 用户确认方向
2. 大纲: 生成大纲+5标题 → 用户确认
3. 全文: 扩写 → 门禁循环(最多3轮) → 用户确认
4. 排版: 生成 HTML

### Example 2: 从草稿开始

**输入**: `/wechat-pipeline --from-draft ~/articles/draft.md`

**执行流程**:
1. 读取草稿 → 门禁评估
2. 不达标 → 自动修改 → 再评估（最多3轮）
3. 达标 → 用户确认 → 排版

### Example 3: 从选题开始

**输入**: `/wechat-pipeline --from-topic --type story`

**执行流程**:
1. 获取全平台热点 → 用户选择方向
2. 后续同完整流程

## 临时文件

| 文件 | 用途 |
|------|------|
| /tmp/pipeline-topic.json | 选题结果 |
| /tmp/pipeline-outline.md | 大纲 |
| /tmp/pipeline-draft.md | 文章草稿（门禁迭代） |
| /tmp/pipeline-article.html | 最终排版 HTML |
| /tmp/pipeline-publish.json | 发布结果 |

## 错误处理

| 场景 | 处理 |
|------|------|
| 选题获取失败 | 跳过热点，让用户直接输入方向 |
| 写作 AI 失败 | 重试一次，仍失败则保存当前进度 |
| 门禁3轮未达标 | 输出当前最佳版本 + 警告 + 剩余问题清单 |
| 排版失败 | 输出 Markdown 版本作为备选 |
| 发布失败 | 检查 API 凭证和 IP 白名单，跳过发布保留 HTML |

## Quick Reference

| 模式 | 命令 | 说明 |
|------|------|------|
| 完整流程 | `/wechat-pipeline "主题"` | 选题→写作→门禁→排版→发布 |
| 从选题 | `/wechat-pipeline --from-topic` | 热点选题开始 |
| 从草稿 | `/wechat-pipeline --from-draft file.md` | 跳过写作直接门禁 |
| 指定类型 | `--type tutorial` | opinion/tutorial/listicle/commentary/story |
| 指定主题 | `--theme business` | simple/business/tech |
| 最大轮数 | `--max-rounds 5` | 门禁最大迭代轮数 |

## Related Skills

- **wechat-topic** v1.1 - 选题分析
- **wechat-writer** v2.0 - AI 写作
- **wechat-article-evaluator** v2.0 - 质量门禁评估
- **wechat-formatter** v3.0 - 排版转换
