# Microinteractions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three layers of microinteractions to ProjectHub — Tailwind press feedback, Framer Motion mount/unmount animations, and CSS @keyframes for custom effects.

**Architecture:** Layer 1 (CSS/Tailwind, no deps) lands first and is immediately functional. Layer 2 (Framer Motion) is installed once and applied to 7 components. Layer 3 (@keyframes) adds bespoke animations to specific widgets. Each task is independently committable.

**Tech Stack:** React 18, Tailwind CSS, framer-motion (to install), dnd-kit (existing), Radix UI (existing)

---

## File Map

| File | Change |
|---|---|
| `frontend/src/index.css` | @keyframes: shimmer, draw-check, badge-pop, success-ring, page-enter, spinner-sweep |
| `frontend/src/components/ui/Button.tsx` | active:scale-95 + spinner refinement |
| `frontend/src/components/layout/Sidebar.tsx` | transition-all on NavLink |
| `frontend/src/components/ui/Modal.tsx` | Framer enter/exit replacing animate-in |
| `frontend/src/features/search/GlobalSearch.tsx` | AnimatePresence panel slide |
| `frontend/src/features/notifications/NotificationToast.tsx` | Framer slide from right |
| `frontend/src/features/notifications/NotificationBell.tsx` | badge pop on count increase |
| `frontend/src/features/workspace/TaskListTile.tsx` | checkmark draw + success flash |
| `frontend/src/features/board/BoardPage.tsx` | card mount + drag scale |
| `frontend/src/features/workspace/WorkspacePage.tsx` | staggered tile mount |
| `frontend/src/features/projects/ProjectsPage.tsx` | staggered card mount |
| `frontend/src/features/notifications/InboxList.tsx` | AnimatePresence item exit |
| `frontend/package.json` | + framer-motion |

---

## Task 1: CSS @keyframes — shimmer, checkmark, badge, success, page-enter, spinner

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add all @keyframes and utility classes**

Open `frontend/src/index.css` and append before the final closing brace of `@layer utilities`:

```css
/* ─── Microinteraction keyframes ─────────────────────────────────────────── */

/* Shimmer — replaces animate-pulse on skeleton divs */
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}

/* Checkmark stroke draw */
@keyframes draw-check {
  from { stroke-dashoffset: 12; }
  to   { stroke-dashoffset: 0; }
}

/* Badge pop on new notification */
@keyframes badge-pop {
  0%   { transform: scale(1); }
  45%  { transform: scale(1.5); }
  70%  { transform: scale(0.9); }
  100% { transform: scale(1); }
}

/* Success ring pulse on form submit */
@keyframes success-ring {
  0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0.55); }
  60%  { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
  100% { box-shadow: 0 0 0 0   rgba(34,197,94,0); }
}

/* Page title entrance */
@keyframes page-enter {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Indeterminate spinner sweep */
@keyframes spinner-sweep {
  0%   { stroke-dashoffset: 56; }
  50%  { stroke-dashoffset: 14; }
  100% { stroke-dashoffset: 56; }
}
```

Then add these utilities inside `@layer utilities { ... }` (the existing block near the bottom):

```css
  /* Shimmer skeleton */
  .animate-shimmer {
    background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.6s infinite linear;
  }
  .dark .animate-shimmer {
    background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.6s infinite linear;
  }

  /* Checkmark draw */
  .animate-draw-check {
    stroke-dasharray: 12;
    stroke-dashoffset: 12;
    animation: draw-check 0.25s ease-out forwards;
  }

  /* Badge pop */
  .animate-badge-pop {
    animation: badge-pop 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }

  /* Success ring */
  .animate-success-ring {
    animation: success-ring 0.65s ease-out;
  }

  /* Page title entrance */
  .animate-page-enter {
    animation: page-enter 0.22s ease-out both;
  }

  /* Spinner sweep */
  .animate-spinner-sweep {
    stroke-dasharray: 56;
    animation: spinner-sweep 1.2s ease-in-out infinite,
               spin       1.2s linear        infinite;
  }
```

