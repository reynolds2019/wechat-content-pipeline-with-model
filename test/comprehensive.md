---
theme: simple
---

# 一级标题：wx-format v1.2 全功能测试

## 二级标题：功能概览

### 三级标题：核心特性

#### 四级标题：新增功能

##### 五级标题：细节改进

###### 六级标题：微调项

## 任务列表测试

- [x] 主题美化重设计
- [x] 转换引擎扩展
- [ ] AI 润色集成
- [ ] 文档更新

## 删除线测试

这是正常文本，~~这是删除线文本~~，这是 **加粗** 和 *斜体*。

~~整段删除线测试：这一整段都应该显示删除线效果。~~

## 多行表格测试（斑马纹）

| 序号 | 功能 | 状态 | 负责人 |
|------|------|------|--------|
| 1 | 主题美化 | 完成 | Agent A |
| 2 | 引擎扩展 | 完成 | Agent B |
| 3 | CLI 升级 | 完成 | Agent C |
| 4 | AI 润色 | 完成 | Agent D |
| 5 | 测试验证 | 完成 | Agent E |
| 6 | 集成测试 | 进行中 | Team |

## 嵌套列表

- 第一层
  - 第二层 A
    - 第三层
  - 第二层 B
- 另一个第一层

1. 有序列表第一项
2. 有序列表第二项
   - 混合嵌套
   - 另一个嵌套

## 代码块测试

```javascript
// 测试代码高亮
const themes = ['simple', 'business', 'tech'];
themes.forEach(t => {
  console.log(`Theme: ${t}`);
});
```

```python
# Python 代码测试
def hello(name: str) -> str:
    return f"Hello, {name}!"
```

## 引用测试

> 这是一段引用文字。引用块应该有独特的样式，与正文区分开来。
>
> 多段引用测试。

## 链接与图片

更多内容参考 [Claude 文档](https://docs.anthropic.com) 和 [GitHub](https://github.com)。

---

*本文由 wx-format v1.2 生成，用于全功能测试。*

## 中英文混排测试 (normalize)

这是一段包含English的中文文本,用于测试normalize功能.共有10个test case需要验证.

使用Claude进行AI润色,效果非常好!你觉得呢?

Node.js是一个基于Chrome V8引擎的JavaScript运行时(runtime),它让JavaScript可以在服务端运行.
