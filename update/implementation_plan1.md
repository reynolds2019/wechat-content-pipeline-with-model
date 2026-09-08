# AI 模块支持自定义 provider / baseUrl / apiKey / model 改造计划

感谢指出！参数命名统一使用 `baseUrl`。

本计划旨在为工程中所有与 AI 大模型交互的模块（润色、写作、选题分析、配图生成等）统一提供 `provider`、`baseUrl`、`apiKey` 和 `model` 的配置与透传支持，使用户能够灵活切换自定义模型和第三方代理接口。

## 变更范围与设计

### 1. 共享通信模块

#### [providers.js](file:///e:/创新应用/wechat-content-pipeline-with-model/providers.js)
- 改造 `createClient(provider, options)` 函数：
  - `options` 可支持传入 `{ apiKey, baseUrl, model }`；兼容原有的 `createClient(provider, apiKey)` 简写调用。
  - 若显式指定 `baseUrl` 或 `model`，优先采用用户指定值；未指定则自动回退至 `PROVIDERS[provider]` 的默认配置。

#### [gemini-client.js](file:///e:/创新应用/wechat-content-pipeline-with-model/gemini-client.js)
- 构造函数参数新增 `baseUrl` 支持：
  - `this.baseUrl = baseUrl || 'https://generativelanguage.googleapis.com/v1beta'`。

---

### 2. 业务功能模块

#### [polisher.js](file:///e:/创新应用/wechat-content-pipeline-with-model/polisher.js)
- `ContentPolisher` 构造函数接收 `baseUrl` 与 `model`。
- 在 `_polishSingle()` 调用 `createClient` 时将 `baseUrl` 和 `model` 完整传递。

#### [image-gen.js](file:///e:/创新应用/wechat-content-pipeline-with-model/image-gen.js) & [cover/index.js](file:///e:/创新应用/wechat-content-pipeline-with-model/cover/index.js)
- 构造函数补充接收 `baseUrl`，实例化 `GeminiClient` 时传入 `baseUrl`。

#### [writer/index.js](file:///e:/创新应用/wechat-content-pipeline-with-model/writer/index.js) & [topic/analyzer.js](file:///e:/创新应用/wechat-content-pipeline-with-model/topic/analyzer.js)
- 使 Writer 和 TopicAnalyzer 模块也支持在配置选项中指定 `baseUrl` 与 `model`。

---

### 3. 主 CLI 工具入口

#### [index.js](file:///e:/创新应用/wechat-content-pipeline-with-model/index.js)
- 在 `wx-format` 命令行参数中新增：
  - `--base-url <url>`: 自定义 AI 服务的 Base URL
  - `--model <model>`: 自定义大模型名称（支持覆盖默认的 `gemini-3.1-pro-preview` / `deepseek-chat` / `gpt-4o` 等）
- 将解析到的 `options.baseUrl` 与 `options.model` 传递给 `ContentPolisher` / `ImageGenerator` / `CoverGenerator`。

---

## 验证计划

### 自动化 / 脚本测试
1. 使用 `--dry-run` 模式测试 `wx-format` 命令：
   ```bash
   node index.js test.md --polish deepseek --base-url "https://my-custom-api.com/v1" --model "deepseek-coder" --api-key "test-key" --dry-run
   ```
   验证控制台打印的 Provider、Model 及 Base URL 是否符合预期。
2. 运行原有的 Provider 测试脚本 `node test/test-providers.js` 确保兼容性不受影响。
