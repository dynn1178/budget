'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from './nav-items'

export function BottomNav() {
  const pathname = usePathname()
  const shown = NAV.filter(n => n.id !== 'divider').slice(0, 5)

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      zIndex: 200,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {shown.map(n => {
        if (n.id === 'divider') return null
        const active = pathname === `/${n.id}` || (n.id === 'home' && pathname === '/')
        return (
          <Link key={n.id} href={`/${n.id}`} style={{
            flex: 1, border: 'none', background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '10px 0 8px',
            cursor: 'pointer',
            color: active ? 'var(--accent)' : 'var(--text3)',
            textDecoration: 'none',
            gap: 3,
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{'icon' in n ? n.icon : ''}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{'short' in n ? n.short : ''}</span>
          </Link>
        )
      })}
    </nav>
  )
}
