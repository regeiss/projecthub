# Microinteractions — Design Spec
**Date:** 2026-06-02  
**Status:** Approved  
**Scope:** All three animation approaches applied broadly across ProjectHub

---

## Overview

Add microinteractions to ProjectHub using three complementary layers:

1. **Tailwind transitions** — press feedback on all interactive elements (zero deps, instant)
2. **Framer Motion** — mount/unmount animations for modals, command palette, toasts, lists, and drag
3. **CSS @keyframes** — custom animations: shimmer skeletons, checkmark draw, badge pop, success flash, page title entrance, spinner refinement

---

## Approach 1 — Tailwind Press Feedback

### Button component (`frontend/src/components/ui/Button.tsx`)
- Add `active:scale-95 active:brightness-95 transition-transform duration-100` to base classes
- Covers every `<Button>` usage in the app

### Global press rule (`frontend/src/index.css`)
```css
button:not([disabled]):active,
[role="button"]:not([disabled]):active {
  transform: scale(0.97);
  transition: transform 0.1s ease;
}
```
Covers all raw `<button>` elements not using the Button component.

### Checkbox in `TaskListTile`
- Add `transition-transform duration-150` + `checked:scale-110` pop on the checkbox button

### Sidebar nav items (`Sidebar.tsx`)
- Add `transition-all duration-150` to nav link items for color/bg change on active state

### Links and icon buttons
- Add `transition-colors duration-150` to bare `<button>` and `<a>` elements missing transitions (particularly in the sidebar, header, and project nav)

### Exclusions
- Drag handles — scale on press conflicts with drag initiation
- Text inputs — not interactive in the press-feedback sense
- Scrollable containers

---

## Approach 2 — Framer Motion

### Installation
```bash
cd frontend && npm install framer-motion
```

### `Modal.tsx`
- Replace Radix `animate-in zoom-in-95` with Framer `motion.div`
- **Enter:** `opacity: 0, scale: 0.96, y: 8` → `opacity: 1, scale: 1, y: 0` (spring, stiffness 300, damping 30)
- **Exit:** `opacity: 0, scale: 0.96, y: 4` — currently missing entirely
- Overlay: `opacity: 0` → `opacity: 1`, exit `opacity: 0`
- Wrap with `AnimatePresence` in the Portal

### `GlobalSearch.tsx` (command palette)
- Wrap panel with `AnimatePresence`
- **Enter:** `y: -8, opacity: 0` → `y: 0, opacity: 1` (150ms ease-out)
- **Exit:** `y: -8, opacity: 0` (100ms)

### `NotificationToast.tsx`
- **Enter:** `x: 320, opacity: 0` → `x: 0, opacity: 1` (spring, stiffness 400, damping 35)
- **Exit:** `x: 320, opacity: 0` (150ms ease-in)
- Multiple toasts: `layout` prop so stack shifts smoothly when one dismisses

### `BoardPage.tsx` (Kanban)
- New cards: `initial: { opacity: 0, y: -12 }` → `animate: { opacity: 1, y: 0 }` (200ms)
- `whileDrag: { scale: 1.03, boxShadow: "0 16px 40px rgba(0,0,0,0.18)" }` for lift feedback

### `WorkspacePage.tsx` tiles + `ProjectsPage.tsx` cards
- Staggered mount using `variants` with `staggerChildren: 0.05`
- Each tile/card: `initial: { opacity: 0, y: 12 }` → `animate: { opacity: 1, y: 0 }`
- Only on first mount (not on re-render)

### `InboxPage.tsx` / notification list items
- Wrap list with `AnimatePresence`
- Items exit with `opacity: 0, x: -16, height: 0` so list collapses cleanly when item is read/dismissed

---

## Approach 3 — CSS @keyframes

All additions in `frontend/src/index.css`.

### Shimmer skeleton
Replace `animate-pulse` on skeleton divs with a shimmer sweep:
```css
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.animate-shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 800px 100%;
  animation: shimmer 1.5s infinite linear;
}
.dark .animate-shimmer {
  background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
  background-size: 800px 100%;
}
```
Replace `animate-pulse` → `animate-shimmer` on skeleton divs in:
- `WorkspacePage.tsx` (TileSkeleton)
- `widgets.tsx` (EmptyState / loading states)
- Any other skeleton divs

### Checkmark draw (`TaskListTile.tsx`)
```css
@keyframes draw-check {
  from { stroke-dashoffset: 12; }
  to   { stroke-dashoffset: 0; }
}
.animate-draw-check {
  stroke-dasharray: 12;
  stroke-dashoffset: 12;
  animation: draw-check 0.25s ease-out forwards;
}
```
Apply `animate-draw-check` to the checkmark `<path>` in `TaskRow` when `task.done` becomes true.

### Notification badge pop
```css
@keyframes badge-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.45); }
  100% { transform: scale(1); }
}
.animate-badge-pop {
  animation: badge-pop 0.3s ease-out;
}
```
Apply to the unread count badge in `NotificationBell` when count increases (use a `useEffect` comparing previous count).

### Success flash (issue/project creation)
```css
@keyframes success-ring {
  0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
  70%  { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
  100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
}
.animate-success-ring {
  animation: success-ring 0.6s ease-out;
}
```
Apply to submit buttons in `IssueForm` and `ProjectWizard` on successful mutation.

### Page title entrance
```css
@keyframes page-enter {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-page-enter {
  animation: page-enter 0.2s ease-out forwards;
}
```
Apply to `h1` on `ProjectsPage`, `WorkspacePage`, `BacklogPage`, `BoardPage`.

### Spinner refinement (`Button.tsx`)
```css
@keyframes spinner-sweep {
  0%   { stroke-dashoffset: 60; }
  50%  { stroke-dashoffset: 15; }
  100% { stroke-dashoffset: 60; }
}
.animate-spinner-sweep {
  stroke-dasharray: 60;
  animation: spinner-sweep 1.2s ease-in-out infinite, spin 1.2s linear infinite;
}
```
Replace the static spinning circle in `Button`'s loading spinner.

---

## Implementation Order

1. CSS @keyframes additions to `index.css` (no deps, no risk)
2. Tailwind press feedback on `Button.tsx` + global CSS rule
3. Install Framer Motion
4. Framer Motion: Modal → GlobalSearch → NotificationToast → Board → Lists
5. Wire checkmark draw, badge pop, success flash, page title entrance

## Files Changed

| File | Change |
|---|---|
| `frontend/src/index.css` | All @keyframes + utility classes |
| `frontend/src/components/ui/Button.tsx` | `active:scale-95`, spinner refinement |
| `frontend/src/components/ui/Modal.tsx` | Framer Motion enter/exit |
| `frontend/src/features/search/GlobalSearch.tsx` | AnimatePresence panel |
| `frontend/src/features/notifications/NotificationToast.tsx` | Framer slide-in |
| `frontend/src/features/board/BoardPage.tsx` | Card mount + whileDrag |
| `frontend/src/features/workspace/WorkspacePage.tsx` | Staggered tile mount |
| `frontend/src/features/projects/ProjectsPage.tsx` | Staggered card mount |
| `frontend/src/features/notifications/InboxPage.tsx` | AnimatePresence list |
| `frontend/src/features/workspace/TaskListTile.tsx` | Checkmark draw |
| `frontend/src/components/layout/Sidebar.tsx` | Nav transition-all |
| `frontend/package.json` | + framer-motion |
