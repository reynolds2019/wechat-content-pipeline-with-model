const { Marked } = require('marked');
const juice = require('juice');
const hljs = require('highlight.js');
const { getTheme } = require('./themes');
const katex = require('katex');

// hljs class → inline style mapping (One Dark theme colors)
const DEFAULT_HLJS_STYLES = {
  'hljs-keyword': 'color:#c678dd;',
  'hljs-built_in': 'color:#e6c07b;',
  'hljs-string': 'color:#98c379;',
  'hljs-number': 'color:#d19a66;',
  'hljs-title': 'color:#61afef;',
  'hljs-function': 'color:#61afef;',
  'hljs-params': 'color:#abb2bf;',
  'hljs-comment': 'color:#5c6370;font-style:italic;',
  'hljs-doctag': 'color:#c678dd;',
  'hljs-meta': 'color:#61afef;',
  'hljs-attr': 'color:#d19a66;',
  'hljs-variable': 'color:#e06c75;',
  'hljs-literal': 'color:#56b6c2;',
  'hljs-type': 'color:#e6c07b;',
  'hljs-symbol': 'color:#61afef;',
  'hljs-bullet': 'color:#61afef;',
  'hljs-link': 'color:#61afef;text-decoration:underline;',
  'hljs-addition': 'color:#98c379;',
  'hljs-deletion': 'color:#e06c75;',
  'hljs-selector-class': 'color:#d19a66;',
  'hljs-selector-id': 'color:#61afef;',
  'hljs-selector-tag': 'color:#e06c75;',
  'hljs-name': 'color:#e06c75;',
  'hljs-tag': 'color:#abb2bf;',
};

class WxConverter {
  constructor(options = {}) {
    this.theme = getTheme(options.theme || 'simple');
    this.hljsStyles = this.theme.codeTheme || DEFAULT_HLJS_STYLES;
    this.footnotes = [];
    this.footnoteIndex = 0;
    this.h2Count = 0;
    this.isFirstParagraph = true;
    this._inBlockquote = false;
    this.normalizeText = options.normalize || false;
    this.important = options.important || false;
    this.enableMath = options.math || false;
    this.enableMermaid = options.mermaid || false;
    this.enableToc = options.toc || false;
    this.headings = []; // collected during rendering for TOC
    this.marked = new Marked();
    this._setupExtensions();
    this._setupRenderer();
  }

