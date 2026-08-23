import { defineConfig } from 'prisma/config'

// Prisma 7's CLI does not read .env on its own — without this every prisma
// command fails with "datasource.url property is required" even when .env is
// correct. In Docker and Kubernetes DATABASE_URL comes from the environment.
try {
  process.loadEnvFile()
} catch {
  // no .env present — expected outside local development
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // MySQL connection string — required, no default. See .env.example.
    url: process.env.DATABASE_URL,
  },
})
