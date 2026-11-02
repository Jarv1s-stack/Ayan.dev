# Portfolio projects

Eight small, independent builds for Ayan.dev. The four browser demos run as static GitHub Pages paths. The Telegram bots and automation examples use only Node/Python built-ins plus their platform APIs.

| Project | Kind | Try it |
| --- | --- | --- |
| [Mori Studio](mori-studio/) | Studio landing page and brief planner | [Open demo](mori-studio/) |
| [Steppe Atlas](steppe-atlas/) | Kazakhstan route planner | [Open demo](steppe-atlas/) |
| [Form & Field](form-and-field/) | Small-batch shop and local cart | [Open demo](form-and-field/) |
| [Quiet Signal](quiet-signal/) | Focus timer and task list | [Open demo](quiet-signal/) |
| [Study Buddy](study-buddy/) | Telegram study companion | Source and setup below |
| [Pocket Ledger](pocket-ledger/) | Telegram expense tracker | Source and setup below |
| [Issue Sorter](issue-sorter/) | GitHub Actions issue labeling | Source and setup below |
| [Morning Wire](morning-wire/) | RSS and optional AI Telegram digest | Source and setup below |

## Bot setup

Both bots use long polling and keep their simple data store in an ignored local JSON file. Create each bot with Telegram's BotFather, set its `TELEGRAM_BOT_TOKEN` in the server environment, then run the relevant `.mjs` file with Node 20 or newer. Run each bot as a separate long-lived process. The sample JSON stores are not a shared database and should be replaced with durable storage before handling real users.

## Secret handling

Copy `.env.example` to `.env.local` for local work, fill in only the values you need, and keep it out of version control. For Actions or Vercel, use the platform's secret settings instead. Never put an API key in a browser bundle, HTML file, workflow literal, screenshot, or README.
