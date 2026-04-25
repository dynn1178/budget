'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { useWindowSize } from '@/hooks/useWindowSize'

const PAGE_TITLES: Record<string, string> = {
  home: '홈',
  entry: '지출 기록',
  transactions: '지출 현황',
  analytics: '지출 분석',
  assets: '자산 관리',
  recurring: '정기 지출',
  budget: '예산 설정',
  categories: '카테고리',
  family: '가족 공유',
  settings: '설정',
}

interface AppShellProps {
  children: React.ReactNode
  userName?: string
  userAvatar?: string
}

export function AppShell({ children, userName, userAvatar }: AppShellProps) {
  const pathname = usePathname()
  const { isMobile, isTablet } = useWindowSize()
  const [collapsed, setCollapsed] = useState(false)

  const pageId = pathname.replace('/', '').split('/')[0] || 'home'
  const pageTitle = PAGE_TITLES[pageId] || '가계부'
  const sidebarWidth = isMobile ? 0 : isTablet || collapsed ? 64 : 224
  const showEntryButton = pageId === 'home' || pageId === 'entry' || pageId === 'transactions'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {!isMobile && (
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          isTablet={isTablet}
          userName={userName}
          userAvatar={userAvatar}
        />
      )}

      <main
        style={{
          marginLeft: sidebarWidth,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left .18s cubic-bezier(.4,0,.2,1)',
          paddingBottom: isMobile ? 86 : 0,
        }}
      >
        {isMobile ? (
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 150,
              padding: '14px 16px',
              background: 'var(--surface)',
              backdropFilter: 'blur(14px)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text)' }}>{pageTitle}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
              </div>
            </div>
            {showEntryButton && (
              <a
                href="/entry"
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: 'var(--accent)',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                기록
              </a>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '24px 28px 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em' }}>{pageTitle}</h1>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                {new Date().toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </div>
            </div>
            {showEntryButton && (
              <a
                href="/entry"
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent)',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 800,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                새 지출 기록
              </a>
            )}
          </div>
        )}

        <div style={{ padding: isMobile ? '16px 14px' : isTablet ? '20px 24px' : '24px 36px', flex: 1 }}>
          {children}
        </div>
      </main>

      {isMobile && <BottomNav />}
    </div>
  )
}
