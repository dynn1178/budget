'use client'

interface Segment {
  value: number
  color: string
}

export function DonutChart({
  segments,
  size = 160,
  thickness = 28,
  label,
  sublabel,
}: {
  segments: Segment[]
  size?: number
  thickness?: number
  label?: string
  sublabel?: string
}) {
  const safeSegments = segments.filter((segment) => segment.value > 0)
  const total = safeSegments.reduce((sum, segment) => sum + segment.value, 0)
  const segmentsToRender = total > 0 ? safeSegments : [{ value: 1, color: 'var(--bg3)' }]
  const renderTotal = segmentsToRender.reduce((sum, segment) => sum + segment.value, 0)

  const r = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  let accumulatedFraction = 0

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg2)" strokeWidth={thickness} />
        {segmentsToRender.map((segment, index) => {
          const fraction = segment.value / renderTotal
          const dashLength = fraction * circumference
          const rotation = accumulatedFraction * 360 - 90
          accumulatedFraction += fraction

          return (
            <circle
              key={index}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeDasharray={`${dashLength} ${circumference}`}
              transform={`rotate(${rotation} ${cx} ${cy})`}
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
