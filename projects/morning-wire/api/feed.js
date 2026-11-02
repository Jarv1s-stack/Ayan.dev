const FEED_URL = 'https://hnrss.org/frontpage';

function decode(value = '') {
  return value
    .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ').trim();
}

function tag(block, name) {
  const result = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return result ? decode(result[1]) : '';
}

module.exports = async function feed(_request, response) {
  response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  try {
    const result = await fetch(FEED_URL, {
      headers: { 'user-agent': 'MorningWire-portfolio-demo/1.0' },
      signal: AbortSignal.timeout(12_000)
    });
    if (!result.ok) return response.status(502).json({ error: 'The public RSS source is temporarily unavailable.' });
    const xml = await result.text();
    const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 10).map(([, block]) => ({
      title: tag(block, 'title'),
      link: tag(block, 'link'),
      date: tag(block, 'pubDate')
    })).filter(item => {
      try { return item.title && ['http:', 'https:'].includes(new URL(item.link).protocol); }
      catch { return false; }
    });
    return response.status(200).json({ items, fetchedAt: new Date().toISOString() });
  } catch {
    return response.status(502).json({ error: 'The public RSS source did not respond in time.' });
  }
};
