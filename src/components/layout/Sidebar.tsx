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

function Avatar({ userName, userAvatar }: { userName: string; userAvatar?: string }) {
  if (userAvatar?.startsWith('http')) {
    return (
      <img
        src={userAvatar}
        alt={userName}
        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
      />
    )
  }

  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: 'var(--accent-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 800,
        color: 'var(--accent)',
      }}
    >
      {userName.slice(0, 1).toUpperCase()}
    </div>
  )
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
        inset: '0 auto 0 0',
        width: isCollapsed ? 72 : 236,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .18s cubic-bezier(.4,0,.2,1)',
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: isCollapsed ? '20px 0' : '20px 18px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          원
        </div>
        {!isCollapsed && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>WhereDidItGo</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>가계부 대시보드</div>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {NAV.map((item) => {
          const active = pathname === `/${item.id}` || (item.id === 'home' && pathname === '/')
          return (
            <Link
              key={item.id}
              href={`/${item.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '12px 0' : '12px 14px',
                marginBottom: 4,
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                background: active ? 'var(--accent-bg)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text2)',
                fontWeight: active ? 800 : 600,
                fontSize: 14,
              }}
            >
              <span style={{ fontSize: 12, minWidth: 24, textAlign: 'center' }}>{item.icon}</span>
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div
        style={{
          padding: isCollapsed ? '14px 0' : '14px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: 10,
        }}
      >
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <Avatar userName={userName} userAvatar={userAvatar} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>개인 예산 관리 중</div>
            </div>
          </div>
        )}
        {!isTablet && (
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            style={{
              width: 30,
              height: 30,
              border: 'none',
              borderRadius: 8,
              background: 'var(--bg2)',
              cursor: 'pointer',
              color: 'var(--text2)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {isCollapsed ? '열기' : '접기'}
          </button>
        )}
      </div>
    </aside>
  )
}