- [ ] **Step 2: Verify CSS parses without errors**

```bash
cd frontend && npm run build 2>&1 | grep -i "error\|warning" | head -20
```

Expected: no CSS parse errors. Build may have TS errors in other files — ignore those for now.

- [ ] **Step 3: Replace animate-pulse with animate-shimmer in WorkspacePage**

In `frontend/src/features/workspace/WorkspacePage.tsx`, find `TileSkeleton`:

```tsx
function TileSkeleton({ rowSpan }: { rowSpan?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4',
        rowSpan && 'row-span-2',
      )}
    >
      <div className="space-y-2.5">
        <div className="h-4 w-1/3 rounded animate-shimmer" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 rounded animate-shimmer" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/index.css frontend/src/features/workspace/WorkspacePage.tsx
git commit -m "feat: add microinteraction @keyframes and shimmer skeleton"
```

---

## Task 2: Button press feedback + spinner refinement

**Files:**
- Modify: `frontend/src/components/ui/Button.tsx`

- [ ] **Step 1: Add active:scale-95 and spinner refinement**

Replace the full content of `frontend/src/components/ui/Button.tsx`:

```tsx
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover disabled:opacity-50',
  secondary:
    'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400',
  ghost:
    'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 disabled:text-gray-300 dark:disabled:text-gray-600',
  danger:
    'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400',
  outline:
    'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600',
}

const sizeClasses: Record<string, string> = {
  sm: 'h-7 px-2 text-xs rounded',
  md: 'h-8 px-3 text-sm rounded-md',
  lg: 'h-10 px-4 text-sm rounded-md',
  icon: 'h-8 w-8 rounded-md',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 font-medium',
          'transition-all duration-100',
          'active:scale-95 active:brightness-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'disabled:cursor-not-allowed disabled:active:scale-100',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <svg
            className="h-3.5 w-3.5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-20"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="animate-spinner-sweep"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              d="M12 2a10 10 0 0 1 10 10"
            />
          </svg>
        )}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
```

- [ ] **Step 2: Verify typecheck passes**

```bash
cd frontend && npm run typecheck 2>&1 | tail -5
```

Expected: `Found 0 errors` or pre-existing errors only (none introduced by this change).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Button.tsx
git commit -m "feat: button press scale feedback + spinner sweep animation"
```

---

## Task 3: Global press rule + Sidebar nav transition

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add global press rule to index.css**

Add this block inside `@layer base { ... }` in `frontend/src/index.css`, after the `body` rules:

```css
  /* Global press feedback — covers all raw <button> elements */
  button:not([disabled]):active,
  [role="button"]:not([disabled]):active {
    transform: scale(0.97);
    transition: transform 0.1s ease;
  }
