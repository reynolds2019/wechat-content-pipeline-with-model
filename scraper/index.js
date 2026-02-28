/**
 * URL → Markdown 抓取模块
 * - Puppeteer 加载页面
 * - 提取正文内容 (article/main/.post-content 等)
 * - HTML → Markdown 转换
 * - YAML frontmatter 输出
 * - --wait 模式支持手动交互 (登录/付费墙)
 */

const puppeteer = require('puppeteer');
const readline = require('readline');

// ============ HTML → Markdown 转换器 ============

function htmlToMarkdown(html) {
  // Simple but effective HTML-to-Markdown converter
  let md = html;

  // Remove script/style tags and their content
  md = md.replace(/<script[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Headings h1-h6
  for (let i = 6; i >= 1; i--) {
    const re = new RegExp(`<h${i}[^>]*>(.*?)<\\/h${i}>`, 'gis');
    md = md.replace(re, (_, content) => `\n${'#'.repeat(i)} ${cleanInline(content)}\n`);
  }

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const lines = cleanInline(content).split('\n').filter(l => l.trim());
    return '\n' + lines.map(l => `> ${l.trim()}`).join('\n') + '\n';
  });

  // Code blocks (pre > code)
  md = md.replace(/<pre[^>]*>\s*<code[^>]*(?:class="[^"]*language-(\w+)[^"]*")?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_, lang, code) => `\n\`\`\`${lang || ''}\n${decodeHtmlEntities(code).trim()}\n\`\`\`\n`);
  // Pre blocks without code
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    (_, code) => `\n\`\`\`\n${decodeHtmlEntities(code).trim()}\n\`\`\`\n`);

  // Inline code
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, (_, code) => `\`${decodeHtmlEntities(code)}\``);

  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (_, href, text) => {
    const cleanText = cleanInline(text).trim();
    if (!cleanText) return '';
    return `[${cleanText}](${href})`;
  });

  // Tables
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableHtml) => {
    return convertTable(tableHtml);
  });

  // Lists - unordered
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, items) => {
    return '\n' + convertListItems(items, '-') + '\n';
  });
  // Lists - ordered
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, items) => {
    return '\n' + convertListItems(items, '1.') + '\n';
  });

  // Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, content) => `\n${cleanInline(content).trim()}\n`);

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Bold
  md = md.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
  // Italic
  md = md.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*');
  // Strikethrough
  md = md.replace(/<(del|s|strike)[^>]*>(.*?)<\/\1>/gi, '~~$2~~');

  // Horizontal rule
  md = md.replace(/<hr[^>]*\/?>/gi, '\n---\n');

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  md = decodeHtmlEntities(md);

  // Clean up excessive blank lines
  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.trim();

  return md;
}

function cleanInline(html) {
  let text = html;
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
  text = text.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*');
  text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  text = text.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
  text = text.replace(/<[^>]+>/g, '');
  return decodeHtmlEntities(text);
}

function convertListItems(html, marker) {
  const items = [];
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  let idx = 0;
  while ((match = re.exec(html)) !== null) {
    idx++;
    const prefix = marker === '1.' ? `${idx}.` : marker;
    items.push(`${prefix} ${cleanInline(match[1]).trim()}`);
  }
  return items.join('\n');
}

function convertTable(tableHtml) {
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(tableHtml)) !== null) {
    const cells = [];
    const cellRe = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowMatch[1])) !== null) {
      cells.push(cleanInline(cellMatch[2]).trim());
    }
    if (cells.length > 0) rows.push(cells);
  }
  if (rows.length === 0) return '';

  const colCount = Math.max(...rows.map(r => r.length));
  let md = '\n';
  // Header row
  md += '| ' + rows[0].map(c => c || ' ').join(' | ') + ' |\n';
  md += '| ' + Array(colCount).fill('---').join(' | ') + ' |\n';
  // Data rows
  for (let i = 1; i < rows.length; i++) {
    const padded = Array(colCount).fill('').map((_, j) => rows[i][j] || '');
    md += '| ' + padded.join(' | ') + ' |\n';
  }
  return md + '\n';
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

// ============ YAML Frontmatter 生成 ============

function generateFrontmatter(meta) {
  const lines = ['---'];
  if (meta.title) lines.push(`title: "${meta.title.replace(/"/g, '\\"')}"`);
  if (meta.author) lines.push(`author: "${meta.author.replace(/"/g, '\\"')}"`);
  if (meta.date) lines.push(`date: "${meta.date}"`);
  if (meta.source) lines.push(`source: "${meta.source}"`);
  lines.push(`scraped_at: "${new Date().toISOString()}"`);
  lines.push('---');
  return lines.join('\n');
}

// ============ 主抓取函数 ============

const CONTENT_SELECTORS = [
  'article',
  'main',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.content',
  '#content',
  '.post-body',
  '.article-body',
  '.rich_media_content', // WeChat articles
];

async function scrape(url, options = {}) {
  const { wait = false, output = null } = options;

  console.log(`正在抓取: ${url}`);
  const browser = await puppeteer.launch({
    headless: wait ? false : 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait mode: let user interact
    if (wait) {
      console.log('\n手动交互模式：请在浏览器中完成操作（登录、关闭弹窗等）');
      console.log('完成后按 Enter 继续抓取...');
      await waitForEnter();
    }

    // Extract metadata
    const meta = await page.evaluate(() => {
      const getContent = (sel) => {
        const el = document.querySelector(sel);
        return el ? (el.content || el.textContent || '').trim() : '';
      };
      return {
        title: document.title || getContent('meta[property="og:title"]') || getContent('h1'),
        author: getContent('meta[name="author"]') || getContent('.author') || getContent('[rel="author"]'),
        date: getContent('meta[property="article:published_time"]') || getContent('time[datetime]') || getContent('.date'),
      };
    });
    meta.source = url;

    // Extract content using selector priority
    const contentHtml = await page.evaluate((selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerHTML.trim().length > 100) {
          return el.innerHTML;
        }
      }
      // Fallback: body with nav/header/footer/aside removed
      const body = document.body.cloneNode(true);
      for (const tag of ['nav', 'header', 'footer', 'aside', '.sidebar', '.nav', '.menu', '.ad', '.advertisement']) {
        body.querySelectorAll(tag).forEach(el => el.remove());
      }
      return body.innerHTML;
    }, CONTENT_SELECTORS);

    // Convert to Markdown
    const markdown = htmlToMarkdown(contentHtml);
    const frontmatter = generateFrontmatter(meta);
    const fullContent = `${frontmatter}\n\n${markdown}`;

    console.log(`标题: ${meta.title}`);
    console.log(`字数: ~${markdown.length} 字符`);

    return { content: fullContent, meta, markdown };
  } finally {
    await browser.close();
  }
}

function waitForEnter() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('', () => { rl.close(); resolve(); });
  });
}

module.exports = { scrape, htmlToMarkdown, generateFrontmatter };
