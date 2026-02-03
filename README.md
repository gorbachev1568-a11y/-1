# bot-panel

Telegram bot + admin panel for collecting leads and inbox messages.

## Requirements

- Node.js 20+
- SQLite (bundled via Prisma)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your bot token and admin credentials.
4. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```
5. Start the bot + server in dev mode:
   ```bash
   npm run dev
   ```

## Admin panel

Open `http://localhost:3000/admin` and authenticate with `ADMIN_USER` / `ADMIN_PASS`.

## REST API (basic auth)

- `GET /api/leads`
- `POST /api/leads/:id/processed`
- `GET /api/inbox`
- `POST /api/inbox/:id/processed`

## Production

```bash
npm run build
npm start
```
