import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'vx.theme'

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStored(): Theme | null {
  try {
    const v = window.sessionStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

/** Theme preference for the demo session (sessionStorage only, per plan_v1 §0.2). */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => readStored() ?? systemTheme())

  useEffect(() => {
    applyTheme(theme)
    try {
      window.sessionStorage.setItem(KEY, theme)
    } catch {
      /* storage unavailable: ignore */
    }
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return { theme, setTheme, toggle }
}
