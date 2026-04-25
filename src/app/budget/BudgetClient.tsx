'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { fmtW, pct } from '@/lib/utils'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetCategory, BudgetSetting } from '@/types/database'

interface Tx {
  amount: number
  category_id: string | null
}

interface Props {
  categories: BudgetCategory[]
  settings: BudgetSetting | null
  transactions: Tx[]
  userId: string
}

export function BudgetClient({ categories, settings, transactions, userId }: Props) {
  const sb = createClient()
  const router = useRouter()

  const [monthlyBudget, setMonthlyBudget] = useState(String(settings?.monthly_budget ?? 2500000))
  const [catBudgets, setCatBudgets] = useState<Record<string, string>>(
    Object.fromEntries(categories.map((c) => [c.id, c.budget_amount > 0 ? String(c.budget_amount) : '']))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0)
  const budget = Number(monthlyBudget) || 0
  const remaining = budget - totalSpent
  const isOver = remaining < 0

  const catSpent = transactions.reduce<Record<string, number>>((acc, t) => {
    if (t.category_id) acc[t.category_id] = (acc[t.category_id] || 0) + t.amount
    return acc
  }, {})

  const totalCatBudget = Object.values(catBudgets).reduce((sum, v) => sum + (Number(v) || 0), 0)

  const handleSave = async () => {
    setSaving(true)

    // upsert monthly budget in settings
    await sb.from('budget_settings').upsert(
      { user_id: userId, monthly_budget: Number(monthlyBudget) || 0 },
      { onConflict: 'user_id' }
    )

    // update each category budget
    await Promise.all(
      categories.map((c) =>
        sb
          .from('budget_categories')
          .update({ budget_amount: Number(catBudgets[c.id]) || 0 })
          .eq('id', c.id)
      )
    )

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
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

  const inputStyle = {
    width: '100%',
    padding: '10px 13px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border2)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 14,
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Overview */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 16 }}>이번 달 예산 현황</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: '월 예산', value: fmtW(budget), color: 'var(--accent)' },
            { label: '현재 지출', value: fmtW(totalSpent), color: 'var(--red)' },
            { label: isOver ? '초과' : '남은 예산', value: fmtW(Math.abs(remaining)), color: isOver ? 'var(--red)' : 'var(--green)' },
          ].map((item) => (
            <div key={item.label} style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: item.color, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
            </div>
          ))}
        </div>
        <ProgressBar value={totalSpent} max={budget} color={isOver ? 'var(--red)' : 'var(--accent)'} height={10} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text3)' }}>
          <span>사용률 {pct(totalSpent, budget)}%</span>
          <span style={{ color: isOver ? 'var(--red)' : 'var(--text3)', fontWeight: isOver ? 700 : 400 }}>
            {isOver ? `${fmtW(Math.abs(remaining))} 초과` : `${fmtW(remaining)} 남음`}
          </span>
        </div>
      </div>

      {/* Monthly budget setting */}
      <div style={cardStyle}>
        <SectionTitle sub="전체 월 지출 한도를 설정합니다">월 예산 설정</SectionTitle>
        <div style={{ marginBottom: 4 }}>
          <label style={labelStyle}>월 예산 (원)</label>
          <input
            style={inputStyle}
            type="number"
            placeholder="2500000"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
          />
        </div>
        {totalCatBudget > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>
            카테고리 예산 합계: <span style={{ fontWeight: 700, color: totalCatBudget > budget ? 'var(--red)' : 'var(--text2)' }}>{fmtW(totalCatBudget)}</span>
            {totalCatBudget > budget && <span style={{ marginLeft: 6, color: 'var(--red)', fontWeight: 700 }}>월 예산 초과</span>}
          </div>
        )}
      </div>

      {/* Per-category budget */}
      <div style={cardStyle}>
        <SectionTitle sub="카테고리별 지출 한도를 설정합니다">카테고리별 예산</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {categories.map((c) => {
            const spent = catSpent[c.id] || 0
            const catBudget = Number(catBudgets[c.id]) || 0
            const over = catBudget > 0 && spent > catBudget
            return (
              <div key={c.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: c.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {c.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: over ? 'var(--red)' : 'var(--text3)', fontWeight: over ? 700 : 400 }}>
                      지출 {fmtW(spent)}{catBudget > 0 && ` / 예산 ${fmtW(catBudget)}`}
                      {over && ' — 초과'}
                    </div>
                  </div>
                  <input
                    style={{ ...inputStyle, width: 140, textAlign: 'right' as const }}
                    type="number"
                    placeholder="예산 없음"
                    value={catBudgets[c.id] || ''}
                    onChange={(e) => setCatBudgets((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  />
                </div>
                {catBudget > 0 && <ProgressBar value={spent} max={catBudget} color={c.color} height={5} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Save button */}
      <button
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
        }}
      >
        {saving ? '저장 중...' : saved ? '✓ 저장 완료' : '예산 저장'}
      </button>
    </div>
  )
}
