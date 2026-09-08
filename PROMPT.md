## 查看wx-format
```
关于wx-format的大模型的调用：主命令为 wx-format [input]（入口通常对应 node index.js），存在参数支持大模型切换，--polish <provider>，启用 AI 润色服务商，可选：gemini / deepseek / openai / claude。
目前有设置大模型Base URL和API-KEY的参数和方法，但是没有指定Model的方法，请确认
```

## 验证文本润色和配图生成
```
请验证文本润色和配图生成这两个功能是否正常。输出内容放置到output目录我验证（不要修改当前工程逻辑，应该是调用以后的输出流形成文件）。
你想要验证的话可以使用这些参数：
# One-API 大模型聚合网关端点
llm_base_url: "http://192.168.8.206:3001/v1"
# One-API 主大模型认证 API Key
api_key: "sk-S9JGFnHuV1EFvhhX73E4D2EcF1D44e2eB82936CaF3CbAfD2"
# 通用对话与 Agent 思考底座模型
llm_model: "qwen3.6-flash"
# 默认生图模型
image_model: "wan2.7-image"
```