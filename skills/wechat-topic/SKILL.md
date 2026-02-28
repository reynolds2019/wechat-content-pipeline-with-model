---
name: wechat-topic
description: |
  微信公众号选题工具 v1.1。聚合微博/知乎/百度/36氪热点数据，支持领域过滤、AI 选题分析、结构化输出和文件保存。
  Use when 公众号选题, 微信选题, 热点分析, trending, wx-topic, 选题推荐,
  热搜分析, 内容选题, 公众号内容策划.
allowed-tools: Read, Bash(node:*), Bash(cat:*)
---

# 微信公众号选题工具 (wechat-topic)

## Instructions

聚合多平台热点数据，辅助公众号选题决策。

### Step 1: 确定参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| niche | 无 | 领域关键词过滤 (逗号分隔) |
| sources | 全部 | 数据源: weibo,zhihu,baidu,36kr |
| count | 20 | 显示条数 |
| analyze | false | 启用 AI 选题分析 |
| provider | gemini | AI provider |
| api-key | 无 | AI API Key |
| dry-run | false | 仅打印分析 prompt |
| json | false | JSON 格式输出 |
| output | 无 | 结果保存到文件路径 |
| format | table | 输出格式: table (默认) / structured (结构化 JSON) |

### Step 2: 执行

```bash
cd ~/Claude/🧪\ 小项目与测试/wx-format
node index.js topic [--niche <keywords>] [--sources <list>] [--count <n>] [--analyze] [--output <path>] [--format structured]
```

### Step 3: 返回结果

- 展示热点列表（序号、来源、热度、标题）
- 如启用 AI 分析，展示 5 个推荐选题（标题+角度+评分+理由）

## Examples

### Example 1: AI 领域热点 + 分析

**输入**: 用户想了解 AI 领域的微博/知乎热点并获取选题建议

**命令**:
```bash
cd ~/Claude/🧪\ 小项目与测试/wx-format
node index.js topic --niche "AI,人工智能" --sources weibo,zhihu --analyze
```

**输出**: 热点列表 + 5 个 AI 推荐选题（标题+角度+评分+理由）

### Example 2: Dry-run 预览分析 prompt

**输入**: 用户想查看 AI 分析的 prompt 而不消耗 API 额度

**命令**:
```bash
node index.js topic --niche "AI" --analyze --dry-run
```

**输出**: 打印完整分析 prompt 到终端

### Example 3: JSON 输出用于后续处理

**命令**:
```bash
node index.js topic --json --count 10
```

**输出**: JSON 格式的热点数据，可供脚本或工作流消费

### Example 4: 结构化输出供管线消费

**命令**:
```bash
node index.js topic --niche "AI" --analyze --format structured --output /tmp/topic.json
```

**输出**: 结构化 JSON 保存到文件，包含 topics 数组和 analyzed 推荐

### Error Handling

- 网络超时 → 跳过失败源，显示可用数据
- AI 分析失败 → 检查 `--api-key` 或环境变量，用 `--dry-run` 验证 prompt
- 数据源为空 → 尝试切换 `--sources`，部分平台可能临时不可用

## Related Skills

- `wechat-formatter` - 选题确定后排版发布
- `wechat-writer` - 选题确定后 AI 写作
- `wechat-pipeline` - 选题→写作→排版全流程
