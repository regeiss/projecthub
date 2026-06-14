import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { createLowlight, common } from 'lowlight'

const lowlight = createLowlight(common)

const LANGUAGES = [
  { value: '',           label: 'auto'       },
  { value: 'python',     label: 'Python'     },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'xml',        label: 'HTML / XML' },
  { value: 'css',        label: 'CSS'        },
  { value: 'scss',       label: 'SCSS'       },
  { value: 'json',       label: 'JSON'       },
  { value: 'bash',       label: 'Bash'       },
  { value: 'shell',      label: 'Shell'      },
  { value: 'sql',        label: 'SQL'        },
  { value: 'go',         label: 'Go'         },
  { value: 'rust',       label: 'Rust'       },
  { value: 'java',       label: 'Java'       },
  { value: 'kotlin',     label: 'Kotlin'     },
  { value: 'php',        label: 'PHP'        },
  { value: 'ruby',       label: 'Ruby'       },
  { value: 'cpp',        label: 'C++'        },
  { value: 'c',          label: 'C'          },
  { value: 'csharp',     label: 'C#'         },
  { value: 'swift',      label: 'Swift'      },
  { value: 'yaml',       label: 'YAML'       },
  { value: 'markdown',   label: 'Markdown'   },
  { value: 'nginx',      label: 'Nginx'      },
  { value: 'makefile',   label: 'Makefile'   },
  { value: 'diff',       label: 'Diff'       },
  { value: 'r',          label: 'R'          },
]

function CodeBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const language = (node.attrs.language as string | null) ?? ''
  const lines = (node.textContent ?? '').split('\n')
  const lineCount = Math.max(lines[lines.length - 1] === '' ? lines.length - 1 : lines.length, 1)

  return (
    <NodeViewWrapper as="div" className="cb-root not-prose">
      {/* Header */}
      <div className="cb-header" contentEditable={false}>
        {editor.isEditable ? (
          <select
            value={language}
            onChange={e => updateAttributes({ language: e.target.value || null })}
            className="cb-lang-select"
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        ) : (
          <span className="cb-lang-badge">{language || 'plaintext'}</span>
        )}
      </div>

      {/* Body */}
      <div className="cb-body">
        <div className="cb-line-numbers" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')}
        </div>
        <NodeViewContent as="code" className="cb-content" />
      </div>
    </NodeViewWrapper>
  )
}

export const CodeBlockWithLineNumbers = CodeBlockLowlight.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      lowlight,
      defaultLanguage: null,
      HTMLAttributes: {},
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  },
})
