'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { downloadCSV, fmtW } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetAsset } from '@/types/database'

const ICONS = ['예금', '현금', '투자', '부동산', '차량', '대출', '카드']
const ASSET_TYPES = [
  { value: 'asset', label: '자산' },
  { value: 'liability', label: '부채' },
] as const

interface FormState {
  name: string
  icon: string
  amount: string
  asset_type: 'asset' | 'liability'
  note: string
}

export function AssetsClient({ assets: initialAssets, userId }: { assets: BudgetAsset[]; userId: string }) {
  const sb = createClient()
  const router = useRouter()
  const [assets, setAssets] = useState(initialAssets)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<BudgetAsset | null>(null)
  const [form, setForm] = useState<FormState>({
    name: '',
    icon: ICONS[0],
    amount: '',
    asset_type: 'asset',
    note: '',
  })
  const [saving, setSaving] = useState(false)

  const setField = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const totalAssets = assets.filter((item) => item.asset_type === 'asset').reduce((sum, item) => sum + item.amount, 0)
  const totalLiabilities = assets.filter((item) => item.asset_type === 'liability').reduce((sum, item) => sum + Math.abs(item.amount), 0)
  const netWorth = totalAssets - totalLiabilities

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: '', icon: ICONS[0], amount: '', asset_type: 'asset', note: '' })
    setShowModal(true)
  }

  const openEdit = (item: BudgetAsset) => {
    setEditItem(item)
    setForm({
      name: item.name,
      icon: item.icon,
      amount: String(Math.abs(item.amount)),
      asset_type: item.asset_type,
      note: item.note || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.amount) return
    setSaving(true)

    const amount = Number(form.amount) * (form.asset_type === 'liability' ? -1 : 1)
    const payload = {
      name: form.name.trim(),
      icon: form.icon,
      amount,
      asset_type: form.asset_type,
      note: form.note.trim(),
    }

    if (editItem) {
      await sb.from('budget_assets').update(payload).eq('id', editItem.id)
    } else {
      await sb.from('budget_assets').insert({ ...payload, user_id: userId, sort_order: assets.length })
    }

    setSaving(false)
    setShowModal(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    await sb.from('budget_assets').delete().eq('id', id)
    setAssets((prev) => prev.filter((item) => item.id !== id))
    setShowModal(false)
  }

  const exportCSV = () => {
    downloadCSV(
      [['이름', '유형', '금액', '메모'], ...assets.map((item) => [item.name, item.asset_type === 'asset' ? '자산' : '부채', Math.abs(item.amount), item.note])],
      'assets.csv',
    )
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

  const assetItems = assets.filter((item) => item.asset_type === 'asset')
  const liabilityItems = assets.filter((item) => item.asset_type === 'liability')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>자산 요약</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={exportCSV} style={buttonStyle(false)}>
              CSV
            </button>
            <button type="button" onClick={openAdd} style={buttonStyle(true)}>
              자산 추가
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>총자산</div>
            <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: 'var(--green)' }}>{fmtW(totalAssets)}</div>
          </div>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>총부채</div>
            <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: 'var(--red)' }}>{fmtW(totalLiabilities)}</div>
          </div>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>순자산</div>
            <div style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: 'var(--accent)' }}>{fmtW(netWorth)}</div>
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <SectionTitle>자산 목록</SectionTitle>
        {assetItems.length === 0 && liabilityItems.length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>아직 등록된 자산이 없습니다.</div>
        ) : (
          <>
            {assetItems.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>자산</div>
                {assetItems.map((item, index) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: index < assetItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                      {item.note && <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text3)' }}>{item.note}</div>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{fmtW(item.amount)}</div>
                    <button type="button" onClick={() => openEdit(item)} style={{ border: 'none', background: 'none', color: 'var(--text3)', cursor: 'pointer', fontWeight: 700 }}>
                      수정
                    </button>
                  </div>
                ))}
              </div>
            )}

            {liabilityItems.length > 0 && (
              <div>
                <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>부채</div>
                {liabilityItems.map((item, index) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: index < liabilityItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--red-bg)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                      {item.note && <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text3)' }}>{item.note}</div>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--red)' }}>-{fmtW(Math.abs(item.amount))}</div>
                    <button type="button" onClick={() => openEdit(item)} style={{ border: 'none', background: 'none', color: 'var(--text3)', cursor: 'pointer', fontWeight: 700 }}>
                      수정
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.42)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{editItem ? '자산 수정' : '자산 추가'}</div>
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
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>유형</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ASSET_TYPES.map((type) => (
                    <button key={type.value} type="button" onClick={() => setField('asset_type', type.value)} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: form.asset_type === type.value ? '2px solid var(--accent)' : '1px solid var(--border2)', background: form.asset_type === type.value ? 'var(--accent-bg)' : 'var(--surface)', cursor: 'pointer', fontWeight: 800, color: form.asset_type === type.value ? 'var(--accent)' : 'var(--text2)' }}>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>이름</label>
                <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="예: 생활비 통장" style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>금액</label>
                <input type="number" value={form.amount} onChange={(e) => setField('amount', e.target.value)} placeholder="0" style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>메모</label>
                <input value={form.note} onChange={(e) => setField('note', e.target.value)} placeholder="선택 입력" style={fieldStyle} />
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
