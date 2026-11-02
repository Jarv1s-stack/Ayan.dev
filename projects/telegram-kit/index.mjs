const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export function createTelegramClient(token) {
  if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN before starting this bot.');
  const endpoint = `https://api.telegram.org/bot${token}/`;

  async function call(method, payload = {}) {
    const response = await fetch(`${endpoint}${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(40_000)
    });
    let result;
    try { result = await response.json(); } catch { throw new Error(`Telegram ${method} returned an unreadable response (${response.status}).`); }
    if (!response.ok || !result.ok) throw new Error(`Telegram ${method} failed (${response.status}).`);
    return result.result;
  }

  async function poll(handler) {
    let offset = 0;
    while (true) {
      try {
        const updates = await call('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] });
        for (const update of updates) {
          offset = update.update_id + 1;
          await handler(update);
        }
      } catch (error) {
        console.error(error.message);
        await wait(3000);
      }
    }
  }

  return { call, sendMessage: (chatId, text) => call('sendMessage', { chat_id: chatId, text }), poll };
}
