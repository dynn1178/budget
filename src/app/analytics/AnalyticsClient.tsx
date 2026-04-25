'use client'

import { useMemo, useState } from 'react'
import { DonutChart } from '@/components/ui/DonutChart'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { useWindowSize } from '@/hooks/useWindowSize'
import { fmtW, pct } from '@/lib/utils'
import type { BudgetCategory, BudgetSetting, BudgetTransaction } from '@/types/database'

interface Props {
  transactions: BudgetTransaction[]
  categories: BudgetCategory[]
  settings: BudgetSetting | null
}

// Static demo data for card performance
const CARD_MOCK = [
  { name: '현대카드', target: 300000, spent: 218000, color: '#2E7D70', benefit: '스타벅스 50% 할인' },
  { name: '신한카드', target: 500000, spent: 412000, color: '#2563EB', benefit: '주유 리터당 100원 할인' },
  { name: '국민카드', target: 200000, spent: 67000, color: '#7C3AED', benefit: '영화 2천원 할인' },
  { name: '삼성카드', target: 400000, spent: 401000, color: '#E11D48', benefit: '배달앱 5% 캐시백' },
]

// Static demo data for net worth history
const NET_WORTH_HISTORY = [
  { label: '11월', amount: 42000000 },
  { label: '12월', amount: 44500000 },
  { label: '1월', amount: 43800000 },
  { label: '2월', amount: 46200000 },
  { label: '3월', amount: 47900000 },
  { label: '4월', amount: 49100000 },
]

const VIEWS = [
  { id: 'category', label: '카테고리' },
  { id: 'card', label: '카드별' },
  { id: 'compare', label: '기간 비교' },
  { id: 'trend', label: '추이' },
] as const

