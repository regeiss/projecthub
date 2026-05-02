import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  type Edge,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useCpmNetwork } from '@/hooks/useCpm'
import { PageSpinner } from '@/components/ui/Spinner'

interface NetworkDiagramProps {
  projectId: string
}

function CpmNode({ data }: { data: { label: string; slack: number; is_critical: boolean } }) {
  return (
    <div
      className={`min-w-[120px] rounded-md border-2 bg-white dark:bg-gray-900 px-3 py-2 text-xs shadow-sm ${
        data.is_critical
          ? 'border-red-400 bg-red-50'
          : 'border-gray-300 dark:border-gray-600'
      }`}
    >
      <Handle type="target" position={Position.Left} />
      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{data.label}</p>
      <p className={data.is_critical ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}>
        Folga: {data.slack}d
      </p>
      <Handle type="source" position={Position.Right} />
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
      is_critical: (n.data as Record<string, boolean>)?.is_critical ?? false,
    },
  }))

  const edges: Edge[] = (network.edges ?? []).map((e: Record<string, unknown>) => {
    const isCritical = !!(e.style as Record<string, unknown>)?.stroke
    const color = isCritical ? '#ef4444' : '#6b7280'
    return {
      id: e.id as string,
      source: e.source as string,
      target: e.target as string,
      type: 'smoothstep',
      animated: isCritical,
      style: { stroke: color, strokeWidth: isCritical ? 2.5 : 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
    }
  })

  return (
    <div className="h-full w-full">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.2}>
        <Background gap={20} color="#374151" />
        <Controls />
        <MiniMap nodeColor={(n) => ((n.data as Record<string, unknown>)?.is_critical ? '#ef4444' : '#6b7280')} />
      </ReactFlow>
    </div>
  )
}
