'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtW } from '@/lib/utils'
import { Toggle } from '@/components/ui/Toggle'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { useWindowSize } from '@/hooks/useWindowSize'
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
  const { isMobile } = useWindowSize()
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

  const setField = (key: keyof FormState, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const activeItems = recurring.filter(i => i.active)
  const inactiveItems = recurring.filter(i => !i.active)

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
    setForm({ name: '', icon: ICONS[0], amount: '', cycle: 'monthly', day_of_month: '1', category_name: categories[0]?.name || '', account: '', memo: '' })
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
      const { data } = await sb.from('budget_recurring').update(payload).eq('id', editItem.id).select().single()
      if (data) setRecurring(prev => prev.map(i => i.id === editItem.id ? data : i))
    } else {
      const { data } = await sb.from('budget_recurring').insert({ ...payload, user_id: userId, active: true }).select().single()
      if (data) setRecurring(prev => [...prev, data])
    }
    setSaving(false)
    setShowModal(false)
  }

  const handleDelete = async (id: string) => {
    await sb.from('budget_recurring').delete().eq('id', id)
    setRecurring(prev => prev.filter(i => i.id !== id))
    setShowModal(false)
  }

  const toggleActive = async (item: BudgetRecurring) => {
    await sb.from('budget_recurring').update({ active: !item.active }).eq('id', item.id)
    setRecurring(prev => prev.map(cur => cur.id === item.id ? { ...cur, active: !cur.active } : cur))
  }

  // Next month preview: monthly items sorted by day
  const nextMonthItems = useMemo(() => {
    return recurring
      .filter(i => i.active && i.cycle === 'monthly')
      .sort((a, b) => (a.day_of_month || 1) - (b.day_of_month || 1))
  }, [recurring])

  const nextMonthTotal = nextMonthItems.reduce((sum, i) => sum + i.amount, 0)
  const now = new Date()
  const nextMonth = now.getMonth() + 2 // 1-based, next month

  const getNextDate = (dayOfMonth: number) => {
    const m = nextMonth > 12 ? 1 : nextMonth
    return `${m}/${dayOfMonth}`
  }

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: isMobile ? '16px' : '20px 24px',
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
    boxSizing: 'border-box' as const,
  }

  const btnStyle = (primary: boolean) => ({
    padding: '10px 18px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: primary ? 'var(--accent)' : 'var(--bg2)',
    color: primary ? '#fff' : 'var(--text2)',
    fontWeight: 800,
    fontSize: 13,
    cursor: 'pointer',
  } as const)

  const RecurringRow = ({ item }: { item: BudgetRecurring }) => {
    const cycleLabel = CYCLES.find(c => c.value === item.cycle)?.label || item.cycle
    const lastRun = item.last_run_date ? item.last_run_date.slice(5).replace('-', '/') : null
    const nextDay = item.day_of_month || 1
    const nextDate = getNextDate(nextDay)

    return (
      <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', marginBottom: 8, opacity: item.active ? 1 : 0.6, transition: 'opacity var(--t)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
            {item.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{item.name}</span>
              {!item.active && (
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', background: 'var(--bg2)', padding: '2px 7px', borderRadius: 999 }}>일시정지</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
              {cycleLabel}{(item.cycle === 'monthly' || item.cycle === 'yearly') && ` · ${nextDay}일`}
              {item.category_name && ` · ${item.category_name}`}
              {item.account && ` · ${item.account}`}
              {item.memo && ` · ${item.memo}`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {lastRun && `마지막: ${lastRun}`}
              {lastRun && item.cycle === 'monthly' && ` · `}
              {item.cycle === 'monthly' && `다음: ${nextDate}`}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{fmtW(item.amount)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <Toggle checked={item.active} onChange={() => toggleActive(item)} />
            <button type="button" onClick={() => openEdit(item)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, padding: '4px' }} title="수정">✏️</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary card */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>정기 지출</div>
          <button type="button" onClick={openAdd} style={btnStyle(true)}>새 항목 추가</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            {
              icon: '💳',
              label: '월 정기 지출',
              value: fmtW(Math.round(monthlyEstimate)),
              color: 'var(--accent)',
            },
            {
              icon: '✅',
              label: '활성 항목',
              value: `${activeItems.length}개`,
              color: 'var(--green)',
            },
            {
              icon: '⏸',
              label: '비활성',
              value: `${inactiveItems.length}개`,
              color: 'var(--text3)',
            },
          ].map(item => (
            <div key={item.label} style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 900, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Active items */}
      <section style={cardStyle}>
        <SectionTitle>활성 정기 지출</SectionTitle>
        {activeItems.length === 0 ? (
          <div style={{ padding: '26px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>고정비 항목이 아직 없습니다.</div>
        ) : (
          activeItems.map(item => <RecurringRow key={item.id} item={item} />)
        )}
      </section>

      {/* Inactive items */}
      {inactiveItems.length > 0 && (
        <section style={cardStyle}>
          <SectionTitle>비활성 항목</SectionTitle>
          {inactiveItems.map(item => <RecurringRow key={item.id} item={item} />)}
        </section>
      )}

      {/* Next month preview */}
      <section style={cardStyle}>
        <SectionTitle sub={`${nextMonth > 12 ? 1 : nextMonth}월 예상 정기 지출`}>다음 달 예상 지출</SectionTitle>
        {nextMonthItems.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>매월 반복 항목이 없습니다.</div>
        ) : (
          <>
            {nextMonthItems.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                  {getNextDate(item.day_of_month || 1)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtW(item.amount)}</div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 800 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>합계</span>
              <span style={{ fontSize: 15, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{fmtW(nextMonthTotal)}</span>
            </div>
          </>
        )}
      </section>

      {/* Modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.44)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div style={{ width: '100%', maxWidth: 520, maxHeight: '92vh', overflow: 'auto', background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{editItem ? '정기 지출 수정' : '정기 지출 추가'}</div>
              <button type="button" onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>아이콘</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setField('icon', icon)} style={{ padding: '9px 12px', borderRadius: 10, border: form.icon === icon ? '2px solid var(--accent)' : '1px solid var(--border2)', background: form.icon === icon ? 'var(--accent-bg)' : 'var(--bg)', cursor: 'pointer', fontWeight: 800, fontSize: 12 }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>이름</label>
                <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="예: 넷플릭스" style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>금액</label>
                <input type="number" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0" style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>주기</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CYCLES.map(c => (
                    <button key={c.value} type="button" onClick={() => setField('cycle', c.value)} style={{ flex: 1, minWidth: 64, padding: '9px', borderRadius: 'var(--radius-sm)', border: form.cycle === c.value ? '2px solid var(--accent)' : '1px solid var(--border2)', background: form.cycle === c.value ? 'var(--accent-bg)' : 'var(--surface)', cursor: 'pointer', fontWeight: 800, color: form.cycle === c.value ? 'var(--accent)' : 'var(--text2)' }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              {(form.cycle === 'monthly' || form.cycle === 'yearly') && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>청구일</label>
                  <input type="number" min="1" max="31" value={form.day_of_month} onChange={e => setField('day_of_month', e.target.value)} style={fieldStyle} />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>카테고리 이름</label>
                <input list="recurring-categories" value={form.category_name} onChange={e => setField('category_name', e.target.value)} style={fieldStyle} />
                <datalist id="recurring-categories">
                  {categories.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>결제수단</label>
                <input value={form.account} onChange={e => setField('account', e.target.value)} placeholder="예: 신용카드" style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>메모</label>
                <input value={form.memo} onChange={e => setField('memo', e.target.value)} placeholder="선택 입력" style={fieldStyle} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ ...btnStyle(false), flex: 1 }}>취소</button>
                {editItem && (
                  <button type="button" onClick={() => handleDelete(editItem.id)} style={{ ...btnStyle(false), color: 'var(--red)' }}>삭제</button>
                )}
                <button type="button" onClick={handleSave} disabled={saving} style={{ ...btnStyle(true), flex: 1 }}>
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
