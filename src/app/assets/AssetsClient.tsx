'use client'

import { fmtW } from '@/lib/utils'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { useWindowSize } from '@/hooks/useWindowSize'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { BudgetAsset } from '@/types/database'

// 최근 6개월 순자산 추이 (실제 데이터로 교체 예정)
const NET_WORTH_HISTORY = [
  { label: '11월', amount: 42000000 },
  { label: '12월', amount: 44500000 },
  { label: '1월',  amount: 43800000 },
  { label: '2월',  amount: 46200000 },
  { label: '3월',  amount: 47900000 },
  { label: '4월',  amount: 49100000 },
]

export function AssetsClient({ assets }: { assets: BudgetAsset[] }) {
  const { isMobile } = useWindowSize()

  const assetItems      = assets.filter(i => i.asset_type === 'asset')
  const liabilityItems  = assets.filter(i => i.asset_type === 'liability')
  const totalAssets     = assetItems.reduce((sum, i) => sum + i.amount, 0)
  const totalLiabilities = liabilityItems.reduce((sum, i) => sum + Math.abs(i.amount), 0)
  const netWorth        = totalAssets - totalLiabilities

  const nwMax   = Math.max(...NET_WORTH_HISTORY.map(i => i.amount), 1)
  const nwFirst = NET_WORTH_HISTORY[0]?.amount || 0
  const nwLast  = NET_WORTH_HISTORY[NET_WORTH_HISTORY.length - 1]?.amount || 0
  const nwGrowth     = nwLast - nwFirst
  const nwMonthlyAvg = Math.round(nwGrowth / (NET_WORTH_HISTORY.length - 1 || 1))
  const nwGrowthRate = nwFirst > 0 ? Math.round((nwGrowth / nwFirst) * 100) : 0

  const cardStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: isMobile ? '16px' : '20px 24px',
    boxShadow: 'var(--shadow-sm)',
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 자산 요약 */}
      <section style={cardStyle}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>자산 현황 분석</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: '총자산',  value: fmtW(totalAssets),      color: 'var(--green)' },
            { label: '총부채',  value: fmtW(totalLiabilities), color: 'var(--red)'   },
            { label: '순자산',  value: fmtW(netWorth),         color: 'var(--accent)'},
          ].map(item => (
            <div key={item.label} style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)' }}>{item.label}</div>
              <div style={{ marginTop: 4, fontSize: isMobile ? 16 : 20, fontWeight: 900, color: item.color, fontVariantNumeric: 'tabular-nums' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* 자산/부채 비율 */}
        {totalAssets > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
              <span>자산 비율</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                부채비율 {totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 0}%
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--bg)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, 100 - (totalLiabilities / totalAssets) * 100))}%`, background: 'var(--green)', borderRadius: 999 }} />
            </div>
          </div>
        )}
      </section>

      {/* 순자산 추이 */}
      <section style={cardStyle}>
        <SectionTitle sub="최근 6개월 순자산 추이 (데모 데이터)">순자산 추이</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130, marginBottom: 14 }}>
          {NET_WORTH_HISTORY.map((item, index) => {
            const isLast = index === NET_WORTH_HISTORY.length - 1
            const barH = Math.max(14, (item.amount / nwMax) * 100)
            return (
              <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: isLast ? 'var(--accent)' : 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(item.amount / 10000000)}천만
                </div>
                <div style={{ width: '100%', maxWidth: 48, height: barH, borderRadius: '6px 6px 0 0', background: isLast ? 'var(--accent)' : 'var(--accent-bg)' }} />
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.label}</div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: '6개월 증가액', value: `+${fmtW(nwGrowth)}`, color: 'var(--green)' },
            { label: '월 평균 증가',  value: `+${fmtW(nwMonthlyAvg)}`, color: 'var(--accent)' },
            { label: '증가율',       value: `+${nwGrowthRate}%`, color: 'var(--teal)' },
          ].map(item => (
            <div key={item.label} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: item.color, fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 자산 구성 */}
      {assetItems.length > 0 && (
        <section style={cardStyle}>
          <SectionTitle sub="자산 항목별 구성 비율">자산 구성</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {assetItems.map(item => {
              const ratio = totalAssets > 0 ? Math.round((item.amount / totalAssets) * 100) : 0
              return (
                <div key={item.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{fmtW(item.amount)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', width: 32, textAlign: 'right' }}>{ratio}%</div>
                  </div>
                  <ProgressBar value={item.amount} max={totalAssets} color="var(--accent)" height={4} />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 부채 목록 */}
      {liabilityItems.length > 0 && (
        <section style={cardStyle}>
          <SectionTitle sub="부채 항목별 현황">부채 현황</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {liabilityItems.map(item => {
              const ratio = totalLiabilities > 0 ? Math.round((Math.abs(item.amount) / totalLiabilities) * 100) : 0
              return (
                <div key={item.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--red-bg)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</div>
                      {item.note && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{item.note}</div>}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--red)' }}>
                      -{fmtW(Math.abs(item.amount))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', width: 32, textAlign: 'right' }}>{ratio}%</div>
                  </div>
                  <ProgressBar value={Math.abs(item.amount)} max={totalLiabilities} color="var(--red)" height={4} />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 자산이 없을 때 */}
      {assets.length === 0 && (
        <section style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏦</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>아직 등록된 자산이 없습니다</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.7 }}>
            <strong>카테고리</strong> 탭의 <strong>자산 분류</strong>에서 자산을 추가해 보세요.
          </div>
        </section>
      )}

      {/* 안내 */}
      <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-bg)', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
        💡 자산 추가·수정은 <strong>카테고리</strong> 탭 → <strong>자산 분류</strong>에서 할 수 있습니다.
      </div>
    </div>
  )
}
