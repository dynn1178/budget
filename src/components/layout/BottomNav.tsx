'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BOTTOM_NAV } from './nav-items'

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 200,
        display: 'flex',
        background: 'var(--surface)',
        backdropFilter: 'blur(14px)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {BOTTOM_NAV.map((item) => {
        const active =
          pathname === `/${item.id}` ||
          (item.id === 'home' && (pathname === '/' || pathname === '/home'))
        return (
          <Link
            key={item.id}
            href={item.id === 'home' ? '/home' : `/${item.id}`}
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
            <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
            <span>{item.short}</span>
          </Link>
        )
      })}
    </nav>
  )
}
