'use client'

export function StatCard({ icon, label, value, sub, color, trend, onClick }: {
  icon?: string; label: string; value: string; sub?: string; color?: string; trend?: number; onClick?: () => void
}) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '16px 18px',
      boxShadow: 'var(--shadow-sm)', cursor: onClick ? 'pointer' : 'default',
    }}
    onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'; }}}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      </div>
      <div style={{ fontWeight: 800, fontSize: 22, color: color || 'var(--text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>{value}</div>
      {(sub || trend !== undefined) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {trend !== undefined && (
            <span style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? 'var(--red)' : 'var(--green)' }}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{sub}</span>}
        </div>
      )}
    </div>
  )
}
