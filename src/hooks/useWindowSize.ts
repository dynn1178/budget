'use client'
import { useState, useEffect } from 'react'

export function useWindowSize() {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const update = () => setWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return {
    width,
    isMobile: width < 600,
    isTablet: width >= 600 && width < 1100,
    isDesktop: width >= 1100,
  }
}
