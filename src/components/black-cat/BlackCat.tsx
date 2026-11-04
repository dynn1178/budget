'use client'

import { useEffect, useRef } from 'react'
import { createBlackCat, type BlackCatHandle, type BlackCatOptions } from './cat-engine'

type Props = BlackCatOptions & {
  className?: string
  style?: React.CSSProperties
  /** 엔진 핸들이 필요할 때 (예: 버튼으로 cat.play('sleep')) */
  onReady?: (cat: BlackCatHandle) => void
}

/**
 * 홈페이지 하단에 사는 검은 고양이.
 * 컨테이너는 pointer-events: none 이라 아래 링크/버튼 클릭을 막지 않고,
 * 고양이 몸통·머리 위에서만 쓰다듬기/클릭이 동작합니다.
 *
 * @example
 * <footer className="relative">
 *   <BlackCat />
 * </footer>
 */
export default function BlackCat({ size = 1, glow = 'auto', interactive = true, className, style, onReady }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  useEffect(() => {
    if (!ref.current) return
    const cat = createBlackCat(ref.current, { size, glow, interactive })
    readyRef.current?.(cat)
    return () => cat.destroy()
  }, [size, glow, interactive])

  return (
    <div
      ref={ref}
      aria-hidden
      className={className}
      style={{ position: 'relative', width: '100%', height: Math.round(140 * size), pointerEvents: 'none', ...style }}
    />
  )
}
