'use client'
import { useState } from 'react'

export default function Counter() {
  const [n, setN] = useState(0)
  return (
    <button onClick={() => setN(n + 1)} style={{ fontSize: '1rem', padding: '.6rem 1.2rem', borderRadius: 8, border: 0, background: '#7c9cff', color: '#0b1020', fontWeight: 600, cursor: 'pointer' }}>
      Clicked {n} times
    </button>
  )
}
