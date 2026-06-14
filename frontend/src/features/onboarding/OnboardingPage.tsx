import { useState } from 'react'
import { ShieldCheck, Clock3, Send } from 'lucide-react'
import { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { useCreateAccessRequest, useMyAccessRequests } from '@/hooks/useAccessRequest'
import { Button } from '@/components/ui/Button'

function AccessRequestPendingCard({
  workspaceName,
  requestedAt,
}: {
  workspaceName: string
  requestedAt: string
}) {
  return (
    <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-3 text-indigo-600">
        <Clock3 className="h-5 w-5" />
        <span className="text-sm font-semibold uppercase tracking-[0.18em]">Solicitação enviada</span>
      </div>

      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-gray-950">
        Aguardando liberação de acesso
      </h1>

      <p className="mt-3 text-sm leading-6 text-gray-600">
        Sua solicitação para <span className="font-medium text-gray-900">{workspaceName}</span> já foi enviada.
        Assim que um administrador aprovar, seu acesso será liberado automaticamente.
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Enviado em {new Date(requestedAt).toLocaleString('pt-BR')}
      </div>
    </div>
  )
}

export function OnboardingPage() {
  const user = useAuthStore((s) => s.user)
  const { data: requests = [], isLoading } = useMyAccessRequests()
  const createRequest = useCreateAccessRequest()
  const [secretaria, setSecretaria] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const pendingRequest = requests.find((request) => request.status === 'pending') ?? null

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200 flex items-center justify-center p-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 text-sm text-gray-500 shadow-sm">
          Carregando acesso…
        </div>
      </div>
    )
  }

  if (pendingRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200 flex flex-col items-center justify-center p-6">
        <div className="mb-8 flex items-center gap-3 text-gray-500">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-950 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold tracking-[0.18em] uppercase">ProjectHub</span>
        </div>

        <AccessRequestPendingCard
          workspaceName={pendingRequest.workspaceName}
          requestedAt={pendingRequest.requestedAt}
        />
      </div>
    )
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    createRequest.mutate(
      {
        secretaria: secretaria.trim(),
        workspaceName: workspaceName.trim(),
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          setReason('')
        },
        onError: (err) => {
          if (err instanceof AxiosError && err.response?.status === 409) {
            setError('Já existe uma solicitação pendente para seu usuário.')
            return
          }
          setError('Não foi possível enviar sua solicitação agora. Tente novamente em instantes.')
        },
      },
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200 flex flex-col items-center justify-center p-6">
      <div className="mb-8 flex items-center gap-3 text-gray-500">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-950 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <span className="text-sm font-semibold tracking-[0.18em] uppercase">ProjectHub</span>
      </div>

      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
          Solicitar acesso
        </p>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950">
          Você ainda não tem um workspace liberado
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          {user?.name ? `${user.name}, ` : ''}
          envie sua solicitação para que um administrador libere seu acesso ao ambiente correto.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="secretaria" className="text-sm font-medium text-gray-700">
              Secretaria
            </label>
            <input
              id="secretaria"
              value={secretaria}
              onChange={(event) => setSecretaria(event.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Ex.: CTIBD"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="workspaceName" className="text-sm font-medium text-gray-700">
              Workspace desejado
            </label>
            <input
              id="workspaceName"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Ex.: Secretaria de TI"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reason" className="text-sm font-medium text-gray-700">
              Motivo do acesso
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-gray-300 px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Descreva brevemente por que você precisa acessar o sistema."
              required
            />
          </div>

          {user?.email && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Solicitação vinculada ao usuário <span className="font-medium text-gray-900">{user.email}</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            loading={createRequest.isPending}
            className="w-full"
            size="lg"
          >
            <Send className="h-4 w-4" />
            Enviar solicitação
          </Button>
        </form>
      </div>
    </div>
  )
}
