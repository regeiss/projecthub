import { createContext, useContext, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export type ColorTheme = 'slate' | 'stone' | 'teal'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  resolvedTheme: ResolvedTheme
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyDarkMode(resolved: ResolvedTheme): void {
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function applyColorTheme(theme: ColorTheme): void {
  document.documentElement.setAttribute('data-color-theme', theme)
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return getSystemTheme()
  return mode
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem('theme')
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    } catch {}
    return 'system'
  })

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    try {
      const stored = localStorage.getItem('color-theme')
      if (stored === 'slate' || stored === 'stone' || stored === 'teal') return stored
    } catch {}
    return 'slate'
  })

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(mode),
  )

  // Apply both on mount before first paint
  useEffect(() => {
    applyDarkMode(resolveTheme(mode))
    applyColorTheme(colorTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const resolved = resolveTheme(mode)
    setResolvedTheme(resolved)
    applyDarkMode(resolved)
  }, [mode])

  useEffect(() => {
    applyColorTheme(colorTheme)
  }, [colorTheme])

  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const resolved: ResolvedTheme = e.matches ? 'dark' : 'light'
      setResolvedTheme(resolved)
      applyDarkMode(resolved)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  function setMode(newMode: ThemeMode) {
    try { localStorage.setItem('theme', newMode) } catch {}
    setModeState(newMode)
  }

  function setColorTheme(theme: ColorTheme) {
    try { localStorage.setItem('color-theme', theme) } catch {}
    setColorThemeState(theme)
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolvedTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
