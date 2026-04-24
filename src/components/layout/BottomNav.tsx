'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from './nav-items'

export function BottomNav() {
  const pathname = usePathname()
  const shown = NAV.slice(0, 5)

  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 200,
        display: 'flex',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(14px)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {shown.map((item) => {
        const active = pathname === `/${item.id}` || (item.id === 'home' && pathname === '/')
        return (
          <Link
            key={item.id}
            href={`/${item.id}`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '10px 0 8px',
              color: active ? 'var(--accent)' : 'var(--text3)',
              textDecoration: 'none',
              fontSize: 10,
              fontWeight: active ? 800 : 600,
            }}
          >
            <span style={{ fontSize: 11 }}>{item.icon}</span>
            <span>{item.short}</span>
          </Link>
        )
      })}
    </nav>
  )
}
