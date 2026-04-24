'use client'

export function Toggle({
  checked,
  onChange,
  on,
  onToggle,
}: {
  checked?: boolean
  onChange?: () => void
  on?: boolean
  onToggle?: () => void
}) {
  const value = checked ?? on ?? false
  const handle = onChange ?? onToggle ?? (() => {})

  return (
    <button
      type="button"
      onClick={handle}
      style={{
        width: 44,
        height: 24,
        borderRadius: 99,
        background: value ? 'var(--accent)' : 'var(--bg3)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background .18s',
        border: 'none',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: value ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left .18s',
          boxShadow: '0 1px 4px rgba(0,0,0,.25)',
        }}
      />
    </button>
  )
}
