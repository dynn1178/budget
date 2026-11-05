'use client'

import { useEffect, useRef } from 'react'
import { createClipCat, type CatManifest, type ClipCatHandle } from './clip-player'
import { defaultCatManifest } from './manifest'

type Props = {
  manifest?: CatManifest
  /** 고양이 표시 가로 크기(px) */
  width?: number
  /** 푸터 안에서의 위치 */
  align?: 'left' | 'center' | 'right'
  /** 가장자리에서 떨어진 거리(px) */
  offset?: number
  className?: string
  onReady?: (cat: ClipCatHandle) => void
}

/**
 * 홈페이지 하단에 앉아 있는 검은 아기고양이 (AI 영상 클립 기반).
 * 고양이 몸 위에서만 마우스를 받으므로 푸터의 링크/버튼 클릭을 막지 않습니다.
 *
 * @example
 * <footer className="relative">
 *   <ClipCat align="right" />
 * </footer>
 */
export default function ClipCat({ manifest = defaultCatManifest, width = 200, align = 'right', offset = 24, className, onReady }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const readyRef = useRef(onReady)
  readyRef.current = onReady

  useEffect(() => {
    if (!ref.current) return
    const cat = createClipCat(ref.current, manifest, { width })
    readyRef.current?.(cat)
    return () => cat.destroy()
  }, [manifest, width])

  const h = Math.round((width * manifest.frame.h) / manifest.frame.w)
  const pos: React.CSSProperties =
    align === 'left' ? { left: offset } : align === 'right' ? { right: offset } : { left: '50%', transform: 'translateX(-50%)' }

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: h, pointerEvents: 'none' }} aria-hidden>
      <div ref={ref} style={{ position: 'absolute', bottom: 0, ...pos }} />
    </div>
  )
}
