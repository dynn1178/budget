'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { downloadCSV, fmtW } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { useWindowSize } from '@/hooks/useWindowSize'
import type { BudgetAsset } from '@/types/database'

// Static demo data for net worth history
const NET_WORTH_HISTORY = [
  { label: '11월', amount: 42000000 },
  { label: '12월', amount: 44500000 },
  { label: '1월', amount: 43800000 },
  { label: '2월', amount: 46200000 },
  { label: '3월', amount: 47900000 },
  { label: '4월', amount: 49100000 },
]

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
  const { isMobile } = useWindowSize()
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

  const setField = (key: keyof FormState, value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const totalAssets = assets.filter(i => i.asset_type === 'asset').reduce((sum, i) => sum + i.amount, 0)
  const totalLiabilities = assets.filter(i => i.asset_type === 'liability').reduce((sum, i) => sum + Math.abs(i.amount), 0)
  const netWorth = totalAssets - totalLiabilities

  const nwMax = Math.max(...NET_WORTH_HISTORY.map(i => i.amount), 1)
  const nwFirst = NET_WORTH_HISTORY[0]?.amount || 0
  const nwLast = NET_WORTH_HISTORY[NET_WORTH_HISTORY.length - 1]?.amount || 0
  const nwGrowth = nwLast - nwFirst
  const nwMonthlyAvg = Math.round(nwGrowth / (NET_WORTH_HISTORY.length - 1 || 1))
  const nwGrowthRate = nwFirst > 0 ? Math.round((nwGrowth / nwFirst) * 100) : 0

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
    setAssets(prev => prev.filter(i => i.id !== id))
    setShowModal(false)
  }

  const exportCSV = () => {
    downloadCSV(
      [['이름', '유형', '금액', '메모'], ...assets.map(i => [i.name, i.asset_type === 'asset' ? '자산' : '부채', Math.abs(i.amount), i.note])],
      'assets.csv'
    )
  }

  const assetItems = assets.filter(i => i.asset_type === 'asset')
  const liabilityItems = assets.filter(i => i.asset_type === 'liability')

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>자산 요약</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={exportCSV} style={btnStyle(false)}>CSV</button>
            <button type="button" onClick={openAdd} style={btnStyle(true)}>자산 추가</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: '총자산', value: fmtW(totalAssets), color: 'var(--green)' },
            { label: '총부채', value: fmtW(totalLiabilities), color: 'var(--red)' },
            { label: '순자산', value: fmtW(netWorth), color: 'var(--accent)' },
          ].map(item => (
            <div key={item.label} style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>{item.label}</div>
              <div style={{ marginTop: 4, fontSize: isMobile ? 16 : 20, fontWeight: 900, color: item.color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 순자산 추이 — static demo data */}
      <section style={cardStyle}>
        <SectionTitle sub="데모 데이터 · 최근 6개월 순자산 추이">순자산 추이</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130, marginBottom: 14 }}>
          {NET_WORTH_HISTORY.map((item, index) => {
            const isLast = index === NET_WORTH_HISTORY.length - 1
            const barH = Math.max(14, (item.amount / nwMax) * 100)
            return (
              <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: isLast ? 'var(--accent)' : 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(item.amount / 10000000)}천만
                </div>
                <div style={{ width: '100%', maxWidth: 48, height: barH, borderRadius: '6px 6px 0 0', background: isLast ? 'var(--accent)' : 'var(--teal-bg)' }} />
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.label}</div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>6개월 증가액</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--green)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>+{fmtW(nwGrowth)}</div>
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>월 평균 증가</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>+{fmtW(nwMonthlyAvg)}</div>
          </div>
          <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>증가율</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--teal)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>+{nwGrowthRate}%</div>
          </div>
        </div>
      </section>

      {/* Asset list */}
      <section style={cardStyle}>
        <SectionTitle>자산 목록</SectionTitle>
        {assetItems.length === 0 && liabilityItems.length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>아직 등록된 자산이 없습니다.</div>
        ) : (
          <>
            {assetItems.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>자산</div>
                {assetItems.map((item, index) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: index < assetItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                      {item.note && <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text3)' }}>{item.note}</div>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtW(item.amount)}</div>
                    <button type="button" onClick={() => openEdit(item)} style={{ border: 'none', background: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, padding: '4px' }} title="수정">✏️</button>
                    <button type="button" onClick={() => handleDelete(item.id)} style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: '4px' }} title="삭제">✕</button>
                  </div>
                ))}
              </div>
            )}
            {liabilityItems.length > 0 && (
              <div>
                <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>부채</div>
                {liabilityItems.map((item, index) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: index < liabilityItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--red-bg)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                      {item.note && <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text3)' }}>{item.note}</div>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--red)', flexShrink: 0 }}>-{fmtW(Math.abs(item.amount))}</div>
                    <button type="button" onClick={() => openEdit(item)} style={{ border: 'none', background: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, padding: '4px' }} title="수정">✏️</button>
                    <button type="button" onClick={() => handleDelete(item.id)} style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: '4px' }} title="삭제">✕</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.44)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{editItem ? '자산 수정' : '자산 추가'}</div>
              <button type="button" onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text3)' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>아이콘</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setField('icon', icon)} style={{ padding: '8px 12px', borderRadius: 10, border: form.icon === icon ? '2px solid var(--accent)' : '1px solid var(--border2)', background: form.icon === icon ? 'var(--accent-bg)' : 'var(--bg)', cursor: 'pointer', fontWeight: 800, fontSize: 12 }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>유형</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ASSET_TYPES.map(type => (
                    <button key={type.value} type="button" onClick={() => setField('asset_type', type.value)} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: form.asset_type === type.value ? '2px solid var(--accent)' : '1px solid var(--border2)', background: form.asset_type === type.value ? 'var(--accent-bg)' : 'var(--surface)', cursor: 'pointer', fontWeight: 800, color: form.asset_type === type.value ? 'var(--accent)' : 'var(--text2)' }}>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>이름</label>
                <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="예: 생활비 통장" style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>금액</label>
                <input type="number" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0" style={fieldStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6 }}>메모</label>
                <input value={form.note} onChange={e => setField('note', e.target.value)} placeholder="선택 입력" style={fieldStyle} />
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
