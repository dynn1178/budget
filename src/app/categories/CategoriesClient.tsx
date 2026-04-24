'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { fmtW } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetCategory } from '@/types/database'

const ICONS = ['식비', '교통', '쇼핑', '주거', '건강', '취미', '기타']
const COLORS = ['#C8622A', '#2E7D70', '#7C5C3E', '#E67E22', '#2980B9', '#8E44AD', '#C0392B', '#27AE60']

interface FormState {
  name: string
  icon: string
  color: string
  budget_amount: string
}

export function CategoriesClient({ categories: initialCategories, userId }: { categories: BudgetCategory[]; userId: string }) {
  const sb = createClient()
  const router = useRouter()
  const [categories, setCategories] = useState(initialCategories)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<BudgetCategory | null>(null)
  const [form, setForm] = useState<FormState>({
    name: '',
    icon: ICONS[0],
    color: COLORS[0],
    budget_amount: '',
  })
  const [saving, setSaving] = useState(false)

  const setField = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }))
  const totalBudget = categories.reduce((sum, category) => sum + (category.budget_amount || 0), 0)

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: '', icon: ICONS[0], color: COLORS[0], budget_amount: '' })
    setShowModal(true)
  }

  const openEdit = (category: BudgetCategory) => {
    setEditItem(category)
    setForm({
      name: category.name,
      icon: category.icon,
      color: category.color,
      budget_amount: category.budget_amount ? String(category.budget_amount) : '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
      budget_amount: form.budget_amount ? Number(form.budget_amount) : 0,
    }

    if (editItem) {
      await sb.from('budget_categories').update(payload).eq('id', editItem.id)
    } else {
      await sb.from('budget_categories').insert({ ...payload, user_id: userId, sort_order: categories.length })
    }

    setSaving(false)
    setShowModal(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    await sb.from('budget_categories').delete().eq('id', id)
    setCategories((prev) => prev.filter((category) => category.id !== id))
    setShowModal(false)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>카테고리 관리</div>
          <button type="button" onClick={openAdd} style={buttonStyle(true)}>
            카테고리 추가
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>카테고리 수</div>
            <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900 }}>{categories.length}개</div>
          </div>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>총 월예산</div>
            <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: 'var(--accent)' }}>{fmtW(totalBudget)}</div>
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <SectionTitle>카테고리 목록</SectionTitle>
        {categories.length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>카테고리를 추가해 예산을 나눠 보세요.</div>
        ) : (
          categories.map((category, index) => (
            <div key={category.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: index < categories.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${category.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: category.color, fontSize: 11, fontWeight: 900 }}>
                {category.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{category.name}</div>
                <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text3)' }}>
                  월예산 {category.budget_amount > 0 ? fmtW(category.budget_amount) : '미설정'}
                </div>
              </div>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: category.color }} />
              <button type="button" onClick={() => openEdit(category)} style={{ border: 'none', background: 'none', color: 'var(--text3)', cursor: 'pointer', fontWeight: 700 }}>
                수정
              </button>
            </div>
          ))
        )}
      </section>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.42)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{editItem ? '카테고리 수정' : '카테고리 추가'}</div>
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
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>색상</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map((color) => (
                    <button key={color} type="button" onClick={() => setField('color', color)} style={{ width: 28, height: 28, borderRadius: '50%', background: color, border: form.color === color ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>이름</label>
                <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="예: 식비" style={fieldStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>월예산</label>
                <input type="number" value={form.budget_amount} onChange={(e) => setField('budget_amount', e.target.value)} placeholder="0" style={fieldStyle} />
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
