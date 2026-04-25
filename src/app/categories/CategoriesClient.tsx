'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtW } from '@/lib/utils'
import { useWindowSize } from '@/hooks/useWindowSize'
import type { BudgetCategory, BudgetAsset } from '@/types/database'

// ── 지출 카테고리 아이콘 / 색상
const EXPENSE_ICONS = ['🍔','🚌','🛍️','🏠','💊','🎮','📚','☕','🎬','✈️','💪','🐶']
const PRESET_COLORS = ['#C8622A','#2E7D70','#7C5C3E','#E67E22','#2980B9','#8E44AD','#C0392B','#27AE60','#E91E63','#00BCD4','#FF5722','#607D8B']

// ── 자산 아이콘 및 유형
const ASSET_ICONS = ['🏦','💰','📈','🏡','🚗','💳','🏗️','💎','💵','🪙','📊','🏧']
const ASSET_TYPES = [
  { value: 'asset',     label: '자산' },
  { value: 'liability', label: '부채' },
] as const

type Tab = 'expense' | 'asset'

interface ExpenseForm { name: string; icon: string; color: string }
interface AssetForm   { name: string; icon: string; amount: string; asset_type: 'asset' | 'liability'; note: string }

interface Props {
  categories: BudgetCategory[]
  assets:     BudgetAsset[]
  userId:     string
}

