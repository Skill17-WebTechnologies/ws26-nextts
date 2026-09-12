// Database connection check.
//
//   GET /api/db-check  → 200 {"ok":true,  ...}   connection works
//                      → 503 {"ok":false, ...}   it does not, and why
//
// An expert can confirm the credentials work without reading any code:
//
//   curl -fsS http://localhost/api/db-check
//
// The 503 makes `curl -f` exit non-zero, so a whole room can be swept in one
// loop. Every WSC2026 template answers the same check in the same shape.
//
// The probe uses the MySQL driver directly rather than Prisma, for one reason:
// Prisma answers every connection problem with the same "pool timeout after
// 10000ms", which hides whether the password was wrong or the host unreachable.
// The driver says ER_ACCESS_DENIED_ERROR or ENOTFOUND in about a millisecond.
// Whether Prisma itself works is answered by /api/tasks.
import mariadb from 'mariadb'

// Never cache a health check.
export const dynamic = 'force-dynamic'

const TABLE = 'nextts_tasks'

const CONFIG_HINT =
  'Local development: cp .env.example .env. Deployed: the platform writes .env.prod, ' +
  'which the entrypoint copies over .env at startup.'
const CONNECTION_HINT =
  'Check DATABASE_URL in .env (local) or .env.prod (deployed). ER_ACCESS_DENIED_ERROR means ' +
  'wrong credentials; ENOTFOUND or ECONNREFUSED means the host, port or network is wrong.'

type Connection = {
  driver: string
  host: string | null
  port: number | null
  database: string | null
  user: string | null
}

// Describe the connection WITHOUT its password, so a failure says which database
// was unreachable and a success cannot leak a credential.
function describeConnection(url?: string): Connection {
  const unknown: Connection = { driver: 'mysql', host: null, port: null, database: null, user: null }
  if (!url) return unknown
  try {
    const u = new URL(url)
    return {
      driver: 'mysql',
      host: u.hostname,
      port: Number(u.port) || 3306,
      database: decodeURIComponent(u.pathname.replace(/^\//, '')) || null,
      user: decodeURIComponent(u.username) || null,
    }
  } catch {
    return unknown
  }
}

export async function GET(): Promise<Response> {
  const url = process.env.DATABASE_URL
  const base = describeConnection(url)

  if (!url) {
    return Response.json({ ...base, ok: false, error: 'DATABASE_URL is not set', hint: CONFIG_HINT }, { status: 503 })
  }

  let connection: Awaited<ReturnType<typeof mariadb.createConnection>> | undefined
  try {
    const started = Date.now()
    // The driver speaks mariadb://; the Prisma adapter rewrites the scheme
    // internally too. allowPublicKeyRetrieval turns MySQL 8's "RSA public key is
    // not available" into the plain ER_ACCESS_DENIED_ERROR it actually is.
    connection = await mariadb.createConnection(
      url.replace(/^mysql:/, 'mariadb:') + '?connectTimeout=5000&allowPublicKeyRetrieval=true',
    )

    // A real round trip, not just "the client object was constructed".
    const [{ version }] = await connection.query('SELECT VERSION() AS version')
    const latency = Date.now() - started

    // Asked separately, so the check still passes on a correctly configured but
    // not-yet-migrated database: working credentials and a present schema are
    // two different questions.
    const [{ found }] = await connection.query(
      'SELECT COUNT(*) AS found FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
      [base.database, TABLE],
    )

    return Response.json({
      ...base,
      ok: true,
      server_version: version,
      latency_ms: latency,
      demo_table: Number(found) === 1 ? `${TABLE} present` : `${TABLE} missing`,
    })
  } catch (e) {
    const error = e as NodeJS.ErrnoException
    return Response.json(
      { ...base, ok: false, error: error.message, code: error.code ?? null, hint: CONNECTION_HINT },
      { status: 503 },
    )
  } finally {
    // Never leave the probe's connection behind; it is not part of the app pool.
    if (connection) await connection.end().catch(() => {})
  }
}
