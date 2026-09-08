# Property Portal API

Express + TypeScript API backed by Prisma 7 and SQLite.

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The API is available at `http://localhost:4000`. Health check: `/health`.

Use `pnpm db:deploy` in a deployment environment. The initial migration is
baselined against the existing development database so local sample data is
preserved.
