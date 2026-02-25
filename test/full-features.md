# 全功能测试：微信公众号排版终极指南

> 这是一段引用文字，用于测试 blockquote 的渲染效果。好的排版让阅读成为享受。

## 文本样式测试

这是普通段落文本，用于测试 `text-align:justify` 和 `letter-spacing` 效果。中文排版需要两端对齐才能看起来整齐美观，这一点在微信公众号中尤为重要。

这里有 **加粗文字** 测试渐变底色高亮效果，还有 *斜体文字* 和 ~~删除线文字~~。行内代码 `console.log('hello')` 也需要测试。

## 列表功能

无序列表：

- 第一项：支持自定义列表图标
- 第二项：间距和排版优化
- 第三项：嵌套内容支持
  - 子项 A
  - 子项 B

有序列表：

1. 需求分析与规划
2. 技术方案设计
3. 开发与测试
4. 部署上线

### 任务清单

- [x] 完成主题设计
- [x] 实现 converter 增强
- [ ] AI 配图集成
- [ ] 最终测试验收

## 表格展示

| 功能 | 状态 | 优先级 | 负责人 |
|------|------|--------|--------|
| 主题重写 | 已完成 | P0 | theme-dev |
| AI 配图 | 进行中 | P1 | image-dev |
| 排版研究 | 已完成 | P0 | researcher |
| CLI 集成 | 待开始 | P2 | image-dev |

## 代码块测试

JavaScript 示例：

```javascript
class WxFormatter {
  constructor(theme = 'simple') {
    this.theme = theme;
    this.plugins = new Map();
  }

  async format(markdown) {
    const html = this.convert(markdown);
    return this.applyTheme(html);
  }
}
```

YAML 配置：

```yaml
wx-format:
  version: "1.4"
  themes:
    - simple
    - business
    - tech
  features:
    ai_images: true
    justify: true
```

### 三级标题测试

这里测试 h3 前置装饰符号的效果。三级标题应该有明显的视觉层级区分。

#### 四级标题

五级和六级标题较少使用，但也需要正确渲染。

##### 五级标题

###### 六级标题

## 引用与链接

> 优秀的排版不是让人注意到设计，而是让人专注于内容。
> —— 某位设计大师

更多参考：[微信公众号排版指南](https://mp.weixin.qq.com) 和 [Markdown 语法](https://commonmark.org)。

---

*本文由 wx-format v1.4 生成，测试所有 Markdown 元素的渲染效果。*
