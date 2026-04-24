'use client'

import { useMemo, useState } from 'react'
import { DonutChart } from '@/components/ui/DonutChart'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { fmtW, pct } from '@/lib/utils'
import type { BudgetCategory, BudgetSetting, BudgetTransaction } from '@/types/database'

interface Props {
  transactions: BudgetTransaction[]
  categories: BudgetCategory[]
  settings: BudgetSetting | null
}

const PERIODS = [
  { id: 'month', label: '이번 달' },
  { id: 'quarter', label: '최근 3개월' },
  { id: 'year', label: '올해' },
  { id: 'all', label: '전체' },
] as const

const VIEWS = [
  { id: 'category', label: '카테고리' },
  { id: 'trend', label: '추이' },
] as const

export function AnalyticsClient({ transactions, categories, settings }: Props) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['id']>('month')
  const [view, setView] = useState<(typeof VIEWS)[number]['id']>('category')

  const filteredTransactions = useMemo(() => {
    if (period === 'all') return transactions

    const now = new Date()
    const cutoff = new Date()

    if (period === 'month') {
      cutoff.setDate(1)
    } else if (period === 'quarter') {
      cutoff.setMonth(now.getMonth() - 2, 1)
    } else if (period === 'year') {
      cutoff.setMonth(0, 1)
    }

    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return transactions.filter((tx) => tx.date >= cutoffStr)
  }, [transactions, period])

  const totalSpent = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0)
  const monthlyBudget = settings?.monthly_budget ?? 2500000
  const average = filteredTransactions.length > 0 ? Math.round(totalSpent / filteredTransactions.length) : 0

  const categorySpend = useMemo(() => {
    const result: Record<string, number> = {}
    for (const tx of filteredTransactions) {
      if (!tx.category_id) continue
      result[tx.category_id] = (result[tx.category_id] || 0) + tx.amount
    }
    return result
  }, [filteredTransactions])

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (categorySpend[b.id] || 0) - (categorySpend[a.id] || 0)),
    [categories, categorySpend],
  )

  const monthly = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      const key = tx.date.slice(0, 7)
      map[key] = (map[key] || 0) + tx.amount
    }

    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, amount]) => ({
        label: `${Number(month.slice(5))}월`,
        amount,
      }))
  }, [transactions])

  const monthlyMax = Math.max(...monthly.map((item) => item.amount), 1)
  const chartSegments = sortedCategories
    .filter((category) => categorySpend[category.id])
    .map((category) => ({ value: categorySpend[category.id], color: category.color }))

  const buttonStyle = (active: boolean) =>
    ({
      padding: '7px 14px',
      borderRadius: 999,
      border: 'none',
      fontSize: 12,
      fontWeight: 800,
      background: active ? 'var(--accent)' : 'var(--bg2)',
      color: active ? '#fff' : 'var(--text2)',
      cursor: 'pointer',
    }) as const

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '18px 22px',
    boxShadow: 'var(--shadow-sm)',
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PERIODS.map((item) => (
            <button key={item.id} type="button" onClick={() => setPeriod(item.id)} style={buttonStyle(period === item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              style={{
                ...buttonStyle(view === item.id),
                background: view === item.id ? 'var(--bg3)' : 'transparent',
                color: view === item.id ? 'var(--text)' : 'var(--text3)',
                border: `1px solid ${view === item.id ? 'var(--border2)' : 'transparent'}`,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[
          { label: '총지출', value: fmtW(totalSpent) },
          { label: '건당 평균', value: fmtW(average) },
          { label: '예산 사용률', value: `${pct(totalSpent, monthlyBudget)}%` },
          { label: '거래 건수', value: `${filteredTransactions.length}건` },
        ].map((item) => (
          <div key={item.label} style={{ ...cardStyle, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
            <div style={{ marginTop: 4, fontSize: 20, fontWeight: 900, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {view === 'category' && (
        <section style={cardStyle}>
          <SectionTitle sub="기간별 카테고리 소비 비중입니다">카테고리 분석</SectionTitle>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <DonutChart
              segments={chartSegments}
              size={180}
              thickness={32}
              label={fmtW(totalSpent)}
              sublabel="총지출"
            />
            <div style={{ flex: 1, minWidth: 220 }}>
              {sortedCategories.map((category, index) => {
                const amount = categorySpend[category.id] || 0
                if (!amount) return null
                return (
                  <div key={category.id} style={{ padding: '10px 0', borderBottom: index < sortedCategories.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        {category.icon} {category.name}
                      </span>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtW(amount)}</span>
                        <span style={{ marginLeft: 6, color: 'var(--text3)' }}>{pct(amount, totalSpent)}%</span>
                      </div>
                    </div>
                    <ProgressBar value={amount} max={Math.max(totalSpent, 1)} color={category.color} height={6} />
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', marginBottom: 12 }}>예산 대비 사용 현황</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedCategories.map((category) => {
                const amount = categorySpend[category.id] || 0
                const budget = category.budget_amount || 0
                if (!amount && !budget) return null
                return (
                  <div key={category.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {category.icon} {category.name}
                      </span>
                      <span style={{ fontSize: 12 }}>
                        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtW(amount)}</strong>
                        {budget > 0 && <span style={{ color: 'var(--text3)' }}> / {fmtW(budget)}</span>}
                      </span>
                    </div>
                    <ProgressBar value={amount} max={budget || Math.max(amount, 1)} color={category.color} />
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {view === 'trend' && (
        <section style={cardStyle}>
          <SectionTitle sub="최근 12개월 지출 흐름입니다">월별 추이</SectionTitle>
          {monthly.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)', fontSize: 13 }}>추이를 계산할 데이터가 아직 없습니다.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180 }}>
              {monthly.map((item, index) => {
                const isLast = index === monthly.length - 1
                const height = Math.max(14, (item.amount / monthlyMax) * 140)
                return (
                  <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: 10, color: isLast ? 'var(--accent)' : 'var(--text3)', fontWeight: 800 }}>{Math.round(item.amount / 10000)}만</div>
                    <div style={{ width: '100%', borderRadius: '8px 8px 0 0', height, background: isLast ? 'var(--accent)' : 'var(--bg3)' }} />
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{item.label}</div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
