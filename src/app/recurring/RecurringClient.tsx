'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { fmtW } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { Toggle } from '@/components/ui/Toggle'
import type { BudgetRecurring, BudgetCategory } from '@/types/database'

const CYCLES = [
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'monthly', label: '매월' },
  { value: 'yearly', label: '매년' },
]

interface FormState {
  name: string; icon: string; amount: string; cycle: string
  day_of_month: string; category_id: string; account: string; memo: string
}

const ICONS = ['📱','🌐','🎵','🎬','📺','🏋️','☁️','🛡️','📰','🎮','🔧','💊','🏠','🚗','📚']

export function RecurringClient({ recurring: initialRecurring, categories, userId }: {
  recurring: BudgetRecurring[]; categories: BudgetCategory[]; userId: string
}) {
  const sb = createClient()
  const router = useRouter()
  const [recurring, setRecurring] = useState(initialRecurring)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<BudgetRecurring | null>(null)
  const [form, setForm] = useState<FormState>({ name: '', icon: '📱', amount: '', cycle: 'monthly', day_of_month: '1', category_id: '', account: '', memo: '' })
  const [saving, setSaving] = useState(false)
  const setF = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const activeItems = recurring.filter(r => r.is_active)
  const inactiveItems = recurring.filter(r => !r.is_active)
  const monthlyTotal = activeItems.filter(r => r.cycle === 'monthly').reduce((s, r) => s + r.amount, 0)
    + activeItems.filter(r => r.cycle === 'yearly').reduce((s, r) => s + r.amount / 12, 0)
    + activeItems.filter(r => r.cycle === 'weekly').reduce((s, r) => s + r.amount * 4.33, 0)
    + activeItems.filter(r => r.cycle === 'daily').reduce((s, r) => s + r.amount * 30, 0)

  const openAdd = () => {
    setForm({ name: '', icon: '📱', amount: '', cycle: 'monthly', day_of_month: '1', category_id: categories[0]?.id || '', account: '', memo: '' })
    setEditItem(null); setShowModal(true)
  }
  const openEdit = (r: BudgetRecurring) => {
    setForm({ name: r.name, icon: r.icon, amount: String(r.amount), cycle: r.cycle, day_of_month: String(r.day_of_month || 1), category_id: r.category_id || '', account: r.account || '', memo: r.memo || '' })
    setEditItem(r); setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.amount) return
    setSaving(true)
    const payload = { name: form.name, icon: form.icon, amount: parseInt(form.amount), cycle: form.cycle, day_of_month: parseInt(form.day_of_month) || 1, category_id: form.category_id || null, account: form.account, memo: form.memo }
    if (editItem) {
      await sb.from('budget_recurring').update(payload).eq('id', editItem.id)
    } else {
      await sb.from('budget_recurring').insert({ ...payload, user_id: userId, is_active: true, sort_order: recurring.length })
    }
    setSaving(false); setShowModal(false); router.refresh()
  }

  const handleDelete = async (id: string) => {
    await sb.from('budget_recurring').delete().eq('id', id)
    setRecurring(list => list.filter(r => r.id !== id))
    setShowModal(false)
  }

  const toggleActive = async (r: BudgetRecurring) => {
    await sb.from('budget_recurring').update({ is_active: !r.is_active }).eq('id', r.id)
    setRecurring(list => list.map(x => x.id === r.id ? { ...x, is_active: !x.is_active } : x))
  }

  const cycleLabel = (c: string) => CYCLES.find(x => x.value === c)?.label || c

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' } as const
  const s = {
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 },
    input: { width: '100%', padding: '10px 13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' as const },
    btn: (primary: boolean) => ({ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, background: primary ? 'var(--accent)' : 'var(--bg2)', color: primary ? '#fff' : 'var(--text2)' }) as React.CSSProperties,
  }

  const RecurringRow = ({ r }: { r: BudgetRecurring }) => {
    const cat = categories.find(c => c.id === r.category_id)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', opacity: r.is_active ? 1 : 0.5 }}>
        <span style={{ fontSize: 22 }}>{r.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            {cycleLabel(r.cycle)} {r.cycle === 'monthly' || r.cycle === 'yearly' ? `${r.day_of_month}일` : ''}
            {cat && <span style={{ marginLeft: 6 }}>{cat.icon} {cat.name}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', marginRight: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtW(r.amount)}</div>
        </div>
        <Toggle checked={r.is_active} onChange={() => toggleActive(r)} />
        <button onClick={() => openEdit(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text3)', padding: '4px 6px', borderRadius: 6 }}>✏️</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>정기 지출</div>
          <button onClick={openAdd} style={{ ...s.btn(true), fontSize: 12, padding: '7px 14px' }}>＋ 항목 추가</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { label: '활성 항목', value: `${activeItems.length}개`, icon: '✅' },
            { label: '월 예상 금액', value: fmtW(Math.round(monthlyTotal)), icon: '📅' },
            { label: '연 예상 금액', value: fmtW(Math.round(monthlyTotal * 12)), icon: '📆' },
          ].map(item => (
            <div key={item.label} style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active list */}
      <div style={card}>
        <SectionTitle>활성 정기 지출</SectionTitle>
        {activeItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>정기 지출을 추가해보세요</div>
          </div>
        ) : activeItems.map(r => <RecurringRow key={r.id} r={r} />)}
      </div>

      {/* Inactive list */}
      {inactiveItems.length > 0 && (
        <div style={card}>
          <SectionTitle>비활성 항목</SectionTitle>
          {inactiveItems.map(r => <RecurringRow key={r.id} r={r} />)}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{editItem ? '정기 지출 수정' : '정기 지출 추가'}</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text3)' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={s.label}>아이콘</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setF('icon', icon)} style={{ width: 36, height: 36, fontSize: 18, borderRadius: 8, border: form.icon === icon ? '2px solid var(--accent)' : '1px solid var(--border2)', background: form.icon === icon ? 'var(--accent-bg)' : 'var(--bg)', cursor: 'pointer' }}>{icon}</button>
                  ))}
                </div>
              </div>
              <div><label style={s.label}>이름</label><input style={s.input} placeholder="예: 넷플릭스" value={form.name} onChange={e => setF('name', e.target.value)} /></div>
              <div><label style={s.label}>금액 (원)</label><input style={s.input} type="number" placeholder="0" value={form.amount} onChange={e => setF('amount', e.target.value)} /></div>
              <div>
                <label style={s.label}>주기</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CYCLES.map(c => (
                    <button key={c.value} onClick={() => setF('cycle', c.value)} style={{ flex: 1, padding: '9px', borderRadius: 'var(--radius-sm)', border: form.cycle === c.value ? '2px solid var(--accent)' : '1px solid var(--border2)', background: form.cycle === c.value ? 'var(--accent-bg)' : 'var(--surface)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: form.cycle === c.value ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer', minWidth: 60 }}>{c.label}</button>
                  ))}
                </div>
              </div>
              {(form.cycle === 'monthly' || form.cycle === 'yearly') && (
                <div><label style={s.label}>결제일</label><input style={s.input} type="number" min="1" max="31" placeholder="1" value={form.day_of_month} onChange={e => setF('day_of_month', e.target.value)} /></div>
              )}
              <div>
                <label style={s.label}>카테고리</label>
                <select style={{ ...s.input, cursor: 'pointer' }} value={form.category_id} onChange={e => setF('category_id', e.target.value)}>
                  <option value="">미분류</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div><label style={s.label}>계정</label><input style={s.input} placeholder="예: 신용카드" value={form.account} onChange={e => setF('account', e.target.value)} /></div>
              <div><label style={s.label}>메모 (선택)</label><input style={s.input} placeholder="간단한 메모" value={form.memo} onChange={e => setF('memo', e.target.value)} /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => setShowModal(false)} style={{ ...s.btn(false), flex: 1, padding: '12px' }}>취소</button>
                {editItem && <button onClick={() => handleDelete(editItem.id)} style={{ ...s.btn(false), color: 'var(--red)', padding: '12px 16px' }}>삭제</button>}
                <button onClick={handleSave} disabled={saving} style={{ ...s.btn(true), flex: 1, padding: '12px' }}>{saving ? '저장 중...' : '저장'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
