# Pocket Ledger

A small Telegram expense tracker that stores entries under the Telegram sender ID and reports monthly totals by category. Amounts are displayed in KZT.

## Start it

Create a separate bot with Telegram's BotFather, then run this from the repository root in PowerShell:

```powershell
$env:TELEGRAM_BOT_TOKEN = 'your-new-token'
node .\projects\pocket-ledger\index.mjs
```

Try `/add 2500 groceries`, `/month`, `/recent`, and `/undo ID`. The bot stores its local data in the ignored `data.json` file beside the source. Use it in a private chat and move the data to a durable, access-controlled database before inviting other people.

This project does not connect to a bank or process payments. It is a personal expense-log example.
