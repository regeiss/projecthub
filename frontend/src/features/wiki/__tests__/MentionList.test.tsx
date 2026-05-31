// frontend/src/features/wiki/__tests__/MentionList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { MentionList, type MentionListHandle } from '../MentionList'
import type { ProjectMember } from '@/types'

const members: ProjectMember[] = [
  { id: 'pm1', projectId: 'p1', memberId: 'u1', memberName: 'Alice Silva',  memberEmail: 'alice@test.com', memberAvatar: null },
  { id: 'pm2', projectId: 'p1', memberId: 'u2', memberName: 'Bob Santos',   memberEmail: 'bob@test.com',   memberAvatar: null },
]

describe('MentionList', () => {
  it('renders member names', () => {
    render(<MentionList items={members} command={vi.fn()} />)
    expect(screen.getByText('Alice Silva')).toBeInTheDocument()
    expect(screen.getByText('Bob Santos')).toBeInTheDocument()
  })

  it('returns null when items is empty', () => {
    const { container } = render(<MentionList items={[]} command={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('calls command with memberId and memberName on click', async () => {
    const command = vi.fn()
    render(<MentionList items={members} command={command} />)
    await userEvent.click(screen.getByText('Alice Silva'))
    expect(command).toHaveBeenCalledWith({ id: 'u1', label: 'Alice Silva' })
  })

  it('navigates with ArrowDown and selects with Enter via ref', () => {
    const command = vi.fn()
    const ref = createRef<MentionListHandle>()
    render(<MentionList ref={ref} items={members} command={command} />)
    ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'ArrowDown' }) })
    ref.current!.onKeyDown({ event: new KeyboardEvent('keydown', { key: 'Enter' }) })
    // ArrowDown moves from index 0 → 1 (Bob Santos)
    expect(command).toHaveBeenCalledWith({ id: 'u2', label: 'Bob Santos' })
  })
})
