<div align="center">

  # 6MIXX Bot Discord

  **A feature-rich Discord community bot for 6MIXX with confession, tickets, VIP management, mini-games, Last.fm tracking, and AI integration.**

  [![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)
  [![Discord.js](https://img.shields.io/badge/Discord.js-14.x-5865F2?logo=discord&logoColor=white)](https://discord.js.org)
  [![Sapphire](https://img.shields.io/badge/Sapphire-5.x-65C5EE?logo=discord&logoColor=white)](https://www.sapphirejs.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
</div>

---

## ✨ Features

- 💌 **Confession System**: Anonymous confessions with moderation queue and auto-posting.
- 🎫 **Ticket System**: Support tickets with transcripts and staff controls.
- 👑 **VIP Management**: VIP roles, perks, and donation tracking with bank integration.
- 🎮 **Mini-Games**: Word-chain game with Lua-powered validation, song quiz with local audio library, and voice XP.
- 📊 **Last.fm Tracking**: Link Last.fm accounts, scrobble stats, and music leaderboards.
- 🔔 **Social Notifications**: Auto-notify on new posts, gallery updates, and community events.
- 🤖 **AI Integration**: Cohere and OpenAI-powered helpers, auto-moderation, and smart replies.
- ⚙️ **Server Management**: Guild settings, custom prefixes, permission presets, and scheduled tasks via BullMQ.

## 🎮 Modules Overview

The bot is organized into plug-and-play Sapphire modules:

| Community                              | Engagement                          | Utilities & Controls                  |
| -------------------------------------- | ----------------------------------- | ------------------------------------- |
| `confession`, `ticket`, `vip`          | `word-chain`, `songs-quiz`, `voice` | `setting`, `management`, `status`     |
| `donation`, `gallery`, `notification`  | `lastfm`, `social`                  | `sharp` image cards, auto-moderation  |

_...explore all slash (`/`) and prefix commands directly via the bot's help menu!_

## 🛠️ Tech Stack

- **Framework**: [Sapphire Framework v5](https://www.sapphirejs.dev/) on top of [Discord.js v14](https://discord.js.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) + [Prisma ORM](https://www.prisma.io/)
- **Cache & Queue**: [Redis](https://redis.io/) + [BullMQ](https://docs.bullmq.io/)
- **AI**: [Cohere](https://cohere.com/) + [OpenAI](https://openai.com/)
- **Media**: [Sharp](https://sharp.pixelplumbing.com/) for image cards, [Cheerio](https://cheerio.js.org/) + [Undici](https://github.com/nodejs/undici) for scraping
- **Deployment**: [Docker](https://www.docker.com/) + Docker Compose

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v22+), [pnpm](https://pnpm.io/), a PostgreSQL database, and a Redis server.

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yngpiu/6mixx-bot-discord.git
cd 6mixx-bot-discord
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up your environment:
```bash
cp .env.example .env
```
Fill in your `DISCORD_TOKEN`, `DATABASE_URL`, `REDIS_URL`, owner/guild IDs, and API keys (Last.fm, YouTube, Cohere).

4. Start the bot:
```bash
pnpm run dev
```

To build and run for production without Docker:
```bash
pnpm run build
pnpm run start
```

## 🌐 Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
DATABASE_URL=postgresql://admin:password@localhost:5432/6mixx?schema=public
REDIS_URL=redis://localhost:6382
DISCORD_TOKEN=your-bot-token
TEST_GUILDS_ID=your-guild-id
OWNER_BOT_ID=your-discord-id
DEFAULT_PREFIX=.
LASTFM_API_KEY=
YOUTUBE_API_KEY=
COHERE_API_KEY=
```

See [.env.example](./.env.example) for the full list.

## 🐳 Docker Deployment

The project includes a Docker Compose setup for production deployment with CI/CD via GitHub Actions.

For the complete step-by-step production guide, see:

👉 **[View Deployment Guide](./DEPLOYMENT.md)**

## 📄 License

This project is open-source and available under the [ISC License](LICENSE).
