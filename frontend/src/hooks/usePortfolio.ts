import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portfolioService } from '@/services/portfolio.service'
import type { Portfolio, PortfolioObjective, PortfolioProject } from '@/types'

export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: () => portfolioService.list(),
  })
}

export function usePortfolio(id: string) {
  return useQuery({
    queryKey: ['portfolio', id],
    queryFn: () => portfolioService.get(id),
    enabled: !!id,
  })
}

export function usePortfolioDashboard(id: string) {
  return useQuery({
    queryKey: ['portfolio-dashboard', id],
    queryFn: () => portfolioService.dashboard(id),
    enabled: !!id,
  })
}

export function usePortfolioRoadmap(id: string) {
  return useQuery({
    queryKey: ['portfolio-roadmap', id],
    queryFn: () => portfolioService.roadmap(id),
    enabled: !!id,
  })
}

export function usePortfolioObjectives(id: string) {
  return useQuery({
    queryKey: ['portfolio-objectives', id],
    queryFn: () => portfolioService.objectives(id),
    enabled: !!id,
  })
}

// ─── Portfolio CRUD ──────────────────────────────────────────────────────────

export function useCreatePortfolio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Portfolio>) => portfolioService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  })
}

export function useUpdatePortfolio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Portfolio> }) =>
      portfolioService.update(id, data),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['portfolios'] })
      qc.invalidateQueries({ queryKey: ['portfolio', p.id] })
    },
  })
}

export function useDeletePortfolio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => portfolioService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  })
}

// ─── Portfolio Projects ───────────────────────────────────────────────────────

export function useAddPortfolioProject(portfolioId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { project: string; startDate?: string | null; endDate?: string | null; budgetPlanned?: string }) =>
      portfolioService.addProject(portfolioId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-dashboard', portfolioId] })
      qc.invalidateQueries({ queryKey: ['portfolio-roadmap', portfolioId] })
      qc.invalidateQueries({ queryKey: ['portfolios'] })
    },
  })
}

export function useUpdatePortfolioProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      portfolioId,
      ppId,
      data,
    }: {
      portfolioId: string
      ppId: string
      data: Partial<PortfolioProject>
    }) => portfolioService.updateProject(portfolioId, ppId, data),
    onSuccess: (_, { portfolioId }) => {
      qc.invalidateQueries({ queryKey: ['portfolio-dashboard', portfolioId] })
    },
  })
}

export function useRemovePortfolioProject(portfolioId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ppId: string) => portfolioService.removeProject(portfolioId, ppId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-dashboard', portfolioId] })
      qc.invalidateQueries({ queryKey: ['portfolio-roadmap', portfolioId] })
      qc.invalidateQueries({ queryKey: ['portfolios'] })
    },
  })
}

export function useRecalculateRag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (portfolioId: string) => portfolioService.recalculateRag(portfolioId),
    onSuccess: (_, portfolioId) => {
      qc.invalidateQueries({ queryKey: ['portfolio-dashboard', portfolioId] })
    },
  })
}

// ─── Objectives ───────────────────────────────────────────────────────────────

export function useCreateObjective(portfolioId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<PortfolioObjective>) =>
      portfolioService.createObjective(portfolioId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio-objectives', portfolioId] }),
  })
}

export function useUpdateObjective(portfolioId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ objId, data }: { objId: string; data: Partial<PortfolioObjective> }) =>
      portfolioService.updateObjective(portfolioId, objId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio-objectives', portfolioId] }),
  })
}

export function useDeleteObjective(portfolioId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (objId: string) => portfolioService.deleteObjective(portfolioId, objId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio-objectives', portfolioId] }),
  })
}
