# wx-format Changelog

## v3.0.1 (2026-02-28) — Bug Fixes + Shared Gemini Client

### Bug Fixes

- **XHS fetch 失败**: 创建共享 `gemini-client.js` (GeminiClient 类)，带指数退避重试 (3次, 2s/4s/8s)，重构 xhs/cover/infographic/image-gen 四个模块统一使用
- **微信 media_id 无效**: `extractAndUploadImages()` 返回 `{ html, thumbMediaId }`，首张图上传为永久素材 (type=thumb)，确保草稿创建使用有效 media_id

### 重构

- 提取 `gemini-client.js` 共享模块，消除 4 处重复的 Gemini API 调用代码
- 统一代理 (proxy) 配置、重试逻辑、错误处理

### 新增依赖

- `undici` ^7.0.0 — ProxyAgent for Gemini API calls

### 新增 SKILL

- `wechat-content-router` — 微信内容套件路由器，统一分派 5 个子 SKILL

---

## v3.0 (2026-02-28) — baoyu-skills 集成

### 新增能力 (8 项集成 + 1 项独立 SKILL)

| # | 能力 | 类型 | 文件 | 状态 |
|---|------|------|------|------|
| 1 | 封面图生成 | CLI 选项 | cover/index.js, cover/prompts.js | ✅ 已集成 |
| 2 | KaTeX 数学公式渲染 | CLI 选项 | converter.js (--math) | ✅ 已集成 |
| 3 | Mermaid 图表渲染 | CLI 选项 | converter.js (--mermaid) | ✅ 已集成 |
| 4 | 目录导航生成 | CLI 选项 | converter.js (--toc) | ✅ 已集成 |
| 5 | 全量中文规范化 | CLI 选项 | normalizer.js (--normalize-full) | ✅ 已集成 |
| 6 | 智能配图密度/风格 | CLI 选项 | image-gen.js (--image-density/--image-style) | ✅ 已集成 |
| 7 | 信息图生成 | 子命令 | infographic/index.js, infographic/layouts.js, infographic/prompts.js | ✅ 已集成 |
| 8 | 小红书系列图 | 子命令 | xhs/index.js, xhs/prompts.js | ✅ 已集成 |
| 9 | URL→Markdown 采集 | 子命令 | scraper/index.js | ✅ 已集成 |
| 10 | 微信发布 | CLI 选项 | publish/index.js, publish/wechat-api.js | ✅ 已集成 |
| 11 | X/Twitter 采集 | 独立 SKILL | utility-suite/x-to-markdown/ | ✅ 独立 SKILL |

### 新增 CLI 选项

- `--cover` — 生成 AI 封面图 (Gemini API)
- `--cover-style <style>` — 封面风格 (hero/conceptual/typography/metaphor/minimal)
- `--cover-palette <palette>` — 封面配色 (warm/cool/dark/vivid/pastel/mono)
- `--cover-ratio <ratio>` — 封面比例 (2.35:1/16:9/1:1)
- `--math` — 启用 KaTeX 数学公式渲染
- `--mermaid` — 启用 Mermaid 图表渲染
- `--toc` — 生成目录导航
- `--normalize-full` — 全量中文规范化
- `--image-density <density>` — 配图密度 (minimal/balanced/rich)
- `--image-style <style>` — 配图风格 (notion/warm/minimal/blueprint/watercolor)
- `--publish <target>` — 发布到平台 (wechat)
- `--publish-method <method>` — 发布方式 (api)
- `--publish-title <title>` — 发布文章标题
- `--publish-author <author>` — 发布文章作者
- `--draft-only` — 仅保存为草稿

### 新增子命令

- `infographic <input>` — 信息图生成 (20 种布局 + 20 种风格)
- `xhs <input>` — 小红书系列图 (9:16 卡片)
- `scrape <url>` — URL→Markdown 采集 (Puppeteer)

### 新增依赖

- `puppeteer` — 网页采集引擎
- `katex` — 数学公式渲染
- `marked-footnote` — 脚注支持

### SKILL 更新

- `wechat-formatter` v1.5 → v3.0 (新增 8 项能力路由)
- `wechat-pipeline` v2.0 → v3.0 (新增发布阶段)
- `x-to-markdown` v1.0 (新增独立 SKILL)

---

## v2.5 (2025-xx-xx)

- 移除调研模块 (搜狗反爬+DDG不稳定)
- 管线从6阶段简化为5阶段
- 修复配图h3章节识别

## v1.5 (2025-xx-xx)

- AI 配图 (Gemini)
- 8 种 AI 润色
- 中文文本规范化
- !important 样式强化

## v1.0 (2025-xx-xx)

- 初始版本
- 3 套主题 (simple/business/tech)
- Markdown → 微信 HTML 转换
