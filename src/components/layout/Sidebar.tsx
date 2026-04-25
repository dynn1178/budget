'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from './nav-items'

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void
  isTablet: boolean
  userName?: string
  userAvatar?: string
}

export function Sidebar({
  collapsed,
  setCollapsed,
  isTablet,
  userName = '사용자',
  userAvatar,
}: SidebarProps) {
  const pathname = usePathname()
  const isCollapsed = isTablet ? true : collapsed

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: isCollapsed ? 64 : 224,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .18s cubic-bezier(.4,0,.2,1)',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: isCollapsed ? '20px 0' : '20px 20px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 16,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          ₩
        </div>
        {!isCollapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
              WhereDidItGo
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.05em', marginTop: 1 }}>
              가계부
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {NAV.map((item, idx) => {
          // Divider
          if (item.divider) {
            return (
              <div
                key={`divider-${idx}`}
                style={{ height: 1, background: 'var(--border)', margin: '8px 12px' }}
              />
            )
          }

          const active =
            pathname === `/${item.id}` ||
            (item.id === 'home' && (pathname === '/' || pathname === '/home'))

          return (
            <Link
              key={item.id}
              href={item.id === 'home' ? '/home' : `/${item.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: isCollapsed ? '10px 0' : '10px 14px',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                margin: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                background: active ? 'var(--accent-bg)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text2)',
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                transition: 'all .16s ease',
                userSelect: 'none',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
              {!isCollapsed && (
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: isCollapsed ? '12px 0' : '12px 14px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: 10,
          flexShrink: 0,
        }}
      >
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
            {userAvatar?.startsWith('http') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userAvatar}
                alt={userName}
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--accent-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 800,
                  color: 'var(--accent)',
                  flexShrink: 0,
                }}
              >
                {userName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Google 로그인</div>
            </div>
          </div>
        )}
        {!isTablet && (
          <button
            onClick={() => setCollapsed(prev => !prev)}
            style={{
              width: 28,
              height: 28,
              border: 'none',
              borderRadius: 8,
              background: 'var(--bg2)',
              cursor: 'pointer',
              color: 'var(--text3)',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontWeight: 700,
              transition: 'all .16s',
            }}
            title={isCollapsed ? '펼치기' : '접기'}
          >
            {isCollapsed ? '›' : '‹'}
          </button>
        )}
      </div>
    </aside>
  )
}
