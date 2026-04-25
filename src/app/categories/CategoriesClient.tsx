'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { fmtW, pct } from '@/lib/utils'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useWindowSize } from '@/hooks/useWindowSize'
import type { BudgetCategory } from '@/types/database'

const EXPENSE_ICONS = ['🍔', '🚌', '🛍️', '🏠', '💊', '🎮', '📚', '☕', '🎬', '✈️', '💪', '🐶']
const ASSET_ICONS = ['🏦', '💰', '📈', '🏡', '🚗', '💳', '🏗️', '💎']
const PRESET_COLORS = ['#C8622A', '#2E7D70', '#7C5C3E', '#E67E22', '#2980B9', '#8E44AD', '#C0392B', '#27AE60', '#E91E63', '#00BCD4', '#FF5722', '#607D8B']

type Tab = 'expense' | 'asset'

interface FormState {
  name: string
  icon: string
  color: string
  budget_amount: string
}

export function CategoriesClient({ categories: initialCategories, userId }: { categories: BudgetCategory[]; userId: string }) {
  const sb = createClient()
  const router = useRouter()
  const { isMobile } = useWindowSize()
  const [activeTab, setActiveTab] = useState<Tab>('expense')
  const [categories, setCategories] = useState(initialCategories)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<BudgetCategory | null>(null)
  const [form, setForm] = useState<FormState>({
    name: '',
    icon: EXPENSE_ICONS[0],
    color: PRESET_COLORS[0],
    budget_amount: '',
  })
  const [saving, setSaving] = useState(false)

  const setField = (key: keyof FormState, value: string) => setForm(prev => ({ ...prev, [key]: value }))
  const totalBudget = categories.reduce((sum, c) => sum + (c.budget_amount || 0), 0)

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: '', icon: EXPENSE_ICONS[0], color: PRESET_COLORS[0], budget_amount: '' })
    setShowModal(true)
  }

  const openEdit = (c: BudgetCategory) => {
    setEditItem(c)
    setForm({ name: c.name, icon: c.icon, color: c.color, budget_amount: c.budget_amount ? String(c.budget_amount) : '' })
    setShowModal(true)
  }

  const moveOrder = async (id: string, direction: 'up' | 'down') => {
    const idx = categories.findIndex(c => c.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === categories.length - 1) return
    const newCats = [...categories]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newCats[idx], newCats[swapIdx]] = [newCats[swapIdx], newCats[idx]]
    setCategories(newCats)
    await Promise.all([
      sb.from('budget_categories').update({ sort_order: swapIdx }).eq('id', newCats[swapIdx].id),
      sb.from('budget_categories').update({ sort_order: idx }).eq('id', newCats[idx].id),
    ])
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
    setCategories(prev => prev.filter(c => c.id !== id))
    setShowModal(false)
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

  const sortedCategories = [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header with tabs + Add button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
          {(['expense', 'asset'] as Tab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                background: activeTab === tab ? 'var(--surface)' : 'transparent',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text3)',
                boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {tab === 'expense' ? '지출 분류' : '자산 분류'}
            </button>
          ))}
        </div>
        {activeTab === 'expense' && (
          <button type="button" onClick={openAdd} style={btnStyle(true)}>카테고리 추가</button>
        )}
      </div>

      {/* Tab 1: 지출 분류 */}
      {activeTab === 'expense' && (
        <>
          {/* Stats */}
          <section style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>카테고리 수</div>
                <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900 }}>{categories.length}개</div>
              </div>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>총 월예산</div>
                <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{fmtW(totalBudget)}</div>
              </div>
            </div>
          </section>

          {/* Category list */}
          <section style={cardStyle}>
            {categories.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>카테고리를 추가해 예산을 나눠 보세요.</div>
            ) : (
              sortedCategories.map((c, index) => {
                const budgetPct = c.budget_amount > 0 ? Math.min(100, pct(0, c.budget_amount)) : 0
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: index < sortedCategories.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    {/* Order buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                      <button type="button" onClick={() => moveOrder(c.id, 'up')} disabled={index === 0} style={{ border: 'none', background: 'none', color: index === 0 ? 'var(--border2)' : 'var(--text3)', cursor: index === 0 ? 'default' : 'pointer', fontSize: 10, lineHeight: 1, padding: '2px 4px' }}>▲</button>
                      <button type="button" onClick={() => moveOrder(c.id, 'down')} disabled={index === sortedCategories.length - 1} style={{ border: 'none', background: 'none', color: index === sortedCategories.length - 1 ? 'var(--border2)' : 'var(--text3)', cursor: index === sortedCategories.length - 1 ? 'default' : 'pointer', fontSize: 10, lineHeight: 1, padding: '2px 4px' }}>▼</button>
                    </div>
                    {/* Icon */}
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${c.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, fontSize: 18, flexShrink: 0 }}>
                      {c.icon}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{c.name}</div>
                      <div style={{ marginTop: 3, fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>월예산 {c.budget_amount > 0 ? fmtW(c.budget_amount) : '미설정'}</span>
                        {c.budget_amount > 0 && <span>사용률 {budgetPct}%</span>}
                      </div>
                      {c.budget_amount > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <ProgressBar value={0} max={c.budget_amount} color={c.color} height={4} />
                        </div>
                      )}
                    </div>
                    {/* Color dot */}
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    {/* Edit button */}
                    <button type="button" onClick={() => openEdit(c)} style={{ border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, padding: '4px' }} title="수정">✏️</button>
                  </div>
                )
              })
            )}
          </section>
        </>
      )}

      {/* Tab 2: 자산 분류 */}
      {activeTab === 'asset' && (
        <section style={cardStyle}>
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>자산 분류</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.8, maxWidth: 360, margin: '0 auto' }}>
              자산 항목은 <strong>자산 관리</strong> 페이지에서 직접 추가·수정할 수 있습니다.
              <br />
              각 자산 항목에서 예금, 투자, 부동산 등의 유형을 설정해 보세요.
            </div>
            <button
              type="button"
              onClick={() => router.push('/assets')}
              style={{ ...btnStyle(true), marginTop: 16, padding: '12px 24px' }}
            >
              자산 관리 바로가기
            </button>
          </div>
          {/* Asset icon preview */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 10 }}>자산 유형 아이콘 예시</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ASSET_ICONS.map(icon => (
                <div key={icon} style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {icon}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.44)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div style={{ width: '100%', maxWidth: 520, maxHeight: '92vh', overflow: 'auto', background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{editItem ? '카테고리 수정' : '카테고리 추가'}</div>
              <button type="button" onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>아이콘</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EXPENSE_ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setField('icon', icon)} style={{ width: 42, height: 42, borderRadius: 12, fontSize: 18, border: form.icon === icon ? '2px solid var(--accent)' : '1px solid var(--border2)', background: form.icon === icon ? 'var(--accent-bg)' : 'var(--bg)', cursor: 'pointer' }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>색상</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {PRESET_COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setField('color', color)} style={{ width: 28, height: 28, borderRadius: '50%', background: color, border: form.color === color ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)' }}>직접 입력:</label>
                  <input type="color" value={form.color} onChange={e => setField('color', e.target.value)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border2)', cursor: 'pointer', padding: 2 }} />
                  <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'monospace' }}>{form.color}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>이름</label>
                <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="예: 식비" style={fieldStyle} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>월예산</label>
                <input type="number" value={form.budget_amount} onChange={e => setField('budget_amount', e.target.value)} placeholder="0" style={fieldStyle} />
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
