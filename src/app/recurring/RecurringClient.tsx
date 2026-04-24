'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { fmtW } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { Toggle } from '@/components/ui/Toggle'
import type { BudgetCategory, BudgetRecurring, RecurringCycle } from '@/types/database'

const CYCLES: { value: RecurringCycle; label: string }[] = [
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'monthly', label: '매월' },
  { value: 'yearly', label: '매년' },
]

const ICONS = ['구독', '보험', '통신', '주거', '교육', '교통', '건강', '문화']

interface FormState {
  name: string
  icon: string
  amount: string
  cycle: RecurringCycle
  day_of_month: string
  category_name: string
  account: string
  memo: string
}

export function RecurringClient({
  recurring: initialRecurring,
  categories,
  userId,
}: {
  recurring: BudgetRecurring[]
  categories: BudgetCategory[]
  userId: string
}) {
  const sb = createClient()
  const router = useRouter()
  const [recurring, setRecurring] = useState(initialRecurring)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<BudgetRecurring | null>(null)
  const [form, setForm] = useState<FormState>({
    name: '',
    icon: ICONS[0],
    amount: '',
    cycle: 'monthly',
    day_of_month: '1',
    category_name: categories[0]?.name || '',
    account: '',
    memo: '',
  })
  const [saving, setSaving] = useState(false)

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const activeItems = recurring.filter((item) => item.active)
  const inactiveItems = recurring.filter((item) => !item.active)

  const monthlyEstimate = useMemo(() => {
    return activeItems.reduce((sum, item) => {
      if (item.cycle === 'daily') return sum + item.amount * 30
      if (item.cycle === 'weekly') return sum + item.amount * 4.33
      if (item.cycle === 'yearly') return sum + item.amount / 12
      return sum + item.amount
    }, 0)
  }, [activeItems])

  const openAdd = () => {
    setEditItem(null)
    setForm({
      name: '',
      icon: ICONS[0],
      amount: '',
      cycle: 'monthly',
      day_of_month: '1',
      category_name: categories[0]?.name || '',
      account: '',
      memo: '',
    })
    setShowModal(true)
  }

  const openEdit = (item: BudgetRecurring) => {
    setEditItem(item)
    setForm({
      name: item.name,
      icon: item.icon,
      amount: String(item.amount),
      cycle: item.cycle,
      day_of_month: String(item.day_of_month || 1),
      category_name: item.category_name || '',
      account: item.account || '',
      memo: item.memo || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.amount) return

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      icon: form.icon,
      amount: Number(form.amount),
      cycle: form.cycle,
      day_of_month: Number(form.day_of_month) || 1,
      category_name: form.category_name,
      account: form.account.trim(),
      memo: form.memo.trim(),
    }

    if (editItem) {
      await sb.from('budget_recurring').update(payload).eq('id', editItem.id)
    } else {
      await sb.from('budget_recurring').insert({
        ...payload,
        user_id: userId,
        active: true,
      })
    }

    setSaving(false)
    setShowModal(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    await sb.from('budget_recurring').delete().eq('id', id)
    setRecurring((prev) => prev.filter((item) => item.id !== id))
    setShowModal(false)
  }

  const toggleActive = async (item: BudgetRecurring) => {
    await sb.from('budget_recurring').update({ active: !item.active }).eq('id', item.id)
    setRecurring((prev) => prev.map((current) => (current.id === item.id ? { ...current, active: !current.active } : current)))
  }

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px 24px',
    boxShadow: 'var(--shadow-sm)',
  } as const

  const fieldStyle = {
    width: '100%',
    padding: '10px 13px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border2)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 14,
  } as const

  const buttonStyle = (primary: boolean) =>
    ({
      padding: '10px 18px',
      borderRadius: 'var(--radius-sm)',
      border: 'none',
      background: primary ? 'var(--accent)' : 'var(--bg2)',
      color: primary ? '#fff' : 'var(--text2)',
      fontWeight: 800,
      fontSize: 13,
      cursor: 'pointer',
    }) as const

  const Row = ({ item }: { item: BudgetRecurring }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', opacity: item.active ? 1 : 0.56 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>
        {item.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{item.name}</div>
        <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text3)' }}>
          {CYCLES.find((cycle) => cycle.value === item.cycle)?.label || item.cycle}
          {(item.cycle === 'monthly' || item.cycle === 'yearly') && ` · ${item.day_of_month}일`}
          {item.category_name && ` · ${item.category_name}`}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{fmtW(item.amount)}</div>
        <div style={{ marginTop: 3, fontSize: 11, color: 'var(--text3)' }}>{item.account || '계정 미입력'}</div>
      </div>
      <Toggle checked={item.active} onChange={() => toggleActive(item)} />
      <button type="button" onClick={() => openEdit(item)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontWeight: 700 }}>
        수정
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>정기 지출 요약</div>
          <button type="button" onClick={openAdd} style={buttonStyle(true)}>
            새 항목 추가
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>활성 항목</div>
            <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900 }}>{activeItems.length}개</div>
          </div>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>월 예상 고정비</div>
            <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{fmtW(Math.round(monthlyEstimate))}</div>
          </div>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>연간 예상 고정비</div>
            <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{fmtW(Math.round(monthlyEstimate * 12))}</div>
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <SectionTitle>활성 정기 지출</SectionTitle>
        {activeItems.length === 0 ? (
          <div style={{ padding: '26px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>고정비 항목이 아직 없습니다.</div>
        ) : (
          activeItems.map((item) => <Row key={item.id} item={item} />)
        )}
      </section>

      {inactiveItems.length > 0 && (
        <section style={cardStyle}>
          <SectionTitle>비활성 항목</SectionTitle>
          {inactiveItems.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </section>
      )}

      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.42)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false)
          }}
        >
          <div style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{editItem ? '정기 지출 수정' : '정기 지출 추가'}</div>
              <button type="button" onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>아이콘</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ICONS.map((icon) => (
                    <button key={icon} type="button" onClick={() => setField('icon', icon)} style={{ padding: '10px 12px', borderRadius: 10, border: form.icon === icon ? '2px solid var(--accent)' : '1px solid var(--border2)', background: form.icon === icon ? 'var(--accent-bg)' : 'var(--bg)', cursor: 'pointer', fontWeight: 800 }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>이름</label>
                <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="예: 넷플릭스" style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>금액</label>
                <input type="number" value={form.amount} onChange={(e) => setField('amount', e.target.value)} placeholder="0" style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>주기</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CYCLES.map((cycle) => (
                    <button key={cycle.value} type="button" onClick={() => setField('cycle', cycle.value)} style={{ flex: 1, minWidth: 72, padding: '9px', borderRadius: 'var(--radius-sm)', border: form.cycle === cycle.value ? '2px solid var(--accent)' : '1px solid var(--border2)', background: form.cycle === cycle.value ? 'var(--accent-bg)' : 'var(--surface)', cursor: 'pointer', fontWeight: 800, color: form.cycle === cycle.value ? 'var(--accent)' : 'var(--text2)' }}>
                      {cycle.label}
                    </button>
                  ))}
                </div>
              </div>
              {(form.cycle === 'monthly' || form.cycle === 'yearly') && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>청구일</label>
                  <input type="number" min="1" max="31" value={form.day_of_month} onChange={(e) => setField('day_of_month', e.target.value)} style={fieldStyle} />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>카테고리 이름</label>
                <input list="recurring-categories" value={form.category_name} onChange={(e) => setField('category_name', e.target.value)} style={fieldStyle} />
                <datalist id="recurring-categories">
                  {categories.map((category) => (
                    <option key={category.id} value={category.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>계정</label>
                <input value={form.account} onChange={(e) => setField('account', e.target.value)} placeholder="예: 신용카드" style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>메모</label>
                <input value={form.memo} onChange={(e) => setField('memo', e.target.value)} placeholder="선택 입력" style={fieldStyle} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ ...buttonStyle(false), flex: 1 }}>
                  취소
                </button>
                {editItem && (
                  <button type="button" onClick={() => handleDelete(editItem.id)} style={{ ...buttonStyle(false), color: 'var(--red)' }}>
                    삭제
                  </button>
                )}
                <button type="button" onClick={handleSave} disabled={saving} style={{ ...buttonStyle(true), flex: 1 }}>
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
