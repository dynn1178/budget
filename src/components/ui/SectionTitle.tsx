'use client'

export function SectionTitle({ children, sub, action }: {
  children: React.ReactNode; sub?: string; action?: { label: string; fn: () => void }
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 3, height: 14, background: 'var(--accent)', borderRadius: 2, marginRight: 4 }} />
          {children}
        </h2>
        {sub && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{sub}</p>}
      </div>
      {action && (
        <button onClick={action.fn} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
          {action.label}
        </button>
      )}
    </div>
  )
}
