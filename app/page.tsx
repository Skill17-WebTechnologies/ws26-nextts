import { version as reactVersion } from 'react'
import Counter from './Counter'
import { getTasks, ensureSeeded } from '../lib/prisma'

// Read the database on every request instead of pre-rendering once at build time.
export const dynamic = 'force-dynamic'

export default async function Home() {
  await ensureSeeded()
  const tasks = await getTasks()

  return (
    <main style={{ background: '#151c33', padding: '2.5rem 3rem', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,.4)' }}>
      <h1>Next.js <span style={{ color: '#7c9cff' }}>16.1.6</span> <span style={{ color: '#7c9cff' }}>· TypeScript</span></h1>
      <p>WSC2026 Web Technologies — minimal Next.js app in TypeScript (App Router, React {reactVersion}), tasks read from MySQL with Prisma 7.3.0.</p>
      {tasks ? (
        <ul style={{ lineHeight: 1.9 }}>
          {tasks.map(t => <li key={t.id}>{t.done ? '✅' : '⬜️'} {t.title}</li>)}
        </ul>
      ) : (
        <p>⚠️ Database not reachable. Check <code>DATABASE_URL</code>.</p>
      )}
      <p>JSON: <code>GET /api/tasks</code> — connection check: <code><a href="/api/db-check" style={{ color: '#7c9cff' }}>/api/db-check</a></code></p>
      <Counter />
    </main>
  )
}
