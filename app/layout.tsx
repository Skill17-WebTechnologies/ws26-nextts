import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'WSC2026 · Next.js 16.1.6 (TypeScript)' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b1020', color: '#e7ecff' }}>
        {children}
      </body>
    </html>
  )
}
