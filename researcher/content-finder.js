/**
 * 同类内容搜索模块 v2.4 — 多平台社交媒体搜索 + 质量评估 + NewsCrawler 全文提取
 * 搜索源: 搜狗微信、DuckDuckGo通用(多平台自动识别)、DDG site:知乎/36氪/Reddit
 * 质量评估: 0-100 分制，>= 50 入选，按分数降序
 * v2.4: 去百度/微博源，新增 NewsCrawler 全文提取，改进去重逻辑
 */
const { ProxyAgent } = require('undici');

const PROXY_URL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
  || process.env.https_proxy || process.env.http_proxy;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// 知名媒体公众号列表（用于来源权威度评分）
const KNOWN_MEDIA = ['36氪', '虎嗅', '极客公园', '少数派', '爱范儿', '机器之心',
  '量子位', 'InfoQ', 'CSDN', '钛媒体', '品玩', '雷锋网', '新智元', 'AI前线'];

/** 通用 fetch 封装，自动加代理 + 超时 */
async function safeFetch(url, opts = {}, timeout = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const fetchOpts = {
    signal: ctrl.signal,
    headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9', ...opts.headers },
    redirect: 'follow',
    ...opts,
  };
  if (PROXY_URL) {
    fetchOpts.dispatcher = new ProxyAgent(PROXY_URL);
  }
  try {
    const resp = await fetch(url, fetchOpts);
    clearTimeout(timer);
    return await resp.text();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── 质量评估 ───────────────────────────────────────────

/** 计算质量分数 0-100 */
function calcQualityScore(item, topic) {
  let score = 0;
  // 来源权威度 (30分)
  score += calcAuthorityScore(item);
  // 互动信号 (25分)
  score += calcEngagementScore(item);
  // 相关度 (25分)
  score += calcRelevanceScore(item, topic);
  // 时效性 (10分)
  score += calcFreshnessScore(item);
  // 内容深度 (10分)
  score += calcDepthScore(item);
  return Math.min(100, Math.round(score));
}

function calcAuthorityScore(item) {
  if (KNOWN_MEDIA.some(m => (item.source || '').includes(m))) return 28;
  if (item.platform === 'zhihu' && (item.upvotes || 0) > 100) return 23;
  if (item.platform === 'reddit' && (item.upvotes || 0) > 50) return 22;
  if (item.platform === '36kr') return 20;
  if (item.platform === 'bbc' || item.platform === 'cnn') return 22;
  if (item.platform === 'toutiao') return 18;
  if (item.platform === 'wechat') return 18;
  if (item.platform === 'netease' || item.platform === 'sohu') return 16;
  if (item.platform === 'tencent') return 16;
  if (item.platform === 'twitter') return 15;
  if (item.platform === 'weibo') return 15;
  if (item.platform === 'baidu') return 12;
  return 8;
}

function calcEngagementScore(item) {
  const eng = (item.upvotes || 0) + (item.comments || 0) * 2 + (item.shares || 0) * 3;
  if (eng > 500) return 25;
  if (eng > 200) return 20;
  if (eng > 50) return 15;
  if (eng > 10) return 10;
  // 搜索排名靠前也算互动信号
  if ((item.rank || 99) <= 3) return 12;
  if ((item.rank || 99) <= 5) return 8;
  return 5;
}

function calcRelevanceScore(item, topic) {
  if (!topic) return 12;
  const title = (item.title || '').toLowerCase();
  const keywords = topic.toLowerCase().split(/[\s,，、]+/).filter(k => k.length > 1);
  if (keywords.length === 0) return 12;
  const matched = keywords.filter(k => title.includes(k)).length;
  const ratio = matched / keywords.length;
  return Math.round(ratio * 25);
}

function calcFreshnessScore(item) {
  if (!item.date) return 5; // 无日期给中间分
  const days = (Date.now() - new Date(item.date).getTime()) / 86400000;
  if (days < 7) return 10;
  if (days < 30) return 8;
  if (days < 90) return 5;
  return 2;
}

function calcDepthScore(item) {
  const len = (item.summary || '').length;
  if (len > 120) return 10;
  if (len > 60) return 7;
  if (len > 20) return 4;
  return 2;
}

// ─── 搜索源: 搜狗微信 ──────────────────────────────────────

async function searchWechatArticles(keyword, limit = 8) {
  const url = `https://weixin.sogou.com/weixin?type=2&s_from=input&query=${encodeURIComponent(keyword)}&ie=utf8`;
  try {
    const html = await safeFetch(url);
    return parseSogouResults(html, limit);
  } catch (err) {
    console.error(`[搜狗微信] 搜索失败: ${err.message}`);
    return [];
  }
}

function parseSogouResults(html, limit) {
  const results = [];
  const blocks = html.split(/sogou_vr_11002601_box_\d+/);
  for (let i = 1; i < blocks.length && results.length < limit; i++) {
    const block = blocks[i];
    const titleMatch = block.match(/<h3>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    const accountMatch = block.match(/<span class="all-time-y2">([\s\S]*?)<\/span>/);
    const summaryMatch = block.match(/<p class="txt-info"[^>]*>([\s\S]*?)<\/p>/);
    if (titleMatch) {
      const title = titleMatch[2].replace(/<[^>]+>/g, '').replace(/<!--[^>]*-->/g, '').trim();
      const account = accountMatch ? accountMatch[1].replace(/<[^>]+>/g, '').trim() : '微信公众号';
      const summary = summaryMatch ? summaryMatch[1].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').trim() : '';
      if (title) {
        results.push({
          title, url: `https://weixin.sogou.com${titleMatch[1].replace(/&amp;/g, '&')}`,
          source: account, summary: summary.slice(0, 150),
          platform: 'wechat', rank: results.length + 1,
        });
      }
    }
  }
  return results;
}

// ─── 搜索源: 知乎 ──────────────────────────────────────────

async function searchZhihu(keyword, limit = 5) {
  return ddgSiteSearch('zhihu.com', keyword, limit, 'zhihu', '知乎');
}

/** DuckDuckGo HTML site: 搜索（通过代理，支持 site: 操作符）
 *  DDG HTML 版 site: 不稳定，返回 0 结果时用 "keyword sourceName" fallback */
async function ddgSiteSearch(site, keyword, limit, platform, sourceName) {
  const query = `site:${site} ${keyword}`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const html = await safeFetch(url, {}, 12000);
    const results = parseDDGResults(html, limit, platform, sourceName);
    if (results.length > 0) return results;
    // fallback: 不用 site:，用平台名作关键词，再按 URL 过滤
    const fbQuery = `${keyword} ${sourceName}`;
    const fbUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(fbQuery)}`;
    const fbHtml = await safeFetch(fbUrl, {}, 12000);
    const fbAll = parseDDGResults(fbHtml, limit * 3, null, sourceName);
    const siteRe = new RegExp(site.replace('.', '\\.'), 'i');
    const filtered = fbAll.filter(r => siteRe.test(r.url)).slice(0, limit);
    filtered.forEach(r => { r.platform = platform; r.source = sourceName; });
    return filtered;
  } catch (err) {
    console.error(`[${sourceName}] 搜索失败: ${err.message}`);
    return [];
  }
}

function parseDDGResults(html, limit, platform, sourceName) {
  const results = [];
  const blocks = html.split(/class="result /);
  for (let i = 1; i < blocks.length && results.length < limit; i++) {
    const block = blocks[i];
    const m = block.match(/class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    const s = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    if (m) {
      let realUrl = m[1];
      const uddg = realUrl.match(/uddg=([^&]*)/);
      if (uddg) realUrl = decodeURIComponent(uddg[1]);
      const title = m[2].replace(/<[^>]+>/g, '').trim();
      const summary = s ? s[1].replace(/<[^>]+>/g, '').trim() : '';
      if (title && title.length > 4) {
        results.push({
          title, url: realUrl, source: sourceName,
          summary: summary.slice(0, 150), platform, rank: results.length + 1,
        });
      }
    }
  }
  return results;
}

// ─── 搜索源: 36氪 ──────────────────────────────────────────

async function search36kr(keyword, limit = 5) {
  return ddgSiteSearch('36kr.com', keyword, limit, '36kr', '36氪');
}

// ─── 搜索源: Reddit (百度间接 + JSON API fallback) ─────────

async function searchReddit(keyword, limit = 5) {
  // Bing site:reddit.com 间接搜索
  const results = await ddgSiteSearch('reddit.com', keyword, limit, 'reddit', 'Reddit');
  if (results.length > 0) return results;
  // fallback: 直接 JSON API
  try {
    const jsonUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=relevance&limit=${limit}`;
    const text = await safeFetch(jsonUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': UA },
    }, 12000);
    if (text.trimStart().startsWith('<')) throw new Error('Reddit returned HTML instead of JSON');
    const data = JSON.parse(text);
    return (data.data?.children || []).slice(0, limit).map((c, i) => {
      const p = c.data;
      return {
        title: p.title || '', url: `https://reddit.com${p.permalink}`,
        source: `r/${p.subreddit}`, summary: (p.selftext || '').slice(0, 150),
        platform: 'reddit', rank: i + 1,
        upvotes: p.ups || 0, comments: p.num_comments || 0,
      };
    });
  } catch (err) {
    console.error(`[Reddit] 搜索失败: ${err.message}`);
    return [];
  }
}

