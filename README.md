# Ayan.dev

Portfolio site and project lab for Ayan Abdimutalip. Fluctlight is included in this repository at [`projects/fluctlight/`](projects/fluctlight/) as a first-party page, with its Three.js scene and chat code served from the portfolio itself.

**Live portfolio:** <https://jarv1s-stack.github.io/Ayan.dev/>
**Vercel deployment:** <https://ayan-dev-projects.vercel.app/>

## Project lab

Eight portfolio demos are listed in [`projects/`](projects/README.md), each with a direct Vercel URL. The set includes four interactive websites, a study planner, an expense tracker, an issue triage preview and a live RSS reading list. The Telegram bot and workflow scripts are source examples; the Study Buddy and Pocket Ledger bots are not active yet and need separate BotFather tokens plus a host with persistent storage.

Mori Studio and Form &amp; Field are fictional product concepts. Steppe Atlas route distances and stops are illustrative, not travel guidance. The storefront checkout is a demo and does not take payments.

## Telegram portfolio bot

The [@ayan_dev_portfolio_bot](https://t.me/ayan_dev_portfolio_bot) responds to `/start`, `/help`, `/projects`, `/contact` and `/chatid`. It runs through a Vercel webhook, so it does not need a polling process on a laptop. Keep `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` in Vercel Production Secrets. After opening the bot and sending `/start`, use `/chatid` to get the chat ID, then save it as the `TELEGRAM_CHAT_ID` Production Secret to enable contact form notifications.

## AI assistant and contact form

The public site uses Vercel serverless handlers in [`api/`](api/). The browser sends chat messages to `/api/chat`; the handler adds the first-person digital-clone prompt from [`data/digital_clone.json`](data/digital_clone.json) on the server and reads `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` from Vercel. Fluctlight speech is generated through `/api/tts` with Fish Audio credentials on the server. Contact form submissions go to `/api/contact`, which reads `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from that same environment.

For Vercel, set these values under **Project → Settings → Environment Variables**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_CHAT_ID`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `FISH_AUDIO_API_KEY`, `FISH_AUDIO_MODEL_ID`, and optionally `FISH_AUDIO_TTS_MODEL`. Never put credentials in browser code, a workflow literal, or a committed `.env` file. Once configured, the contact form sends the visitor's name, email, optional Telegram handle, subject and message to the portfolio's Telegram inbox after submission.

The sample uses OpenRouter's [`openrouter/free` router](https://openrouter.ai/openrouter/free) by default, so model behavior can vary between requests. Set a fixed model in Vercel if you want stable selection. Fish Audio uses the configured voice ID as `reference_id`; if the service is unavailable, the Fluctlight page falls back to browser speech synthesis.

If a credential has been committed to a public repository, revoke and replace it. Removing it from the latest files does not remove older Git history.

GitHub Pages does not run the `/api` handlers. The portfolio and 3D scene still load there, while live AI chat, Fish Audio speech and contact delivery require the Vercel deployment with environment variables configured. Copy `.env.example` to `.env.local` for local development and keep that file private.

## Local preview

Open `index.html` in a local static server, or deploy the repository root to GitHub Pages. Direct live project links are in [`projects/README.md`](projects/README.md).
