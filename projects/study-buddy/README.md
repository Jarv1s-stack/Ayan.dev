# Study Buddy

A private Telegram study companion. It can save one intention, record daily check-ins, calculate a streak, and send a once-a-day reminder in each user's chosen time zone.

## Start it

Create a bot with Telegram's BotFather, then run this from the repository root in PowerShell:

```powershell
$env:TELEGRAM_BOT_TOKEN = 'your-new-token'
$env:DEFAULT_TIMEZONE = 'Asia/Qyzylorda'
node .\projects\study-buddy\index.mjs
```

The bot responds to `/start`, `/help`, `/goal`, `/done`, `/status`, `/timezone`, and `/remind`. Stop it with Ctrl+C. Keep the process running for reminders to fire.

The bot uses the Telegram Bot API's long-polling mode. Do not set a webhook for the same bot while it is polling. It stores Telegram user IDs, goals, check-ins and reminder preferences in `data.json` beside the bot code; that file is ignored by Git. Put the process on a private host with persistent storage before using it beyond a demo.
