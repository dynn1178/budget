'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtW } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetCategory } from '@/types/database'

const ACCOUNTS = [
  '신한카드', '현대카드', '삼성카드', '롯데카드', 'NH농협', 'IBK기업', 'BC카드', '현금', '은행 이체',
]

const TABS = [
  { id: 'direct', label: '직접 입력', icon: '✏️' },
  { id: 'sms',    label: '문자 파싱', icon: '💬' },
  { id: 'scan',   label: '영수증 스캔', icon: '📷' },
]

interface Props { categories: BudgetCategory[]; userId: string }

interface FormState {
  date: string; amount: string; merchant: string
  category_id: string; account: string; memo: string
}

export function EntryClient({ categories, userId }: Props) {
  const router = useRouter()
  const sb = createClient()
  const [tab, setTab] = useState('direct')
  const [form, setForm] = useState<FormState>({
    date: new Date().toISOString().slice(0, 10),
    amount: '', merchant: '',
    category_id: categories[0]?.id || '',
    account: '신한카드', memo: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  // SMS 파싱
  const [smsText, setSmsText] = useState('')
  const [parsed,  setParsed]  = useState<{ amount?: string; merchant?: string; date?: string; error?: boolean } | null>(null)

  // OCR
  const fileRef = useRef<HTMLInputElement>(null)
  const [ocrResult, setOcrResult] = useState<{ amount: string; merchant: string; date: string; demo?: boolean } | null>(null)
  const [scanning,  setScanning]  = useState(false)

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.amount || parseInt(form.amount) <= 0) { setError('금액을 입력하세요'); return }
    setSaving(true); setError('')
    const { error: dbError } = await sb.from('budget_transactions').insert({
      user_id: userId,
      category_id: form.category_id || null,
      date: form.date,
      merchant: form.merchant,
      amount: parseInt(form.amount),
      account: form.account,
      memo: form.memo,
    })
    setSaving(false)
    if (dbError) { setError(dbError.message); return }
    setSaved(true)
    setTimeout(() => { setSaved(false); router.push('/transactions') }, 1500)
  }

  const parseSMS = () => {
    const amountMatch  = smsText.match(/([0-9,]+)원/)
    const merchantMatch = smsText.match(/\[([^\]]+)\]/) || smsText.match(/(스타벅스|쿠팡|GS25|CU|올리브영|이마트|배달의민족|카카오|넷플릭스)/)
    const dateMatch    = smsText.match(/(\d{2})\/(\d{2})/)
    if (amountMatch || merchantMatch) {
      setParsed({
        amount:   amountMatch   ? amountMatch[1].replace(/,/g, '') : '',
        merchant: merchantMatch ? (merchantMatch[1] || merchantMatch[0]) : '',
        date:     dateMatch     ? `${new Date().getFullYear()}-${dateMatch[1]}-${dateMatch[2]}` : form.date,
      })
    } else setParsed({ error: true })
  }

  const applyParsed = () => {
    if (parsed && !parsed.error) {
      setForm(f => ({ ...f, ...(parsed as Partial<FormState>) }))
      setTab('direct'); setParsed(null); setSmsText('')
    }
  }

  const runOCR = async (file: File) => {
    setScanning(true); setOcrResult(null)
    await new Promise(r => setTimeout(r, 1200)) // 데모 딜레이
    setOcrResult({ amount: '6500', merchant: '스타벅스', date: form.date, demo: true })
    setScanning(false)
  }

  const applyOCR = () => {
    if (ocrResult) {
      setForm(f => ({ ...f, amount: ocrResult!.amount, merchant: ocrResult!.merchant, date: ocrResult!.date }))
      setTab('direct'); setOcrResult(null)
    }
  }

  const selectedCat = categories.find(c => c.id === form.category_id)

  const s = {
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' } as const,
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 },
    input: { width: '100%', padding: '10px 13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' as const },
    select: { width: '100%', padding: '10px 13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text)', background: 'var(--surface)', outline: 'none', cursor: 'pointer' } as const,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg2)', borderRadius: 'var(--radius-sm)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700,
            background: tab === t.id ? 'var(--surface)' : 'transparent',
            color: tab === t.id ? 'var(--accent)' : 'var(--text3)',
            boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
          }}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── 직접 입력 ── */}
      {tab === 'direct' && (
        <div style={s.card}>
          {error && <div style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 8, fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>{error}</div>}

          <div style={{ marginBottom: 18 }}>
            <label style={s.label}>금액 (원)</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...s.input, padding: '14px 50px 14px 16px', fontSize: 24, fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums', border: '2px solid var(--accent)', boxShadow: '0 0 0 3px var(--accent-bg)' }}
                type="number" placeholder="0" value={form.amount}
                onChange={e => set('amount', e.target.value)}
              />
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text3)', fontWeight: 700, pointerEvents: 'none' }}>원</div>
            </div>
            {form.amount && <div style={{ textAlign: 'right', marginTop: 4, fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>{fmtW(parseInt(form.amount) || 0)}</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={s.label}>날짜</label>
              <input style={s.input} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>

            <div>
              <label style={s.label}>가맹점 / 내용</label>
              <input style={s.input} placeholder="예: 스타벅스 강남점" value={form.merchant} onChange={e => set('merchant', e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={s.label}>지출 분류</label>
                <select style={s.select} value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>결제 수단</label>
                <select style={s.select} value={form.account} onChange={e => set('account', e.target.value)}>
                  {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={s.label}>메모</label>
              <input style={s.input} placeholder="메모 (선택)" value={form.memo} onChange={e => set('memo', e.target.value)} />
            </div>

            {/* 복식부기 미리보기 */}
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>복식부기 미리보기</div>
              {[
                { type: '차변 DEBIT', account: `비용 — ${selectedCat?.name || '비용 계정'}`, color: 'var(--red)', bg: 'var(--red-bg)' },
                { type: '대변 CREDIT', account: `자산 — ${form.account || '자산 계정'}`, color: 'var(--green)', bg: 'var(--green-bg)' },
              ].map((row, i) => (
                <div key={i}>
                  {i === 1 && <div style={{ borderTop: '1px dashed var(--border2)', margin: '6px 0' }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, background: row.bg, color: row.color, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{row.type}</span>
                      <span style={{ color: 'var(--text)' }}>{row.account}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: row.color, fontVariantNumeric: 'tabular-nums' }}>
                      {form.amount ? fmtW(parseInt(form.amount)) : '₩0'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleSave} disabled={saving || saved} style={{
              width: '100%', padding: '13px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 800,
              background: saved ? 'var(--green)' : 'var(--accent)', color: '#fff', transition: 'all .2s',
            }}>
              {saved ? '✓ 저장됨' : saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* ── 문자 파싱 ── */}
      {tab === 'sms' && (
        <div style={s.card}>
          <SectionTitle sub="카드사 결제 문자를 붙여넣으면 자동으로 파싱합니다">문자 붙여넣기</SectionTitle>
          <textarea
            style={{ ...s.input, height: 140, resize: 'vertical', lineHeight: 1.6, fontSize: 13 }}
            placeholder={"예시:\n[신한카드] 6,500원 승인\n스타벅스 04/24 14:32"}
            value={smsText}
            onChange={e => { setSmsText(e.target.value); setParsed(null) }}
          />
          <button onClick={parseSMS} style={{ width: '100%', marginTop: 12, padding: '12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 800 }}>파싱하기</button>
          {parsed && !parsed.error && (
            <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--green-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(58,122,82,.3)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>✓ 파싱 완료</div>
              {parsed.merchant && <div style={{ fontSize: 13, color: 'var(--text)' }}>가맹점: <strong>{parsed.merchant}</strong></div>}
              {parsed.amount   && <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>금액: <strong>{fmtW(parseInt(parsed.amount))}</strong></div>}
              <button onClick={applyParsed} style={{ width: '100%', marginTop: 12, padding: '9px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700 }}>직접 입력 폼에 적용</button>
            </div>
          )}
          {parsed?.error && <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--red-bg)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>파싱 실패 — 직접 입력해 주세요.</div>}
        </div>
      )}

      {/* ── 영수증 스캔 ── */}
      {tab === 'scan' && (
        <div style={s.card}>
          <SectionTitle sub="영수증 이미지를 업로드하면 자동으로 금액·가맹점·날짜를 추출합니다">영수증 스캔</SectionTitle>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) runOCR(e.target.files[0]) }} />
          {!scanning && !ocrResult && (
            <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed var(--border2)', borderRadius: 'var(--radius-sm)', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>탭하여 영수증 이미지 선택</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>JPG, PNG 지원</div>
            </div>
          )}
          {scanning && (
            <div style={{ padding: '30px 20px', textAlign: 'center', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>OCR 인식 중...</div>
            </div>
          )}
          {ocrResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ocrResult.demo && <div style={{ padding: '8px 12px', background: 'var(--teal-bg)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--teal)', fontWeight: 600 }}>ℹ️ 데모 결과 — 실제 배포 시 Tesseract.js 연동</div>}
              <div style={{ padding: '14px 16px', background: 'var(--green-bg)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>✓ OCR 완료</div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>가맹점: <strong>{ocrResult.merchant}</strong></div>
                <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>금액: <strong>{fmtW(parseInt(ocrResult.amount))}</strong></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setOcrResult(null)} style={{ flex: 1, padding: '10px', background: 'var(--bg2)', color: 'var(--text2)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700 }}>다시 스캔</button>
                <button onClick={applyOCR} style={{ flex: 2, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700 }}>폼에 적용</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
