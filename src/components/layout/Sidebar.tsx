'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from './nav-items'

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (c: boolean | ((prev: boolean) => boolean)) => void
  isTablet: boolean
  userName?: string
  userAvatar?: string
}

export function Sidebar({ collapsed, setCollapsed, isTablet, userName = 'User', userAvatar = '🧑‍💻' }: SidebarProps) {
  const pathname = usePathname()
  const isCollapsed = isTablet ? true : collapsed

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: isCollapsed ? 64 : 224,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width .18s cubic-bezier(.4,0,.2,1)',
      zIndex: 100,
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: isCollapsed ? '20px 0' : '20px 20px',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'var(--accent)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 16, flexShrink: 0, fontWeight: 900,
        }}>₩</div>
        <div style={{ opacity: isCollapsed ? 0 : 1, transition: 'opacity .12s', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text)' }}>WhereDidItGo</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, marginTop: 1 }}>가계부</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {NAV.map((n) => {
          if (n.id === 'divider') return (
            <div key="divider" style={{ height: 1, background: 'var(--border)', margin: '8px 12px' }} />
          )
          const active = pathname === `/${n.id}` || (n.id === 'home' && pathname === '/')
          return (
            <Link key={n.id} href={`/${n.id}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: isCollapsed ? '10px 0' : '10px 14px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              margin: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              background: active ? 'var(--accent-bg)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text2)',
              fontWeight: active ? 700 : 500,
              fontSize: 14,
              textDecoration: 'none',
              transition: 'all .16s',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{'icon' in n ? n.icon : ''}</span>
              <span style={{ whiteSpace: 'nowrap', opacity: isCollapsed ? 0 : 1, transition: 'opacity .12s', width: isCollapsed ? 0 : 'auto', overflow: 'hidden' }}>
                {'label' in n ? n.label : ''}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: isCollapsed ? '12px 0' : '12px 14px',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: isCollapsed ? 'center' : 'flex-start',
      }}>
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, overflow: 'hidden' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
              {userAvatar}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Google 로그인</div>
            </div>
          </div>
        )}
        {!isTablet && (
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              marginLeft: isCollapsed ? 0 : 'auto',
              background: 'var(--bg2)', border: 'none', borderRadius: 8,
              width: 28, height: 28, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text3)', fontSize: 14, flexShrink: 0,
            }}>
            {isCollapsed ? '›' : '‹'}
          </button>
        )}
      </div>
    </aside>
  )
}
