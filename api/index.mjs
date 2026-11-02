const requestsByAddress = globalThis.__ayanApiRequests || (globalThis.__ayanApiRequests = new Map());

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

function allowRequest(address, limit, windowMs, now = Date.now()) {
  const key = `${address}:${limit}`;
  const current = requestsByAddress.get(key);
  if (!current || now >= current.resetAt) {
    requestsByAddress.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count++;
  return true;
}

function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; }
  catch { return false; }
}

function requestAddress(request) {
  return (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
}

async function readJson(request, maxLength) {
  try {
    const raw = await request.text();
    if (raw.length > maxLength) return { error: 'request_too_large', status: 413 };
    return { value: JSON.parse(raw) };
  } catch {
    return { error: 'invalid_json', status: 400 };
  }
}

async function handleChat(request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) return json({ error: 'assistant_unavailable' }, 503);

  const parsed = await readJson(request, 24_000);
  if (parsed.error) return json({ error: parsed.error }, parsed.status);
  const payload = parsed.value;
  if (!payload || typeof payload !== 'object') return json({ error: 'invalid_messages' }, 400);
  if (!Array.isArray(payload.messages) || payload.messages.length > 18) return json({ error: 'invalid_messages' }, 400);

  const messages = payload.messages.slice(-18).filter(message =>
    message && ['system', 'user', 'assistant'].includes(message.role) &&
    typeof message.content === 'string' && message.content.length <= (message.role === 'system' ? 12_000 : 4_000)
  );
  if (!messages.length || !messages.some(message => message.role === 'user')) return json({ error: 'empty_messages' }, 400);

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'http-referer': new URL(request.url).origin,
        'x-title': 'Ayan.dev AI Assistant'
      },
      body: JSON.stringify({ model, messages, temperature: 0.65, max_tokens: 700 }),
      signal: AbortSignal.timeout(28_000)
    });
    if (!upstream.ok) return json({ error: 'assistant_provider_error' }, 502);
    const result = await upstream.json();
    const reply = result.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) return json({ error: 'assistant_empty_reply' }, 502);
    return json({ reply: reply.trim() });
  } catch {
    return json({ error: 'assistant_request_failed' }, 502);
  }
}

function clean(value, limit) {
  return typeof value === 'string' ? value.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, limit) : '';
}

async function handleContact(request) {
  const parsed = await readJson(request, 12_000);
  if (parsed.error) return json({ error: parsed.error }, parsed.status);
  const payload = parsed.value;
  if (!payload || typeof payload !== 'object') return json({ error: 'invalid_form' }, 400);
  const name = clean(payload.name, 80);
  const phone = clean(payload.phone, 50);
  const email = clean(payload.email, 160);
  const telegram = clean(payload.telegram, 80) || 'Not provided';
  const subject = clean(payload.subject, 120);
  const message = clean(payload.message, 2_000);
  if (!name || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !subject || !message) {
    return json({ error: 'required_fields_missing' }, 400);
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return json({ error: 'contact_unavailable' }, 503);

  const text = [
    'New portfolio inquiry',
    '',
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    `Telegram: ${telegram}`,
    `Subject: ${subject}`,
    '',
    message
  ].join('\n');

  try {
    const upstream = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(12_000)
    });
    const result = await upstream.json();
    if (!upstream.ok || !result.ok) return json({ error: 'contact_delivery_failed' }, 502);
    return json({ sent: true });
  } catch {
    return json({ error: 'contact_delivery_failed' }, 502);
  }
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    if (!isSameOrigin(request)) return json({ error: 'origin_not_allowed' }, 403);
    const route = new URL(request.url).searchParams.get('route');
    const address = requestAddress(request);

    if (route === 'chat') {
      if (!allowRequest(address, 8, 60_000)) return json({ error: 'rate_limit' }, 429);
      return handleChat(request);
    }
    if (route === 'contact') {
      if (!allowRequest(address, 4, 10 * 60_000)) return json({ error: 'rate_limit' }, 429);
      return handleContact(request);
    }
    return json({ error: 'not_found' }, 404);
  }
};
