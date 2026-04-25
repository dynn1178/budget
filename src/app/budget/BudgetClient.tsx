'use client'

import { useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtW, pct } from '@/lib/utils'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetCategory, BudgetSetting, BudgetMonthlySetting } from '@/types/database'

interface HistoryTx { amount: number; date: string; category_id: string | null }

interface Props {
  categories:          BudgetCategory[]
  settings:            BudgetSetting | null
  monthlySettings:     BudgetMonthlySetting[]
  historyTransactions: HistoryTx[]
  userId:              string
}

const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

export function BudgetClient({ categories, settings, monthlySettings: initMonthlySettings, historyTransactions, userId }: Props) {
  const sb  = createClient()
  const now = new Date()
  const thisYear  = now.getFullYear()
  const thisMonth = now.getMonth() + 1

  const [monthlySettings, setMonthlySettings] = useState(initMonthlySettings)
  const [selYear,  setSelYear]  = useState(thisYear)
  const [selMonth, setSelMonth] = useState(thisMonth)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [copyMsg, setCopyMsg] = useState('')

  // ── 선택된 월의 설정 로드
  const selSetting = useMemo(
    () => monthlySettings.find(s => s.year === selYear && s.month === selMonth),
    [monthlySettings, selYear, selMonth]
  )

  const [monthlyBudget, setMonthlyBudget] = useState<string>(
    String(selSetting?.budget_amount ?? settings?.monthly_budget ?? 2500000)
  )
  const [catBudgets, setCatBudgets] = useState<Record<string, string>>(
    () => {
      const cb = selSetting?.category_budgets ?? {}
      return Object.fromEntries(
        categories.map(c => [c.id, cb[c.id] != null ? String(cb[c.id]) : (c.budget_amount > 0 ? String(c.budget_amount) : '')])
      )
    }
  )

  // 월이 바뀌면 해당 월 예산 불러오기
  const loadMonth = useCallback((year: number, month: number) => {
    setSelYear(year)
    setSelMonth(month)
    const s = monthlySettings.find(ms => ms.year === year && ms.month === month)
    setMonthlyBudget(String(s?.budget_amount ?? settings?.monthly_budget ?? 2500000))
    const cb = s?.category_budgets ?? {}
    setCatBudgets(
      Object.fromEntries(
        categories.map(c => [c.id, cb[c.id] != null ? String(cb[c.id]) : (c.budget_amount > 0 ? String(c.budget_amount) : '')])
      )
    )
  }, [monthlySettings, settings, categories])

  // 이전 달 불러오기
  const loadPrevMonth = () => {
    const prevDate = new Date(selYear, selMonth - 2, 1)
    const py = prevDate.getFullYear()
    const pm = prevDate.getMonth() + 1
    const prev = monthlySettings.find(s => s.year === py && s.month === pm)
    if (!prev) { setCopyMsg('이전 달 예산이 없습니다.'); setTimeout(() => setCopyMsg(''), 2500); return }
    setMonthlyBudget(String(prev.budget_amount))
    const cb = prev.category_budgets ?? {}
    setCatBudgets(Object.fromEntries(categories.map(c => [c.id, cb[c.id] != null ? String(cb[c.id]) : ''])))
    setCopyMsg(`${pm}월 예산을 불러왔습니다.`)
    setTimeout(() => setCopyMsg(''), 2500)
  }

  // 카테고리 기본값 적용 (budget_categories.budget_amount)
  const loadDefaults = () => {
    setCatBudgets(Object.fromEntries(categories.map(c => [c.id, c.budget_amount > 0 ? String(c.budget_amount) : ''])))
    setCopyMsg('카테고리 기본값을 적용했습니다.')
    setTimeout(() => setCopyMsg(''), 2500)
  }

  // ── 선택 월 거래 데이터
  const selTransactions = useMemo(() =>
    historyTransactions.filter(t => {
      const d = new Date(t.date)
      return d.getFullYear() === selYear && d.getMonth() + 1 === selMonth
    }),
    [historyTransactions, selYear, selMonth]
  )

  const totalSpent    = selTransactions.reduce((sum, t) => sum + t.amount, 0)
  const budget        = Number(monthlyBudget) || 0
  const remaining     = budget - totalSpent
  const isOver        = remaining < 0
  const budgetRate    = pct(totalSpent, budget)
  const totalCatBudget = Object.values(catBudgets).reduce((sum, v) => sum + (Number(v) || 0), 0)

  const catSpent = useMemo(() =>
    selTransactions.reduce<Record<string, number>>((acc, t) => {
      if (t.category_id) acc[t.category_id] = (acc[t.category_id] || 0) + t.amount
      return acc
    }, {}),
    [selTransactions]
  )

  // ── 12개월 히스토리 (차트)
  const history = useMemo(() => {
    const months = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - 1 - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const s = monthlySettings.find(ms => ms.year === y && ms.month === m)
      const spent = historyTransactions
        .filter(t => { const td = new Date(t.date); return td.getFullYear() === y && td.getMonth() + 1 === m })
        .reduce((sum, t) => sum + t.amount, 0)
      const bgt  = s?.budget_amount ?? 0
      const rate = bgt > 0 ? Math.round((spent / bgt) * 100) : 0
      months.push({ year: y, month: m, label: MONTH_KO[m - 1], budget: bgt, spent, rate })
    }
    return months
  }, [monthlySettings, historyTransactions, thisYear, thisMonth])

  const historyMax = Math.max(...history.map(h => Math.max(h.budget, h.spent)), 1)

  const handleSave = async () => {
    setSaving(true)
    const budgetNum = Number(monthlyBudget) || 0
    const catBudgetsNum: Record<string, number> = {}
    for (const [id, v] of Object.entries(catBudgets)) {
      catBudgetsNum[id] = Number(v) || 0
    }

    const { data: newSetting } = await sb
      .from('budget_monthly_settings')
      .upsert(
        { user_id: userId, year: selYear, month: selMonth, budget_amount: budgetNum, category_budgets: catBudgetsNum },
        { onConflict: 'user_id,year,month' }
      )
      .select()
      .single()

    if (newSetting) {
      setMonthlySettings(prev => {
        const filtered = prev.filter(s => !(s.year === selYear && s.month === selMonth))
        return [...filtered, newSetting]
      })
    }

    if (selYear === thisYear && selMonth === thisMonth) {
      await sb.from('budget_settings').upsert(
        { user_id: userId, monthly_budget: budgetNum },
        { onConflict: 'user_id' }
      )
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ── 연/월 선택기
  const yearOptions = [thisYear - 1, thisYear, thisYear + 1]
  const isCurrentMonth = selYear === thisYear && selMonth === thisMonth
  const isPast = selYear < thisYear || (selYear === thisYear && selMonth < thisMonth)

  const cardStyle = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)',
  } as const

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6,
  }

  const selStyle = {
    padding: '7px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: 14, cursor: 'pointer', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 월 선택 헤더 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>예산 설정</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>월을 선택해 예산을 설정하세요</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select value={selYear} onChange={e => loadMonth(Number(e.target.value), selMonth)} style={selStyle}>
              {yearOptions.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={selMonth} onChange={e => loadMonth(selYear, Number(e.target.value))} style={selStyle}>
              {MONTH_KO.map((label, i) => <option key={i + 1} value={i + 1}>{label}</option>)}
            </select>
            {isCurrentMonth && (
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '3px 8px', borderRadius: 999 }}>
                이번 달
              </span>
            )}
            {isPast && !isCurrentMonth && (
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', background: 'var(--bg2)', padding: '3px 8px', borderRadius: 999 }}>
                과거
              </span>
            )}
          </div>
        </div>

        {/* 복사/템플릿 버튼 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadPrevMonth}
            style={{ padding: '7px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            ← 이전 달 불러오기
          </button>
          <button
            type="button"
            onClick={loadDefaults}
            style={{ padding: '7px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            카테고리 기본값 적용
          </button>
        </div>
        {copyMsg && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>{copyMsg}</div>
        )}
      </div>

      {/* 선택 월 예산 현황 */}
      <div style={cardStyle}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
          {selYear}년 {MONTH_KO[selMonth - 1]} 예산 현황
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: '월 예산',       value: fmtW(budget),                   color: 'var(--accent)' },
            { label: '실지출',         value: fmtW(totalSpent),               color: 'var(--red)'   },
            { label: isOver ? '초과' : '남은 예산', value: fmtW(Math.abs(remaining)), color: isOver ? 'var(--red)' : 'var(--green)' },
          ].map(item => (
            <div key={item.label} style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: item.color, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
            </div>
          ))}
        </div>
        {budget > 0 && (
          <>
            <ProgressBar value={totalSpent} max={budget} color={isOver ? 'var(--red)' : 'var(--accent)'} height={10} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
              <span>사용률 {budgetRate}%</span>
              <span style={{ color: isOver ? 'var(--red)' : 'var(--text3)', fontWeight: isOver ? 700 : 400 }}>
                {isOver ? `${fmtW(Math.abs(remaining))} 초과` : `${fmtW(remaining)} 남음`}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 월 예산 입력 */}
      <div style={cardStyle}>
        <SectionTitle sub={`${selYear}년 ${MONTH_KO[selMonth - 1]} 지출 한도`}>월 예산 설정</SectionTitle>
        <label style={labelStyle}>월 예산 (원)</label>
        <input
          type="number"
          placeholder="2500000"
          value={monthlyBudget}
          onChange={e => setMonthlyBudget(e.target.value)}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 'var(--radius-sm)',
            border: '2px solid var(--accent)', boxShadow: '0 0 0 3px var(--accent-bg)',
            background: 'var(--surface)', color: 'var(--text)', fontSize: 20, fontWeight: 800,
            fontVariantNumeric: 'tabular-nums', outline: 'none', boxSizing: 'border-box' as const,
          }}
        />
        {monthlyBudget && (
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: 'var(--text2)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {fmtW(Number(monthlyBudget) || 0)}
          </div>
        )}
        {totalCatBudget > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>카테고리 합계:</span>
            <span style={{ fontWeight: 700, color: totalCatBudget > budget ? 'var(--red)' : 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
              {fmtW(totalCatBudget)}
            </span>
            {totalCatBudget > budget && <span style={{ color: 'var(--red)', fontWeight: 700 }}>초과</span>}
          </div>
        )}
      </div>

      {/* 카테고리별 예산 */}
      <div style={cardStyle}>
        <SectionTitle sub="카테고리별 지출 한도">카테고리별 예산</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {categories.map(c => {
            const spent     = catSpent[c.id] || 0
            const catBudget = Number(catBudgets[c.id]) || 0
            const over      = catBudget > 0 && spent > catBudget
            return (
              <div key={c.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: c.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {c.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: over ? 'var(--red)' : 'var(--text3)', fontWeight: over ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>
                      지출 {fmtW(spent)}{catBudget > 0 && ` / 예산 ${fmtW(catBudget)}`}
                      {over && ' — 초과'}
                    </div>
                  </div>
                  <input
                    type="number"
                    placeholder="예산 없음"
                    value={catBudgets[c.id] || ''}
                    onChange={e => setCatBudgets(prev => ({ ...prev, [c.id]: e.target.value }))}
                    style={{
                      width: 140, padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                      border: over ? '1.5px solid var(--red)' : '1px solid var(--border2)',
                      background: 'var(--surface)', color: 'var(--text)', fontSize: 14,
                      textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums',
                      outline: 'none', flexShrink: 0,
                    }}
                  />
                </div>
                {catBudget > 0 && <ProgressBar value={spent} max={catBudget} color={c.color} height={5} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* 저장 버튼 */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: '14px', borderRadius: 'var(--radius-sm)', border: 'none',
          background: saved ? 'var(--green)' : 'var(--accent)', color: '#fff',
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 800,
          cursor: 'pointer', transition: 'background .2s',
          boxShadow: saved ? 'none' : '0 4px 14px var(--accent-bg)',
        }}
      >
        {saving ? '저장 중...' : saved ? `✓ ${selYear}년 ${MONTH_KO[selMonth - 1]} 저장 완료` : `${selYear}년 ${MONTH_KO[selMonth - 1]} 예산 저장`}
      </button>

      {/* 월별 추이 차트 */}
      <div style={cardStyle}>
        <SectionTitle sub="최근 12개월 예산 vs 실지출">월별 예산 추이</SectionTitle>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, marginBottom: 8 }}>
          {history.map((h, idx) => {
            const isSelected = h.year === selYear && h.month === selMonth
            const budgetH = h.budget > 0 ? Math.max(8, (h.budget / historyMax) * 100) : 0
            const spentH  = h.spent  > 0 ? Math.max(4, (h.spent  / historyMax) * 100) : 0
            return (
              <button
                key={idx}
                type="button"
                onClick={() => loadMonth(h.year, h.month)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div style={{ width: '100%', display: 'flex', gap: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{ flex: 1, height: budgetH, background: isSelected ? 'var(--accent-bg)' : 'var(--border)', borderRadius: '3px 3px 0 0', border: isSelected ? '1px solid var(--accent)' : 'none' }} />
                  <div style={{ flex: 1, height: spentH, background: h.spent > h.budget && h.budget > 0 ? 'var(--red)' : isSelected ? 'var(--accent)' : 'var(--text3)', borderRadius: '3px 3px 0 0', opacity: isSelected ? 1 : 0.6 }} />
                </div>
                <div style={{ fontSize: 9, color: isSelected ? 'var(--accent)' : 'var(--text3)', fontWeight: isSelected ? 800 : 500, whiteSpace: 'nowrap' }}>
                  {h.label}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 11, color: 'var(--text3)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--border)', border: '1px solid var(--text3)' }} />예산
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--text3)' }} />실지출
          </span>
          <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 4 }}>막대 클릭 → 해당 월로 이동</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr 60px', gap: 8, padding: '6px 8px', fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>
            <span>월</span><span style={{ textAlign: 'right' }}>예산</span><span style={{ textAlign: 'right' }}>실지출</span><span style={{ textAlign: 'right' }}>달성률</span>
          </div>
          {[...history].reverse().map((h, idx) => {
            const isSelected = h.year === selYear && h.month === selMonth
            const over = h.budget > 0 && h.spent > h.budget
            const rateColor = over ? 'var(--red)' : h.rate >= 80 ? 'var(--accent)' : 'var(--green)'
            return (
              <button
                key={idx}
                type="button"
                onClick={() => loadMonth(h.year, h.month)}
                style={{
                  display: 'grid', gridTemplateColumns: '64px 1fr 1fr 60px', gap: 8,
                  padding: '8px', borderRadius: 8,
                  background: isSelected ? 'var(--accent-bg)' : 'transparent',
                  fontSize: 12, fontVariantNumeric: 'tabular-nums', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontWeight: isSelected ? 800 : 500, color: isSelected ? 'var(--accent)' : 'var(--text2)' }}>
                  {h.year !== thisYear ? `${h.year}/` : ''}{h.label}
                  {isSelected && <span style={{ fontSize: 9, marginLeft: 3, color: 'var(--accent)' }}>●</span>}
                </span>
                <span style={{ textAlign: 'right', color: 'var(--text2)' }}>
                  {h.budget > 0 ? fmtW(h.budget) : <span style={{ color: 'var(--border2)' }}>—</span>}
                </span>
                <span style={{ textAlign: 'right', color: over ? 'var(--red)' : 'var(--text)' }}>
                  {h.spent > 0 ? fmtW(h.spent) : <span style={{ color: 'var(--border2)' }}>—</span>}
                </span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: h.budget > 0 ? rateColor : 'var(--border2)' }}>
                  {h.budget > 0 ? `${h.rate}%` : '—'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
