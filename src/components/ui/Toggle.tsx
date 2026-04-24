'use client'

export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 44, height: 24, borderRadius: 99,
        background: on ? 'var(--accent)' : 'var(--bg3)',
        position: 'relative', cursor: 'pointer',
        transition: 'background .18s', border: 'none', padding: 0, flexShrink: 0,
      }}>
      <div style={{
        position: 'absolute', top: 3, width: 18, height: 18,
        borderRadius: '50%', background: '#fff',
        left: on ? 23 : 3,
        transition: 'left .18s',
        boxShadow: '0 1px 4px rgba(0,0,0,.25)',
      }} />
    </button>
  )
}
