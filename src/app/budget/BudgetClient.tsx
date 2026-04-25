'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtW, pct } from '@/lib/utils'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetCategory, BudgetSetting, BudgetMonthlySetting } from '@/types/database'

interface Tx { amount: number; category_id: string | null }
interface HistoryTx { amount: number; date: string }

interface Props {
  categories: BudgetCategory[]
  settings: BudgetSetting | null
  transactions: Tx[]
  monthlySettings: BudgetMonthlySetting[]
  historyTransactions: HistoryTx[]
  userId: string
}

const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

export function BudgetClient({
  categories,
  settings,
  transactions,
  monthlySettings: initialMonthlySettings,
  historyTransactions,
  userId,
}: Props) {
  const sb = createClient()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [monthlySettings, setMonthlySettings] = useState(initialMonthlySettings)

  const thisMonthSetting = monthlySettings.find(
    s => s.year === currentYear && s.month === currentMonth
  )

  const [monthlyBudget, setMonthlyBudget] = useState(
    String(thisMonthSetting?.budget_amount ?? settings?.monthly_budget ?? 2500000)
  )
  const [catBudgets, setCatBudgets] = useState<Record<string, string>>(
    Object.fromEntries(
      categories.map(c => [c.id, c.budget_amount > 0 ? String(c.budget_amount) : ''])
    )
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0)
  const budget = Number(monthlyBudget) || 0
  const remaining = budget - totalSpent
  const isOver = remaining < 0
  const budgetRate = pct(totalSpent, budget)

  const catSpent = transactions.reduce<Record<string, number>>((acc, t) => {
    if (t.category_id) acc[t.category_id] = (acc[t.category_id] || 0) + t.amount
    return acc
  }, {})

  const totalCatBudget = Object.values(catBudgets).reduce((sum, v) => sum + (Number(v) || 0), 0)

  // 최근 12개월 히스토리 계산
  const history = useMemo(() => {
    const months = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const setting = monthlySettings.find(s => s.year === y && s.month === m)
      const spent = historyTransactions
        .filter(t => {
          const td = new Date(t.date)
          return td.getFullYear() === y && td.getMonth() + 1 === m
        })
        .reduce((sum, t) => sum + t.amount, 0)
      const bgt = setting?.budget_amount ?? (i === 0 ? budget : 0)
      const rate = bgt > 0 ? Math.round((spent / bgt) * 100) : 0
      months.push({ year: y, month: m, label: MONTH_KO[m - 1], budget: bgt, spent, rate })
    }
    return months
  }, [monthlySettings, historyTransactions, currentYear, currentMonth, budget])

  const historyMax = Math.max(...history.map(h => Math.max(h.budget, h.spent)), 1)

  const handleSave = async () => {
    setSaving(true)
    const budgetNum = Number(monthlyBudget) || 0

    // 이번 달 월별 예산 저장
    const { data: newMonthlySetting } = await sb
      .from('budget_monthly_settings')
      .upsert(
        { user_id: userId, year: currentYear, month: currentMonth, budget_amount: budgetNum },
        { onConflict: 'user_id,year,month' }
      )
      .select()
      .single()

    if (newMonthlySetting) {
      setMonthlySettings(prev => {
        const filtered = prev.filter(s => !(s.year === currentYear && s.month === currentMonth))
        return [...filtered, newMonthlySetting]
      })
    }

    // 전체 설정 업데이트 (하위 호환)
    await sb
      .from('budget_settings')
      .upsert({ user_id: userId, monthly_budget: budgetNum }, { onConflict: 'user_id' })

    // 카테고리별 예산 저장
    await Promise.all(
      categories.map(c =>
        sb
          .from('budget_categories')
          .update({ budget_amount: Number(catBudgets[c.id]) || 0 })
          .eq('id', c.id)
      )
    )

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px 24px',
    boxShadow: 'var(--shadow-sm)',
  } as const

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text3)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: 6,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 이번 달 예산 현황 */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>
          이번 달 예산 현황
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
          {currentYear}년 {currentMonth}월
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: '월 예산', value: fmtW(budget), color: 'var(--accent)' },
            { label: '현재 지출', value: fmtW(totalSpent), color: 'var(--red)' },
            { label: isOver ? '초과' : '남은 예산', value: fmtW(Math.abs(remaining)), color: isOver ? 'var(--red)' : 'var(--green)' },
          ].map(item => (
            <div key={item.label} style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {item.label}
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: item.color, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
        <ProgressBar value={totalSpent} max={budget} color={isOver ? 'var(--red)' : 'var(--accent)'} height={10} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
          <span>사용률 {budgetRate}%</span>
          <span style={{ color: isOver ? 'var(--red)' : 'var(--text3)', fontWeight: isOver ? 700 : 400 }}>
            {isOver ? `${fmtW(Math.abs(remaining))} 초과` : `${fmtW(remaining)} 남음`}
          </span>
        </div>
      </div>

      {/* 이번 달 예산 설정 */}
      <div style={cardStyle}>
        <SectionTitle sub="이번 달 지출 한도를 설정합니다">
          {currentYear}년 {currentMonth}월 예산 설정
        </SectionTitle>
        <div>
          <label style={labelStyle}>월 예산 (원)</label>
          <input
            type="number"
            placeholder="2500000"
            value={monthlyBudget}
            onChange={e => setMonthlyBudget(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '2px solid var(--accent)',
              boxShadow: '0 0 0 3px var(--accent-bg)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: 20,
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              outline: 'none',
              boxSizing: 'border-box' as const,
            }}
          />
          {monthlyBudget && (
            <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: 'var(--text2)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {fmtW(Number(monthlyBudget) || 0)}
            </div>
          )}
        </div>
        {totalCatBudget > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>카테고리 예산 합계:</span>
            <span style={{ fontWeight: 700, color: totalCatBudget > budget ? 'var(--red)' : 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
              {fmtW(totalCatBudget)}
            </span>
            {totalCatBudget > budget && (
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>월 예산 초과</span>
            )}
          </div>
        )}
      </div>

      {/* 카테고리별 예산 */}
      <div style={cardStyle}>
        <SectionTitle sub="카테고리별 지출 한도를 설정합니다">카테고리별 예산</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {categories.map(c => {
            const spent = catSpent[c.id] || 0
            const catBudget = Number(catBudgets[c.id]) || 0
            const over = catBudget > 0 && spent > catBudget
            return (
              <div key={c.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
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
                      width: 140,
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: over ? '1.5px solid var(--red)' : '1px solid var(--border2)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: 14,
                      textAlign: 'right' as const,
                      fontVariantNumeric: 'tabular-nums',
                      outline: 'none',
                      flexShrink: 0,
                    }}
                  />
                </div>
                {catBudget > 0 && (
                  <ProgressBar value={spent} max={catBudget} color={c.color} height={5} />
                )}
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
          padding: '14px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: saved ? 'var(--green)' : 'var(--accent)',
          color: '#fff',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          transition: 'background .2s',
          boxShadow: saved ? 'none' : '0 4px 14px var(--accent-bg)',
        }}
      >
        {saving ? '저장 중...' : saved ? '✓ 저장 완료' : '예산 저장'}
      </button>

      {/* 월별 예산 추이 */}
      <div style={cardStyle}>
        <SectionTitle sub="최근 12개월 예산 대비 실지출 추이">월별 예산 추이</SectionTitle>

        {/* 막대 차트 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, marginBottom: 8 }}>
          {history.map((h, idx) => {
            const isCurrent = h.year === currentYear && h.month === currentMonth
            const budgetH = h.budget > 0 ? Math.max(8, (h.budget / historyMax) * 100) : 0
            const spentH = h.spent > 0 ? Math.max(4, (h.spent / historyMax) * 100) : 0
            return (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', display: 'flex', gap: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                  {/* 예산 막대 */}
                  <div style={{ flex: 1, height: budgetH, background: isCurrent ? 'var(--accent-bg)' : 'var(--border)', borderRadius: '3px 3px 0 0', border: isCurrent ? '1px solid var(--accent)' : 'none' }} title={`예산 ${fmtW(h.budget)}`} />
                  {/* 실지출 막대 */}
                  <div style={{ flex: 1, height: spentH, background: h.spent > h.budget && h.budget > 0 ? 'var(--red)' : isCurrent ? 'var(--accent)' : 'var(--text3)', borderRadius: '3px 3px 0 0', opacity: isCurrent ? 1 : 0.7 }} title={`지출 ${fmtW(h.spent)}`} />
                </div>
                <div style={{ fontSize: 9, color: isCurrent ? 'var(--accent)' : 'var(--text3)', fontWeight: isCurrent ? 800 : 500, whiteSpace: 'nowrap' }}>
                  {h.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* 범례 */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 11, color: 'var(--text3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--border)', border: '1px solid var(--text3)' }} />
            예산
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--text3)' }} />
            실지출
          </div>
        </div>

        {/* 테이블 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 60px', gap: 8, padding: '6px 8px', fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>
            <span>월</span>
            <span style={{ textAlign: 'right' }}>예산</span>
            <span style={{ textAlign: 'right' }}>실지출</span>
            <span style={{ textAlign: 'right' }}>달성률</span>
          </div>
          {[...history].reverse().map((h, idx) => {
            const isCurrent = h.year === currentYear && h.month === currentMonth
            const over = h.budget > 0 && h.spent > h.budget
            const rateColor = over ? 'var(--red)' : h.rate >= 80 ? 'var(--accent)' : 'var(--green)'
            return (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 1fr 60px',
                  gap: 8,
                  padding: '8px',
                  borderRadius: 8,
                  background: isCurrent ? 'var(--accent-bg)' : 'transparent',
                  fontSize: 12,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span style={{ fontWeight: isCurrent ? 800 : 500, color: isCurrent ? 'var(--accent)' : 'var(--text2)' }}>
                  {h.year !== currentYear ? `${h.year}/` : ''}{h.label}
                  {isCurrent && <span style={{ fontSize: 9, marginLeft: 3, color: 'var(--accent)' }}>●</span>}
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
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
