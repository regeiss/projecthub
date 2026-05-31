import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { queryClient } from './lib/queryClient'
import { ThemeProvider } from './features/theme/ThemeContext'
import './index.css'

// Navigation throttle diagnostic — logs first 30 history calls with stack traces.
// Remove once throttling is diagnosed.
;(function patchHistory() {
  let _count = 0
  const MAX = 30
  const _push = history.pushState.bind(history)
  const _replace = history.replaceState.bind(history)
  history.pushState = function (...args) {
    if (++_count <= MAX) console.trace(`[nav#${_count}] pushState → ${args[2]}`)
    else if (_count === MAX + 1) console.warn('[nav] further calls suppressed')
    return _push(...args)
  }
  history.replaceState = function (...args) {
    if (++_count <= MAX) console.trace(`[nav#${_count}] replaceState → ${args[2]}`)
    else if (_count === MAX + 1) console.warn('[nav] further calls suppressed')
    return _replace(...args)
  }
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_relativeSplatPath: true }}>
          <App />
          {/* App renders AuthProvider internally, satisfying ThemeProvider > AuthProvider hierarchy */}
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
