---
name: wechat-writer
description: |
  微信公众号 AI 写作工具 v2.0。从观点/想法生成完整公众号文章。支持 5 种文章类型(观点文/教程文/盘点文/热点评论/故事文)，
  两步生成(大纲→全文)，支持调研素材融入、大纲模式(outline-only)、标题候选生成，可链接润色和排版。
  Use when 公众号写作, AI写文章, 观点扩展, wx-write, wechat-write, 想法变文章, 写公众号, 生成文章.
allowed-tools: Read, Write, Bash(node:*), Bash(cat:*)
---

# 微信公众号 AI 写作工具 (wechat-writer)

## Instructions

从观点/想法出发，AI 生成完整公众号文章。

### Step 1: 获取输入

- **观点文本**: 分号分隔多个观点，如 "AI改变教育; 个性化学习是未来"
- **观点文件**: `.txt` 文件路径
- **无输入**: 提示用户提供观点

### Step 2: 确定参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| type | opinion | opinion/tutorial/listicle/commentary/story |
| provider | gemini | AI provider: gemini/deepseek/openai/claude |
| api-key | 无 | AI API Key |
| dry-run | false | 仅打印 prompt，不调用 API |
| list-types | false | 列出所有文章类型 |
| no-confirm | false | 跳过大纲确认 |
| outline-only | false | 仅输出大纲，不扩写全文 |
| title-candidates | 5 | 大纲阶段生成标题候选数量 |
| output | 无 | 输出文件路径 (-o) |
| polish | 无 | 写完后润色的 provider |
| polish-type | deai | 润色类型 |
| theme | 无 | 排版主题（触发 HTML 转换） |

### Step 3: 执行写作

```bash
cd ~/Claude/🧪\ 小项目与测试/wx-format

# 基础：观点→文章
node index.js write "AI正在改变教育; 个性化学习是未来" --provider gemini

# 指定类型
node index.js write "量化交易3个误区" --type listicle

# 全流程：写作→润色→排版
node index.js write "观点1; 观点2" --provider gemini \
  --polish gemini --polish-type deai -t simple -o article.html

# 仅生成大纲 + 5个标题候选
node index.js write "AI套娃思维" --outline-only --title-candidates 5
```

### Step 4: 返回结果

- 输出 Markdown 到 stdout（可重定向）
- 带 `-t` 时输出 HTML
- 带 `-o` 时写入文件

## 文章类型

| 类型 | 名称 | 特点 |
|------|------|------|
| opinion | 观点文 | 论点+论据+升华（默认） |
| tutorial | 教程文 | 步骤式 how-to |
| listicle | 盘点文 | Top N 列表 |
| commentary | 热点评论 | 新闻+分析 |
| story | 故事文 | 叙事驱动 |

## Examples

### Example 1: 观点→完整文章 + 排版

**输入**: 用户提供观点 "AI正在改变教育; 个性化学习是未来"

**命令**:
```bash
cd ~/Claude/🧪\ 小项目与测试/wx-format
node index.js write "AI正在改变教育; 个性化学习是未来" --provider gemini \
  --polish gemini --polish-type deai -t simple -o article.html
```

**输出**: 生成大纲→确认→扩写全文→去AI味润色→simple主题排版→输出 article.html

### Example 2: Dry-run 预览 prompt

**输入**: 用户想查看生成的 prompt 而不调用 API

**命令**:
```bash
node index.js write "量化交易3个误区" --type listicle --dry-run
```

**输出**: 打印完整 prompt 到终端，不消耗 API 额度

### Error Handling

- AI 调用失败 → 检查 `--api-key` 或环境变量配置
- 大纲不满意 → 不带 `--no-confirm`，手动确认/修改大纲
- 输出乱码 → 确认终端 UTF-8 编码

## Related Skills

- `wechat-formatter` - 公众号排版工具
- `wechat-topic` - 公众号选题分析
- `wechat-article-evaluator` - 公众号文章质量评估
- `wechat-pipeline` - 公众号全流程编排 (选题→写作→门禁→排版)
