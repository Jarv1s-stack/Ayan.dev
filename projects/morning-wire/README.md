# Morning Wire

A scheduled digest that reads a public RSS feed, optionally asks an OpenRouter model for a brief based on the feed titles, then sends the result to one Telegram chat. Without `OPENROUTER_API_KEY`, it sends the source titles and links as-is. It uses Node's built-in `fetch`; no package install is required.

## Run it

```powershell
$env:TELEGRAM_BOT_TOKEN = 'set-this-in-your-shell-only'
$env:TELEGRAM_CHAT_ID = 'your-private-chat-id'
node .\index.mjs
```

For the AI summary, also set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`. Keep both in a secret store. The API key is sent in a server-side bearer header to OpenRouter; it is never read by browser code or printed in logs. The feed titles and links are sent to the selected model provider when AI summarization is enabled.

## Schedule it with GitHub Actions

Copy `workflow.example.yml` to `.github/workflows/morning-wire.yml`. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as repository Actions secrets. Add the model name as the `OPENROUTER_MODEL` Actions variable, and add `OPENROUTER_API_KEY` as a secret only if you want generated summaries. Run it once from the Actions tab with **Run workflow** before relying on the weekday schedule. The example uses the Hacker News RSS feed; set `RSS_FEED_URL` to another public feed if you prefer.

The scheduled workflow is an example file inside this folder, so it is not active in the portfolio repository.
