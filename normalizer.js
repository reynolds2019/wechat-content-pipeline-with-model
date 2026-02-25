/**
 * 中文文本规范化模块
 * - 中文语境下英文标点→中文标点
 * - 中英文/中文数字间加空格
 * - 保护代码块、行内代码、URL、HTML标签不被修改
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

module.exports = { normalize };
