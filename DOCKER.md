# Next.js 16.1.6 · TypeScript — WSC2026 minimal app

```bash
docker compose up --build
```

Open **http://localhost** — a minimal Next.js App Router app in TypeScript (server page +
client counter). JSON API: `GET /api/tasks`.

The task list is stored in **MySQL** via **Prisma 7.3.0** (`@prisma/adapter-mariadb`).
`DATABASE_URL` comes from the environment if set, otherwise from `.env.prod`; the entrypoint
runs `prisma migrate deploy` before starting the app, and three rows are seeded on first boot.

The database is shared with the competitor's other projects — see README.md before changing
the schema. This project's tables are prefixed `nextts_`, so they do not collide with the
`next_tasks` table owned by `ws26-nextjs`. Never run `prisma db push` against it.

The image runs `npx prisma generate` at build time, which is what produces the typed client
the TypeScript sources import.

Pinned: Node 24.1.0 / npm 11.5.0, Next.js 16.1.6, React 19.2.4, TypeScript 5.9, Prisma 7.3.0.
