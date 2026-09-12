# Next.js 16.1.6 · TypeScript — WSC2026

A small, real **Next.js** application (version **16.1.6**) written in **TypeScript**, part of
the WorldSkills 2026 Web Technologies (TP17) set. Runtime pinned to the competition spec.
Task data lives in **MySQL**, accessed through **Prisma 7.3.0**.

This is the TypeScript counterpart of `ws26-nextjs`: same version, same structure, same
behaviour — the difference is the language.

## Configuration

The app needs one environment variable, a MySQL connection string, resolved in this order:

1. `DATABASE_URL` in the environment (compose, Kubernetes, your shell) — always wins.
2. `.env` — local development. Copy from `.env.example`. Gitignored, and excluded from the
   Docker build context.
3. `.env.prod` — production configuration, baked into the image. The entrypoint copies it to
   `.env` when the environment supplies nothing.

```bash
cp .env.example .env   # then fill in your database
```

Note that Prisma 7's CLI does not read `.env` by itself; `prisma.config.ts` loads it with
`process.loadEnvFile()`.

## Run it

```bash
cp .env.example .env
docker compose up --build
```

Then open **http://localhost**. With no `DATABASE_URL` in your shell the container falls back
to `.env.prod`. It applies pending migrations, then starts the dev server.

Stop it with `docker compose down`.

## Develop

For a hot-reloading loop on your machine you need **Node 24.1.0** and **npm 11.5.0**
installed locally (the same versions the Docker image pins).

```bash
npm install
npm run db:migrate   # applies prisma/migrations to the database
npx prisma generate  # generates the typed client into node_modules
npm run dev
```

The dev server runs on **http://localhost** and reloads on save.
Edit **app/page.tsx** and **app/Counter.tsx** to change the app.

## TypeScript

`tsconfig.json` is taken verbatim from `create-next-app@16.1.6 --ts`, so the editor behaves
exactly as it does in a freshly scaffolded Next.js project — `strict` is on, and the `@/*`
path alias points at the project root.

```bash
npm run typecheck    # tsc --noEmit
```

`next dev` does **not** typecheck; `next build` does. Run `npm run typecheck` if you want the
errors without a full build.

Two files are generated rather than committed, and both are gitignored: `next-env.d.ts`,
which Next rewrites on every dev/build, and `tsconfig.tsbuildinfo`.

Model types come from Prisma. `prisma generate` writes `Task` into the client from
`prisma/schema.prisma`, and `lib/prisma.ts` re-exports it — so a schema change becomes a type
error at the call site instead of a runtime surprise. Run `npx prisma generate` after editing
the schema, or the types will describe the old shape.

## Checking the connection

```bash
curl -fsS http://localhost/api/db-check
```

```json
{ "ok": true, "driver": "mysql", "host": "db", "port": 3306, "database": "app",
  "user": "app", "server_version": "8.4.11", "latency_ms": 2,
  "demo_table": "nextts_tasks present" }
```

It returns **503** when the connection fails, naming the host, database and user it tried
and the driver's error code — `ER_ACCESS_DENIED_ERROR` for a wrong password, `ENOTFOUND`
for a wrong host. The password is never in the response. Every WSC2026 template answers
the same check, so one command works whatever stack you chose.

Nothing is hardcoded: `lib/prisma.ts`, the `Dockerfile` and `docker-compose.yml` contain no
host, user or password, and Compose starts the local MySQL server from the same `.env` the
app reads.

## Database

Tasks live in MySQL in a table named **`nextts_tasks`**. `app/page.tsx` is a server component
that queries Prisma directly (marked `force-dynamic` so it re-reads on every request);
`app/api/tasks/route.ts` returns the same data as JSON. The client is created once in
`lib/prisma.ts` and cached on `globalThis` so dev hot-reloads do not open a new connection pool.

`getTasks()` returns `Task[] | null`, where `null` means the database could not be reached —
a distinct state from an empty list, and the type keeps the two from collapsing into one.

## ⚠️ The database is shared

Every project a competitor creates points at the **same** MySQL database, so it will already
contain other projects' tables (a Laravel app's `users`, `notes`, `sessions`, `migrations`, …)
— including the `next_tasks` table belonging to `ws26-nextjs`.

1. **Never run `prisma db push` or `prisma migrate dev`.** Both diff the whole database against
   `schema.prisma` and **drop every table they do not know about** — that is another project's
   data. `db push` is deliberately absent from `package.json` for this reason.
2. Model tables are **prefixed** with `@@map()` so they cannot collide. This project uses
   `nextts_`. Rename the prefix per project; do not remove it.

Schema changes are made as **create-only migration files** and applied with
`prisma migrate deploy`, which only runs the SQL under `prisma/migrations/` and never computes a
destructive diff:

```bash
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema prisma/schema.prisma \
  --script > prisma/migrations/<timestamp>_<name>/migration.sql
npm run db:migrate
```

On first boot against a database that already holds other tables, Prisma reports `P3005`
(“schema is not empty”). The entrypoint handles this automatically: it applies each migration's
SQL directly and records it with `prisma migrate resolve --applied`, so later boots are an
ordinary no-op. Migrations ship as `CREATE TABLE IF NOT EXISTS` to make that safe.

## Tailwind CSS

Tailwind **4.1.18** is installed and wired up, but nothing in the template uses it — it is here
for you to reach for if you want it, and it costs nothing if you don't. Add utility classes to
your markup and they work straight away:

```html
<div class="rounded-xl bg-slate-800 p-6 text-slate-100">…</div>
```

`@tailwindcss/postcss` is registered in `postcss.config.mjs`. The entry stylesheet is
`app/globals.css`, imported from `app/layout.tsx`.

The template's own CSS lives inside Tailwind's `base` layer, and that detail matters: unlayered
CSS outranks *every* cascade layer, so left as it was a rule like `button { background: … }`
would silently beat `class="bg-blue-500"` and the class would appear to do nothing. Inside
`base` those rules still style unclassed elements, while utilities override them as expected.

Tailwind 4 needs no `tailwind.config.js` — it is configured in CSS. Customise the theme with
`@theme { … }` in `app/globals.css`. Docs: <https://tailwindcss.com/docs>

## Stack

- Node 24.1.0 / npm 11.5.0
- Next.js 16.1.6, React 19.2.4
- TypeScript 5.9 (`@types/node` 24, matching the pinned runtime)
- Prisma 7.3.0 (`@prisma/adapter-mariadb`, MySQL driver adapter)
- Tailwind CSS 4.1.18 — installed and configured, use it or ignore it
