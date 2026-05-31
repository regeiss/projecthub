import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { IssueRelationList } from './IssueRelationList'

vi.mock('@/hooks/useIssues', () => ({
  useRelations: vi.fn(),
  useAddRelation: vi.fn(),
  useDeleteRelation: vi.fn(),
  useIssueSearch: vi.fn(),
}))

import {
  useRelations,
  useAddRelation,
  useDeleteRelation,
  useIssueSearch,
} from '@/hooks/useIssues'

const mockRelation = {
  id: 'rel-1',
  issueId: 'issue-1',
  relatedIssueId: 'issue-2',
  relatedIssueTitle: 'Related Task',
  relatedIssueSequenceId: 42,
  relatedIssueProjectId: 'proj-2',
  relatedIssueProjectName: 'Project Beta',
  relationType: 'blocks',
  lagDays: 0,
}

const mockRelationWithLag = { ...mockRelation, id: 'rel-2', lagDays: 3 }

function renderComponent(props = { projectId: 'proj-1', issueId: 'issue-1' }) {
  return render(
    <MemoryRouter>
      <IssueRelationList {...props} />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAddRelation).mockReturnValue({ mutate: vi.fn(), isPending: false } as any)
  vi.mocked(useDeleteRelation).mockReturnValue({ mutate: vi.fn(), isError: false } as any)
  vi.mocked(useIssueSearch).mockReturnValue({ data: [], isLoading: false } as any)
})

describe('IssueRelationList', () => {
  it('renders loading state', () => {
    vi.mocked(useRelations).mockReturnValue({ data: undefined, isLoading: true, isError: false } as any)
    renderComponent()
    expect(screen.getByText('Carregando...')).toBeDefined()
  })

  it('renders error state', () => {
    vi.mocked(useRelations).mockReturnValue({ data: undefined, isLoading: false, isError: true } as any)
    renderComponent()
    expect(screen.getByText('Não foi possível carregar relações.')).toBeDefined()
  })

  it('renders empty state', () => {
    vi.mocked(useRelations).mockReturnValue({ data: [], isLoading: false, isError: false } as any)
    renderComponent()
    expect(screen.getByText('Sem relações.')).toBeDefined()
    expect(screen.getByText('Relações (0)')).toBeDefined()
  })

  it('renders grouped relation rows', () => {
    vi.mocked(useRelations).mockReturnValue({
      data: [mockRelation],
      isLoading: false,
      isError: false,
    } as any)
    renderComponent()
    expect(screen.getByText('BLOQUEIA')).toBeDefined()
    expect(screen.getByText(/Related Task/)).toBeDefined()
    expect(screen.getByText(/Project Beta/)).toBeDefined()
    expect(screen.getByText('Relações (1)')).toBeDefined()
  })

  it('shows lag badge only when lagDays > 0', () => {
    vi.mocked(useRelations).mockReturnValue({
      data: [mockRelation, mockRelationWithLag],
      isLoading: false,
      isError: false,
    } as any)
    renderComponent()
    expect(screen.getByText('+3d')).toBeDefined()
    expect(screen.queryAllByText(/\+\d+d/).length).toBe(1)
  })

  it('opens add form when + Adicionar is clicked', () => {
    vi.mocked(useRelations).mockReturnValue({ data: [], isLoading: false, isError: false } as any)
    renderComponent()
    fireEvent.click(screen.getByLabelText('Adicionar relação'))
    expect(screen.getByLabelText('Tipo de relação')).toBeDefined()
    expect(screen.getByLabelText('Buscar issue')).toBeDefined()
    expect(screen.getByLabelText('Dias de atraso')).toBeDefined()
  })

  it('Save button is disabled until issue is selected', () => {
    vi.mocked(useRelations).mockReturnValue({ data: [], isLoading: false, isError: false } as any)
    renderComponent()
    fireEvent.click(screen.getByLabelText('Adicionar relação'))
    const saveBtn = screen.getByText('Salvar')
    expect(saveBtn.hasAttribute('disabled')).toBe(true)
  })

  it('delete button calls useDeleteRelation with correct args', () => {
    const deleteMutate = vi.fn()
    vi.mocked(useDeleteRelation).mockReturnValue({ mutate: deleteMutate, isError: false } as any)
    vi.mocked(useRelations).mockReturnValue({
      data: [mockRelation],
      isLoading: false,
      isError: false,
    } as any)
    renderComponent()
    fireEvent.click(screen.getByLabelText('Remover relação #42'))
    expect(deleteMutate).toHaveBeenCalledWith({ issueId: 'issue-1', relationId: 'rel-1' })
  })

  it('shows delete error message when isError is true', () => {
    vi.mocked(useDeleteRelation).mockReturnValue({ mutate: vi.fn(), isError: true } as any)
    vi.mocked(useRelations).mockReturnValue({
      data: [mockRelation],
      isLoading: false,
      isError: false,
    } as any)
    renderComponent()
    expect(screen.getByText('Não foi possível remover a relação.')).toBeDefined()
  })
})
