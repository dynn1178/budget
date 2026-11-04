'use client'

import { useEffect, useRef } from 'react'
import type { BlackCatHandle, BlackCatOptions } from './cat-engine'

type Props = BlackCatOptions & {
  /** '3d' = three.js 실사풍(기본, WebGL 없으면 자동으로 2d), '2d' = 가벼운 SVG 버전 */
  mode?: '3d' | '2d'
  className?: string
  style?: React.CSSProperties
  /** 엔진 핸들이 필요할 때 (예: 버튼으로 cat.play('sleep')) */
  onReady?: (cat: BlackCatHandle) => void
}

/**
 * 홈페이지 하단에 사는 검은 아기고양이.
 * 컨테이너는 pointer-events: none 이라 아래 링크/버튼 클릭을 막지 않고,
 * 고양이 몸통·머리 위에서만 쓰다듬기/클릭이 동작합니다.
 * 엔진은 클라이언트에서만 동적으로 불러오므로 초기 번들에 three.js가 포함되지 않습니다.
 *
 * @example
 * <footer className="relative">
 *   <BlackCat />
 * </footer>
 */
export default function BlackCat({ mode = '3d', size = 1, glow = 'auto', interactive = true, className, style, onReady }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cat: BlackCatHandle | null = null
    let cancelled = false
    const opts = { size, glow, interactive }

    ;(async () => {
      if (mode === '3d') {
        try {
          const m = await import('./cat3d-engine')
          if (cancelled) return
          if (m.supportsWebGL()) cat = m.createBlackCat3D(el, opts)
        } catch (err) {
          console.warn('[BlackCat] 3D unavailable, falling back to 2D', err)
        }
      }
      if (!cat) {
        const m = await import('./cat-engine')
        if (cancelled) return
        cat = m.createBlackCat(el, opts)
      }
      readyRef.current?.(cat)
    })()

    return () => {
      cancelled = true
      cat?.destroy()
    }
  }, [mode, size, glow, interactive])

  return (
    <div
      ref={ref}
      aria-hidden
      className={className}
      style={{ position: 'relative', width: '100%', height: Math.round(150 * size), pointerEvents: 'none', ...style }}
    />
  )
}