```

- [ ] **Step 2: Add transition-all to NavItem in Sidebar.tsx**

In `frontend/src/components/layout/Sidebar.tsx`, find the `NavLink` className function inside `NavItem` and add `transition-all duration-150`:

```tsx
className={({ isActive }) =>
  cn(
    'flex h-8 items-center rounded-md text-white/50 transition-all duration-150 hover:bg-white/10 hover:text-white',
    expanded ? 'w-full gap-3 px-2' : 'w-8 justify-center',
    isActive && 'bg-white/15 text-white',
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: global button press scale + sidebar nav transition"
```

---

## Task 4: Install Framer Motion

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install**

```bash
cd frontend && npm install framer-motion
```

- [ ] **Step 2: Verify import works**

```bash
node -e "require('./node_modules/framer-motion')" && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "deps: add framer-motion"
```

---

## Task 5: Modal.tsx — Framer enter + exit animation

**Files:**
- Modify: `frontend/src/components/ui/Modal.tsx`

- [ ] **Step 1: Rewrite Modal with Framer AnimatePresence**

Replace the full content of `frontend/src/components/ui/Modal.tsx`:

```tsx
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-5xl',
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const contentVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 30 } },
  exit:    { opacity: 0, scale: 0.97, y: 4,  transition: { duration: 0.15, ease: 'easeIn' } },
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-black/50"
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ duration: 0.18 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  'fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2',
                  'rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl dark:shadow-black/40',
                  'max-h-[90vh] overflow-y-auto',
                  sizeClasses[size],
                  className,
                )}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {(title || description) && (
                  <div className="mb-4">
                    {title && (
                      <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {title}
                      </Dialog.Title>
                    )}
                    {description && (
                      <Dialog.Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                )}
                <Dialog.Close
                  className="absolute right-4 top-4 rounded-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </Dialog.Close>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mt-6 flex justify-end gap-2', className)}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npm run typecheck 2>&1 | grep "Modal\|error" | head -10
```

Expected: no Modal-related errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Modal.tsx
git commit -m "feat: modal enter/exit animation with framer-motion spring"
```

---

## Task 6: GlobalSearch — panel slide-down AnimatePresence

**Files:**
- Modify: `frontend/src/features/search/GlobalSearch.tsx`

- [ ] **Step 1: Find the panel render**

In `GlobalSearch.tsx`, find where `isOpen` controls the panel — look for the return of the panel `<div>`. It will be inside a conditional like `{isOpen && <div ...>}`.

- [ ] **Step 2: Wrap with AnimatePresence + motion.div**

Add to imports at top of file:
```tsx
import { AnimatePresence, motion } from 'framer-motion'
```

Replace the conditional panel render (the block guarded by `{isOpen && ...}`) with:

```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.1, ease: 'easeIn' } }}
      className={/* keep the existing className exactly as-is */}
    >
      {/* keep all existing panel contents */}
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 3: Typecheck**

```bash
cd frontend && npm run typecheck 2>&1 | grep "GlobalSearch\|error" | head -10
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/search/GlobalSearch.tsx
git commit -m "feat: global search panel slide-down with framer-motion"
```

---

## Task 7: NotificationToast — slide in from right with Framer

**Files:**
- Modify: `frontend/src/features/notifications/NotificationToast.tsx`

- [ ] **Step 1: Rewrite with AnimatePresence**

Replace the full content of `frontend/src/features/notifications/NotificationToast.tsx`:

```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNotificationStore } from '@/stores/notificationStore'

export function NotificationToast() {
  const { toast, clearToast } = useNotificationStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(clearToast, 5000)
    return () => clearTimeout(timer)
  }, [toast, clearToast])

  function handleClick() {
    if (toast?.actionUrl) navigate(toast.actionUrl)
    clearToast()
  }

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.title}
          initial={{ opacity: 0, x: 340, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 35 } }}
          exit={{ opacity: 0, x: 340, scale: 0.95, transition: { duration: 0.2, ease: 'easeIn' } }}
          className="fixed bottom-5 right-5 z-50 flex max-w-sm cursor-pointer items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-lg ring-1 ring-black/5 dark:ring-white/5"
          onClick={handleClick}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
            <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{toast.title}</p>
            {toast.message && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{toast.message}</p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); clearToast() }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npm run typecheck 2>&1 | grep "NotificationToast\|error" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/notifications/NotificationToast.tsx
git commit -m "feat: notification toast slides in from right with spring"
```

---

## Task 8: NotificationBell — badge pop on count increase

**Files:**
- Modify: `frontend/src/features/notifications/NotificationBell.tsx`

- [ ] **Step 1: Add useRef + useEffect for badge key**

Replace the full content of `frontend/src/features/notifications/NotificationBell.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUnreadCount } from '@/hooks/useNotifications'
import { NotificationPanel } from './NotificationPanel'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { unreadCount } = useNotificationStore()
  useUnreadCount()

  // Re-key the badge when count increases to retrigger the CSS animation
  const [badgeKey, setBadgeKey] = useState(0)
  const prevCount = useRef(unreadCount)
  useEffect(() => {
    if (unreadCount > prevCount.current) {
      setBadgeKey((k) => k + 1)
    }
    prevCount.current = unreadCount
  }, [unreadCount])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            'relative flex h-7 w-7 items-center justify-center rounded-md text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300',
            open && 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
          )}
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              key={badgeKey}
              className="animate-badge-pop absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-900/50 animate-in fade-in-0 zoom-in-95"
        >
          <NotificationPanel onClose={() => setOpen(false)} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npm run typecheck 2>&1 | grep "NotificationBell\|error" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/notifications/NotificationBell.tsx
