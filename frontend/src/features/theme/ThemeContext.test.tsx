import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('ThemeContext', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to system mode when nothing is stored', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.mode).toBe('system')
  })

  it('reads saved mode from localStorage on mount', () => {
    localStorage.setItem('theme', 'dark')
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.mode).toBe('dark')
  })

  it('applies dark class to <html> when mode is dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => result.current.setMode('dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class from <html> when mode is light', () => {
    document.documentElement.classList.add('dark')
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => result.current.setMode('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('persists mode to localStorage when changed', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => result.current.setMode('light'))
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('resolvedTheme is light when mode is light', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => result.current.setMode('light'))
    expect(result.current.resolvedTheme).toBe('light')
  })

  it('resolvedTheme is dark when mode is dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => result.current.setMode('dark'))
    expect(result.current.resolvedTheme).toBe('dark')
  })

  it('resolvedTheme follows system preference when mode is system', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList)
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.resolvedTheme).toBe('dark')
  })
})
