# Ratatouille

Mobile-first marketplace foundation for auctioning sealed, soon-to-expire goods.

## Stack

- Next.js App Router
- React
- Tailwind CSS
- Drizzle ORM
- Neon Postgres

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create a local env file from the example:

```bash
cp .env.example .env
```

3. Start the app:

```bash
npm run dev
```

## Database workflow

Generate SQL migrations from the schema:

```bash
npm run db:generate
```

Apply migrations to the configured database:

```bash
npm run db:migrate
```
