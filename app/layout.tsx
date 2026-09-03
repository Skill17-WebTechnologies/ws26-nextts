import './globals.css'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'WSC2026 · Next.js 16.1.6 (TypeScript)' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