git commit -m "feat: notification badge pops when new notification arrives"
```

---

## Task 9: TaskListTile — checkmark draw animation

**Files:**
- Modify: `frontend/src/features/workspace/TaskListTile.tsx`

- [ ] **Step 1: Add animate-draw-check to checkmark SVG path**

In `TaskListTile.tsx`, find the `TaskRow` component. The checkmark SVG is inside the `{task.done && (...)}` block:

```tsx
{task.done && (
  <svg viewBox="0 0 10 10" className="h-full w-full text-white" fill="none">
    <path
      className="animate-draw-check"
      d="M2 5l2.5 2.5L8 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)}
```

The only change is adding `className="animate-draw-check"` to the `<path>` element. Since React unmounts and remounts this SVG when `task.done` toggles true, the animation fires every time a task is checked.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/workspace/TaskListTile.tsx
git commit -m "feat: checkmark draws in when task is completed"
```

---

## Task 10: BoardPage — card mount animation + drag scale

**Files:**
- Modify: `frontend/src/features/board/BoardPage.tsx`

- [ ] **Step 1: Add framer-motion import and animate IssueCard**

Add to the imports in `BoardPage.tsx`:
```tsx
import { motion } from 'framer-motion'
```

In `IssueCard`, the component returns a `<div ref={setNodeRef} ...>`. Wrap it in a `motion.div` for mount animation AND use `isDragging` (already tracked by useSortable) to add drag scale. Replace the outer `<div>` with:

```tsx
return (
  <motion.div
    ref={setNodeRef}
    {...attributes}
    {...listeners}
    initial={{ opacity: 0, y: -10 }}
    animate={{
      opacity: isDragging ? 0.4 : 1,
      y: 0,
      scale: isDragging ? 1.03 : 1,
      boxShadow: isDragging
        ? '0 16px 40px rgba(0,0,0,0.18)'
        : '0 1px 3px rgba(0,0,0,0.08)',
      transition: isDragging
        ? { duration: 0.15 }
        : { type: 'spring', stiffness: 300, damping: 28 },
    }}
    className="cursor-grab rounded-md border border-gray-200 dark:border-gray-700 border-l-4 bg-white dark:bg-gray-900 p-3 active:cursor-grabbing"
    style={{ ...style, borderLeftColor: PRIORITY_LEFT_COLOR[issue.priority] ?? PRIORITY_LEFT_COLOR.none }}
    onClick={() => navigate(`/projects/${projectId}/issues/${issue.id}`, { state: { from: `/projects/${projectId}/board` } })}
  >
    {/* all existing card content unchanged */}
```

Note: remove `shadow-sm hover:shadow-md` from className — the `boxShadow` in `animate` handles this now. Keep `active:cursor-grabbing`.

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npm run typecheck 2>&1 | grep "Board\|error" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/board/BoardPage.tsx
git commit -m "feat: kanban cards mount with fade+slide, scale up on drag"
```

---

## Task 11: WorkspacePage + ProjectsPage — staggered mount

**Files:**
- Modify: `frontend/src/features/workspace/WorkspacePage.tsx`
- Modify: `frontend/src/features/projects/ProjectsPage.tsx`

- [ ] **Step 1: Add staggered grid to WorkspacePage**

Add to imports in `WorkspacePage.tsx`:
```tsx
import { motion } from 'framer-motion'
```

Define variants above the `WorkspacePage` component:
```tsx
const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055 } },
}
const tileVariants = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 26 } },
}
```

In the `WorkspacePage` return, change the grid `<div>` to `<motion.div>` and wrap each tile in `<motion.div variants={tileVariants}>`:

```tsx
<motion.div
  className="flex-1 min-h-0 grid gap-3"
  style={{ gridTemplateColumns: '1.4fr 1fr 1fr', gridTemplateRows: '1fr 1fr' }}
  variants={gridVariants}
  initial="hidden"
  animate="visible"
