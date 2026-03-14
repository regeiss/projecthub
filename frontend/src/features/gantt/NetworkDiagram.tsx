import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useCpmNetwork } from '@/hooks/useCpm'
import { PageSpinner } from '@/components/ui/Spinner'

interface NetworkDiagramProps {
  projectId: string
}

function CpmNode({ data }: { data: { label: string; slack: number; isCritical: boolean } }) {
  return (
    <div
      className={`min-w-[120px] rounded-md border-2 bg-white dark:bg-gray-900 px-3 py-2 text-xs shadow-sm ${
        data.isCritical
          ? 'border-red-400 bg-red-50'
          : 'border-gray-300 dark:border-gray-600'
      }`}
    >
      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{data.label}</p>
      <p className={data.isCritical ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}>
        Folga: {data.slack}d
      </p>
    </div>
  )
}

const nodeTypes = { cpmNode: CpmNode }

export function NetworkDiagram({ projectId }: NetworkDiagramProps) {
  const { data: network, isLoading } = useCpmNetwork(projectId)

  if (isLoading) return <PageSpinner />
  if (!network) return (
    <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
      Calcule o CPM para ver o diagrama
    </div>
  )

  const nodes: Node[] = (network.nodes ?? []).map((n: Record<string, unknown>) => ({
    id: n.id as string,
    type: 'cpmNode',
    position: { x: (n.position as { x: number })?.x ?? 0, y: (n.position as { y: number })?.y ?? 0 },
    data: {
      label: (n.data as Record<string, unknown>)?.label ?? n.id,
      slack: (n.data as Record<string, number>)?.slack ?? 0,
      isCritical: (n.data as Record<string, boolean>)?.isCritical ?? false,
    },
  }))

  const edges: Edge[] = (network.edges ?? []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    source: e.source as string,
    target: e.target as string,
    animated: e.isCritical as boolean,
    style: { stroke: (e.isCritical as boolean) ? '#ef4444' : '#9ca3af', strokeWidth: 2 },
  }))

  return (
    <div className="h-full w-full">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
