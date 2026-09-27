# Property Portal API

The API provides authentication, authorization, property taxonomy, listings, moderation, search, favorites, saved searches, inquiries, reports, notifications, and admin operations for the Yadanar Property Portal.

## Stack

TypeScript, Node.js, Express 5, Prisma 7, SQLite, and Zod. The REST API is versioned under `/api/v1`.

## Run locally

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The server runs at `http://localhost:4000`; health check: `http://localhost:4000/health`.

Useful commands:

```bash
pnpm typecheck
pnpm build
pnpm db:deploy
```

Use `db:deploy` for an environment where migrations should be applied without creating new ones. The seed is deterministic and creates fictional sample data for Yangon, Mandalay, all major roles, listings, and marketplace workflows.

## Demo accounts

- Buyer/renter: `buyer_renter@propertyportal.test`
- Agent: `agent@propertyportal.test`
- Password: `demo-password`

## Related documentation

See the workspace [`SPEC.md`](../SPEC.md) for the feature contract and [`AGENTS.md`](../AGENTS.md) for repository boundaries and engineering conventions.