>
  {loadingWork ? (
    <motion.div variants={tileVariants}><TileSkeleton /></motion.div>
  ) : (
    <motion.div variants={tileVariants}><MyWorkTile issues={myIssues} isLoading={loadingWork} /></motion.div>
  )}
  {loadingActivity ? (
    <motion.div variants={tileVariants}><TileSkeleton /></motion.div>
  ) : (
    <motion.div variants={tileVariants}><ActivityTile events={recentActivity} isLoading={loadingActivity} /></motion.div>
  )}
  {loadingCycles ? (
    <motion.div variants={tileVariants}><TileSkeleton /></motion.div>
  ) : (
    <motion.div variants={tileVariants}><CyclesTile cycles={activeCycles} isLoading={loadingCycles} /></motion.div>
  )}
  <motion.div variants={tileVariants}><TaskListTileWrapper /></motion.div>
  {loadingNotifs ? (
    <motion.div variants={tileVariants}><TileSkeleton /></motion.div>
  ) : (
    <motion.div variants={tileVariants}>
      <NotificationsTile notifications={unreadNotifs} isLoading={loadingNotifs} unreadCount={unreadCount} />
    </motion.div>
  )}
  {loadingMilestones ? (
    <motion.div variants={tileVariants}><TileSkeleton /></motion.div>
  ) : (
    <motion.div variants={tileVariants}>
      <MilestonesTile milestones={upcomingMilestones} isLoading={loadingMilestones} />
    </motion.div>
  )}
</motion.div>
```

- [ ] **Step 2: Add staggered grid to ProjectsPage**

Add to imports in `ProjectsPage.tsx`:
```tsx
import { motion } from 'framer-motion'
```

Define variants above `ProjectsPage`:
```tsx
const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}
const cardVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
}
```

In the grid view, change the grid `<div>` to `<motion.div>` and wrap each card:

```tsx
) : view === 'grid' ? (
  <motion.div
    className="grid grid-cols-2 gap-4 sm:grid-cols-3"
    variants={gridVariants}
    initial="hidden"
    animate="visible"
  >
    {filtered.map((p) => (
      <motion.div key={p.id} variants={cardVariants}>
        <ProjectCard
          project={p}
          onClick={() => navigate(`/projects/${p.id}/board`)}
        />
      </motion.div>
    ))}
    <motion.div variants={cardVariants}>
      <NewProjectCard onClick={() => setCreating(true)} />
    </motion.div>
  </motion.div>
```

Note: `ProjectCard` already has `key` on the outer `motion.div` wrapper, so remove it from `ProjectCard` itself if it was there. The `ProjectCard` component still has its own hover state intact.

- [ ] **Step 3: Typecheck**

```bash
cd frontend && npm run typecheck 2>&1 | grep "WorkspacePage\|ProjectsPage\|error" | head -15
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/workspace/WorkspacePage.tsx frontend/src/features/projects/ProjectsPage.tsx
git commit -m "feat: staggered mount animation on workspace tiles and project cards"
```

---

## Task 12: InboxList — AnimatePresence item exit

**Files:**
- Modify: `frontend/src/features/notifications/InboxList.tsx`

- [ ] **Step 1: Wrap items with AnimatePresence**

Replace the full content of `frontend/src/features/notifications/InboxList.tsx`:

```tsx
import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Notification } from '@/types'
import { InboxItem } from './InboxItem'

interface DateGroup {
  label: string
  items: Notification[]
}

