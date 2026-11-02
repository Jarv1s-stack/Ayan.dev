import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createTelegramClient } from '../telegram-kit/index.mjs';

const bot = createTelegramClient(process.env.TELEGRAM_BOT_TOKEN);
const storePath = fileURLToPath(new URL('./data.json', import.meta.url));
const defaultZone = process.env.DEFAULT_TIMEZONE || 'Asia/Qyzylorda';
let users = {};

try { users = JSON.parse(await readFile(storePath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') console.error('Could not read study data; starting with an empty store.'); }

async function persist() {
  await writeFile(storePath, `${JSON.stringify(users, null, 2)}\n`, { mode: 0o600 });
}

function dateInZone(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function clockInZone(timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.hour}:${value.minute}`;
}

function getStreak(days, timeZone) {
  const done = new Set(days);
  const today = dateInZone(timeZone);
  const yesterdayDate = new Date(`${today}T12:00:00Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  let date = done.has(today) ? today : dateInZone('UTC', yesterdayDate);
  let streak = 0;
  while (done.has(date)) {
    streak++;
    const previous = new Date(`${date}T12:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    date = previous.toISOString().slice(0, 10);
  }
  return streak;
}

function getUser(id) {
  users[id] ||= { goal: '', doneDays: [], reminder: '', timeZone: defaultZone, lastReminderDate: '' };
  return users[id];
}

async function handle(update) {
  const message = update.message;
  if (!message?.text || !message.from?.id) return;
  const chatId = message.chat.id;
  const user = getUser(String(message.from.id));
  const [command = '', ...rest] = message.text.trim().split(/\s+/);
  const argument = rest.join(' ').trim();

  if (/^\/start(?:@\w+)?$/i.test(command)) {
    await bot.sendMessage(chatId, 'Hi, I’m Study Buddy. Pick one small goal with /goal, check in with /done and use /remind 19:30 when you want a gentle nudge. Your data stays in the bot’s local data file.');
  } else if (/^\/help(?:@\w+)?$/i.test(command)) {
    await bot.sendMessage(chatId, 'Commands:\n/goal <one small thing> — set today’s intention\n/done — mark today complete\n/status — see your current goal and streak\n/remind HH:MM — set a daily reminder\n/remind off — turn reminders off\n/timezone Area/City — change reminder time zone');
  } else if (/^\/goal(?:@\w+)?$/i.test(command)) {
    if (!argument) return bot.sendMessage(chatId, 'Try /goal Read one chapter.');
    user.goal = argument.slice(0, 160);
    await persist();
    await bot.sendMessage(chatId, `Saved for today: ${user.goal}`);
  } else if (/^\/done(?:@\w+)?$/i.test(command)) {
    const today = dateInZone(user.timeZone);
    if (!user.doneDays.includes(today)) user.doneDays.push(today);
    user.doneDays = user.doneDays.slice(-120);
    await persist();
    const streak = getStreak(user.doneDays, user.timeZone);
    await bot.sendMessage(chatId, `Today counts. You have checked in ${streak} ${streak === 1 ? 'day' : 'days'} in a row. Take a breath before picking the next thing.`);
  } else if (/^\/status(?:@\w+)?$/i.test(command)) {
    const streak = getStreak(user.doneDays, user.timeZone);
    await bot.sendMessage(chatId, `${user.goal ? `Today’s intention: ${user.goal}` : 'No intention set yet. Try /goal <one small thing>.'}\nCurrent streak: ${streak} ${streak === 1 ? 'day' : 'days'}\nTime zone: ${user.timeZone}`);
  } else if (/^\/timezone(?:@\w+)?$/i.test(command)) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: argument }).format();
      user.timeZone = argument;
      await persist();
      await bot.sendMessage(chatId, `Reminder time zone set to ${argument}.`);
    } catch {
      await bot.sendMessage(chatId, 'Use a valid time zone such as /timezone Asia/Qyzylorda.');
    }
  } else if (/^\/remind(?:@\w+)?$/i.test(command)) {
    if (argument.toLowerCase() === 'off') {
      user.reminder = '';
      await persist();
      await bot.sendMessage(chatId, 'Daily reminder turned off.');
    } else if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(argument)) {
      user.reminder = argument;
      await persist();
      await bot.sendMessage(chatId, `I’ll send one gentle reminder each day at ${argument} (${user.timeZone}). Use /remind off to stop it.`);
    } else {
      await bot.sendMessage(chatId, 'Use /remind 19:30 or /remind off.');
    }
  } else {
    await bot.sendMessage(chatId, 'I didn’t recognize that yet. Try /help to see what I can do.');
  }
}

async function checkReminders() {
  for (const [userId, user] of Object.entries(users)) {
    if (!user.reminder) continue;
    try {
      const today = dateInZone(user.timeZone);
      if (clockInZone(user.timeZone) === user.reminder && user.lastReminderDate !== today) {
        user.lastReminderDate = today;
        await persist();
        await bot.sendMessage(Number(userId), `${user.goal ? `A small reminder: ${user.goal}` : 'A small reminder: what is one kind thing you can finish today?'}\n\nNo rush. You can reply /done when you finish.`);
      }
    } catch (error) {
      console.error(`Reminder skipped for one user: ${error.message}`);
    }
  }
}

setInterval(checkReminders, 15_000);
console.log('Study Buddy is running. Bot credentials are not logged.');
await bot.poll(handle);
