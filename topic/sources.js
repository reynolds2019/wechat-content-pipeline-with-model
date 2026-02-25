/**
 * 热点数据源聚合模块
 * 支持微博、知乎、百度、36氪热搜
 */

const SOURCES = {
  weibo: {
    name: '微博热搜',
    url: 'https://weibo.com/ajax/statuses/hot_band',
    headers: { Referer: 'https://weibo.com' },
    parse(data) {
      const list = data?.data?.band_list || [];
      return list.slice(0, 30).map(item => ({
        title: item.word || item.note,
        url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word || '')}`,
        heat: item.raw_hot || item.num || 0,
        source: 'weibo',
      }));
    },
  },
  zhihu: {
    name: '知乎热榜',
    url: 'https://api.zhihu.com/topstory/hot-list?limit=30',
    headers: { 'x-api-version': '3.0.91' },
    parse(data) {
      const list = data?.data || [];
      return list.slice(0, 30).map(item => ({
        title: item.target?.title || '',
        url: `https://www.zhihu.com/question/${item.target?.id || ''}`,
        heat: item.detail_text ? parseInt(item.detail_text) || 0 : 0,
        source: 'zhihu',
      }));
    },
  },
  baidu: {
    name: '百度热搜',
    url: 'https://top.baidu.com/board?tab=realtime',
    parse(html) {
      // Baidu returns HTML, extract from embedded JSON
      const match = typeof html === 'string'
        ? html.match(/<!--s-data:(.*?)-->/)
        : null;
      if (!match) return [];
      try {
        const json = JSON.parse(match[1]);
        const list = json?.data?.cards?.[0]?.content || [];
        return list.slice(0, 30).map(item => ({
          title: item.word || item.query,
          url: item.url || `https://www.baidu.com/s?wd=${encodeURIComponent(item.word || '')}`,
          heat: parseInt(item.hotScore) || 0,
          source: 'baidu',
        }));
      } catch { return []; }
    },
  },
  '36kr': {
    name: '36氪热榜',
    url: 'https://36kr.com/hot-list/catalog',
    parse(data) {
      const list = data?.data?.hotRankList || data?.data?.itemList || [];
      return list.slice(0, 30).map(item => ({
        title: item.templateMaterial?.widgetTitle || item.title || '',
        url: `https://36kr.com/p/${item.itemId || item.id || ''}`,
        heat: item.templateMaterial?.statRead || 0,
        source: '36kr',
      }));
    },
  },
};

async function fetchSource(key) {
  const src = SOURCES[key];
  if (!src) return [];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const resp = await fetch(src.url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        ...(src.headers || {}),
      },
    });
    const isJson = (resp.headers.get('content-type') || '').includes('json');
    const data = isJson ? await resp.json() : await resp.text();
    return src.parse(data);
  } catch (err) {
    console.warn(`[${src.name}] 获取失败: ${err.message}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTrending(sourceNames) {
  const keys = sourceNames || Object.keys(SOURCES);
  const results = await Promise.all(keys.map(k => fetchSource(k)));
  return results.flat();
}

module.exports = { fetchTrending, SOURCES };
