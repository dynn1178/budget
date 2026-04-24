'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { useWindowSize } from '@/hooks/useWindowSize'

const PAGE_TITLES: Record<string, string> = {
  home: '🏠 홈',
  entry: '✏️ 지출 기록',
  analytics: '📊 지출 분석',
  assets: '💰 자산 관리',
  transactions: '📋 지출 현황',
  recurring: '🔁 정기 지출',
  family: '👨‍👩‍👧 가족 공유',
  categories: '🏷️ 카테고리',
  budget: '🎯 예산 설정',
  settings: '⚙️ 설정',
}

interface AppShellProps {
  children: React.ReactNode
  userName?: string
  userAvatar?: string
}

export function AppShell({ children, userName, userAvatar }: AppShellProps) {
  const pathname = usePathname()
  const { isMobile, isTablet, isDesktop } = useWindowSize()
  const [collapsed, setCollapsed] = useState(false)

  const pageId = pathname.replace('/', '') || 'home'
  const pageTitle = PAGE_TITLES[pageId] || '홈'

  const sidebarW = isMobile ? 0 : (isTablet || collapsed) ? 64 : 224

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

      <main style={{
        marginLeft: sidebarW,
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        transition: 'margin-left .18s cubic-bezier(.4,0,.2,1)',
        paddingBottom: isMobile ? 80 : 0,
      }}>
        {/* Mobile topbar */}
        {isMobile && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 150,
            background: 'var(--topbar-bg, rgba(244,241,236,.93))',
            backdropFilter: 'blur(14px)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center',
            padding: '13px 16px',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', flex: 1 }}>
              {pageTitle}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>
              {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
            </div>
          </div>
        )}

        {/* Desktop page header */}
        {!isMobile && (
          <div style={{ padding: '24px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.4px' }}>
                {pageTitle}
              </h1>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
              </div>
            </div>
            {(pageId === 'home' || pageId === 'transactions') && (
              <a href="/entry" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
                boxShadow: 'var(--shadow-sm)',
              }}>＋ 지출 기록</a>
            )}
          </div>
        )}

        <div style={{
          padding: isMobile ? '14px' : isTablet ? '20px 24px' : '24px 36px',
          flex: 1, width: '100%',
        }}>
          {children}
        </div>
      </main>

      {isMobile && <BottomNav />}
    </div>
  )
}