export function CategoriesClient({ categories: initialCategories, assets: initialAssets, userId }: Props) {
  const sb = createClient()
  const { isMobile } = useWindowSize()

  const [activeTab, setActiveTab] = useState<Tab>('expense')

  // ── 지출 카테고리 상태
  const [categories, setCategories] = useState(initialCategories)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editCategory, setEditCategory] = useState<BudgetCategory | null>(null)
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({ name: '', icon: EXPENSE_ICONS[0], color: PRESET_COLORS[0] })
  const [savingExpense, setSavingExpense] = useState(false)

  // ── 자산 상태
  const [assets, setAssets] = useState(initialAssets)
  const [showAssetModal, setShowAssetModal] = useState(false)
  const [editAsset, setEditAsset] = useState<BudgetAsset | null>(null)
  const [assetForm, setAssetForm] = useState<AssetForm>({ name: '', icon: ASSET_ICONS[0], amount: '', asset_type: 'asset', note: '' })
  const [savingAsset, setSavingAsset] = useState(false)

  // ── 공통 스타일
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
    outline: 'none',
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

  // ─────────────────────────────────────────────
  // 지출 카테고리 CRUD
  // ─────────────────────────────────────────────
  const openAddCategory = () => {
    setEditCategory(null)
    setExpenseForm({ name: '', icon: EXPENSE_ICONS[0], color: PRESET_COLORS[0] })
    setShowExpenseModal(true)
  }

  const openEditCategory = (c: BudgetCategory) => {
    setEditCategory(c)
    setExpenseForm({ name: c.name, icon: c.icon, color: c.color })
    setShowExpenseModal(true)
  }

  const handleSaveCategory = async () => {
    if (!expenseForm.name.trim()) return
    setSavingExpense(true)
    const payload = { name: expenseForm.name.trim(), icon: expenseForm.icon, color: expenseForm.color }

    if (editCategory) {
      const { data } = await sb
        .from('budget_categories')
        .update(payload)
        .eq('id', editCategory.id)
        .select()
        .single()
      if (data) setCategories(prev => prev.map(c => c.id === editCategory.id ? data : c))
    } else {
      const { data } = await sb
        .from('budget_categories')
        .insert({ ...payload, user_id: userId, sort_order: categories.length, budget_amount: 0 })
        .select()
        .single()
      if (data) setCategories(prev => [...prev, data])
    }

    setSavingExpense(false)
    setShowExpenseModal(false)
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('카테고리를 삭제하면 해당 카테고리의 지출 기록에서 분류가 제거됩니다. 계속할까요?')) return
    await sb.from('budget_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
    setShowExpenseModal(false)
  }

  const moveOrder = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    const idx = sorted.findIndex(c => c.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === sorted.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]]
    setCategories(sorted)
    await Promise.all([
      sb.from('budget_categories').update({ sort_order: swapIdx }).eq('id', sorted[swapIdx].id),
      sb.from('budget_categories').update({ sort_order: idx }).eq('id', sorted[idx].id),
    ])
  }

  // ─────────────────────────────────────────────
  // 자산 CRUD
  // ─────────────────────────────────────────────
  const openAddAsset = () => {
    setEditAsset(null)
    setAssetForm({ name: '', icon: ASSET_ICONS[0], amount: '', asset_type: 'asset', note: '' })
    setShowAssetModal(true)
  }

  const openEditAsset = (a: BudgetAsset) => {
    setEditAsset(a)
    setAssetForm({
      name: a.name,
      icon: a.icon,
      amount: String(Math.abs(a.amount)),
      asset_type: a.asset_type,
      note: a.note || '',
    })
    setShowAssetModal(true)
  }

  const handleSaveAsset = async () => {
    if (!assetForm.name.trim() || !assetForm.amount) return
    setSavingAsset(true)
    const amount = Number(assetForm.amount) * (assetForm.asset_type === 'liability' ? -1 : 1)
    const payload = {
      name: assetForm.name.trim(),
      icon: assetForm.icon,
      amount,
      asset_type: assetForm.asset_type,
      note: assetForm.note.trim(),
    }

    if (editAsset) {
      const { data } = await sb
        .from('budget_assets')
        .update(payload)
        .eq('id', editAsset.id)
        .select()
        .single()
      if (data) setAssets(prev => prev.map(a => a.id === editAsset.id ? data : a))
    } else {
      const { data } = await sb
        .from('budget_assets')
        .insert({ ...payload, user_id: userId, sort_order: assets.length })
        .select()
        .single()
      if (data) setAssets(prev => [...prev, data])
    }

    setSavingAsset(false)
    setShowAssetModal(false)
  }

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('자산을 삭제하시겠습니까?')) return
    await sb.from('budget_assets').delete().eq('id', id)
    setAssets(prev => prev.filter(a => a.id !== id))
    setShowAssetModal(false)
  }

  const sortedCategories = [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const assetItems     = assets.filter(a => a.asset_type === 'asset')
  const liabilityItems = assets.filter(a => a.asset_type === 'liability')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 탭 + 추가 버튼 */}
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
                transition: 'all .14s',
              }}
            >
              {tab === 'expense' ? '지출 분류' : '자산 분류'}
            </button>
          ))}
        </div>
        {activeTab === 'expense' ? (
          <button type="button" onClick={openAddCategory} style={btnStyle(true)}>+ 카테고리 추가</button>
        ) : (
          <button type="button" onClick={openAddAsset} style={btnStyle(true)}>+ 자산 추가</button>
        )}
      </div>

      {/* ══════════════════════════════
          Tab 1: 지출 분류
      ══════════════════════════════ */}
      {activeTab === 'expense' && (
        <>
          {/* 통계 */}
          <section style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>카테고리 수</div>
                <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900 }}>{categories.length}개</div>
              </div>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>예산 설정</div>
                <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                  예산 설정 탭에서 관리
                </div>
              </div>
            </div>
          </section>

          {/* 카테고리 목록 */}
          <section style={cardStyle}>
            {sortedCategories.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                + 카테고리 추가 버튼으로 분류를 만들어 보세요.
              </div>
            ) : (
              sortedCategories.map((c, index) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 0',
                    borderBottom: index < sortedCategories.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {/* 순서 버튼 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => moveOrder(c.id, 'up')}
                      disabled={index === 0}
                      style={{ border: 'none', background: 'none', color: index === 0 ? 'var(--border2)' : 'var(--text3)', cursor: index === 0 ? 'default' : 'pointer', fontSize: 10, lineHeight: 1, padding: '2px 4px' }}
                    >▲</button>
                    <button
                      type="button"
                      onClick={() => moveOrder(c.id, 'down')}
                      disabled={index === sortedCategories.length - 1}
                      style={{ border: 'none', background: 'none', color: index === sortedCategories.length - 1 ? 'var(--border2)' : 'var(--text3)', cursor: index === sortedCategories.length - 1 ? 'default' : 'pointer', fontSize: 10, lineHeight: 1, padding: '2px 4px' }}
                    >▼</button>
                  </div>
                  {/* 아이콘 */}
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${c.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, fontSize: 18, flexShrink: 0 }}>
                    {c.icon}
                  </div>
                  {/* 이름 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{c.name}</div>
                  </div>
                  {/* 색상 점 */}
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  {/* 수정 */}
                  <button
                    type="button"
                    onClick={() => openEditCategory(c)}
                    style={{ border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, padding: '4px' }}
                    title="수정"
                  >✏️</button>
                </div>
              ))
            )}
          </section>
        </>
      )}

      {/* ══════════════════════════════
          Tab 2: 자산 분류
      ══════════════════════════════ */}
      {activeTab === 'asset' && (
        <>
          {/* 통계 */}
          <section style={cardStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
              {[
                { label: '자산 항목', value: `${assetItems.length}개`, color: 'var(--green)' },
                { label: '부채 항목', value: `${liabilityItems.length}개`, color: 'var(--red)' },
                { label: '총 항목',   value: `${assets.length}개`, color: 'var(--accent)' },
              ].map(item => (
                <div key={item.label} style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>{item.label}</div>
                  <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 자산 목록 */}
          <section style={cardStyle}>
            {assets.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                + 자산 추가 버튼으로 자산을 등록해 보세요.
              </div>
            ) : (
              <>
                {/* 자산 */}
                {assetItems.length > 0 && (
                  <div style={{ marginBottom: liabilityItems.length > 0 ? 20 : 0 }}>
                    <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      자산
                    </div>
                    {assetItems.map((item, index) => (
                      <div
                        key={item.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: index < assetItems.length - 1 ? '1px solid var(--border)' : 'none' }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {item.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                          {item.note && <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text3)' }}>{item.note}</div>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--green)', flexShrink: 0 }}>
                          {fmtW(item.amount)}
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditAsset(item)}
                          style={{ border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, padding: '4px' }}
                          title="수정"
                        >✏️</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* 부채 */}
                {liabilityItems.length > 0 && (
                  <div>
                    <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      부채
                    </div>
                    {liabilityItems.map((item, index) => (
                      <div
                        key={item.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: index < liabilityItems.length - 1 ? '1px solid var(--border)' : 'none' }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--red-bg)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {item.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                          {item.note && <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text3)' }}>{item.note}</div>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--red)', flexShrink: 0 }}>
                          -{fmtW(Math.abs(item.amount))}
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditAsset(item)}
                          style={{ border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, padding: '4px' }}
                          title="수정"
                        >✏️</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}

      {/* ══════════════════════════════
          모달: 지출 카테고리 추가/수정
      ══════════════════════════════ */}
      {showExpenseModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.44)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setShowExpenseModal(false)}
        >
          <div style={{ width: '100%', maxWidth: 520, maxHeight: '92vh', overflow: 'auto', background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                {editCategory ? '카테고리 수정' : '카테고리 추가'}
              </div>
              <button type="button" onClick={() => setShowExpenseModal(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* 아이콘 */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>아이콘</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EXPENSE_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setExpenseForm(prev => ({ ...prev, icon }))}
                      style={{ width: 42, height: 42, borderRadius: 12, fontSize: 18, border: expenseForm.icon === icon ? '2px solid var(--accent)' : '1px solid var(--border2)', background: expenseForm.icon === icon ? 'var(--accent-bg)' : 'var(--bg)', cursor: 'pointer' }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* 색상 */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>색상</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setExpenseForm(prev => ({ ...prev, color }))}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: color, border: expenseForm.color === color ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)' }}>직접 입력:</label>
                  <input
                    type="color"
                    value={expenseForm.color}
                    onChange={e => setExpenseForm(prev => ({ ...prev, color: e.target.value }))}
                    style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border2)', cursor: 'pointer', padding: 2 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'monospace' }}>{expenseForm.color}</span>
                </div>
              </div>

              {/* 이름 */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>이름</label>
                <input
                  value={expenseForm.name}
                  onChange={e => setExpenseForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 식비"
                  style={fieldStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} style={{ ...btnStyle(false), flex: 1 }}>취소</button>
                {editCategory && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(editCategory.id)}
                    style={{ ...btnStyle(false), color: 'var(--red)' }}
                  >
                    삭제
                  </button>
                )}
                <button type="button" onClick={handleSaveCategory} disabled={savingExpense} style={{ ...btnStyle(true), flex: 1 }}>
                  {savingExpense ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          모달: 자산 추가/수정
      ══════════════════════════════ */}
      {showAssetModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.44)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setShowAssetModal(false)}
        >
          <div style={{ width: '100%', maxWidth: 520, maxHeight: '92vh', overflow: 'auto', background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                {editAsset ? '자산 수정' : '자산 추가'}
              </div>
              <button type="button" onClick={() => setShowAssetModal(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* 아이콘 */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>아이콘</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ASSET_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setAssetForm(prev => ({ ...prev, icon }))}
                      style={{ width: 42, height: 42, borderRadius: 12, fontSize: 18, border: assetForm.icon === icon ? '2px solid var(--accent)' : '1px solid var(--border2)', background: assetForm.icon === icon ? 'var(--accent-bg)' : 'var(--bg)', cursor: 'pointer' }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* 유형 */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>유형</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ASSET_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setAssetForm(prev => ({ ...prev, asset_type: type.value }))}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        border: assetForm.asset_type === type.value ? '2px solid var(--accent)' : '1px solid var(--border2)',
                        background: assetForm.asset_type === type.value ? 'var(--accent-bg)' : 'var(--surface)',
                        cursor: 'pointer',
                        fontWeight: 800,
                        color: assetForm.asset_type === type.value ? 'var(--accent)' : 'var(--text2)',
                      }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 이름 */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>이름</label>
                <input
                  value={assetForm.name}
                  onChange={e => setAssetForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 토스 통장"
                  style={fieldStyle}
                />
              </div>

              {/* 금액 */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>금액 (원)</label>
                <input
                  type="number"
                  value={assetForm.amount}
                  onChange={e => setAssetForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                  style={fieldStyle}
                />
              </div>

              {/* 메모 */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>메모 (선택)</label>
                <input
                  value={assetForm.note}
                  onChange={e => setAssetForm(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="예: 급여 입금 계좌"
                  style={fieldStyle}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowAssetModal(false)} style={{ ...btnStyle(false), flex: 1 }}>취소</button>
                {editAsset && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAsset(editAsset.id)}
                    style={{ ...btnStyle(false), color: 'var(--red)' }}
                  >
                    삭제
                  </button>
                )}
                <button type="button" onClick={handleSaveAsset} disabled={savingAsset} style={{ ...btnStyle(true), flex: 1 }}>
                  {savingAsset ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
