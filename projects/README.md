# Portfolio projects

Eight compact projects for Ayan.dev. Each opens as a live Vercel demo, with project source grouped by folder in this repository.

| Project | Demo | What it does |
| --- | --- | --- |
| Mori Studio | [Open the website](https://mori-studio-blush.vercel.app/) | Studio landing page and brief planner |
| Steppe Atlas | [Open the website](https://steppe-atlas.vercel.app/) | Kazakhstan route planner |
| Form & Field | [Open the website](https://form-and-field-snowy.vercel.app/) | Product filters, local cart and demo checkout |
| Quiet Signal | [Open the website](https://quiet-signal-eight.vercel.app/) | Focus timer and private task list |
| Study Buddy | [Open the planner](https://study-buddy-two-livid.vercel.app/) | Browser study planner; Telegram bot source is included |
| Pocket Ledger | [Open the tracker](https://pocket-ledger-orpin.vercel.app/) | Local expense tracker with filters and CSV export |
| Issue Sorter | [Open the preview](https://issue-sorter.vercel.app/) | Rule-based issue labels with a dry-run GitHub Actions companion |
| Morning Wire | [Open the digest](https://morning-wire-pi.vercel.app/) | Live Hacker News RSS reading list with saved stories |

## Telegram bot source

The Study Buddy and Pocket Ledger source examples use long polling and save demo state in local JSON files. They are not active Telegram bots yet. Each needs its own bot token from BotFather and a private host with persistent storage. Keep the token in the host's secret store; do not place it in the repository.

The portfolio helper is the only currently active Telegram bot: [@ayan_dev_portfolio_bot](https://t.me/ayan_dev_portfolio_bot).

## Automation source

Issue Sorter includes a dry-run-first Python workflow example. Morning Wire includes a scheduled RSS-to-Telegram script and optional server-side OpenRouter summarization. They need repository workflow setup and secrets before scheduled delivery is enabled.

## Secrets

Never put API keys or bot tokens in browser code, committed files, workflow literals, screenshots, or README text. Use GitHub Actions Secrets or the hosting provider's secret settings. Public demos do not require an API key.

## Notes

Mori Studio and Form & Field are fictional product concepts. Steppe Atlas locations are illustrative, not travel guidance. Form & Field does not take payments. Browser demos store personal sample data in that browser only.
