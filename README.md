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

For local testing, the seed creates demo accounts. Sign in with
`buyer_renter@propertyportal.test` or `agent@propertyportal.test` and the
password `demo-password`.

Use `pnpm db:deploy` in a deployment environment. The initial migration is
baselined against the existing development database so local sample data is
preserved.
