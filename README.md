# Ayan.dev

Portfolio site and project lab for Ayan Abdimutalip.

**Live portfolio:** <https://jarv1s-stack.github.io/Ayan.dev/>
**Vercel deployment:** <https://ayan-dev-projects.vercel.app/>

## Project lab

Eight new examples live in [`projects/`](projects/README.md): four interactive browser demos, two Telegram bots, and two workflow automations. The demos are static and run directly on GitHub Pages. Bot state is local to the host that runs the bot; use durable storage before handling real users.

Mori Studio and Form &amp; Field are fictional product concepts. Steppe Atlas route distances and stops are illustrative, not travel guidance. The storefront checkout is a demo and does not take payments.

## Telegram portfolio bot

The [@ayan_dev_portfolio_bot](https://t.me/ayan_dev_portfolio_bot) responds to `/start`, `/help`, `/projects`, `/contact` and `/chatid`. It runs through a Vercel webhook, so it does not need a polling process on a laptop. Keep `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` in Vercel Production Secrets. After opening the bot and sending `/start`, use `/chatid` to get the chat ID, then save it as the `TELEGRAM_CHAT_ID` Production Secret to enable contact form notifications.

## AI assistant and contact form

The public site uses Vercel serverless handlers in [`api/`](api/). The browser sends chat messages to `/api/chat`; the handler reads `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` from the Vercel environment. Contact form submissions go to `/api/contact`, which reads `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from that same server-side environment.

For Vercel, set these values under **Project → Settings → Environment Variables**. Never put them in `ai-assistant.js`, `script.js`, a browser bundle, a workflow literal, or a committed `.env` file. Once configured, the form sends the visitor's name, email, optional Telegram handle, subject and message to that chat after submission.

The sample uses OpenRouter's [`openrouter/free` router](https://openrouter.ai/openrouter/free) so the assistant can be prototyped without purchased credits. It selects an available free model, so model behavior can vary between requests. Set a fixed paid model in Vercel after adding credits if you want stable model selection.

If a credential has been committed to a public repository, revoke and replace it. Removing it from the latest files does not remove older Git history.

GitHub Pages does not run the `/api` handlers. The static demos still work there; live AI chat and contact delivery require a Vercel deployment with the environment variables configured. Copy `.env.example` to `.env.local` for local development and keep that file private.

## Local preview

Open `index.html` in a local static server, or deploy the repository root to GitHub Pages. The four project demos are available under `projects/`.
