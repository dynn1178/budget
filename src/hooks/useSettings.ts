'use client'
import { useState, useEffect, useCallback } from 'react'
import { ThemeType, AccentType, FontType } from '@/types/database'

const FONT_MAP: Record<string, string> = {
  'pretendard': "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
  'noto-sans':  "'Noto Sans KR',sans-serif",
  'gothic':     "'Gothic A1',sans-serif",
  'ibm':        "'IBM Plex Sans KR',sans-serif",
  'noto-serif': "'Noto Serif KR',serif",
}

function deviceKey() {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200
  return w < 600 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop'
}

function storageKey(k: string) {
  return `wdig_${deviceKey()}_${k}`
}

function loadSetting<T>(k: string, def: T): T {
  try {
    const v = localStorage.getItem(storageKey(k))
    return v !== null ? JSON.parse(v) : def
  } catch { return def }
}

function saveSetting(k: string, v: unknown) {
  try { localStorage.setItem(storageKey(k), JSON.stringify(v)) } catch {}
}

export function useSettings() {
  const [theme,  setThemeState]  = useState<ThemeType>('light')
  const [accent, setAccentState] = useState<AccentType>('teal')
  const [font,   setFontState]   = useState<FontType>('pretendard')
  const [ready,  setReady]       = useState(false)

  useEffect(() => {
    setThemeState(loadSetting('theme', 'light') as ThemeType)
    setAccentState(loadSetting('accent', 'teal') as AccentType)
    setFontState(loadSetting('font', 'pretendard') as FontType)
    setReady(true)
  }, [])

  const setTheme = useCallback((t: ThemeType) => {
    saveSetting('theme', t)
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  const setAccent = useCallback((a: AccentType) => {
    saveSetting('accent', a)
    setAccentState(a)
    document.documentElement.setAttribute('data-accent', a || 'teal')
  }, [])

  const setFont = useCallback((f: FontType) => {
    saveSetting('font', f)
    setFontState(f)
    document.documentElement.style.setProperty('--font-sans', FONT_MAP[f] || FONT_MAP.pretendard)
    document.body.style.fontFamily = FONT_MAP[f] || FONT_MAP.pretendard
  }, [])

  return { theme, setTheme, accent, setAccent, font, setFont, ready }
}
