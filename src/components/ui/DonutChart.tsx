'use client'

interface Segment { value: number; color: string }

export function DonutChart({ segments, size = 160, thickness = 28, label, sublabel }: {
  segments: Segment[]; size?: number; thickness?: number; label?: string; sublabel?: string
}) {
  const total = segments.reduce((s, d) => s + d.value, 0)
  const r = (size - thickness) / 2
  const cx = size / 2, cy = size / 2
  const C = 2 * Math.PI * r
  let cumFrac = 0

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg2)" strokeWidth={thickness} />
        {segments.map((seg, i) => {
          const frac = seg.value / total
          const dashLen = frac * C
          const rotate = cumFrac * 360 - 90
          cumFrac += frac
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth={thickness}
              strokeDasharray={`${dashLen} ${C}`}
              strokeDashoffset={0}
              transform={`rotate(${rotate} ${cx} ${cy})`}
            />
          )
        })}
      </svg>
      {label && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontWeight: 800, fontSize: size > 130 ? 16 : 13, color: 'var(--text)', lineHeight: 1.1 }}>{label}</div>
          {sublabel && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{sublabel}</div>}
        </div>
      )}
    </div>
  )
}
