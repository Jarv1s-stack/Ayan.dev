import { timingSafeEqual } from 'node:crypto';

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

function matchesSecret(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string') return false;
  const actualBytes = Buffer.from(actual, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function portfolioBotReply(text) {
  const command = text.trim().split(/\s+/, 1)[0].split('@', 1)[0].toLowerCase();
  if (command === '/start' || command === '/help') {
    return [
      'Привет! Я бот портфолио Ayan.dev.',
      'Покажу демо сайтов, проекты и способы связи.',
      '',
      '/projects — проекты и исходники',
      '/contact — форма связи',
      '/help — список команд'
    ].join('\n');
  }
  if (command === '/projects') {
    return [
      'Проекты Ayan.dev:',
      'Демо сайтов: https://ayan-dev-projects.vercel.app/#projects',
      'Боты и автоматизации: https://github.com/Jarv1s-stack/Ayan.dev/tree/main/projects',
      'Портфолио: https://ayan-dev-projects.vercel.app/'
    ].join('\n');
  }
  if (command === '/contact') return 'Форма связи: https://ayan-dev-projects.vercel.app/#contact';
  return 'Попробуйте /projects, /contact или /help.';
}

async function handleTelegram(request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) return json({ error: 'telegram_unavailable' }, 503);
  if (!matchesSecret(request.headers.get('x-telegram-bot-api-secret-token') || '', secret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const parsed = await readJson(request, 16_000);
  if (parsed.error) return json({ error: 'invalid_update' }, 400);
  const message = parsed.value?.message;
  if (!message?.chat || typeof message.chat.id !== 'number' || typeof message.text !== 'string') {
    return json({ ok: true });
  }

  try {
    const upstream = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chat.id,
        text: portfolioBotReply(clean(message.text, 2_000)),
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(12_000)
    });
    const result = await upstream.json();
    if (!upstream.ok || !result.ok) return json({ error: 'telegram_delivery_failed' }, 502);
    return json({ ok: true });
  } catch {
    return json({ error: 'telegram_delivery_failed' }, 502);
  }
}

async function handleTelegramSetup(request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) return json({ error: 'telegram_unavailable' }, 503);
  if (!matchesSecret(request.headers.get('authorization') || '', `Bearer ${secret}`)) {
    return json({ error: 'unauthorized' }, 401);
  }

  try {
    const upstream = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: 'https://ayan-dev-projects.vercel.app/api/telegram',
        secret_token: secret,
        allowed_updates: ['message']
      }),
      signal: AbortSignal.timeout(12_000)
    });
    const result = await upstream.json();
    if (!upstream.ok || !result.ok) return json({ error: 'telegram_setup_failed' }, 502);
    return json({ ok: true });
  } catch {
    return json({ error: 'telegram_setup_failed' }, 502);
  }
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
    const route = new URL(request.url).searchParams.get('route');
    if (route === 'telegram') return handleTelegram(request);
    if (route === 'telegram-setup') return handleTelegramSetup(request);
    if (!isSameOrigin(request)) return json({ error: 'origin_not_allowed' }, 403);
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
