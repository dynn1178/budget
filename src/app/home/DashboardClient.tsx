'use client'

import { useMemo } from 'react'
import { useWindowSize } from '@/hooks/useWindowSize'
import { fmtW, pct } from '@/lib/utils'
import { DonutChart } from '@/components/ui/DonutChart'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetAsset, BudgetCategory, BudgetSetting, BudgetTransaction } from '@/types/database'

interface Props {
  transactions: BudgetTransaction[]
  categories: BudgetCategory[]
  settings: BudgetSetting | null
  assets: BudgetAsset[]
}

export function DashboardClient({ transactions, categories, settings, assets }: Props) {
  const { isMobile } = useWindowSize()

  const monthlyBudget = settings?.monthly_budget ?? 2500000
  const totalSpent = useMemo(() => transactions.reduce((sum, tx) => sum + tx.amount, 0), [transactions])
  const totalAssets = useMemo(
    () => assets.filter((asset) => asset.asset_type === 'asset').reduce((sum, asset) => sum + asset.amount, 0),
    [assets],
  )
  const totalLiabilities = useMemo(
    () =>
      assets
        .filter((asset) => asset.asset_type === 'liability')
        .reduce((sum, asset) => sum + Math.abs(asset.amount), 0),
    [assets],
  )
  const netWorth = totalAssets - totalLiabilities
  const budgetRate = pct(totalSpent, monthlyBudget)

  const categorySpend = useMemo(() => {
    const result: Record<string, number> = {}
    for (const tx of transactions) {
      if (!tx.category_id) continue
      result[tx.category_id] = (result[tx.category_id] || 0) + tx.amount
    }
    return result
  }, [transactions])

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (categorySpend[b.id] || 0) - (categorySpend[a.id] || 0)),
    [categories, categorySpend],
  )

  const chartSegments = sortedCategories
    .map((category) => ({ value: categorySpend[category.id] || 0, color: category.color }))
    .filter((segment) => segment.value > 0)

  const recentTransactions = transactions.slice(0, 8)
  const daysPassed = Math.max(new Date().getDate(), 1)
  const averageDaily = Math.round(totalSpent / daysPassed)
  const remainingBudget = monthlyBudget - totalSpent

  const monthlyTrend = useMemo(() => {
    const map: Record<string, number> = {}
    for (const tx of transactions) {
      const key = tx.date.slice(0, 7)
      map[key] = (map[key] || 0) + tx.amount
    }

    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, amount]) => ({
        label: `${Number(month.slice(5))}월`,
        amount,
      }))
  }, [transactions])

  const trendMax = Math.max(...monthlyTrend.map((item) => item.amount), 1)

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: isMobile ? '16px' : '20px 24px',
    boxShadow: 'var(--shadow-sm)',
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, #194a44 100%)',
          borderRadius: 'var(--radius)',
          color: '#fff',
          padding: isMobile ? '22px 18px' : '30px 32px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -40,
            top: -30,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, opacity: 0.78, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            이번 달 총지출
          </div>
          <div style={{ marginTop: 8, fontSize: isMobile ? 34 : 46, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {fmtW(totalSpent)}
          </div>
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
            월 예산 {fmtW(monthlyBudget)} 중 {budgetRate}% 사용, {remainingBudget >= 0 ? `남은 금액 ${fmtW(remainingBudget)}` : `초과 금액 ${fmtW(Math.abs(remainingBudget))}`}
          </div>
          <div style={{ marginTop: 14, height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.18)' }}>
            <div
              style={{
                width: `${Math.min(budgetRate, 100)}%`,
                height: '100%',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.92)',
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
              gap: 12,
              marginTop: 18,
            }}
          >
            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>평균 일지출</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{fmtW(averageDaily)}</div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>거래 건수</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{transactions.length}건</div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>순자산</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{fmtW(netWorth)}</div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        <StatCard label="총자산" value={fmtW(totalAssets)} sub="예금, 현금, 투자" color="var(--green)" />
        <StatCard label="총부채" value={fmtW(totalLiabilities)} sub="카드값, 대출" color="var(--red)" />
        <StatCard label="예산 사용률" value={`${budgetRate}%`} sub={`남은 예산 ${fmtW(Math.max(remainingBudget, 0))}`} />
        <StatCard label="이번 달 기록" value={`${transactions.length}건`} sub="카드값과 현금 지출 포함" color="var(--accent)" />
      </section>

      <section style={cardStyle}>
        <SectionTitle sub="어디에 가장 많이 쓰고 있는지 한눈에 볼 수 있어요">카테고리 예산 현황</SectionTitle>
        {sortedCategories.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            카테고리가 아직 없습니다. 먼저 분류를 만들고 지출을 기록해 보세요.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24, flexWrap: isMobile ? 'wrap' : 'nowrap', alignItems: 'flex-start' }}>
            <div style={{ minWidth: isMobile ? '100%' : 180, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <DonutChart
                segments={chartSegments.length > 0 ? chartSegments : [{ value: 1, color: 'var(--bg3)' }]}
                size={isMobile ? 150 : 180}
                thickness={30}
                label={`${budgetRate}%`}
                sublabel="예산 사용"
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sortedCategories.map((category) => {
                const spent = categorySpend[category.id] || 0
                const overBudget = category.budget_amount > 0 && spent > category.budget_amount
                return (
                  <div key={category.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{category.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{category.name}</span>
                        {overBudget && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--red)', background: 'var(--red-bg)', padding: '2px 7px', borderRadius: 999 }}>
                            초과
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12 }}>
                        <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtW(spent)}</span>
                        <span style={{ color: 'var(--text3)' }}>
                          {category.budget_amount > 0 ? ` / ${fmtW(category.budget_amount)}` : ' / 예산 미설정'}
                        </span>
                      </div>
                    </div>
                    <ProgressBar value={spent} max={category.budget_amount || Math.max(spent, 1)} color={category.color} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr .9fr', gap: 20 }}>
        <section style={cardStyle}>
          <SectionTitle action={{ label: '전체 보기', fn: () => (window.location.href = '/transactions') }}>최근 지출 내역</SectionTitle>
          {recentTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)', fontSize: 13 }}>
              아직 기록된 지출이 없습니다. 첫 지출을 추가해 보세요.
            </div>
          ) : (
            recentTransactions.map((tx, index) => {
              const category = tx.category
              return (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: index < recentTransactions.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: `${category?.color || '#9A9088'}22`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 17,
                      flexShrink: 0,
                    }}
                  >
                    {category?.icon || '•'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{tx.merchant || '미입력 사용처'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                      {(category?.name || '기타')} · {tx.account || '결제수단 미입력'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>-{fmtW(tx.amount)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{tx.date}</div>
                  </div>
                </div>
              )
            })
          )}
        </section>

        <section style={cardStyle}>
          <SectionTitle sub="최근 월별 지출 흐름입니다">월별 추이</SectionTitle>
          {monthlyTrend.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)', fontSize: 13 }}>월별 통계를 만들 데이터가 아직 없습니다.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, minHeight: 180 }}>
              {monthlyTrend.map((item, index) => {
                const height = Math.max(16, (item.amount / trendMax) * 132)
                const isCurrent = index === monthlyTrend.length - 1
                return (
                  <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: isCurrent ? 'var(--accent)' : 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(item.amount / 10000)}만
                    </div>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 42,
                        height,
                        borderRadius: '10px 10px 0 0',
                        background: isCurrent ? 'var(--accent)' : 'var(--bg3)',
                      }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.label}</div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