// ─── 搜索源: DuckDuckGo 通用搜索（多平台自动识别）──────────────

/** URL → 平台识别映射 */
const PLATFORM_PATTERNS = [
  { pattern: /mp\.weixin\.qq\.com/, platform: 'wechat', source: '微信公众号' },
  { pattern: /zhihu\.com/, platform: 'zhihu', source: '知乎' },
  { pattern: /weibo\.com/, platform: 'weibo', source: '微博' },
  { pattern: /36kr\.com/, platform: '36kr', source: '36氪' },
  { pattern: /reddit\.com/, platform: 'reddit', source: 'Reddit' },
  { pattern: /toutiao\.com|toutiaocdn/, platform: 'toutiao', source: '今日头条' },
  { pattern: /163\.com/, platform: 'netease', source: '网易' },
  { pattern: /sohu\.com/, platform: 'sohu', source: '搜狐' },
  { pattern: /qq\.com\/om/, platform: 'tencent', source: '腾讯新闻' },
  { pattern: /twitter\.com|x\.com/, platform: 'twitter', source: 'Twitter/X' },
  { pattern: /bbc\.com|bbc\.co\.uk/, platform: 'bbc', source: 'BBC' },
  { pattern: /cnn\.com/, platform: 'cnn', source: 'CNN' },
];

