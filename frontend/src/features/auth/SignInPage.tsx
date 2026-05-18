import { useState } from 'react'
import keycloak from '@/lib/keycloak'
import { cn } from '@/lib/utils'

export function SignInPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    keycloak.login({ loginHint: email.trim() || undefined })
  }

  function handleSSO() {
    setLoading(true)
    keycloak.login()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo mark */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-indigo-600 rotate-45 rounded-sm shadow-sm" />
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              ProjectHub
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              entre no seu workspace
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-4">

          <form onSubmit={handleContinue} className="space-y-4">
            {/* Email */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wide text-gray-400"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoFocus
                autoComplete="email"
                className={cn(
                  'h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900',
                  'placeholder:text-gray-400',
                  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
                  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
                )}
                disabled={loading}
              />
            </div>

            {/* Password — visual only; auth happens on Keycloak */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-wide text-gray-400"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className={cn(
                  'h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900',
                  'placeholder:text-gray-400',
                  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
                  'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
                )}
                disabled={loading}
              />
            </div>

            {/* Continuar */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full h-9 rounded-md text-sm font-medium transition-colors',
                'bg-indigo-600 text-white hover:bg-indigo-700',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {loading ? 'redirecionando…' : 'continuar'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* SSO */}
          <button
            type="button"
            onClick={handleSSO}
            disabled={loading}
            className={cn(
              'w-full h-9 rounded-md border border-gray-300 text-sm font-medium text-gray-700',
              'hover:bg-gray-50 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            SSO
          </button>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Prefeitura de Novo Hamburgo · sistema interno
        </p>
      </div>
    </div>
  )
}
