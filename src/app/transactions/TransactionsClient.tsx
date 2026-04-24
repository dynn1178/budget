'use client'
import { useState, useMemo } from 'react'
import { fmtW, pct, downloadCSV } from '@/lib/utils'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetTransaction, BudgetCategory } from '@/types/database'

interface Props {
  transactions: BudgetTransaction[]
  categories: BudgetCategory[]
  userId: string
}

export function TransactionsClient({ transactions, categories }: Props) {
  const [filterCat,  setFilterCat]  = useState('all')
  const [search,     setSearch]     = useState('')
  const [sortBy,     setSortBy]     = useState('date')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const months = useMemo(() => {
    const set = new Set(transactions.map(t => t.date.slice(0, 7)))
    return Array.from(set).sort().reverse().slice(0, 6)
  }, [transactions])

  const filtered = useMemo(() => transactions
    .filter(t => t.date.startsWith(selectedMonth))
    .filter(t => filterCat === 'all' || (t.category as BudgetCategory)?.id === filterCat)
    .filter(t => !search || t.merchant.includes(search) || t.memo.includes(search))
    .sort((a, b) => sortBy === 'date' ? b.date.localeCompare(a.date) : b.amount - a.amount),
  [transactions, selectedMonth, filterCat, search, sortBy])

  const total = filtered.reduce((s, t) => s + t.amount, 0)

  const grouped = useMemo(() => filtered.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = []
    acc[t.date].push(t)
    return acc
  }, {} as Record<string, BudgetTransaction[]>), [filtered])
  const groupDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  const exportCSV = () => {
    downloadCSV(
      [['날짜', '가맹점', '카테고리', '계정', '금액', '메모'],
       ...filtered.map(t => [t.date, t.merchant, (t.category as BudgetCategory)?.name || '', t.account, t.amount, t.memo])],
      `지출내역_${selectedMonth}.csv`
    )
  }

  const catColor = (t: BudgetTransaction) => (t.category as BudgetCategory)?.color || '#9A9088'

  const chip = (active: boolean) => ({
    padding: '5px 12px', borderRadius: 99, border: 'none',
    fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700,
    background: active ? 'var(--accent)' : 'var(--bg2)',
    color: active ? '#fff' : 'var(--text2)', cursor: 'pointer',
    whiteSpace: 'nowrap' as const, transition: 'all .16s',
  })

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow-sm)' } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Month + export */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {months.map(m => (
              <button key={m} style={chip(selectedMonth === m)} onClick={() => setSelectedMonth(m)}>
                {m.slice(5)}월
              </button>
            ))}
          </div>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700 }}>
            📥 CSV 내보내기
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: '총 지출', value: fmtW(total), color: 'var(--red)' },
          { label: '거래 건수', value: `${filtered.length}건`, color: 'var(--text)' },
          { label: '일 평균', value: fmtW(Math.round(total / 30)), color: 'var(--text2)' },
          { label: '최대 지출', value: fmtW(Math.max(...filtered.map(t => t.amount), 0)), color: 'var(--accent)' },
        ].map(item => (
          <div key={item.label} style={{ ...card, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: item.color, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--text)', background: 'var(--surface)', outline: 'none', maxWidth: 200, flex: 1 }}
            placeholder="🔍 가맹점 검색" value={search} onChange={e => setSearch(e.target.value)}
          />
          <select style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--text2)', background: 'var(--surface)', outline: 'none', cursor: 'pointer' }}
            value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="all">전체 카테고리</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--text2)', background: 'var(--surface)', outline: 'none', cursor: 'pointer' }}
            value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="date">날짜순</option>
            <option value="amount">금액순</option>
          </select>
        </div>
      </div>

      {/* Transaction list */}
      <div style={card}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
            <div style={{ fontWeight: 600 }}>검색 결과가 없습니다</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottom: '2px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>총 {filtered.length}건</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>{fmtW(total)}</span>
            </div>
            {groupDates.map(date => {
              const dayTotal = grouped[date].reduce((s, t) => s + t.amount, 0)
              const d = new Date(date)
              return (
                <div key={date}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text3)', padding: '10px 0 6px', letterSpacing: '0.04em' }}>
                    <span>{date.slice(5).replace('-', '.')} ({dayNames[d.getDay()]})</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>-{fmtW(dayTotal)}</span>
                  </div>
                  {grouped[date].map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 'var(--radius-sm)', marginBottom: 2, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: catColor(t) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                        {(t.category as BudgetCategory)?.icon || '📦'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant || '(미입력)'}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: catColor(t) + '22', color: catColor(t), fontWeight: 700 }}>{(t.category as BudgetCategory)?.name || '미분류'}</span>
                          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{t.account}</span>
                          {t.memo && <span style={{ fontSize: 10, color: 'var(--text3)' }}>· {t.memo}</span>}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--red)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>-{fmtW(t.amount)}</div>
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Category breakdown */}
      <div style={card}>
        <SectionTitle sub={`${selectedMonth} 카테고리별 합계`}>카테고리 합계</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map(c => {
            const catTotal = filtered.filter(t => (t.category as BudgetCategory)?.id === c.id).reduce((s, t) => s + t.amount, 0)
            if (!catTotal) return null
            return (
              <div key={c.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>{c.icon} {c.name}</span>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{fmtW(catTotal)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{pct(catTotal, total)}%</span>
                  </div>
                </div>
                <ProgressBar value={catTotal} max={total} color={c.color} height={7} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
