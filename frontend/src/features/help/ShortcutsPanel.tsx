import { SHORTCUTS, SHORTCUT_GROUP_LABELS } from './content/shortcuts'
import type { Shortcut } from './content/types'

const GROUPS: Shortcut['group'][] = ['navigation', 'search', 'issues', 'editor']

export function ShortcutsPanel() {
  return (
    <div>
      <h2 className="mb-6 text-base font-semibold text-gray-900 dark:text-gray-100">
        Atalhos de teclado
      </h2>

      <div className="flex flex-col gap-8">
        {GROUPS.map((group) => {
          const items = SHORTCUTS.filter((s) => s.group === group)
          if (items.length === 0) return null
          return (
            <section key={group} aria-labelledby={`shortcut-group-${group}`}>
              <h3
                id={`shortcut-group-${group}`}
                className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
              >
                {SHORTCUT_GROUP_LABELS[group]}
              </h3>
              <div className="flex flex-col gap-2">
                {items.map((shortcut) => (
                  <div
                    key={shortcut.keys.join('-')}
                    className="flex items-center justify-between rounded-lg px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, ki) => (
                        <span key={ki}>
                          <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-1.5 font-mono text-xs text-gray-700 dark:text-gray-300 shadow-sm">
                            {key}
                          </kbd>
                          {ki < shortcut.keys.length - 1 && (
                            <span className="mx-0.5 text-xs text-gray-400">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
