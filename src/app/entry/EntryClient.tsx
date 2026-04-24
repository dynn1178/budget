'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtW } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetCategory } from '@/types/database'

const ACCOUNTS = ['현대카드', '신한카드', '국민카드', '토스뱅크', '카카오뱅크', '현금', '계좌이체']

const TABS = [
  { id: 'direct', label: '직접 입력' },
  { id: 'sms', label: '문자 붙여넣기' },
] as const

interface Props {
  categories: BudgetCategory[]
  userId: string
}

interface FormState {
  date: string
  amount: string
  merchant: string
  category_id: string
  account: string
  memo: string
}

export function EntryClient({ categories, userId }: Props) {
  const router = useRouter()
  const sb = createClient()
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('direct')
  const [form, setForm] = useState<FormState>({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    merchant: '',
    category_id: categories[0]?.id || '',
    account: ACCOUNTS[0],
    memo: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [smsText, setSmsText] = useState('')

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const parseSMS = () => {
    const amountMatch = smsText.match(/([0-9,]+)\s*원/)
    const merchantMatch = smsText.match(/\]\s*([^\n]+)/) || smsText.match(/([가-힣A-Za-z0-9 ]+)\s+\d{2}\/\d{2}/)
    const dateMatch = smsText.match(/(\d{2})\/(\d{2})/)

    if (!amountMatch && !merchantMatch) {
      setError('문자에서 금액이나 사용처를 찾지 못했습니다.')
      return
    }

    setError('')
    setForm((prev) => ({
      ...prev,
      amount: amountMatch ? amountMatch[1].replace(/,/g, '') : prev.amount,
      merchant: merchantMatch ? merchantMatch[1].trim() : prev.merchant,
      date: dateMatch ? `${new Date().getFullYear()}-${dateMatch[1]}-${dateMatch[2]}` : prev.date,
    }))
    setTab('direct')
  }

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      setError('금액을 올바르게 입력해 주세요.')
      return
    }
    if (!form.merchant.trim()) {
      setError('사용처를 입력해 주세요.')
      return
    }

    setSaving(true)
    setError('')

    const { error: insertError } = await sb.from('budget_transactions').insert({
      user_id: userId,
      category_id: form.category_id || null,
      date: form.date,
      merchant: form.merchant.trim(),
      amount: Number(form.amount),
      account: form.account,
      memo: form.memo.trim(),
    })

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setSaved(true)
    setTimeout(() => {
      router.push('/transactions')
      router.refresh()
    }, 900)
  }

  const selectedCategory = categories.find((category) => category.id === form.category_id)

  const fieldStyle = {
    width: '100%',
    padding: '11px 13px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border2)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 14,
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg2)', borderRadius: 'var(--radius-sm)' }}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              background: tab === item.id ? 'var(--surface)' : 'transparent',
              color: tab === item.id ? 'var(--accent)' : 'var(--text3)',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: tab === item.id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'sms' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
          <SectionTitle sub="결제 문자를 붙여넣으면 금액과 사용처를 채워드립니다">문자 도우미</SectionTitle>
          <textarea
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            style={{ ...fieldStyle, minHeight: 140, resize: 'vertical', lineHeight: 1.6 }}
            placeholder={'예시\n[현대카드] 6,500원 승인\n스타벅스 04/24 14:32'}
          />
          <button
            type="button"
            onClick={parseSMS}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '12px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            문자 분석하기
          </button>
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' }}>
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13, fontWeight: 700 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            금액
          </label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => updateField('amount', e.target.value)}
            placeholder="0"
            style={{ ...fieldStyle, padding: '14px 16px', fontSize: 26, textAlign: 'right', fontWeight: 900, border: '2px solid var(--accent)' }}
          />
          {form.amount && <div style={{ marginTop: 6, textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>{fmtW(Number(form.amount) || 0)}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>날짜</label>
            <input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} style={fieldStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>결제수단</label>
            <select value={form.account} onChange={(e) => updateField('account', e.target.value)} style={fieldStyle}>
              {ACCOUNTS.map((account) => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>사용처</label>
          <input value={form.merchant} onChange={(e) => updateField('merchant', e.target.value)} placeholder="예: 스타벅스 강남점" style={fieldStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>카테고리</label>
            <select value={form.category_id} onChange={(e) => updateField('category_id', e.target.value)} style={fieldStyle}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>메모</label>
            <input value={form.memo} onChange={(e) => updateField('memo', e.target.value)} placeholder="선택 입력" style={fieldStyle} />
          </div>
        </div>

        <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>기록 미리보기</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>{form.merchant || '사용처를 입력하면 여기에 표시됩니다'}</div>
              <div style={{ marginTop: 4, color: 'var(--text3)' }}>
                {(selectedCategory?.name || '미분류')} · {form.account}
              </div>
            </div>
            <div style={{ fontWeight: 900, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
              {form.amount ? `-${fmtW(Number(form.amount))}` : '-0원'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || saved}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '13px',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            background: saved ? 'var(--green)' : 'var(--accent)',
            color: '#fff',
            fontWeight: 900,
            fontSize: 15,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saved ? '저장 완료' : saving ? '저장 중...' : '지출 저장'}
        </button>
      </div>
    </div>
  )
}
