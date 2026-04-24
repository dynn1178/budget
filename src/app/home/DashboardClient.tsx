'use client'
import { useMemo } from 'react'
import { useWindowSize } from '@/hooks/useWindowSize'
import { fmtW, pct } from '@/lib/utils'
import { DonutChart } from '@/components/ui/DonutChart'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetTransaction, BudgetCategory, BudgetSetting, BudgetAsset } from '@/types/database'

interface Props {
  transactions: BudgetTransaction[]
  categories: BudgetCategory[]
  settings: BudgetSetting | null
  assets: BudgetAsset[]
}

const MONTHLY_HISTORY = [
  { m:'11월', a:1820000 }, { m:'12월', a:2100000 }, { m:'1월', a:1950000 },
  { m:'2월', a:2280000 }, { m:'3월', a:2150000 },
]

export function DashboardClient({ transactions, categories, settings, assets }: Props) {
  const { isMobile, isTablet } = useWindowSize()

  const monthlyBudget = settings?.monthly_budget ?? 2500000
  const totalSpent = useMemo(() => transactions.reduce((s, t) => s + t.amount, 0), [transactions])
  const budgetPct = pct(totalSpent, monthlyBudget)

  const totalAssets = assets.filter(a => a.asset_type === 'asset').reduce((s, a) => s + a.amount, 0)
  const totalLiab   = assets.filter(a => a.asset_type === 'liability').reduce((s, a) => s + Math.abs(a.amount), 0)
  const netWorth    = totalAssets - totalLiab

  // 카테고리별 지출 집계
  const catSpent = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.forEach(t => {
      if (t.category_id) map[t.category_id] = (map[t.category_id] || 0) + t.amount
    })
    return map
  }, [transactions])

  const sortedCats = [...categories].sort((a, b) => (catSpent[b.id] || 0) - (catSpent[a.id] || 0))
  const catSegments = sortedCats.map(c => ({ value: catSpent[c.id] || 0, color: c.color })).filter(s => s.value > 0)

  const currentMonth = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
  const allMonthly = [...MONTHLY_HISTORY, { m: `${new Date().getMonth()+1}월`, a: totalSpent }]
  const monthlyMax = Math.max(...allMonthly.map(d => d.a))

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: isMobile ? '16px' : '20px 24px', boxShadow: 'var(--shadow-sm)' } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--accent) 0%, #1A5C54 100%)',
        borderRadius: 'var(--radius)', padding: isMobile ? '20px 18px' : '28px 32px',
        color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ fontSize: 12, opacity: .75, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{currentMonth} · 이달의 지출</div>
        <div style={{ fontWeight: 900, fontSize: isMobile ? 34 : 44, letterSpacing: '-1.5px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{fmtW(totalSpent)}</div>
        <div style={{ fontSize: 13, opacity: .8, marginTop: 8 }}>예산 {fmtW(monthlyBudget)} 중 {budgetPct}% 사용 · 잔여 {fmtW(monthlyBudget - totalSpent)}</div>
        <div style={{ marginTop: 12, height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(budgetPct, 100)}%`, background: 'rgba(255,255,255,0.85)', borderRadius: 99, transition: 'width .5s ease' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: isMobile ? 10 : 20, marginTop: 18 }}>
          {[
            { label: '이번 달 거래', value: `${transactions.length}건`, note: `일평균 ${(transactions.length / new Date().getDate()).toFixed(1)}건` },
            { label: '총 자산', value: fmtW(totalAssets), note: '현금·투자 포함' },
            { label: '순자산', value: fmtW(netWorth), note: '자산 - 부채' },
          ].map(item => (
            <div key={item.label} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.12)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, opacity: .7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginTop: 4 }}>{item.value}</div>
              <div style={{ fontSize: 11, opacity: .7, marginTop: 2 }}>{item.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12 }}>
        <StatCard icon="📈" label="총 자산" value={fmtW(totalAssets)} sub="현금·투자·부동산 등" />
        <StatCard icon="📉" label="총 부채" value={fmtW(totalLiab)} sub="카드·대출" color="var(--red)" />
        <StatCard icon="📅" label="이번 달 거래" value={`${transactions.length}건`} sub={`예산 ${budgetPct}% 사용`} />
        <StatCard icon="💰" label="순자산" value={fmtW(netWorth)} color="var(--accent)" />
      </div>

      {/* ── 카테고리 현황 ── */}
      <div style={card}>
        <SectionTitle sub="카테고리별 예산 사용 현황">카테고리별 지출 현황</SectionTitle>
        <div style={{ display: 'flex', gap: isMobile ? 16 : 28, alignItems: 'flex-start', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <DonutChart
              segments={catSegments.length > 0 ? catSegments : [{ value: 1, color: 'var(--bg3)' }]}
              size={isMobile ? 130 : 160} thickness={28}
              label={`${budgetPct}%`} sublabel="예산 사용"
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 170 }}>
              {sortedCats.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedCats.map(c => {
              const spent = catSpent[c.id] || 0
              const over = spent > c.budget_amount
              return (
                <div key={c.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 14 }}>{c.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
                      {over && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', background: 'var(--red-bg)', padding: '1px 6px', borderRadius: 99 }}>초과</span>}
                    </div>
                    <div style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: over ? 'var(--red)' : 'var(--text)' }}>{fmtW(spent)}</span>
                      <span style={{ color: 'var(--text3)', fontSize: 11 }}> / {fmtW(c.budget_amount)}</span>
                      <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>{pct(spent, c.budget_amount)}%</span>
                    </div>
                  </div>
                  <ProgressBar value={spent} max={c.budget_amount} color={c.color} height={6} />
                </div>
              )
            })}
            {categories.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text3)', padding: '20px 0', textAlign: 'center' }}>카테고리가 없습니다</div>
            )}
          </div>
        </div>
      </div>

      {/* ── 월별 지출 ── */}
      <div style={card}>
        <SectionTitle sub="최근 6개월 지출 추이">월별 지출</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>
          {allMonthly.map((d, i) => {
            const isLast = i === allMonthly.length - 1
            const barH = Math.max(4, (d.a / monthlyMax) * 110)
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                {isLast && <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{Math.round(d.a / 10000)}만</div>}
                <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: isLast ? 'var(--accent)' : 'var(--bg3)', height: barH, transition: 'height .3s ease', minHeight: 4 }} />
                <div style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center' }}>{d.m}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 최근 지출 내역 ── */}
      <div style={card}>
        <SectionTitle action={{ label: '전체 보기 →', fn: () => { location.href = '/transactions' } }}>최근 지출 내역</SectionTitle>
        {transactions.slice(0, 8).map((t, i, arr) => {
          const cat = t.category as BudgetCategory | undefined
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: (cat?.color || '#9A9088') + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                {cat?.icon || '📦'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant || '(미입력)'}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{t.account}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>-{fmtW(t.amount)}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{t.date.slice(5).replace('-', '.')}</div>
              </div>
            </div>
          )
        })}
        {transactions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✏️</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>이번 달 지출 내역이 없습니다</div>
            <a href="/entry" style={{ display: 'inline-block', marginTop: 12, padding: '8px 16px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>첫 지출 기록하기</a>
          </div>
        )}
      </div>

      {/* ── 자산 현황 ── */}
      {assets.length > 0 && (
        <div style={card}>
          <SectionTitle sub="자산·부채 현황">자산 현황</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: '총 자산', value: fmtW(totalAssets), color: 'var(--green)' },
              { label: '총 부채', value: fmtW(totalLiab), color: 'var(--red)' },
              { label: '순자산', value: fmtW(netWorth), color: 'var(--accent)' },
            ].map(item => (
              <div key={item.label} style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: item.color, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {assets.slice(0, 6).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{a.icon}</span>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.name}</div>
                <div style={{ fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: a.asset_type === 'asset' ? 'var(--text)' : 'var(--red)' }}>
                  {a.asset_type === 'liability' ? '-' : ''}{fmtW(Math.abs(a.amount))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