  inlineHljsStyles(html) {
    const styles = this.hljsStyles;
    return html.replace(
      /<span class="([^"]+)">/g,
      (_, classes) => {
        const s = classes.split(/\s+/)
          .map(c => styles[c] || '')
          .filter(Boolean)
          .join('');
        return s ? `<span style="${s}">` : '<span>';
      }
    );
  }

  _setupExtensions() {
    // Footnotes extension (marked-footnote)
    try {
      const markedFootnote = require('marked-footnote');
      this.marked.use(markedFootnote());
    } catch { /* marked-footnote not available, skip */ }
  }

  _setupRenderer() {
    const self = this;
    const s = this.theme.elements;

    this.marked.use({
      renderer: {
        heading({ tokens, depth }) {
          const text = this.parser.parseInline(tokens);
          const tag = `h${depth}`;
          const style = s[tag] || s.h3;
          // Collect headings for TOC
          const plainText = text.replace(/<[^>]+>/g, '');
          const id = `heading-${self.headings.length}`;
          self.headings.push({ depth, text: plainText, id });

          if (depth === 1 && s.h1_wrapper) {
            return `<section style="${s.h1_wrapper}"><h1 id="${id}" style="${style}">${text}</h1></section>\n`;
          }
          if (depth === 2 && s.h2_badge) {
            self.h2Count++;
            const num = String(self.h2Count).padStart(2, '0');
            return `<h2 id="${id}" style="${style}"><span style="${s.h2_badge}">${num}</span>${text}</h2>\n`;
          }
          if (depth === 3 && s.h3_icon) {
            const icon = s.h3_icon_text || '◆';
            return `<h3 id="${id}" style="${style}"><span style="${s.h3_icon}">${icon}</span>${text}</h3>\n`;
          }
          return `<${tag} id="${id}" style="${style}">${text}</${tag}>\n`;
        },

        paragraph({ tokens }) {
          const text = this.parser.parseInline(tokens);
          if (self._inBlockquote) {
            return `<p style="${s.p_blockquote || 'color:inherit;line-height:1.8;margin:8px 0;'}">${text}</p>\n`;
          }
          if (self.isFirstParagraph && s.p_first) {
            self.isFirstParagraph = false;
            return `<p style="${s.p_first}">${text}</p>\n`;
          }
          return `<p style="${s.p}">${text}</p>\n`;
        },

        blockquote({ tokens }) {
          self._inBlockquote = true;
          const body = this.parser.parse(tokens);
          self._inBlockquote = false;

          // GitHub-style alerts: > [!NOTE], > [!WARNING], etc.
          const alertMatch = body.match(/\[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\]/);
          if (alertMatch) {
            const alertType = alertMatch[1];
            const alertBody = body.replace(/\[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\](<br>)?/g, '').trim();
            return self._renderAlert(alertType, alertBody);
          }

          const icon = s.blockquote_icon ? `<span style="${s.blockquote_icon}">\u201C</span>` : '';
          return `<blockquote style="${s.blockquote}">${icon}${body}</blockquote>\n`;
        },

        list(token) {
          const tag = token.ordered ? 'ol' : 'ul';
          const style = token.ordered ? s.ol : s.ul;
          let body = '';
          for (const item of token.items) {
            body += this.listitem(item);
          }
          return `<${tag} style="${style}">${body}</${tag}>\n`;
        },

        listitem(item) {
          let text = this.parser.parse(item.tokens);
          text = text.replace(/<\/?p[^>]*>/g, '');
          if (item.checked !== null && item.checked !== undefined) {
            const isChecked = item.checked === true;
            const cbStyle = isChecked
              ? (s.checkbox_checked || 'color:#10b981;margin-right:4px;')
              : (s.checkbox || 'color:#999;margin-right:4px;');
            const icon = isChecked ? '☑ ' : '☐ ';
            return `<li style="${s.li};list-style:none;"><span style="${cbStyle}">${icon}</span>${text.trim()}</li>\n`;
          }
          if (s.ul_item_icon) {
            const iconText = s.ul_item_icon_text || '•';
            return `<li style="${s.li};list-style:none;"><span style="${s.ul_item_icon}">${iconText}</span>${text.trim()}</li>\n`;
          }
          return `<li style="${s.li}">${text.trim()}</li>\n`;
        },

        strong({ tokens }) {
          const text = this.parser.parseInline(tokens);
          if (s.strong_bg) {
            return `<strong style="${s.strong};${s.strong_bg}">${text}</strong>`;
          }
          return `<strong style="${s.strong}">${text}</strong>`;
        },

        em({ tokens }) {
          const text = this.parser.parseInline(tokens);
          return `<em style="${s.em}">${text}</em>`;
        },

        del({ tokens }) {
          const text = this.parser.parseInline(tokens);
          const style = s.del || 'text-decoration:line-through;color:#999;';
          return `<del style="${style}">${text}</del>`;
        },

        codespan({ text }) {
          const escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<code style="${s.code_inline}">${escaped}</code>`;
        },

        code({ text, lang }) {
          // Mermaid diagram support
          if (lang === 'mermaid' && self.enableMermaid) {
            return `<div class="mermaid">${text}</div>\n`;
          }
          let highlighted;
          if (lang && hljs.getLanguage(lang)) {
            highlighted = hljs.highlight(text, { language: lang }).value;
          } else {
            highlighted = hljs.highlightAuto(text).value;
          }
          highlighted = self.inlineHljsStyles(highlighted);
          return `<pre style="${s.code_block}"><code>${highlighted}</code></pre>\n`;
        },

        link({ href, tokens }) {
          const text = this.parser.parseInline(tokens);
          self.footnoteIndex++;
          self.footnotes.push({ index: self.footnoteIndex, text, href });
          const refStyle = s.footnote_ref;
          return `${text}<sup style="${refStyle}">[${self.footnoteIndex}]</sup>`;
        },

        image({ href, title, text }) {
          const alt = text || title || '';
          return `<img src="${href}" alt="${alt}" style="${s.img}" />\n`;
        },

        table({ header, rows }) {
          let out = `<table style="${s.table}"><thead><tr>`;
          for (const cell of header) {
            const content = this.parser.parseInline(cell.tokens);
            out += `<th style="${s.th}">${content}</th>`;
          }
          out += '</tr></thead><tbody>';
          for (let ri = 0; ri < rows.length; ri++) {
            const row = rows[ri];
            out += '<tr>';
            for (const cell of row) {
              const content = this.parser.parseInline(cell.tokens);
              const tdStyle = (ri % 2 === 1 && s.td_even) ? s.td_even : s.td;
              out += `<td style="${tdStyle}">${content}</td>`;
            }
            out += '</tr>';
          }
          out += '</tbody></table>\n';
          return out;
        },

        hr() {
          if (s.hr_content) {
            return `<p style="${s.hr}">${s.hr_content}</p>\n`;
          }
          return `<hr style="${s.hr}" />\n`;
        },
      },
    });
  }

  _renderFootnotes() {
    if (this.footnotes.length === 0) return '';
    const s = this.theme.elements;
    let html = `<section style="${s.footnote_section}">`;
    const fnTitleStyle = s.footnote_title || 'font-weight:bold;margin-bottom:8px;';
    html += `<p style="${fnTitleStyle}">参考链接</p>`;
    for (const fn of this.footnotes) {
      html += `<p style="${s.footnote_item}">[${fn.index}] ${fn.text}: ${fn.href}</p>\n`;
    }
    html += '</section>';
    return html;
  }

  _renderAlert(type, body) {
    const configs = {
      NOTE: { icon: '\u2139\ufe0f', label: 'Note', bg: '#f0f7ff', border: '#4a90d9', color: '#1a56db' },
      TIP: { icon: '\ud83d\udca1', label: 'Tip', bg: '#f0fdf4', border: '#22c55e', color: '#166534' },
      IMPORTANT: { icon: '\u2757', label: 'Important', bg: '#faf5ff', border: '#a855f7', color: '#7c3aed' },
      WARNING: { icon: '\u26a0\ufe0f', label: 'Warning', bg: '#fffbeb', border: '#f59e0b', color: '#b45309' },
      CAUTION: { icon: '\ud83d\udd34', label: 'Caution', bg: '#fef2f2', border: '#ef4444', color: '#dc2626' },
    };
    const c = configs[type] || configs.NOTE;
    return `<div style="background:${c.bg};border-left:4px solid ${c.border};padding:12px 16px;margin:16px 0;border-radius:4px;">` +
      `<p style="margin:0 0 4px 0;font-weight:bold;color:${c.color};">${c.icon} ${c.label}</p>` +
      `<div style="color:#333;line-height:1.6;">${body}</div>` +
      `</div>\n`;
  }

  _renderToc() {
    if (this.headings.length === 0) return '';
    let html = '<nav style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:6px;padding:16px 20px;margin:0 0 24px 0;">';
    html += '<p style="font-weight:bold;margin:0 0 8px 0;color:#333;">目录</p>';
    for (const h of this.headings) {
      const indent = (h.depth - 1) * 16;
      html += `<p style="margin:4px 0;padding-left:${indent}px;line-height:1.6;"><a href="#${h.id}" style="color:#4a90d9;text-decoration:none;">${h.text}</a></p>`;
    }
    html += '</nav>';
    return html;
  }

  _processMath(text) {
    // Block math: $$...$$
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
      } catch { return `<pre>${math}</pre>`; }
    });
    // Inline math: $...$  (avoid matching $$)
    text = text.replace(/(?<!\$)\$(?!\$)([^\n$]+?)\$(?!\$)/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      } catch { return `<code>${math}</code>`; }
    });
    return text;
  }

  _getExternalResources() {
    const resources = [];
    if (this.enableMath) {
      resources.push('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">');
    }
    if (this.enableMermaid) {
      resources.push('<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>');
      resources.push('<script>mermaid.initialize({startOnLoad:true});</script>');
    }
    return resources;
  }

  _addImportant(styleStr) {
    return styleStr.replace(/;/g, ' !important;').replace(/ !important;$/, ' !important;');
  }

  convert(markdown) {
    // Reset state for each conversion
    this.footnotes = [];
    this.footnoteIndex = 0;
    this.h2Count = 0;
    this.isFirstParagraph = true;
    this._inBlockquote = false;
    this.headings = [];

    // Normalize text if enabled
    if (this.normalizeText) {
      const { normalize } = require('./normalizer');
      markdown = normalize(markdown);
    }

    // Pre-process math (before marked parsing to protect math from markdown)
    if (this.enableMath) {
      markdown = this._processMath(markdown);
    }

    // Add !important to all theme styles if enabled
    if (this.important) {
      const s = this.theme.elements;
      for (const key of Object.keys(s)) {
        if (typeof s[key] === 'string' && s[key].includes(':')) {
          s[key] = this._addImportant(s[key]);
        }
      }
    }

    const body = this.marked.parse(markdown);
    const toc = this.enableToc ? this._renderToc() : '';
    const footnotes = this._renderFootnotes();
    const b = this.theme.base;
    // Use single quotes for font-family to avoid breaking style="" attribute
    const fontFamily = b.fontFamily.replace(/"/g, "'");

    const sectionBg = this.theme.elements.section_bg ? `;${this.theme.elements.section_bg}` : '';
    const externalResources = this._getExternalResources().join('\n');
    const html = `${externalResources}<section style="color:${b.color};font-size:${b.fontSize};line-height:${b.lineHeight};font-family:${fontFamily};padding:10px 0;text-align:justify${sectionBg}">${toc}${body}${footnotes}</section>`;

    // juice inlines any remaining CSS (safety net)
    return juice(html);
  }
}

module.exports = { WxConverter };