export function AnalyticsClient({ transactions, categories, settings }: Props) {
  const { isMobile } = useWindowSize()
  const [view, setView] = useState<(typeof VIEWS)[number]['id']>('category')
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())

  const currentMonthStr = new Date().toISOString().slice(0, 7)
  const monthlyBudget = settings?.monthly_budget ?? 2500000

  // Current month transactions
  const thisMonthTx = useMemo(() => transactions.filter(tx => tx.date.startsWith(currentMonthStr)), [transactions, currentMonthStr])
  const totalSpent = thisMonthTx.reduce((sum, tx) => sum + tx.amount, 0)

  const categorySpend = useMemo(() => {
    const result: Record<string, number> = {}
    for (const tx of thisMonthTx) {
      if (!tx.category_id) continue
      result[tx.category_id] = (result[tx.category_id] || 0) + tx.amount
    }
    return result
  }, [thisMonthTx])

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (categorySpend[b.id] || 0) - (categorySpend[a.id] || 0)),
    [categories, categorySpend]
  )

  const chartSegments = sortedCategories
    .filter(c => categorySpend[c.id])
    .map(c => ({ value: categorySpend[c.id], color: c.color }))

  // Monthly trend
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
        key: month,
      }))
  }, [transactions])

  const monthlyMax = Math.max(...monthly.map(i => i.amount), 1)
  const monthlyAvg = monthly.length > 0 ? Math.round(monthly.reduce((s, i) => s + i.amount, 0) / monthly.length) : 0

  // Year comparison (current vs previous year by month)
  const yearCompare = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    return months.map(m => {
      const mStr = String(m).padStart(2, '0')
      const curKey = `${selectedYear}-${mStr}`
      const prevKey = `${selectedYear - 1}-${mStr}`
      const cur = transactions.filter(tx => tx.date.startsWith(curKey)).reduce((s, tx) => s + tx.amount, 0)
      const prev = transactions.filter(tx => tx.date.startsWith(prevKey)).reduce((s, tx) => s + tx.amount, 0)
      return { label: `${m}월`, cur, prev }
    })
  }, [transactions, selectedYear])

  const compareMax = Math.max(...yearCompare.flatMap(d => [d.cur, d.prev]), 1)

  const nwMax = Math.max(...NET_WORTH_HISTORY.map(i => i.amount), 1)
  const nwFirst = NET_WORTH_HISTORY[0]?.amount || 0
  const nwLast = NET_WORTH_HISTORY[NET_WORTH_HISTORY.length - 1]?.amount || 0
  const nwGrowth = nwLast - nwFirst
  const nwMonthlyAvg = Math.round(nwGrowth / (NET_WORTH_HISTORY.length - 1 || 1))

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '18px 22px',
    boxShadow: 'var(--shadow-sm)',
  } as const

  const chipBtn = (active: boolean) => ({
    padding: '7px 14px',
    borderRadius: 999,
    border: 'none',
    fontSize: 13,
    fontWeight: 800,
    background: active ? 'var(--accent)' : 'var(--bg2)',
    color: active ? '#fff' : 'var(--text2)',
    cursor: 'pointer',
  } as const)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* View tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '4px', background: 'var(--bg2)', borderRadius: 'var(--radius-sm)' }}>
        {VIEWS.map(v => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 'var(--radius-xs)',
              border: 'none',
              fontSize: 13,
              fontWeight: 800,
              background: view === v.id ? 'var(--surface)' : 'transparent',
              color: view === v.id ? 'var(--accent)' : 'var(--text3)',
              cursor: 'pointer',
              boxShadow: view === v.id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* 카테고리 view */}
      {view === 'category' && (
        <>
          <section style={cardStyle}>
            <SectionTitle sub="이번 달 카테고리 소비 비중입니다">카테고리 분석</SectionTitle>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <DonutChart
                  segments={chartSegments.length > 0 ? chartSegments : [{ value: 1, color: 'var(--bg3)' }]}
                  size={isMobile ? 130 : 180}
                  thickness={32}
                  label={fmtW(totalSpent)}
                  sublabel="총지출"
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', justifyContent: 'center' }}>
                  {sortedCategories.filter(c => categorySpend[c.id] > 0).map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                      {c.name}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {sortedCategories.map(c => {
                  const amount = categorySpend[c.id] || 0
                  if (!amount) return null
                  return (
                    <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{c.icon} {c.name}</span>
                        <div style={{ fontSize: 12, textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtW(amount)}</span>
                          <span style={{ marginLeft: 6, color: 'var(--text3)' }}>{pct(amount, totalSpent)}%</span>
                        </div>
                      </div>
                      <ProgressBar value={amount} max={Math.max(totalSpent, 1)} color={c.color} height={6} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Budget vs Actual */}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', marginBottom: 12 }}>예산 대비 사용 현황</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sortedCategories.map(c => {
                  const amount = categorySpend[c.id] || 0
                  const budget = c.budget_amount || 0
                  if (!amount && !budget) return null
                  const over = budget > 0 && amount > budget
                  return (
                    <div key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{c.icon} {c.name}</span>
                        <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {over && <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--red)', background: 'var(--red-bg)', padding: '2px 6px', borderRadius: 999 }}>초과</span>}
                          <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtW(amount)}</span>
                          {budget > 0 && <span style={{ color: 'var(--text3)' }}>/ {fmtW(budget)}</span>}
                        </div>
                      </div>
                      <ProgressBar value={amount} max={budget || Math.max(amount, 1)} color={c.color} />
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </>
      )}

      {/* 카드별 view — MOCK data */}
      {view === 'card' && (
        <section style={cardStyle}>
          <SectionTitle sub="데모 데이터 · 실제 카드 실적은 연동 후 표시됩니다">카드별 실적</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {CARD_MOCK.map(card => {
              const rate = pct(card.spent, card.target)
              const achieved = rate >= 100
              return (
                <div key={card.name} style={{ padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{card.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{card.benefit}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: card.color, fontVariantNumeric: 'tabular-nums' }}>{rate}%</div>
                      {achieved && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: card.color, background: `${card.color}22`, padding: '2px 8px', borderRadius: 999 }}>실적달성</span>
                      )}
                    </div>
                  </div>
                  <ProgressBar value={card.spent} max={card.target} color={card.color} height={8} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--text3)' }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>사용 {fmtW(card.spent)}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>목표 {fmtW(card.target)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 기간 비교 view */}
      {view === 'compare' && (
        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <SectionTitle sub={`${selectedYear}년 vs ${selectedYear - 1}년 월별 비교`}>기간 비교</SectionTitle>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => setSelectedYear(y => y - 1)} style={chipBtn(false)}>◀</button>
              <span style={{ fontSize: 14, fontWeight: 800, padding: '7px 12px', color: 'var(--text)' }}>{selectedYear}년</span>
              <button type="button" onClick={() => setSelectedYear(y => y + 1)} style={chipBtn(false)}>▶</button>
            </div>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent)' }} />
              <span style={{ color: 'var(--text2)' }}>{selectedYear}년</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--bg3)' }} />
              <span style={{ color: 'var(--text2)' }}>{selectedYear - 1}년</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 2 : 4, height: 180, overflowX: 'auto' }}>
            {yearCompare.map(item => {
              const curH = Math.max(4, (item.cur / compareMax) * 140)
              const prevH = Math.max(4, (item.prev / compareMax) * 140)
              return (
                <div key={item.label} style={{ flex: 1, minWidth: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                    <div style={{ width: isMobile ? 8 : 14, height: prevH, borderRadius: '4px 4px 0 0', background: 'var(--bg3)' }} />
                    <div style={{ width: isMobile ? 8 : 14, height: curH, borderRadius: '4px 4px 0 0', background: 'var(--accent)' }} />
                  </div>
                  <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{item.label}</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 추이 view */}
      {view === 'trend' && (
        <>
          <section style={cardStyle}>
            <SectionTitle sub="최근 12개월 지출 흐름입니다">월별 지출 추이</SectionTitle>
            <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
              <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>월 평균 지출</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>{fmtW(monthlyAvg)}</div>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>이번 달 예산 사용률</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>{pct(totalSpent, monthlyBudget)}%</div>
              </div>
            </div>
            {monthly.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)', fontSize: 13 }}>추이를 계산할 데이터가 아직 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 160 }}>
                {monthly.map((item, index) => {
                  const isLast = index === monthly.length - 1
                  const h = Math.max(12, (item.amount / monthlyMax) * 120)
                  return (
                    <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ fontSize: 10, color: isLast ? 'var(--accent)' : 'var(--text3)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{Math.round(item.amount / 10000)}만</div>
                      <div style={{ width: '100%', borderRadius: '6px 6px 0 0', height: h, background: isLast ? 'var(--accent)' : 'var(--bg3)' }} />
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{item.label}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* 순자산 추이 — static demo data */}
          <section style={cardStyle}>
            <SectionTitle sub="데모 데이터 · 최근 6개월 순자산 추이">순자산 추이</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, marginBottom: 14 }}>
              {NET_WORTH_HISTORY.map((item, index) => {
                const isLast = index === NET_WORTH_HISTORY.length - 1
                const barH = Math.max(14, (item.amount / nwMax) * 110)
                return (
                  <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isLast ? 'var(--accent)' : 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(item.amount / 10000000)}천만
                    </div>
                    <div style={{ width: '100%', maxWidth: 48, height: barH, borderRadius: '8px 8px 0 0', background: isLast ? 'var(--accent)' : 'var(--teal-bg)' }} />
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.label}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>6개월 증가액</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--green)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>+{fmtW(nwGrowth)}</div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>월 평균 증가</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>+{fmtW(nwMonthlyAvg)}</div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
