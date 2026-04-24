'use client'

import { useMemo, useState } from 'react'
import { downloadCSV, fmtW, pct } from '@/lib/utils'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetCategory, BudgetTransaction } from '@/types/database'

interface Props {
  transactions: BudgetTransaction[]
  categories: BudgetCategory[]
  userId: string
}

export function TransactionsClient({ transactions, categories }: Props) {
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const months = useMemo(() => {
    const unique = Array.from(new Set(transactions.map((tx) => tx.date.slice(0, 7))))
    return unique.sort().reverse().slice(0, 12)
  }, [transactions])

  const filtered = useMemo(() => {
    return [...transactions]
      .filter((tx) => tx.date.startsWith(selectedMonth))
      .filter((tx) => filterCat === 'all' || tx.category?.id === filterCat || tx.category_id === filterCat)
      .filter((tx) => {
        if (!search.trim()) return true
        const keyword = search.trim().toLowerCase()
        return `${tx.merchant} ${tx.memo} ${tx.account}`.toLowerCase().includes(keyword)
      })
      .sort((a, b) => (sortBy === 'date' ? b.date.localeCompare(a.date) : b.amount - a.amount))
  }, [transactions, selectedMonth, filterCat, search, sortBy])

  const total = filtered.reduce((sum, tx) => sum + tx.amount, 0)
  const average = filtered.length > 0 ? Math.round(total / filtered.length) : 0
  const maxValue = filtered.length > 0 ? Math.max(...filtered.map((tx) => tx.amount)) : 0

  const grouped = useMemo(() => {
    const result: Record<string, BudgetTransaction[]> = {}
    for (const tx of filtered) {
      if (!result[tx.date]) result[tx.date] = []
      result[tx.date].push(tx)
    }
    return result
  }, [filtered])

  const groupDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  const exportCSV = () => {
    downloadCSV(
      [
        ['날짜', '사용처', '카테고리', '결제수단', '금액', '메모'],
        ...filtered.map((tx) => [tx.date, tx.merchant, tx.category?.name || '', tx.account, tx.amount, tx.memo]),
      ],
      `transactions-${selectedMonth}.csv`,
    )
  }

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '16px 20px',
    boxShadow: 'var(--shadow-sm)',
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {months.map((month) => (
              <button
                key={month}
                type="button"
                onClick={() => setSelectedMonth(month)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: 'none',
                  background: selectedMonth === month ? 'var(--accent)' : 'var(--bg2)',
                  color: selectedMonth === month ? '#fff' : 'var(--text2)',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {month.replace('-', '.')}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportCSV}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            CSV 내보내기
          </button>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[
          { label: '총지출', value: fmtW(total), color: 'var(--red)' },
          { label: '거래 건수', value: `${filtered.length}건`, color: 'var(--text)' },
          { label: '건당 평균', value: fmtW(average), color: 'var(--text2)' },
          { label: '최대 지출', value: fmtW(maxValue), color: 'var(--accent)' },
        ].map((item) => (
          <div key={item.label} style={{ ...cardStyle, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</div>
            <div style={{ marginTop: 4, fontWeight: 900, fontSize: 20, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
          </div>
        ))}
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="사용처, 메모, 결제수단 검색"
            style={{
              flex: '1 1 220px',
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border2)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 13,
            }}
          />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', fontSize: 13 }}
          >
            <option value="all">전체 카테고리</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
            style={{ padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', fontSize: 13 }}
          >
            <option value="date">날짜순</option>
            <option value="amount">금액순</option>
          </select>
        </div>
      </section>

      <section style={cardStyle}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '42px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>조건에 맞는 지출이 없습니다.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, marginBottom: 8, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{filtered.length}건</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>{fmtW(total)}</span>
            </div>
            {groupDates.map((date) => {
              const dayTotal = grouped[date].reduce((sum, tx) => sum + tx.amount, 0)
              const day = new Date(date)
              return (
                <div key={date} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 6px', fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>
                    <span>
                      {date} ({dayNames[day.getDay()]})
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>-{fmtW(dayTotal)}</span>
                  </div>
                  {grouped[date].map((tx) => {
                    const category = tx.category
                    const color = category?.color || '#9A9088'
                    return (
                      <div
                        key={tx.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '11px 10px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                          {category?.icon || '•'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{tx.merchant || '미입력 사용처'}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                            <span style={{ fontSize: 11, color: color, background: `${color}18`, padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                              {category?.name || '미분류'}
                            </span>
                            {tx.account && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{tx.account}</span>}
                            {tx.memo && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{tx.memo}</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>-{fmtW(tx.amount)}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </>
        )}
      </section>

      <section style={cardStyle}>
        <SectionTitle sub={`${selectedMonth} 카테고리별 합계`}>카테고리 분석</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map((category) => {
            const amount = filtered
              .filter((tx) => tx.category?.id === category.id || tx.category_id === category.id)
              .reduce((sum, tx) => sum + tx.amount, 0)

            if (!amount) return null

            return (
              <div key={category.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                    {category.icon} {category.name}
                  </span>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtW(amount)}</span>
                    <span style={{ color: 'var(--text3)', marginLeft: 6 }}>{pct(amount, total)}%</span>
                  </div>
                </div>
                <ProgressBar value={amount} max={Math.max(total, 1)} color={category.color} height={7} />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
