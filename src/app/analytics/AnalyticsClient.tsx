'use client'
import { useState, useMemo } from 'react'
import { fmtW, pct } from '@/lib/utils'
import { DonutChart } from '@/components/ui/DonutChart'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetTransaction, BudgetCategory, BudgetSetting } from '@/types/database'

interface Props {
  transactions: BudgetTransaction[]
  categories: BudgetCategory[]
  settings: BudgetSetting | null
}

const PERIODS = [
  { id: 'month', label: '이번 달' },
  { id: 'quarter', label: '3개월' },
  { id: 'year', label: '올해' },
  { id: 'all', label: '전체' },
]

const VIEWS = [
  { id: 'category', label: '카테고리' },
  { id: 'trend', label: '추이' },
]

export function AnalyticsClient({ transactions, categories, settings }: Props) {
  const [period, setPeriod] = useState('month')
  const [view, setView] = useState('category')

  const now = new Date()
  const filteredTx = useMemo(() => {
    const cutoff = new Date()
    if (period === 'month') cutoff.setDate(1)
    else if (period === 'quarter') cutoff.setMonth(now.getMonth() - 3)
    else if (period === 'year') cutoff.setMonth(0, 1)
    else return transactions
    return transactions.filter(t => t.date >= cutoff.toISOString().slice(0, 10))
  }, [transactions, period])

  const totalSpent = filteredTx.reduce((s, t) => s + t.amount, 0)
  const monthlyBudget = settings?.monthly_budget ?? 2500000

  const catSpent = useMemo(() => {
    const map: Record<string, number> = {}
    filteredTx.forEach(t => {
      if (t.category_id) map[t.category_id] = (map[t.category_id] || 0) + t.amount
    })
    return map
  }, [filteredTx])

  const sortedCats = [...categories].sort((a, b) => (catSpent[b.id] || 0) - (catSpent[a.id] || 0))

  // 월별 집계
  const monthly = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.forEach(t => {
      const m = t.date.slice(0, 7)
      map[m] = (map[m] || 0) + t.amount
    })
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-12).map(([m, a]) => ({ m: `${parseInt(m.slice(5))}월`, a }))
  }, [transactions])

  const monthlyMax = Math.max(...monthly.map(d => d.a), 1)

  const filterBtn = (active: boolean) => ({
    padding: '6px 14px', borderRadius: 99, border: 'none',
    fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700,
    background: active ? 'var(--accent)' : 'var(--bg2)',
    color: active ? '#fff' : 'var(--text2)', cursor: 'pointer',
  })

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 22px', boxShadow: 'var(--shadow-sm)' } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PERIODS.map(p => <button key={p.id} style={filterBtn(period === p.id)} onClick={() => setPeriod(p.id)}>{p.label}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {VIEWS.map(v => (
            <button key={v.id} style={{ ...filterBtn(false), background: view === v.id ? 'var(--bg3)' : 'transparent', color: view === v.id ? 'var(--text)' : 'var(--text3)', border: view === v.id ? '1px solid var(--border2)' : '1px solid transparent' }}
              onClick={() => setView(v.id)}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: '총 지출', value: fmtW(totalSpent) },
          { label: '일 평균', value: fmtW(Math.round(totalSpent / Math.max(new Date().getDate(), 1))) },
          { label: '예산 사용률', value: `${pct(totalSpent, monthlyBudget)}%` },
          { label: '거래 건수', value: `${filteredTx.length}건` },
        ].map(item => (
          <div key={item.label} style={{ ...card, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{item.label}</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Category view */}
      {view === 'category' && (
        <div style={card}>
          <SectionTitle sub="카테고리별 지출 상세 분석">카테고리 분석</SectionTitle>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
            <DonutChart
              segments={sortedCats.filter(c => catSpent[c.id]).map(c => ({ value: catSpent[c.id] || 0, color: c.color }))}
              size={180} thickness={32}
              label={fmtW(totalSpent)} sublabel="총 지출"
            />
            <div style={{ flex: 1, minWidth: 180 }}>
              {sortedCats.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < sortedCats.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{c.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                    <ProgressBar value={catSpent[c.id] || 0} max={totalSpent} color={c.color} height={4} />
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtW(catSpent[c.id] || 0)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{pct(catSpent[c.id] || 0, totalSpent)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>예산 vs 실제 지출</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedCats.map(c => {
                const spent = catSpent[c.id] || 0
                const over = c.budget_amount > 0 && spent > c.budget_amount
                return (
                  <div key={c.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{c.icon} {c.name}</span>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: over ? 'var(--red)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtW(spent)}</span>
                        {c.budget_amount > 0 && <span style={{ color: 'var(--text3)' }}> / {fmtW(c.budget_amount)}</span>}
                        {over && <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>초과</span>}
                      </div>
                    </div>
                    {c.budget_amount > 0 && <ProgressBar value={spent} max={c.budget_amount} color={c.color} height={6} />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Trend view */}
      {view === 'trend' && (
        <div style={card}>
          <SectionTitle sub="월별 지출 추이">추이 분석</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160 }}>
            {monthly.map((d, i) => {
              const isLast = i === monthly.length - 1
              const barH = Math.max(4, (d.a / monthlyMax) * 130)
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  {isLast && <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{Math.round(d.a / 10000)}만</div>}
                  <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: isLast ? 'var(--accent)' : 'var(--bg3)', height: barH, minHeight: 4 }} />
                  <div style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center' }}>{d.m}</div>
                </div>
              )
            })}
          </div>
          {monthly.length === 0 && <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)', fontSize: 13 }}>데이터가 없습니다</div>}
        </div>
      )}
    </div>
  )
}
