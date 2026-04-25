'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useWindowSize } from '@/hooks/useWindowSize'
import { fmtW, pct } from '@/lib/utils'
import { DonutChart } from '@/components/ui/DonutChart'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetAsset, BudgetCategory, BudgetSetting, BudgetTransaction } from '@/types/database'

interface Props {
  transactions: BudgetTransaction[]
  categories: BudgetCategory[]
  settings: BudgetSetting | null
  assets: BudgetAsset[]
}

// Static demo data for net worth history and card performance
const NET_WORTH_HISTORY = [
  { label: '11월', amount: 42000000 },
  { label: '12월', amount: 44500000 },
  { label: '1월', amount: 43800000 },
  { label: '2월', amount: 46200000 },
  { label: '3월', amount: 47900000 },
  { label: '4월', amount: 49100000 },
]

const CARD_DEMO = [
  { name: '현대카드', target: 300000, spent: 218000, color: '#2E7D70' },
  { name: '신한카드', target: 500000, spent: 412000, color: '#2563EB' },
  { name: '국민카드', target: 200000, spent: 67000, color: '#7C3AED' },
  { name: '삼성카드', target: 400000, spent: 401000, color: '#E11D48' },
]

export function DashboardClient({ transactions, categories, settings, assets }: Props) {
  const { isMobile } = useWindowSize()
  const router = useRouter()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const monthlyBudget = settings?.monthly_budget ?? 2500000

  const currentMonthStr = now.toISOString().slice(0, 7)
  const thisMonthTx = useMemo(() => transactions.filter(tx => tx.date.startsWith(currentMonthStr)), [transactions, currentMonthStr])
  const totalSpent = useMemo(() => thisMonthTx.reduce((sum, tx) => sum + tx.amount, 0), [thisMonthTx])

  const totalAssets = useMemo(
    () => assets.filter(a => a.asset_type === 'asset').reduce((sum, a) => sum + a.amount, 0),
    [assets]
  )
  const totalLiabilities = useMemo(
    () => assets.filter(a => a.asset_type === 'liability').reduce((sum, a) => sum + Math.abs(a.amount), 0),
    [assets]
  )
  const netWorth = totalAssets - totalLiabilities
  const budgetRate = pct(totalSpent, monthlyBudget)
  const remainingBudget = monthlyBudget - totalSpent

  // Previous month comparison
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthStr = prevMonthDate.toISOString().slice(0, 7)
  const prevMonthSpent = useMemo(() => transactions.filter(tx => tx.date.startsWith(prevMonthStr)).reduce((s, tx) => s + tx.amount, 0), [transactions, prevMonthStr])
  const momDiff = prevMonthSpent > 0 ? Math.round(((totalSpent - prevMonthSpent) / prevMonthSpent) * 100) : 0

  // Prev year same month
  const prevYearStr = `${now.getFullYear() - 1}-${String(currentMonth).padStart(2, '0')}`
  const prevYearSpent = useMemo(() => transactions.filter(tx => tx.date.startsWith(prevYearStr)).reduce((s, tx) => s + tx.amount, 0), [transactions, prevYearStr])

  const daysPassed = Math.max(now.getDate(), 1)
  const averageDaily = Math.round(totalSpent / daysPassed)

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
    .map(c => ({ value: categorySpend[c.id] || 0, color: c.color }))
    .filter(s => s.value > 0)

  const recentTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)

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
        key: month,
      }))
  }, [transactions])

  const trendMax = Math.max(...monthlyTrend.map(i => i.amount), 1)
  const trendAvg = monthlyTrend.length > 0 ? Math.round(monthlyTrend.reduce((s, i) => s + i.amount, 0) / monthlyTrend.length) : 0
  const trendMaxAmount = Math.max(...monthlyTrend.map(i => i.amount), 0)
  const trendMaxMonth = monthlyTrend.find(i => i.amount === trendMaxAmount)

  const nwMax = Math.max(...NET_WORTH_HISTORY.map(i => i.amount), 1)
  const nwFirst = NET_WORTH_HISTORY[0]?.amount || 0
  const nwLast = NET_WORTH_HISTORY[NET_WORTH_HISTORY.length - 1]?.amount || 0
  const nwGrowth = nwLast - nwFirst
  const nwMonthlyAvg = Math.round(nwGrowth / (NET_WORTH_HISTORY.length - 1 || 1))

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: isMobile ? '16px' : '20px 24px',
    boxShadow: 'var(--shadow-sm)',
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hero section */}
      <section style={{
        background: 'linear-gradient(135deg, var(--accent) 0%, #194a44 100%)',
        borderRadius: 'var(--radius)',
        color: '#fff',
        padding: isMobile ? '22px 18px' : '30px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -50, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 700, letterSpacing: '0.06em' }}>
            2026년 {currentMonth}월 · 이달의 지출
          </div>
          <div style={{ marginTop: 8, fontSize: isMobile ? 36 : 50, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {fmtW(totalSpent)}
          </div>
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
            예산 {fmtW(monthlyBudget)} 중 {budgetRate}% 사용 · 잔여{' '}
            {remainingBudget >= 0 ? fmtW(remainingBudget) : `초과 ${fmtW(Math.abs(remainingBudget))}`}
          </div>
          <div style={{ marginTop: 14, height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.2)' }}>
            <div style={{ width: `${Math.min(budgetRate, 100)}%`, height: '100%', borderRadius: 999, background: 'rgba(255,255,255,0.92)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 18 }}>
            <div style={{ padding: '13px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.72, marginBottom: 4 }}>전월 대비</div>
              <div style={{ fontSize: 17, fontWeight: 900 }}>
                {momDiff > 0 ? '▲' : momDiff < 0 ? '▼' : '─'} {Math.abs(momDiff)}%
              </div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{momDiff >= 0 ? '지출 증가' : '지출 감소'}</div>
            </div>
            <div style={{ padding: '13px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.72, marginBottom: 4 }}>전년 동월 대비</div>
              <div style={{ fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                {prevYearSpent > 0 ? fmtW(totalSpent - prevYearSpent) : '데이터 없음'}
              </div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>작년 {currentMonth}월과 비교</div>
            </div>
            <div style={{ padding: '13px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.72, marginBottom: 4 }}>순자산</div>
              <div style={{ fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{fmtW(netWorth)}</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>자산 - 부채</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick stat cards */}
      <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: '총자산', value: fmtW(totalAssets), color: 'var(--green)', sub: '예금·현금·투자' },
          { label: '총부채', value: fmtW(totalLiabilities), color: 'var(--red)', sub: '카드값·대출' },
          { label: '이번 달 거래', value: `${thisMonthTx.length}건`, color: 'var(--accent)', sub: `일 평균 ${fmtW(averageDaily)}` },
          { label: '카드 지출', value: fmtW(totalSpent), color: 'var(--text)', sub: `예산 ${budgetRate}% 사용` },
        ].map(item => (
          <div key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</div>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{item.sub}</div>
          </div>
        ))}
      </section>

      {/* 카테고리별 지출 현황 */}
      <section style={cardStyle}>
        <SectionTitle sub="이달 카테고리별 지출 현황입니다">카테고리별 지출 현황</SectionTitle>
        {sortedCategories.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            카테고리가 아직 없습니다. 먼저 분류를 만들고 지출을 기록해 보세요.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24, flexWrap: isMobile ? 'wrap' : 'nowrap', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <DonutChart
                segments={chartSegments.length > 0 ? chartSegments : [{ value: 1, color: 'var(--bg3)' }]}
                size={isMobile ? 130 : 160}
                thickness={28}
                label={`${budgetRate}%`}
                sublabel="예산 사용"
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', justifyContent: 'center', maxWidth: isMobile ? '100%' : 180 }}>
                {sortedCategories.filter(c => categorySpend[c.id] > 0).slice(0, 6).map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    {c.name}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              {sortedCategories.map(c => {
                const spent = categorySpend[c.id] || 0
                if (!spent && !c.budget_amount) return null
                const overBudget = c.budget_amount > 0 && spent > c.budget_amount
                return (
                  <div
                    key={c.id}
                    onClick={() => router.push('/transactions')}
                    style={{ cursor: 'pointer', padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', transition: 'background var(--t)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ fontSize: 18 }}>{c.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{c.name}</span>
                        {overBudget && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--red)', background: 'var(--red-bg)', padding: '2px 7px', borderRadius: 999, flexShrink: 0 }}>초과</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12, flexShrink: 0 }}>
                        <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtW(spent)}</span>
                        <span style={{ color: 'var(--text3)' }}>
                          {c.budget_amount > 0 ? ` / ${fmtW(c.budget_amount)} · ${pct(spent, c.budget_amount)}%` : ' / 예산 미설정'}
                        </span>
                      </div>
                    </div>
                    <ProgressBar value={spent} max={c.budget_amount || Math.max(spent, 1)} color={c.color} height={5} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* 월별 지출 section */}
      <section style={cardStyle}>
        <SectionTitle sub="최근 6개월 지출 흐름입니다">월별 지출</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: '이번 달', value: fmtW(totalSpent), color: 'var(--accent)' },
            { label: '전월', value: fmtW(prevMonthSpent), color: 'var(--text)' },
            { label: '월 평균', value: fmtW(trendAvg), color: 'var(--text2)' },
            { label: '최고 지출', value: trendMaxMonth ? fmtW(trendMaxMonth.amount) : '-', color: 'var(--red)' },
          ].map(item => (
            <div key={item.label} style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
            </div>
          ))}
        </div>
        {monthlyTrend.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)', fontSize: 13 }}>월별 통계를 만들 데이터가 아직 없습니다.</div>
        ) : (
          <div style={{ position: 'relative', height: 160 }}>
            {/* Dashed average line */}
            {trendMax > 0 && (
              <div style={{
                position: 'absolute',
                left: 0, right: 0,
                bottom: 28 + ((trendAvg / trendMax) * 110),
                borderTop: '1.5px dashed var(--border2)',
                zIndex: 1,
              }} />
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: '100%', paddingBottom: 22 }}>
              {monthlyTrend.map((item, index) => {
                const isCurrentMonth = index === monthlyTrend.length - 1
                const isHighest = item.amount === trendMaxAmount
                const barHeight = Math.max(12, (item.amount / trendMax) * 110)
                const barColor = isCurrentMonth ? 'var(--accent)' : isHighest ? 'var(--red-bg)' : 'var(--bg3)'
                return (
                  <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: isCurrentMonth ? 'var(--accent)' : 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round(item.amount / 10000)}만
                    </div>
                    <div style={{ width: '100%', maxWidth: 44, height: barHeight, borderRadius: '8px 8px 0 0', background: barColor }} />
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* 최근 지출 내역 + 신용카드 실적 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr 0.9fr', gap: 20 }}>
        <section style={cardStyle}>
          <SectionTitle action={{ label: '전체 보기', fn: () => router.push('/transactions') }}>최근 지출 내역</SectionTitle>
          {recentTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)', fontSize: 13 }}>
              아직 기록된 지출이 없습니다.
            </div>
          ) : (
            recentTransactions.map((tx, index) => {
              const category = tx.category
              return (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: index < recentTransactions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: `${category?.color || '#9A9088'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                    {category?.icon || '•'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.merchant || '미입력 사용처'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{category?.name || '기타'} · {tx.account || '결제수단 미입력'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>-{fmtW(tx.amount)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{tx.date.slice(5)}</div>
                  </div>
                </div>
              )
            })
          )}
        </section>

        {/* 신용카드 실적 - static demo data */}
        <section style={cardStyle}>
          <SectionTitle sub="데모 데이터 · 카드 실적 현황">신용카드 실적</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {CARD_DEMO.map(card => {
              const rate = pct(card.spent, card.target)
              const achieved = rate >= 100
              return (
                <div key={card.name} style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>{card.name}</div>
                    {achieved && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: card.color, background: `${card.color}22`, padding: '2px 6px', borderRadius: 999 }}>실적달성</span>
                    )}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: card.color, fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>{rate}%</div>
                  <ProgressBar value={card.spent} max={card.target} color={card.color} height={4} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text3)' }}>
                    <span>{fmtW(card.spent)}</span>
                    <span>목표 {fmtW(card.target)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* 자산 현황 section */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
        {/* 자산 목록 */}
        <section style={cardStyle}>
          <SectionTitle>자산 현황</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: '총자산', value: fmtW(totalAssets), color: 'var(--green)' },
              { label: '총부채', value: fmtW(totalLiabilities), color: 'var(--red)' },
              { label: '순자산', value: fmtW(netWorth), color: 'var(--accent)' },
            ].map(item => (
              <div key={item.label} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: item.color, fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>{item.value}</div>
              </div>
            ))}
          </div>
          {assets.slice(0, 5).map((asset, index) => (
            <div key={asset.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: index < Math.min(assets.length, 5) - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: asset.asset_type === 'asset' ? 'var(--accent-bg)' : 'var(--red-bg)', color: asset.asset_type === 'asset' ? 'var(--accent)' : 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
                {asset.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{asset.name}</div>
                {asset.note && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{asset.note}</div>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: asset.asset_type === 'liability' ? 'var(--red)' : 'var(--text)' }}>
                {asset.asset_type === 'liability' ? '-' : ''}{fmtW(Math.abs(asset.amount))}
              </div>
            </div>
          ))}
        </section>

        {/* 월별 순자산 추이 - static demo data */}
        <section style={cardStyle}>
          <SectionTitle sub="데모 데이터 · 최근 6개월 순자산 추이">월별 순자산 추이</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 130, marginBottom: 12 }}>
            {NET_WORTH_HISTORY.map((item, index) => {
              const isLast = index === NET_WORTH_HISTORY.length - 1
              const barH = Math.max(12, (item.amount / nwMax) * 100)
              return (
                <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isLast ? 'var(--accent)' : 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(item.amount / 10000000)}천
                  </div>
                  <div style={{ width: '100%', maxWidth: 44, height: barH, borderRadius: '6px 6px 0 0', background: isLast ? 'var(--accent)' : 'var(--teal-bg)' }} />
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.label}</div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>6개월 증가액</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--green)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>+{fmtW(nwGrowth)}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>월 평균 증가</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>+{fmtW(nwMonthlyAvg)}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
