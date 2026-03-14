# Dark Mode — Design Spec

**Date:** 2026-03-13
**Status:** Approved

---

## Overview

Add dark mode support to ProjectHub. Users default to their system preference (`prefers-color-scheme`) and can manually override via a toggle in the header. Preference persists across sessions via `localStorage`.

---

## Architecture

### Tailwind Configuration

Enable Tailwind's class-based dark mode strategy by adding `darkMode: 'class'` to `tailwind.config.ts`. This causes all `dark:` variant utilities to activate when the `dark` class is present on `<html>`.

### ThemeContext

A new `ThemeContext` (React context + provider) manages theme state. It lives in `src/features/theme/ThemeContext.tsx`.

**State shape:**
```ts
type ThemeMode = 'light' | 'dark' | 'system'
```

**Behavior:**
- On mount, reads saved preference from `localStorage` (key: `theme`). Defaults to `'system'` if none is set.
- When mode is `'system'`, listens to `window.matchMedia('(prefers-color-scheme: dark)')` and applies `dark` class accordingly. Updates reactively when the system preference changes.
- When mode is `'light'` or `'dark'`, applies/removes the `dark` class on `<html>` directly.
- Persists any manual change to `localStorage`.

**Exports:**
```ts
ThemeProvider   // wraps the app
useTheme()      // returns { mode, setMode, resolvedTheme }
```

`resolvedTheme` is `'light' | 'dark'` — the actual applied theme after resolving `'system'`.

### Toggle in Header

`src/components/layout/Header.tsx` gets a `ThemeToggle` button component.

- Displays a sun icon (`Sun`) when the resolved theme is light, moon icon (`Moon`) when dark (Lucide icons)
- Clicking cycles through three modes: `system → light → dark → system`
- `aria-label` updates to reflect the next mode: `"Switch to light mode"`, `"Switch to dark mode"`, `"Use system theme"`
- Accessible: keyboard focusable, `role="button"`

### AppLayout / Entry Point

`ThemeProvider` is the outermost wrapper in `main.tsx`, wrapping `AuthProvider`. This ensures theme is available to everything including any future auth UI, and keeps theme independent of auth state.

```tsx
// main.tsx
<ThemeProvider>
  <AuthProvider>
    ...
  </AuthProvider>
</ThemeProvider>
```

---

## Color Palette

Soft dark style (Notion/Linear aesthetic). All dark tokens use standard Tailwind gray scale.

| Role | Light | Dark |
|---|---|---|
| Page background | `bg-gray-50` | `dark:bg-gray-900` |
| Surface (cards, panels) | `bg-white` | `dark:bg-gray-800` |
| Sidebar / header background | `bg-white` | `dark:bg-gray-950` |
| Borders | `border-gray-200` | `dark:border-gray-700` |
| Body text | `text-gray-900` | `dark:text-gray-100` |
| Secondary / muted text | `text-gray-500` | `dark:text-gray-400` |
| Muted icons | `text-gray-500` | `dark:text-gray-400` |
| Active nav item | `bg-indigo-50 text-indigo-600` | `dark:bg-indigo-950 dark:text-indigo-400` |
| Hover states | `hover:bg-gray-100` | `dark:hover:bg-gray-700` |
| Dividers | `bg-gray-200` | `dark:bg-gray-700` |

---

## Component Scope

All components that use hardcoded light color classes need `dark:` variants added. Priority order:

1. **Layout shell** — `AppLayout`, `Sidebar`, `Header`
2. **UI primitives** — `Dropdown`, `Tooltip`, and any other components in `src/components/ui/`
3. **Feature pages** — `WorkspacePage`, `ProjectsPage`, `BoardPage`, `BacklogPage`, `CyclesPage`, `GanttPage`, `PortfolioPage`, `MilestonesPage`, `RisksPage`, `ModulesPage`, `WikiLayout/WikiPage`, `IssueDetailPage`, settings pages
4. **`index.css`** — update base `body` styles by adding a `.dark body` CSS selector block that overrides background and text color, consistent with how Tailwind applies the `dark` class on `<html>`

---

## Data Flow

```
localStorage / system preference
        ↓
  ThemeContext (mount)
        ↓
  toggle <html class="dark">
        ↓
  Tailwind dark: variants activate
        ↓
  All components re-render with dark colors
```

---

## Error Handling

- If `localStorage` is unavailable (private browsing edge case), fall back gracefully to `'system'` mode without throwing.
- `matchMedia` listener cleaned up on `ThemeProvider` unmount to prevent memory leaks.

---

## Accessibility

- Toggle button has `aria-label` describing current action (e.g., `"Switch to dark mode"`)
- Color contrast in dark mode meets WCAG AA minimum (4.5:1 for body text)
- No theme flash on load — an inline `<script>` in `index.html` (before the React bundle) reads `localStorage.getItem('theme')` and, if the stored value is `'dark'` or if the value is `'system'` and `window.matchMedia('(prefers-color-scheme: dark)').matches`, immediately adds `class="dark"` to `<html>`. This runs synchronously before first paint so there is no flash of the wrong theme.

---

## Testing

- Unit test `ThemeContext`: default resolves to system, manual override persists, `resolvedTheme` reflects system media query
- Unit test `ThemeToggle`: renders correct icon, toggle cycles modes, `aria-label` updates
- Integration test: dark class applied to `<html>` when mode is `'dark'` or system is dark
- Visual regression: Vitest snapshot tests for `Sidebar` and `Header` rendered in both light and dark modes

---

## Out of Scope

- Per-project or per-workspace theme overrides
- High-contrast or custom color themes
- Server-side rendering concerns (this is a Vite/React SPA)
