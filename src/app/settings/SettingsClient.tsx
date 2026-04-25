'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useSettings } from '@/hooks/useSettings'
import { Toggle } from '@/components/ui/Toggle'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { downloadCSV } from '@/lib/utils'
import type { BudgetSetting, ThemeType, AccentType, FontType } from '@/types/database'

interface Props {
  settings: BudgetSetting | null
  userId: string
  userEmail: string
  userName: string
  userAvatar: string | null
}

const THEMES: { value: ThemeType; label: string; bg: string; surface: string; accent: string }[] = [
  { value: 'light', label: '라이트', bg: '#F4F1EC', surface: '#FFFFFF', accent: '#7C5C3E' },
  { value: 'dark', label: '다크', bg: '#151210', surface: '#1E1A17', accent: '#C8936A' },
  { value: 'grey', label: '그레이', bg: '#F0F0F0', surface: '#FFFFFF', accent: '#4A4A4A' },
  { value: 'sepia', label: '세피아', bg: '#F5ECD7', surface: '#FEFBF3', accent: '#8B5E3C' },
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

const PREVIEW_SENTENCE = '오늘 스타벅스에서 6,500원을 지출했습니다'

export function SettingsClient({ settings, userId, userEmail, userName, userAvatar }: Props) {
  const sb = createClient()
  const router = useRouter()
  const { theme, accent, font, setTheme, setAccent, setFont } = useSettings()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [notify80, setNotify80] = useState(true)
  const [notifyOver, setNotifyOver] = useState(true)
  const [notifyMonthly, setNotifyMonthly] = useState(false)
  const [cloudSync, setCloudSync] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveToCloud = async () => {
    setSaving(true)
    await sb.from('budget_settings').upsert(
      { user_id: userId, theme, accent, font },
      { onConflict: 'user_id' }
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }

  const handleExportJSON = async () => {
    const { data: txData } = await sb.from('budget_transactions').select('*').eq('user_id', userId)
    const { data: catData } = await sb.from('budget_categories').select('*').eq('user_id', userId)
    const { data: assetData } = await sb.from('budget_assets').select('*').eq('user_id', userId)
    const exportObj = {
      exported_at: new Date().toISOString(),
      transactions: txData || [],
      categories: catData || [],
      assets: assetData || [],
    }
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = async () => {
    const { data } = await sb.from('budget_transactions').select('*, category:budget_categories(name)').eq('user_id', userId)
    if (!data) return
    downloadCSV(
      [
        ['날짜', '사용처', '카테고리', '결제수단', '금액', '메모'],
        ...data.map((tx: { date: string; merchant: string; category?: { name?: string } | null; account: string; amount: number; memo: string }) => [
          tx.date, tx.merchant,
          (tx.category && typeof tx.category === 'object' && 'name' in tx.category && tx.category.name) ? String(tx.category.name) : '',
          tx.account, tx.amount, tx.memo
        ]),
      ],
      `budget-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    )
  }

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        alert(`백업 파일 확인: 거래 ${data.transactions?.length || 0}건, 카테고리 ${data.categories?.length || 0}개`)
      } catch {
        alert('JSON 파일을 읽을 수 없습니다.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
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

      {/* 계정 */}
      <div style={cardStyle}>
        <SectionTitle>계정</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
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
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 13 }}>🔐</span>
              Google 계정으로 로그인됨
            </div>
          </div>
        </div>
        <form action="/auth/signout" method="POST">
          <button type="submit" style={{ padding: '9px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', background: 'var(--bg2)', color: 'var(--text2)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            로그아웃
          </button>
        </form>
      </div>

      {/* 테마 설정 */}
      <div style={cardStyle}>
        <SectionTitle sub="배경 및 전체 색조를 선택합니다">테마 설정</SectionTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {THEMES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                border: theme === t.value ? '2px solid var(--accent)' : '1px solid var(--border2)',
                background: theme === t.value ? 'var(--accent-bg)' : 'var(--bg)',
                cursor: 'pointer', minWidth: 72,
              }}
            >
              {/* 3-layer preview */}
              <div style={{ position: 'relative', width: 36, height: 28 }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 36, height: 22, borderRadius: 6, background: t.bg, border: '1px solid rgba(0,0,0,.1)' }} />
                <div style={{ position: 'absolute', top: 5, left: 4, width: 28, height: 16, borderRadius: 4, background: t.surface, border: '1px solid rgba(0,0,0,.08)' }} />
                <div style={{ position: 'absolute', top: 9, left: 8, width: 10, height: 8, borderRadius: 2, background: t.accent }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: theme === t.value ? 'var(--accent)' : 'var(--text2)' }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 강조 색상 */}
      <div style={cardStyle}>
        <SectionTitle sub="강조 색상을 선택합니다">강조 색상</SectionTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {ACCENTS.map(a => (
            <button
              key={a.value}
              type="button"
              onClick={() => setAccent(a.value)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                border: accent === a.value ? '2px solid var(--accent)' : '1px solid var(--border2)',
                background: accent === a.value ? 'var(--accent-bg)' : 'var(--bg)',
                cursor: 'pointer', minWidth: 56,
              }}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: a.color, boxShadow: accent === a.value ? `0 0 0 3px ${a.color}40` : 'none' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: accent === a.value ? 'var(--accent)' : 'var(--text2)' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 폰트 설정 */}
      <div style={cardStyle}>
        <SectionTitle sub="앱 전체 폰트를 변경합니다">폰트 설정</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FONTS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFont(f.value)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                border: font === f.value ? '2px solid var(--accent)' : '1px solid var(--border2)',
                background: font === f.value ? 'var(--accent-bg)' : 'var(--bg)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: f.family, fontSize: 14, fontWeight: 600, color: font === f.value ? 'var(--accent)' : 'var(--text)' }}>{f.label}</span>
              <span style={{ fontFamily: f.family, fontSize: 12, color: 'var(--text3)' }}>{PREVIEW_SENTENCE}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 카테고리 관리 link card */}
      <div style={cardStyle}>
        <SectionTitle>카테고리 관리</SectionTitle>
        <button
          type="button"
          onClick={() => router.push('/categories')}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border2)', background: 'var(--bg)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🏷️</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>지출 카테고리</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>아이콘, 색상, 예산 설정</div>
            </div>
          </div>
          <span style={{ color: 'var(--text3)', fontSize: 16 }}>›</span>
        </button>
      </div>

      {/* 알림·동기화 */}
      <div style={cardStyle}>
        <SectionTitle sub="알림 및 동기화 설정입니다">알림 · 동기화</SectionTitle>
        {[
          { label: '예산 80% 알림', sub: '지출이 예산의 80%에 달하면 알립니다', value: notify80, toggle: () => setNotify80(v => !v) },
          { label: '예산 초과 알림', sub: '월 예산을 초과했을 때 알립니다', value: notifyOver, toggle: () => setNotifyOver(v => !v) },
          { label: '월간 리포트', sub: '매월 1일 지난달 요약을 이메일로 보냅니다', value: notifyMonthly, toggle: () => setNotifyMonthly(v => !v) },
          { label: '클라우드 동기화', sub: '설정을 자동으로 클라우드에 저장합니다', value: cloudSync, toggle: () => setCloudSync(v => !v) },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{item.sub}</div>
            </div>
            <Toggle checked={item.value} onChange={item.toggle} />
          </div>
        ))}
      </div>

      {/* 데이터 백업·복원 */}
      <div style={cardStyle}>
        <SectionTitle sub="데이터를 내보내거나 불러옵니다">데이터 백업 · 복원</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            onClick={handleExportJSON}
            style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <span style={{ fontSize: 18 }}>📦</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>JSON 내보내기</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>전체 데이터 백업 파일 다운로드</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <span style={{ fontSize: 18 }}>📂</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>JSON 가져오기</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>백업 파일에서 데이터 복원</div>
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
          <button
            type="button"
            onClick={handleExportCSV}
            style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <span style={{ fontSize: 18 }}>📊</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>CSV 내보내기</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>엑셀 호환 형식으로 내보내기</div>
            </div>
          </button>
        </div>
      </div>

      {/* Save to cloud button */}
      <button
        type="button"
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
      </div>
    </div>
  )
}
