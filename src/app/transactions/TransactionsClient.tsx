'use client'

import { useMemo, useState } from 'react'
import { downloadCSV, fmtW, pct } from '@/lib/utils'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { useWindowSize } from '@/hooks/useWindowSize'
import type { BudgetCategory, BudgetTransaction } from '@/types/database'

interface Props {
  transactions: BudgetTransaction[]
  categories: BudgetCategory[]
  userId: string
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export function TransactionsClient({ transactions, categories }: Props) {
  const { isMobile } = useWindowSize()
  const [filterCat, setFilterCat] = useState('all')
  const [filterAccount, setFilterAccount] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))

  const months = useMemo(() => {
    const unique = Array.from(new Set(transactions.map(tx => tx.date.slice(0, 7))))
    return unique.sort().reverse().slice(0, 12)
  }, [transactions])

  const accounts = useMemo(() => {
    const unique = Array.from(new Set(transactions.map(tx => tx.account).filter(Boolean)))
    return unique.sort()
  }, [transactions])

  const filtered = useMemo(() => {
    return [...transactions]
      .filter(tx => tx.date.startsWith(selectedMonth))
      .filter(tx => filterCat === 'all' || tx.category?.id === filterCat || tx.category_id === filterCat)
      .filter(tx => filterAccount === 'all' || tx.account === filterAccount)
      .filter(tx => {
        if (!search.trim()) return true
        const keyword = search.trim().toLowerCase()
        return `${tx.merchant} ${tx.memo} ${tx.account}`.toLowerCase().includes(keyword)
      })
      .sort((a, b) => sortBy === 'date' ? b.date.localeCompare(a.date) : b.amount - a.amount)
  }, [transactions, selectedMonth, filterCat, filterAccount, search, sortBy])

  const total = filtered.reduce((sum, tx) => sum + tx.amount, 0)
  const dayCount = (() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    return new Date(y, m, 0).getDate()
  })()
  const dailyAverage = total > 0 ? Math.round(total / dayCount) : 0
  const maxValue = filtered.length > 0 ? Math.max(...filtered.map(tx => tx.amount)) : 0

  const grouped = useMemo(() => {
    const result: Record<string, BudgetTransaction[]> = {}
    for (const tx of filtered) {
      if (!result[tx.date]) result[tx.date] = []
      result[tx.date].push(tx)
    }
    return result
  }, [filtered])

  const groupDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const exportCSV = () => {
    downloadCSV(
      [
        ['날짜', '사용처', '카테고리', '결제수단', '금액', '메모'],
        ...filtered.map(tx => [tx.date, tx.merchant, tx.category?.name || '', tx.account, tx.amount, tx.memo]),
      ],
      `transactions-${selectedMonth}.csv`
    )
  }

  const getMonthLabel = (month: string) => {
    const [y, m] = month.split('-')
    const currentYear = new Date().getFullYear()
    if (Number(y) !== currentYear) return `'${y.slice(2)}/${m}월`
    return `${Number(m)}월`
  }

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '16px 20px',
    boxShadow: 'var(--shadow-sm)',
  } as const

  const selectStyle = {
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border2)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 13,
    cursor: 'pointer',
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Month chip selector + CSV button */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {months.map(month => (
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
                {getMonthLabel(month)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportCSV}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border2)',
              background: 'var(--bg)',
              color: 'var(--text2)',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            CSV 내보내기
          </button>
        </div>
      </section>

      {/* 4 summary cards */}
      <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: '총 지출', value: fmtW(total), color: 'var(--red)' },
          { label: '거래 건수', value: `${filtered.length}건`, color: 'var(--text)' },
          { label: '일 평균', value: fmtW(dailyAverage), color: 'var(--text2)' },
          { label: '최대 지출', value: fmtW(maxValue), color: 'var(--accent)' },
        ].map(item => (
          <div key={item.label} style={{ ...cardStyle, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</div>
            <div style={{ marginTop: 4, fontWeight: 900, fontSize: 20, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
          </div>
        ))}
      </section>

      {/* Filter bar */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="사용처, 메모, 결제수단 검색"
            style={{
              flex: '1 1 200px',
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border2)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 13,
            }}
          />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={selectStyle}>
            <option value="all">전체 카테고리</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} style={selectStyle}>
            <option value="all">전체 결제수단</option>
            {accounts.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'date' | 'amount')} style={selectStyle}>
            <option value="date">날짜순</option>
            <option value="amount">금액순</option>
          </select>
        </div>
      </section>

      {/* Transaction list */}
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
            {groupDates.map(date => {
              const dayTotal = grouped[date].reduce((sum, tx) => sum + tx.amount, 0)
              const d = new Date(date)
              const dayOfWeek = DAY_NAMES[d.getDay()]
              const isSat = d.getDay() === 6
              const isSun = d.getDay() === 0
              const dayColor = isSat ? 'var(--accent)' : isSun ? 'var(--red)' : 'var(--text3)'
              return (
                <div key={date} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 6px', fontSize: 12, color: 'var(--text3)', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
                    <span>
                      {date.slice(5).replace('-', '.')}
                      <span style={{ marginLeft: 6, color: dayColor }}>({dayOfWeek})</span>
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>-{fmtW(dayTotal)}</span>
                  </div>
                  {grouped[date].map(tx => {
                    const category = tx.category
                    const color = category?.color || '#9A9088'
                    return (
                      <div
                        key={tx.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px', borderRadius: 'var(--radius-xs)' }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                          {category?.icon || '•'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.merchant || '미입력 사용처'}</div>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 3, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color, background: `${color}18`, padding: '2px 7px', borderRadius: 999, fontWeight: 700 }}>
                              {category?.name || '미분류'}
                            </span>
                            {tx.account && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{tx.account}</span>}
                            {tx.memo && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{tx.memo}</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--red)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>-{fmtW(tx.amount)}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </>
        )}
      </section>

      {/* Category breakdown */}
      <section style={cardStyle}>
        <SectionTitle sub={`${selectedMonth} 카테고리별 합계`}>카테고리 분석</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map(c => {
            const amount = filtered
              .filter(tx => tx.category?.id === c.id || tx.category_id === c.id)
              .reduce((sum, tx) => sum + tx.amount, 0)
            if (!amount) return null
            return (
              <div key={c.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                  </span>
                  <div style={{ fontSize: 12, textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtW(amount)}</span>
                    <span style={{ color: 'var(--text3)', marginLeft: 6 }}>{pct(amount, total)}%</span>
                  </div>
                </div>
                <ProgressBar value={amount} max={Math.max(total, 1)} color={c.color} height={6} />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
