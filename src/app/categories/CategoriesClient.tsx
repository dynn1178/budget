'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { fmtW } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetCategory } from '@/types/database'

const ICONS = ['🍜','☕','🛒','🚌','🏥','🎬','📚','💪','✈️','🎁','👗','🏠','⚡','📱','🐾','🌿','🎨','🎵','🏋️','💊']
const COLORS = ['#C8622A','#2E7D70','#7C5C3E','#E67E22','#2980B9','#8E44AD','#C0392B','#27AE60','#F39C12','#16A085','#D35400','#2C3E50']

interface FormState { name: string; icon: string; color: string; budget_amount: string }

export function CategoriesClient({ categories: initialCategories, userId }: { categories: BudgetCategory[]; userId: string }) {
  const sb = createClient()
  const router = useRouter()
  const [categories, setCategories] = useState(initialCategories)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<BudgetCategory | null>(null)
  const [form, setForm] = useState<FormState>({ name: '', icon: '🍜', color: '#C8622A', budget_amount: '' })
  const [saving, setSaving] = useState(false)
  const setF = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const totalBudget = categories.reduce((s, c) => s + (c.budget_amount || 0), 0)

  const openAdd = () => {
    setForm({ name: '', icon: '🍜', color: '#C8622A', budget_amount: '' })
    setEditItem(null); setShowModal(true)
  }
  const openEdit = (c: BudgetCategory) => {
    setForm({ name: c.name, icon: c.icon, color: c.color, budget_amount: c.budget_amount ? String(c.budget_amount) : '' })
    setEditItem(c); setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    const payload = { name: form.name, icon: form.icon, color: form.color, budget_amount: form.budget_amount ? parseInt(form.budget_amount) : 0 }
    if (editItem) {
      await sb.from('budget_categories').update(payload).eq('id', editItem.id)
    } else {
      await sb.from('budget_categories').insert({ ...payload, user_id: userId, sort_order: categories.length })
    }
    setSaving(false); setShowModal(false); router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('카테고리를 삭제하면 해당 카테고리의 지출이 미분류로 변경됩니다. 삭제하시겠습니까?')) return
    await sb.from('budget_categories').delete().eq('id', id)
    setCategories(list => list.filter(c => c.id !== id))
    setShowModal(false)
  }

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' } as const
  const s = {
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 },
    input: { width: '100%', padding: '10px 13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' as const },
    btn: (primary: boolean) => ({ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, background: primary ? 'var(--accent)' : 'var(--bg2)', color: primary ? '#fff' : 'var(--text2)' }) as React.CSSProperties,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>카테고리 관리</div>
          <button onClick={openAdd} style={{ ...s.btn(true), fontSize: 12, padding: '7px 14px' }}>＋ 카테고리 추가</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>카테고리 수</div>
            <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)', marginTop: 4 }}>{categories.length}개</div>
          </div>
          <div style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>총 월 예산</div>
            <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--accent)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{fmtW(totalBudget)}</div>
          </div>
        </div>
      </div>

      {/* Category list */}
      <div style={card}>
        <SectionTitle>카테고리 목록</SectionTitle>
        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏷️</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>카테고리를 추가해보세요</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {categories.map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 'var(--radius-sm)', borderBottom: i < categories.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: c.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{c.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                  {c.budget_amount > 0 && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>월 예산: {fmtW(c.budget_amount)}</div>}
                </div>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text3)', padding: '4px 6px', borderRadius: 6 }}>✏️</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{editItem ? '카테고리 수정' : '카테고리 추가'}</div>
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
              <div>
                <label style={s.label}>색상</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLORS.map(color => (
                    <button key={color} onClick={() => setF('color', color)} style={{ width: 28, height: 28, borderRadius: '50%', background: color, border: form.color === color ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div><label style={s.label}>카테고리명</label><input style={s.input} placeholder="예: 식비" value={form.name} onChange={e => setF('name', e.target.value)} /></div>
              <div><label style={s.label}>월 예산 (원, 선택)</label><input style={s.input} type="number" placeholder="0" value={form.budget_amount} onChange={e => setF('budget_amount', e.target.value)} /></div>
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