function groupByDate(notifications: Notification[]): DateGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const groups: Record<string, Notification[]> = {
    Hoje: [],
    Ontem: [],
    'Esta semana': [],
    'Mais antigas': [],
  }

  for (const n of notifications) {
    const d = new Date(n.createdAt ?? (n as any).created_at)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (day >= today) {
      groups['Hoje'].push(n)
    } else if (day >= yesterday) {
      groups['Ontem'].push(n)
    } else if (day >= weekAgo) {
      groups['Esta semana'].push(n)
    } else {
      groups['Mais antigas'].push(n)
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

interface Props {
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkUnread: (id: string) => void
  onArchive: (id: string) => void
}

export function InboxList({ notifications, onMarkRead, onMarkUnread, onArchive }: Props) {
  const groups = useMemo(() => groupByDate(notifications), [notifications])

  return (
    <div>
      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-6 py-2 text-[10px] font-mono uppercase tracking-widest text-gray-400">
            {group.label}
          </div>
          <AnimatePresence initial={false}>
            {group.items.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 1 }}
                exit={{
                  opacity: 0,
                  x: -20,
                  height: 0,
                  marginBottom: 0,
                  transition: { duration: 0.22, ease: 'easeOut' },
                }}
                layout
              >
                <InboxItem
                  notification={n}
                  onMarkRead={onMarkRead}
                  onMarkUnread={onMarkUnread}
                  onArchive={onArchive}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npm run typecheck 2>&1 | grep "InboxList\|error" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/notifications/InboxList.tsx
git commit -m "feat: inbox items slide out when marked read or archived"
```

---

## Task 13: Page title entrance + success ring

**Files:**
- Modify: `frontend/src/features/projects/ProjectsPage.tsx`
- Modify: `frontend/src/features/workspace/WorkspacePage.tsx`
- Modify: `frontend/src/features/backlog/BacklogPage.tsx`
- Modify: `frontend/src/features/board/BoardPage.tsx`

- [ ] **Step 1: Add animate-page-enter to h1 headings**

In each of these files, find the main `<h1>` and add the `animate-page-enter` class:

**ProjectsPage.tsx:**
```tsx
<h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 animate-page-enter">Projetos</h1>
```

**WorkspacePage.tsx:**
```tsx
<h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 animate-page-enter">Início</h1>
```

**BacklogPage.tsx** — find the page heading and add `animate-page-enter`.

**BoardPage.tsx** — find the column headers or page title and add `animate-page-enter` to the main heading.

- [ ] **Step 2: Commit**

```bash
git add \
  frontend/src/features/projects/ProjectsPage.tsx \
  frontend/src/features/workspace/WorkspacePage.tsx \
  frontend/src/features/backlog/BacklogPage.tsx \
  frontend/src/features/board/BoardPage.tsx
git commit -m "feat: page title entrance animation on route mount"
```

---

## Task 14: Final typecheck + build verification

- [ ] **Step 1: Full typecheck**

```bash
cd frontend && npm run typecheck 2>&1 | tail -10
```

Expected: `Found 0 errors` or only pre-existing errors unrelated to this work.

- [ ] **Step 2: Build**

```bash
cd frontend && npm run build 2>&1 | tail -15
```

Expected: build succeeds (exit 0).

- [ ] **Step 3: Run existing tests**

```bash
cd frontend && npm run test 2>&1 | tail -20
```

Expected: same pass/fail ratio as before this work. No new test failures.

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -p  # stage only fixup changes
git commit -m "fix: microinteractions typecheck cleanup"
```

---

## Quick Reference: What Each Task Delivers

| Task | Deliverable |
|---|---|
| 1 | @keyframes CSS + shimmer on WorkspacePage skeletons |
| 2 | Button.tsx press scale + sweep spinner |
| 3 | Global press rule + Sidebar nav transition |
| 4 | framer-motion installed |
| 5 | Modal spring enter + exit |
| 6 | Search panel slide-down |
| 7 | Toast slides in from right, exits right |
| 8 | Badge pops on new notification |
| 9 | Checkmark draws in when task checked |
| 10 | Kanban cards fade+slide on mount, scale on drag |
| 11 | Workspace tiles + project cards stagger in |
| 12 | Inbox items slide-collapse out on read/archive |
| 13 | Page titles fade+rise on route mount |
| 14 | Verification pass |