function detectPlatform(url) {
  for (const { pattern, platform, source } of PLATFORM_PATTERNS) {
    if (pattern.test(url)) return { platform, source };
  }
  return { platform: 'web', source: '网页' };
}

/** DuckDuckGo HTML 通用搜索 — 不限 site，自动从 URL 识别平台 */
async function searchDDGGeneral(keyword, limit = 8) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword)}`;
  try {
    const html = await safeFetch(url, {}, 12000);
    const results = [];
    const blocks = html.split(/class="result /);
    for (let i = 1; i < blocks.length && results.length < limit; i++) {
      const block = blocks[i];
      const m = block.match(/class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
      const s = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      if (m) {
        // DDG wraps URLs: //duckduckgo.com/l/?uddg=<encoded_url>
        let realUrl = m[1];
        const uddg = realUrl.match(/uddg=([^&]*)/);
        if (uddg) realUrl = decodeURIComponent(uddg[1]);
        const title = m[2].replace(/<[^>]+>/g, '').trim();
        const summary = s ? s[1].replace(/<[^>]+>/g, '').trim() : '';
        if (title && title.length > 4) {
          const { platform, source } = detectPlatform(realUrl);
          results.push({
            title, url: realUrl, source,
            summary: summary.slice(0, 150), platform, rank: results.length + 1,
          });
        }
      }
    }
    return results;
  } catch (err) {
    console.error(`[DDG通用] 搜索失败: ${err.message}`);
    return [];
  }
}

// ─── NewsCrawler 全文提取（可选）─────────────────────────────

async function extractFullContent(results, topN = 5) {
  const API = 'http://localhost:8000/api/extract';
  const targets = results.slice(0, topN);
  console.error(`正在提取 ${targets.length} 篇全文 (NewsCrawler)...`);

  const enriched = await Promise.allSettled(
    targets.map(async (item) => {
      try {
        const resp = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.url, output_format: 'json' }),
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (json.status !== 'success') throw new Error(json.message || 'extract failed');
        const texts = (json.data?.texts || []).join('\n');
        return { ...item, fullContent: texts, extractedTitle: json.data?.title || item.title };
      } catch (err) {
        console.error(`  [提取失败] ${item.title}: ${err.message}`);
        return item;
      }
    })
  );

  const extracted = enriched.filter(r => r.status === 'fulfilled').map(r => r.value);
  const withContent = extracted.filter(r => r.fullContent);
  console.error(`成功提取 ${withContent.length}/${targets.length} 篇全文`);
  return [...extracted, ...results.slice(topN)];
}

// ─── 主搜索编排 ─────────────────────────────────────────────

/**
 * 多平台搜索同类高质量内容 + 质量评估
 * 策略: 5 源并发搜索 → 去重 → 质量评分 → 过滤(>=50) → 降序排列
 * 搜索源: 搜狗微信 + DDG通用 + DDG site:知乎/36氪/Reddit
 */
async function findSimilarContent(topic, niche, { extractContent = false } = {}) {
  const queries = [topic];
  if (niche) {
    niche.split(',').forEach(k => {
      const kw = k.trim();
      if (kw && !topic.includes(kw)) queries.push(`${topic} ${kw}`);
    });
  }

  console.error(`正在多平台搜索同类内容 (${queries.length} 组关键词)...`);
  const allResults = [];

  for (const q of queries.slice(0, 2)) {
    const results = await Promise.all([
      searchWechatArticles(q, 6),
      searchDDGGeneral(q, 8),
      searchZhihu(q, 4),
      search36kr(q, 3),
      // searchReddit(q, 3), // 已禁用: DDG不再索引Reddit + Reddit JSON API对非美国IP返回HTML
    ]);
    results.forEach(r => allResults.push(...r));
  }

  // 去重（按标题前30字符 + URL去参数）
  const seen = new Set();
  const unique = allResults.filter(r => {
    const titleKey = r.title.replace(/\s+/g, '').slice(0, 30);
    const urlKey = r.url.replace(/[?#].*$/, '');
    const key = `${titleKey}|${urlKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 质量评分 + 过滤 + 排序
  const scored = unique.map(r => ({ ...r, qualityScore: calcQualityScore(r, topic) }));
  const filtered = scored.filter(r => r.qualityScore >= 50);
  filtered.sort((a, b) => b.qualityScore - a.qualityScore);

  const platforms = [...new Set(filtered.map(r => r.platform))];
  console.error(`找到 ${filtered.length} 篇高质量参考 (来自 ${platforms.join('/')})`);

  if (extractContent && filtered.length > 0) {
    return extractFullContent(filtered.slice(0, 15));
  }
  return filtered.slice(0, 15);
}

module.exports = {
  findSimilarContent, calcQualityScore, extractFullContent,
  searchWechatArticles, searchDDGGeneral,
  searchZhihu, search36kr, searchReddit,
  detectPlatform,
};
