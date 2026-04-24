'use client'
import { pct } from '@/lib/utils'

export function ProgressBar({ value, max, color = 'var(--accent)', height = 6, showOverflow = true }: {
  value: number; max: number; color?: string; height?: number; showOverflow?: boolean
}) {
  const p = Math.min(100, pct(value, max))
  const over = value > max
  return (
    <div style={{ width: '100%', height, background: 'var(--bg2)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${p}%`,
        background: over && showOverflow ? 'var(--red)' : color,
        borderRadius: 99,
        transition: 'width .4s ease',
      }} />
    </div>
  )
}
