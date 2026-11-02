import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createTelegramClient } from '../telegram-kit/index.mjs';

const bot = createTelegramClient(process.env.TELEGRAM_BOT_TOKEN);
const storePath = fileURLToPath(new URL('./data.json', import.meta.url));
const currency = new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 });
let ledger = {};

try { ledger = JSON.parse(await readFile(storePath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') console.error('Could not read ledger data; starting with an empty store.'); }

async function persist() {
  await writeFile(storePath, `${JSON.stringify(ledger, null, 2)}\n`, { mode: 0o600 });
}

function entriesFor(userId) {
  ledger[userId] ||= [];
  return ledger[userId];
}

function totalsForMonth(entries) {
  const month = new Date().toISOString().slice(0, 7);
  const current = entries.filter(entry => entry.date.slice(0, 7) === month);
  const total = current.reduce((sum, entry) => sum + entry.amount, 0);
  const categories = new Map();
  for (const entry of current) categories.set(entry.category, (categories.get(entry.category) || 0) + entry.amount);
  const summary = [...categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([category, amount]) => `• ${category}: ${currency.format(amount)}`).join('\n');
  return { month, current, total, summary };
}

async function handle(update) {
  const message = update.message;
  if (!message?.text || !message.from?.id) return;
  const chatId = message.chat.id;
  const userId = String(message.from.id);
  const entries = entriesFor(userId);
  const [command = '', ...rest] = message.text.trim().split(/\s+/);
  const argument = rest.join(' ').trim();

  if (/^\/start(?:@\w+)?$/i.test(command)) {
    await bot.sendMessage(chatId, 'Pocket Ledger keeps a small expense log on its host. Add an expense with /add 2500 groceries, see the month with /month, or undo a recent entry with /undo ID. Use this bot only on a private deployment you control.');
  } else if (/^\/help(?:@\w+)?$/i.test(command)) {
    await bot.sendMessage(chatId, 'Commands:\n/add <amount> <category> — save an expense in KZT\n/month — total and category summary for this month\n/recent — show your last five entries\n/undo <id> — remove one of your entries\n\nExample: /add 2500 lunch');
  } else if (/^\/add(?:@\w+)?$/i.test(command)) {
    const match = argument.match(/^(\d+(?:[.,]\d{1,2})?)\s+(.+)$/);
    if (!match) return bot.sendMessage(chatId, 'Try /add 2500 groceries. Amounts must be positive and the category is required.');
    const amount = Number(match[1].replace(',', '.'));
    const category = match[2].trim().slice(0, 32);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000 || !category) return bot.sendMessage(chatId, 'That amount or category is not valid. Try /add 2500 groceries.');
    const entry = { id: randomUUID().slice(0, 6), amount, category, date: new Date().toISOString() };
    entries.push(entry);
    await persist();
    await bot.sendMessage(chatId, `Saved ${currency.format(amount)} for ${category}. Entry ID: ${entry.id}`);
  } else if (/^\/month(?:@\w+)?$/i.test(command)) {
    const summary = totalsForMonth(entries);
    await bot.sendMessage(chatId, `Your ${summary.month} total is ${currency.format(summary.total)} across ${summary.current.length} ${summary.current.length === 1 ? 'entry' : 'entries'}.${summary.summary ? `\n\n${summary.summary}` : '\n\nNo expenses recorded this month yet.'}`);
  } else if (/^\/recent(?:@\w+)?$/i.test(command)) {
    const recent = entries.slice(-5).reverse();
    const lines = recent.map(entry => `${entry.id} · ${entry.date.slice(0, 10)} · ${entry.category} · ${currency.format(entry.amount)}`);
    await bot.sendMessage(chatId, lines.length ? `Your recent entries:\n${lines.join('\n')}` : 'No entries yet. Try /add 2500 groceries.');
  } else if (/^\/undo(?:@\w+)?$/i.test(command)) {
    if (!/^[a-f\d]{6}$/i.test(argument)) return bot.sendMessage(chatId, 'Use the six-character ID shown after /add. Find it with /recent.');
    const index = entries.findIndex(entry => entry.id.toLowerCase() === argument.toLowerCase());
    if (index < 0) return bot.sendMessage(chatId, 'I could not find that entry in your ledger.');
    const [removed] = entries.splice(index, 1);
    await persist();
    await bot.sendMessage(chatId, `Removed ${currency.format(removed.amount)} for ${removed.category}.`);
  } else {
    await bot.sendMessage(chatId, 'I didn’t recognize that yet. Try /help to see the available commands.');
  }
}

console.log('Pocket Ledger is running. Bot credentials are not logged.');
await bot.poll(handle);
