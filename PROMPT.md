## 查看wx-format
```
关于wx-format的大模型的调用：主命令为 wx-format [input]（入口通常对应 node index.js），存在参数支持大模型切换，--polish <provider>，启用 AI 润色服务商，可选：gemini / deepseek / openai / claude。
目前有设置大模型Base URL和API-KEY的参数和方法，但是没有指定Model的方法，请确认
```

## 验证文本润色和配图生成
```
请验证文本润色和配图生成这两个功能是否正常。
- 使用的大语言模型和文生图模型脚本如下：
- 大语言模型验证
```
curl http://192.168.8.206:3002/v1/chat/completions -H "Content-Type: application/json" -H "Authorization: Bearer sk-oKSP4ZeeWvITB65yGpodcldvzjYema6gt9OU0qtCjeT94EGx" -d "{\"model\":\"qwen3.6-flash\",\"messages\":[{\"role\":\"user\",\"content\":\"Say hello in one sentence.\"}]}"
```
- 文生图模型验证
```
curl http://192.168.8.206:3002/v1/images/generations -H "Content-Type: application/json" -H "Authorization: Bearer sk-oKSP4ZeeWvITB65yGpodcldvzjYema6gt9OU0qtCjeT94EGx" -d "{\"model\":\"wan2.7-image\",\"prompt\":\"一只在太空漫步的猫，赛博朋克风格\",\"n\":1,\"size\":\"1024x1024\"}"
```
- 代码迭代原则：支持新的大模型可新增代码文件或代码块，  如：原有 gemini-client.js 尽量减少修改，可新增 qwen-client.js 作为分支逻辑，便于后续维护。
```