import { WorkspaceWizard } from '@/features/workspace/WorkspaceWizard'

export function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 flex flex-col items-center justify-center p-6">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rotate-45 rounded-sm" />
        <span className="text-sm font-semibold text-gray-500 tracking-wide">ProjectHub</span>
      </div>

      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <WorkspaceWizard />
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Prefeitura de Novo Hamburgo · sistema interno de gestão de projetos
      </p>
    </div>
  )
}
