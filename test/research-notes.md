# 排版设计研究笔记

## 来源：135编辑器 + 微信公众号真实文章

### 1. Box-Shadow 模式

```css
/* 卡片阴影 - 轻柔 */
box-shadow: 0 2px 12px rgba(0,0,0,0.06);
/* 卡片阴影 - 中等 */
box-shadow: 0 4px 16px rgba(0,0,0,0.08);
/* 标题徽章阴影 */
box-shadow: 0 2px 6px rgba(主色,0.2);
/* 发光效果 (tech) */
box-shadow: 0 0 8px rgba(主色,0.3);
```

### 2. Gradient 模式

```css
/* 渐变底色高亮 (strong) */
linear-gradient(to top, rgba(主色,0.15-0.25) 0%, rgba(主色,0.15-0.25) 40%, transparent 40%);
/* 标题背景渐变 */
linear-gradient(135deg, #lighter, #darker);
/* 微透明渐变 */
linear-gradient(to right, rgba(主色,0.06), transparent);
```

### 3. 间距体系

| 元素 | margin | padding |
|------|--------|---------|
| h2 | 34-36px 0 18px | 12-14px 18px |
| h3 | 24px 0 12px | - |
| p | 16px 0 | - |
| ul/ol | 16px 0 | left 28px |
| li | 8px 0 | - |
| blockquote | 20px 0 | 20-24px |

### 4. 装饰元素

- h3 前置图标：◆(simple) ▸(business) >(tech)
- 列表自定义标记：◆(simple) ▪(business) $(tech)
- letter-spacing: 0.5px (正文)
- text-align: justify (所有正文)

### 5. 字体层级

- h1: 26-28px, bold
- h2: 21-22px, bold, 带编号徽章
- h3: 18px, bold, 带装饰图标
- p: 16px, justify, letter-spacing 0.5px
- code_inline: 14px, 带 border
- footnote: 13px

### 6. 关键发现

1. 专业公众号文章几乎都用 text-align:justify
2. 加粗文字用渐变底色高亮比纯色更高级
3. 卡片元素必须有 box-shadow 才有层次感
4. h3 前置装饰符号能显著提升视觉层级
5. 列表自定义标记比默认 disc 更精致
6. section 整体背景色能统一视觉风格
