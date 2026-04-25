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
  { id: 'sms', label: '문자 파싱' },
  { id: 'receipt', label: '영수증 스캔' },
  { id: 'push', label: '알림 인식' },
] as const

// Static AI merchant suggestions
const AI_SUGGESTIONS = ['스타벅스 강남점', '쿠팡 로켓배송', '배달의민족', 'GS25', '이마트 은평점']

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
  const [parsedResult, setParsedResult] = useState<Partial<FormState> | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const updateField = (key: keyof FormState, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const parseSMS = () => {
    const amountMatch = smsText.match(/([0-9,]+)\s*원/)
    const merchantMatch = smsText.match(/\]\s*([^\n]+)/) || smsText.match(/([가-힣A-Za-z0-9 ]+)\s+\d{2}\/\d{2}/)
    const dateMatch = smsText.match(/(\d{2})\/(\d{2})/)

    if (!amountMatch && !merchantMatch) {
      setError('문자에서 금액이나 사용처를 찾지 못했습니다.')
      setParsedResult(null)
      return
    }

    setError('')
    const result: Partial<FormState> = {
      amount: amountMatch ? amountMatch[1].replace(/,/g, '') : form.amount,
      merchant: merchantMatch ? merchantMatch[1].trim() : form.merchant,
      date: dateMatch ? `${new Date().getFullYear()}-${dateMatch[1]}-${dateMatch[2]}` : form.date,
    }
    setParsedResult(result)
  }

  const applyParsed = () => {
    if (!parsedResult) return
    setForm(prev => ({ ...prev, ...parsedResult }))
    setParsedResult(null)
    setSmsText('')
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

  const selectedCategory = categories.find(c => c.id === form.category_id)

  const fieldStyle = {
    width: '100%',
    padding: '11px 13px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border2)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 14,
    boxSizing: 'border-box' as const,
    outline: 'none',
  } as const

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    fontWeight: 800,
    color: 'var(--text3)',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  } as const

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px 24px',
    boxShadow: 'var(--shadow-sm)',
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg2)', borderRadius: 'var(--radius-sm)' }}>
        {TABS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: 8,
              padding: '10px 8px',
              background: tab === item.id ? 'var(--surface)' : 'transparent',
              color: tab === item.id ? 'var(--accent)' : 'var(--text3)',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              boxShadow: tab === item.id ? 'var(--shadow-sm)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Tab: 직접 입력 */}
      {tab === 'direct' && (
        <div style={cardStyle}>
          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13, fontWeight: 700 }}>
              {error}
            </div>
          )}

          {/* Amount input */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>금액</label>
            <input
              type="number"
              value={form.amount}
              onChange={e => updateField('amount', e.target.value)}
              placeholder="0"
              style={{
                ...fieldStyle,
                padding: '16px 18px',
                fontSize: 28,
                textAlign: 'right',
                fontWeight: 900,
                border: '2px solid var(--accent)',
                boxShadow: '0 0 0 4px var(--accent-bg)',
              }}
            />
            {form.amount && (
              <div style={{ marginTop: 6, textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtW(Number(form.amount) || 0)}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <label style={labelStyle}>날짜</label>
              <input type="date" value={form.date} onChange={e => updateField('date', e.target.value)} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>결제수단</label>
              <select value={form.account} onChange={e => updateField('account', e.target.value)} style={fieldStyle}>
                {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 14, position: 'relative' }}>
            <label style={labelStyle}>사용처</label>
            <input
              value={form.merchant}
              onChange={e => { updateField('merchant', e.target.value); setShowSuggestions(e.target.value.length > 0) }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="예: 스타벅스 강남점"
              style={fieldStyle}
            />
            {/* AI suggest box */}
            {showSuggestions && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow)', zIndex: 100, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', fontSize: 10, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)' }}>
                  AI 추천
                </div>
                {AI_SUGGESTIONS.filter(s => s.toLowerCase().includes(form.merchant.toLowerCase())).slice(0, 4).map(s => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => { updateField('merchant', s); setShowSuggestions(false) }}
                    style={{ display: 'block', width: '100%', padding: '10px 12px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 }}>
            <div>
              <label style={labelStyle}>카테고리</label>
              <select value={form.category_id} onChange={e => updateField('category_id', e.target.value)} style={fieldStyle}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>메모</label>
              <input value={form.memo} onChange={e => updateField('memo', e.target.value)} placeholder="선택 입력" style={fieldStyle} />
            </div>
          </div>

          {/* 복식부기 preview */}
          <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              기록 미리보기 (복식부기)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              <div style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: 'var(--radius-xs)', borderLeft: '3px solid var(--red)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text3)', marginBottom: 3 }}>차변 (지출)</div>
                <div style={{ fontWeight: 800, color: 'var(--text)' }}>{selectedCategory?.name || '미분류'}</div>
                <div style={{ color: 'var(--red)', fontWeight: 900, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                  {form.amount ? fmtW(Number(form.amount)) : '₩ —'}
                </div>
              </div>
              <div style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: 'var(--radius-xs)', borderLeft: '3px solid var(--accent)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text3)', marginBottom: 3 }}>대변 (자산)</div>
                <div style={{ fontWeight: 800, color: 'var(--text)' }}>{form.account || ACCOUNTS[0]}</div>
                <div style={{ color: 'var(--accent)', fontWeight: 900, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                  {form.amount ? `-${fmtW(Number(form.amount))}` : '₩ —'}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)' }}>
              {form.merchant || '사용처를 입력하면 여기에 표시됩니다'} · {form.date}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || saved}
            style={{
              marginTop: 16,
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: saved ? 'var(--green)' : 'var(--accent)',
              color: '#fff',
              fontWeight: 900,
              fontSize: 15,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: saved ? 'none' : '0 4px 14px var(--accent-bg)',
            }}
          >
            {saved ? '✓ 저장 완료' : saving ? '저장 중...' : '지출 저장'}
          </button>
        </div>
      )}

      {/* Tab: 문자 파싱 */}
      {tab === 'sms' && (
        <div style={cardStyle}>
          <SectionTitle sub="결제 문자를 붙여넣으면 금액과 사용처를 채워드립니다">문자 파싱</SectionTitle>
          <textarea
            value={smsText}
            onChange={e => setSmsText(e.target.value)}
            style={{ ...fieldStyle, minHeight: 140, resize: 'vertical', lineHeight: 1.6 }}
            placeholder={'예시\n[현대카드] 6,500원 승인\n스타벅스 04/24 14:32'}
          />
          {error && (
            <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13, fontWeight: 700 }}>
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={parseSMS}
            style={{ marginTop: 12, width: '100%', padding: '12px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
          >
            문자 분석하기
          </button>
          {parsedResult && (
            <div style={{ marginTop: 14, padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>파싱 결과</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                {parsedResult.merchant && <div><span style={{ color: 'var(--text3)' }}>사용처: </span><strong>{parsedResult.merchant}</strong></div>}
                {parsedResult.amount && <div><span style={{ color: 'var(--text3)' }}>금액: </span><strong style={{ color: 'var(--red)' }}>{fmtW(Number(parsedResult.amount))}</strong></div>}
                {parsedResult.date && <div><span style={{ color: 'var(--text3)' }}>날짜: </span><strong>{parsedResult.date}</strong></div>}
              </div>
              <button
                type="button"
                onClick={applyParsed}
                style={{ marginTop: 12, width: '100%', padding: '10px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
              >
                직접 입력에 적용하기
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: 영수증 스캔 */}
      {tab === 'receipt' && (
        <div style={cardStyle}>
          <SectionTitle sub="영수증 사진을 업로드하거나 데모 결과를 확인해 보세요">영수증 스캔</SectionTitle>
          {/* Upload area */}
          <div style={{ border: '2px dashed var(--border2)', borderRadius: 'var(--radius-sm)', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16 }}
            onDragOver={e => e.preventDefault()}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>영수증 사진을 드래그하거나 클릭해서 업로드</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>JPG, PNG 지원</div>
          </div>
          {/* Demo result */}
          <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>데모 결과</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <div><span style={{ color: 'var(--text3)' }}>사용처: </span><strong>이마트 은평점</strong></div>
              <div><span style={{ color: 'var(--text3)' }}>날짜: </span><strong>2026-04-24</strong></div>
              <div><span style={{ color: 'var(--text3)' }}>합계: </span><strong style={{ color: 'var(--red)' }}>₩48,700</strong></div>
            </div>
            <button type="button" style={{ marginTop: 12, width: '100%', padding: '10px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
              onClick={() => { updateField('merchant', '이마트 은평점'); updateField('amount', '48700'); updateField('date', '2026-04-24'); setTab('direct') }}
            >
              직접 입력에 적용하기
            </button>
          </div>
        </div>
      )}

      {/* Tab: 알림 인식 */}
      {tab === 'push' && (
        <div style={cardStyle}>
          <SectionTitle sub="스마트폰 결제 알림을 자동으로 인식합니다">알림 인식</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { step: 1, icon: '📱', title: '알림 권한 허용', desc: '앱에서 알림 접근 권한을 허용합니다.', status: '완료', statusColor: 'var(--green)' },
              { step: 2, icon: '🔔', title: '알림 수신 대기', desc: '결제 알림이 오면 자동으로 감지합니다.', status: '대기 중', statusColor: 'var(--accent)' },
              { step: 3, icon: '✅', title: '자동 분류', desc: 'AI가 카테고리를 자동으로 분류합니다.', status: '준비', statusColor: 'var(--text3)' },
              { step: 4, icon: '💾', title: '저장 확인', desc: '지출 내역을 검토하고 저장합니다.', status: '준비', statusColor: 'var(--text3)' },
            ].map(item => (
              <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.step}. {item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{item.desc}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: item.statusColor, background: `${item.statusColor}18`, padding: '3px 8px', borderRadius: 999, flexShrink: 0 }}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--accent-bg)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
            이 기능은 모바일 앱 버전에서 완전히 지원됩니다. 현재는 웹 미리보기입니다.
          </div>
        </div>
      )}
    </div>
  )
}
