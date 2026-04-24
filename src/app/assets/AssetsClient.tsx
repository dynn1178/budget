'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { fmtW, downloadCSV } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { BudgetAsset } from '@/types/database'

const ICONS = ['🏦','📈','🏠','🚗','🪙','💳','🏛️','💵','🏢','✈️','💎','🎓']
const ASSET_TYPES = [{ value: 'asset', label: '자산' }, { value: 'liability', label: '부채' }]

interface FormState { name: string; icon: string; amount: string; asset_type: 'asset' | 'liability'; note: string }

export function AssetsClient({ assets: initialAssets, userId }: { assets: BudgetAsset[]; userId: string }) {
  const sb = createClient()
  const router = useRouter()
  const [assets, setAssets] = useState(initialAssets)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<BudgetAsset | null>(null)
  const [form, setForm] = useState<FormState>({ name: '', icon: '🏦', amount: '', asset_type: 'asset', note: '' })
  const [saving, setSaving] = useState(false)
  const setF = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const totalAssets = assets.filter(a => a.asset_type === 'asset').reduce((s, a) => s + a.amount, 0)
  const totalLiab   = assets.filter(a => a.asset_type === 'liability').reduce((s, a) => s + Math.abs(a.amount), 0)
  const netWorth    = totalAssets - totalLiab

  const openAdd = () => {
    setForm({ name: '', icon: '🏦', amount: '', asset_type: 'asset', note: '' })
    setEditItem(null); setShowModal(true)
  }
  const openEdit = (a: BudgetAsset) => {
    setForm({ name: a.name, icon: a.icon, amount: String(Math.abs(a.amount)), asset_type: a.asset_type, note: a.note })
    setEditItem(a); setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.amount) return
    setSaving(true)
    const amt = parseInt(form.amount) * (form.asset_type === 'liability' ? -1 : 1)
    if (editItem) {
      await sb.from('budget_assets').update({ name: form.name, icon: form.icon, amount: amt, asset_type: form.asset_type, note: form.note }).eq('id', editItem.id)
    } else {
      await sb.from('budget_assets').insert({ user_id: userId, name: form.name, icon: form.icon, amount: amt, asset_type: form.asset_type, note: form.note, sort_order: assets.length })
    }
    setSaving(false); setShowModal(false); router.refresh()
  }

  const handleDelete = async (id: string) => {
    await sb.from('budget_assets').delete().eq('id', id)
    setAssets(list => list.filter(a => a.id !== id))
    setShowModal(false)
  }

  const exportCSV = () => {
    downloadCSV([['자산명','유형','금액','메모'], ...assets.map(a => [a.name, a.asset_type === 'asset' ? '자산' : '부채', Math.abs(a.amount), a.note])], '자산내역.csv')
  }

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)' } as const
  const s = {
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 },
    input: { width: '100%', padding: '10px 13px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border2)', fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' as const },
    btn: (primary: boolean) => ({ padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, background: primary ? 'var(--accent)' : 'var(--bg2)', color: primary ? '#fff' : 'var(--text2)' }) as React.CSSProperties,
  }

  const assetList = assets.filter(a => a.asset_type === 'asset')
  const liabList  = assets.filter(a => a.asset_type === 'liability')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>자산 요약</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportCSV} style={{ ...s.btn(false), fontSize: 12, padding: '7px 14px' }}>📥 CSV</button>
            <button onClick={openAdd}   style={{ ...s.btn(true),  fontSize: 12, padding: '7px 14px' }}>＋ 자산 추가</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { label: '총 자산', value: fmtW(totalAssets), color: 'var(--green)', icon: '📈' },
            { label: '총 부채', value: fmtW(totalLiab),   color: 'var(--red)',   icon: '📉' },
            { label: '순자산', value: fmtW(netWorth),     color: 'var(--accent)',icon: '💎' },
          ].map(item => (
            <div key={item.label} style={{ padding: '16px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{item.label}</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: item.color, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Asset list */}
      <div style={card}>
        <SectionTitle>자산 목록</SectionTitle>
        {assetList.length === 0 && liabList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>자산을 추가해보세요</div>
          </div>
        )}
        {assetList.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>자산 ({assetList.length})</div>
            {assetList.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < assetList.length - 1 ? '1px solid var(--border)' : '1px solid var(--border2)' }}>
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.name}</div>
                  {a.note && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{a.note}</div>}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmtW(a.amount)}</div>
                <button onClick={() => openEdit(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text3)', padding: '4px 6px', borderRadius: 6 }}>✏️</button>
              </div>
            ))}
          </>
        )}
        {liabList.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 16, marginBottom: 8 }}>부채 ({liabList.length})</div>
            {liabList.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < liabList.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.name}</div>
                  {a.note && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{a.note}</div>}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>-{fmtW(Math.abs(a.amount))}</div>
                <button onClick={() => openEdit(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text3)', padding: '4px 6px', borderRadius: 6 }}>✏️</button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', padding: '24px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{editItem ? '자산 수정' : '자산 추가'}</div>
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
                <label style={s.label}>유형</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ASSET_TYPES.map(t => (
                    <button key={t.value} onClick={() => setF('asset_type', t.value)} style={{ flex: 1, padding: '9px', borderRadius: 'var(--radius-sm)', border: form.asset_type === t.value ? '2px solid var(--accent)' : '1px solid var(--border2)', background: form.asset_type === t.value ? 'var(--accent-bg)' : 'var(--surface)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: form.asset_type === t.value ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer' }}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div><label style={s.label}>자산명</label><input style={s.input} placeholder="예: 신한은행 적금" value={form.name} onChange={e => setF('name', e.target.value)} /></div>
              <div><label style={s.label}>금액 (원)</label><input style={s.input} type="number" placeholder="0" value={form.amount} onChange={e => setF('amount', e.target.value)} /></div>
              <div><label style={s.label}>메모 (선택)</label><input style={s.input} placeholder="간단한 메모" value={form.note} onChange={e => setF('note', e.target.value)} /></div>
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
