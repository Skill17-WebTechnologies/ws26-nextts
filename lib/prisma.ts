import { PrismaClient } from '@prisma/client'
import type { Task } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

// MySQL over the network. DATABASE_URL is required and never hardcoded — Next.js
// loads it from .env, which the entrypoint writes from .env.prod when deployed.
function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set — see .env.example')
  // The adapter accepts a mysql:// URL and rewrites it to mariadb:// internally.
  const adapter = new PrismaMariaDb(url)
  return new PrismaClient({ adapter })
}

// `next dev` re-evaluates modules on every hot reload; cache the client on globalThis so
// each reload does not open another connection pool to MySQL. globalThis carries no such
// property in its type, hence the widening cast.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Task is generated from prisma/schema.prisma by `prisma generate`; re-exported so the
// page and the route handler can name the shape they render without importing Prisma.
export type { Task }

// null means the database could not be reached — a caller renders that differently
// from an empty list, so the two must not collapse into one value.
export async function getTasks(): Promise<Task[] | null> {
  try {
    return await prisma.task.findMany({ orderBy: { id: 'asc' } })
  } catch (e) {
    console.error('query failed (database not reachable):', e instanceof Error ? e.message : e)
    return null
  }
}

// Seed once per process, not once per request.
let seeding: Promise<void> | undefined
export function ensureSeeded(): Promise<void> {
  return (seeding ??= seed())
}

async function seed(): Promise<void> {
  try {
    if ((await prisma.task.count()) === 0) {
      await prisma.task.createMany({
        data: [
          { title: 'Define the schema', done: true },
          { title: 'Run prisma migrate deploy', done: true },
          { title: 'Query from a server component', done: false },
        ],
      })
    }
  } catch (e) {
    console.error('seed skipped (database not ready):', e instanceof Error ? e.message : e)
  }
}
