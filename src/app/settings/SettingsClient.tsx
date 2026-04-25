'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/hooks/useSettings'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetSetting, ThemeType, AccentType, FontType } from '@/types/database'

interface Props {
  settings: BudgetSetting | null
  userId: string
  userEmail: string
  userName: string
  userAvatar: string | null
}

const THEMES: { value: ThemeType; label: string; preview: string }[] = [
  { value: 'light', label: '라이트', preview: '#F4F1EC' },
  { value: 'dark', label: '다크', preview: '#151210' },
  { value: 'grey', label: '그레이', preview: '#F0F0F0' },
  { value: 'sepia', label: '세피아', preview: '#F5ECD7' },
]

const ACCENTS: { value: AccentType; label: string; color: string }[] = [
  { value: '', label: '기본', color: '#7C5C3E' },
  { value: 'teal', label: '틸', color: '#2E7D70' },
  { value: 'blue', label: '블루', color: '#2563EB' },
  { value: 'purple', label: '퍼플', color: '#7C3AED' },
  { value: 'green', label: '그린', color: '#16A34A' },
  { value: 'rose', label: '로즈', color: '#E11D48' },
  { value: 'amber', label: '앰버', color: '#D97706' },
  { value: 'ocean', label: '오션', color: '#0E7490' },
]

const FONTS: { value: FontType; label: string; family: string }[] = [
  { value: 'pretendard', label: 'Pretendard', family: "'Pretendard Variable', sans-serif" },
  { value: 'noto-sans', label: 'Noto Sans KR', family: "'Noto Sans KR', sans-serif" },
  { value: 'gothic', label: 'Gothic A1', family: "'Gothic A1', sans-serif" },
  { value: 'ibm', label: 'IBM Plex Sans KR', family: "'IBM Plex Sans KR', sans-serif" },
  { value: 'noto-serif', label: 'Noto Serif KR', family: "'Noto Serif KR', serif" },
]

export function SettingsClient({ settings, userId, userEmail, userName, userAvatar }: Props) {
  const sb = createClient()
  const router = useRouter()
  const { theme, accent, font, setTheme, setAccent, setFont } = useSettings()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSaveToCloud = async () => {
    setSaving(true)
    await sb.from('budget_settings').upsert(
      { user_id: userId, theme, accent, font },
      { onConflict: 'user_id' }
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px 24px',
    boxShadow: 'var(--shadow-sm)',
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Profile */}
      <div style={cardStyle}>
        <SectionTitle>내 계정</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userAvatar} alt="avatar" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', fontWeight: 900, flexShrink: 0 }}>
              {(userName || userEmail)[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{userName || '이름 없음'}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{userEmail}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Google 계정으로 로그인 중</div>
          </div>
        </div>
        <form action="/auth/signout" method="POST" style={{ marginTop: 16 }}>
          <button type="submit" style={{ padding: '9px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', background: 'var(--bg2)', color: 'var(--text2)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            로그아웃
          </button>
        </form>
      </div>

      {/* Theme */}
      <div style={cardStyle}>
        <SectionTitle sub="배경 및 전체 색조를 선택합니다">테마</SectionTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                border: theme === t.value ? '2px solid var(--accent)' : '1px solid var(--border2)',
                background: theme === t.value ? 'var(--accent-bg)' : 'var(--bg)',
                cursor: 'pointer', minWidth: 64,
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, background: t.preview, border: '1px solid var(--border2)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: theme === t.value ? 'var(--accent)' : 'var(--text2)' }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div style={cardStyle}>
        <SectionTitle sub="강조 색상을 선택합니다">강조 색상</SectionTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              onClick={() => setAccent(a.value)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                border: accent === a.value ? '2px solid var(--accent)' : '1px solid var(--border2)',
                background: accent === a.value ? 'var(--accent-bg)' : 'var(--bg)',
                cursor: 'pointer', minWidth: 56,
              }}
            >
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: a.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: accent === a.value ? 'var(--accent)' : 'var(--text2)' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font */}
      <div style={cardStyle}>
        <SectionTitle sub="앱 전체 폰트를 변경합니다">폰트</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FONTS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFont(f.value)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                border: font === f.value ? '2px solid var(--accent)' : '1px solid var(--border2)',
                background: font === f.value ? 'var(--accent-bg)' : 'var(--bg)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: f.family, fontSize: 14, fontWeight: 600, color: font === f.value ? 'var(--accent)' : 'var(--text)' }}>{f.label}</span>
              <span style={{ fontFamily: f.family, fontSize: 12, color: 'var(--text3)' }}>가나다 ABC 123</span>
            </button>
          ))}
        </div>
      </div>

      {/* Save to cloud */}
      <button
        onClick={handleSaveToCloud}
        disabled={saving}
        style={{
          padding: '14px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: saved ? 'var(--green)' : 'var(--accent)',
          color: '#fff',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          transition: 'background .2s',
        }}
      >
        {saving ? '저장 중...' : saved ? '✓ 클라우드 동기화 완료' : '☁️ 클라우드에 설정 저장'}
      </button>

      {/* App info */}
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>₩</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>WhereDidItGo</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>v1.0.0 · Next.js 15 · Supabase</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>kuan-reads와 동일한 계정으로 로그인됩니다</div>
      </div>
    </div>
  )
}
