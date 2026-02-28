/**
 * 中文文本规范化模块
 * - 中文语境下英文标点→中文标点
 * - 中英文/中文数字间加空格
 * - 保护代码块、行内代码、URL、HTML标签不被修改
 * - 全角引号转换
 * - 标题层级检查
 * - 空行清理
 * - 列表格式统一
 */

function normalize(markdown) {
  const placeholders = [];
  let idx = 0;

  function protect(text, regex) {
    return text.replace(regex, (match) => {
      const ph = `\x00PH${idx++}\x00`;
      placeholders.push({ ph, match });
      return ph;
    });
  }

  // 保护区域：代码块 → 行内代码 → Markdown链接 → URL → HTML标签
  let text = protect(markdown, /```[\s\S]*?```/g);
  text = protect(text, /`[^`]+`/g);
  text = protect(text, /\[[^\]]*\]\([^)]*\)/g);
  text = protect(text, /https?:\/\/[^\s)>\]]+/g);
  text = protect(text, /<[^>]+>/g);

  // 中文语境下英文标点→中文标点
  text = text.replace(/([\u4e00-\u9fff])\./g, '$1。');
  text = text.replace(/([\u4e00-\u9fff]),/g, '$1，');
  text = text.replace(/([\u4e00-\u9fff])!/g, '$1！');
  text = text.replace(/([\u4e00-\u9fff])\?/g, '$1？');
  text = text.replace(/([\u4e00-\u9fff]):/g, '$1：');
  text = text.replace(/([\u4e00-\u9fff]);/g, '$1；');
  text = text.replace(/([\u4e00-\u9fff])\(/g, '$1（');
  text = text.replace(/\)([\u4e00-\u9fff])/g, '）$1');

  // 中英文间加空格
  text = text.replace(/([\u4e00-\u9fff])([A-Za-z])/g, '$1 $2');
  text = text.replace(/([A-Za-z])([\u4e00-\u9fff])/g, '$1 $2');

  // 中文与数字间加空格
  text = text.replace(/([\u4e00-\u9fff])(\d)/g, '$1 $2');
  text = text.replace(/(\d)([\u4e00-\u9fff])/g, '$1 $2');

  // 还原保护区域（逆序还原）
  for (let i = placeholders.length - 1; i >= 0; i--) {
    text = text.replace(placeholders[i].ph, placeholders[i].match);
  }

  return text;
}

/**
 * 全角引号转换: ASCII " ' → "" ''（中文智能引号）
 * 使用配对逻辑：奇数次出现为左引号，偶数次为右引号
 */
function fullWidthQuotes(text) {
  const placeholders = [];
  let idx = 0;
  function protect(t, regex) {
    return t.replace(regex, (match) => {
      const ph = `\x00FWQ${idx++}\x00`;
      placeholders.push({ ph, match });
      return ph;
    });
  }

  // 保护代码块、行内代码、链接、URL
  let result = protect(text, /```[\s\S]*?```/g);
  result = protect(result, /`[^`]+`/g);
  result = protect(result, /\[[^\]]*\]\([^)]*\)/g);
  result = protect(result, /https?:\/\/[^\s)>\]]+/g);

  // 转换双引号: " → \u201c / \u201d 交替
  let dblCount = 0;
  result = result.replace(/"/g, () => (dblCount++ % 2 === 0 ? '\u201c' : '\u201d'));

  // 转换单引号: 仅转换中文附近的单引号
  let sglCount = 0;
  result = result.replace(/([\u4e00-\u9fff\u201c\u201d])'/g, (_, before) =>
    before + (sglCount++ % 2 === 0 ? '\u2018' : '\u2019')
  );
  result = result.replace(/'([\u4e00-\u9fff])/g, (_, after) =>
    (sglCount++ % 2 === 0 ? '\u2018' : '\u2019') + after
  );

  // 还原保护区域
  for (let i = placeholders.length - 1; i >= 0; i--) {
    result = result.replace(placeholders[i].ph, placeholders[i].match);
  }
  return result;
}

/**
 * 检查标题层级是否跳级（如 h1→h3 缺少 h2）
 * 返回 { warnings: string[], text: string }
 */
function checkHeadingLevels(text) {
  const lines = text.split('\n');
  const warnings = [];
  let lastLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s/);
    if (match) {
      const level = match[1].length;
      if (lastLevel > 0 && level > lastLevel + 1) {
        warnings.push(`第 ${i + 1} 行: 标题层级跳跃 h${lastLevel} → h${level}（缺少 h${lastLevel + 1}）`);
      }
      lastLevel = level;
    }
  }
  return { warnings, text };
}

/**
 * 清理多余空行：3 行及以上连续空行缩减为 2 行
 */
function cleanBlankLines(text) {
  return text.replace(/\n{3,}/g, '\n\n');
}

/**
 * 统一列表格式：将 * 和 + 无序列表标记统一为 -
 * 保护代码块内容不被修改
 */
function unifyListFormat(text) {
  const lines = text.split('\n');
  let inCodeBlock = false;
  const result = [];

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }
    if (inCodeBlock) {
      result.push(line);
      continue;
    }
    // 将 * 或 + 开头的列表项转为 -
    result.push(line.replace(/^(\s*)[*+]\s/, '$1- '));
  }
  return result.join('\n');
}

/**
 * 全量规范化：依次应用所有规范化功能
 * 返回 { text: string, warnings: string[] }
 */
function normalizeFull(text) {
  let result = text;
  result = cleanBlankLines(result);
  result = unifyListFormat(result);
  result = fullWidthQuotes(result);
  result = normalize(result);
  const headingCheck = checkHeadingLevels(result);
  return { text: headingCheck.text, warnings: headingCheck.warnings };
}

module.exports = {
  normalize,
  fullWidthQuotes,
  checkHeadingLevels,
  cleanBlankLines,
  unifyListFormat,
  normalizeFull,
};
