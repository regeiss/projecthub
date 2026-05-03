import React from 'react'
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
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

interface NodeData {
  label: string
  sequenceId: number | null
  duration: number
  es: number
  ef: number
  ls: number
  lf: number
  slack: number
  is_critical: boolean
}

const CIRCLE = 72
const BOX_H = 44
const BOX_W = 88
const LABEL_H = 18
const GAP = 8

function CpmNode({ data }: { data: NodeData }) {
  const critical = data.is_critical
  const color = critical ? '#ef4444' : '#3b82f6'
  const borderColor = critical ? 'rgba(252,165,165,0.7)' : 'rgba(147,197,253,0.7)'
  const cellBg = critical ? 'rgba(30,10,10,0.55)' : 'rgba(10,20,40,0.55)'
  // Box offset so it's centred under the circle
  const boxLeft = (CIRCLE - BOX_W) / 2

  const cellStyle = (right: boolean, bottom: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: right ? `1px solid ${borderColor}` : undefined,
    borderBottom: bottom ? `1px solid ${borderColor}` : undefined,
    padding: '2px 4px',
  })

  return (
    <div style={{ position: 'relative', width: CIRCLE, height: CIRCLE }}>

      {/* Duration label — sits above the circle */}
      <div style={{
        position: 'absolute',
        top: -(LABEL_H + GAP),
        width: '100%',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 700,
        color: '#cbd5e1',
        lineHeight: `${LABEL_H}px`,
      }}>
        {data.duration}d
      </div>

      {/* Circle */}
      <div style={{
        width: CIRCLE,
        height: CIRCLE,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 0 3px ${color}55, 0 4px 16px rgba(0,0,0,0.45)`,
        gap: 2,
      }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 11, textAlign: 'center', lineHeight: 1.2, padding: '0 6px' }}>
          {data.sequenceId != null ? `#${data.sequenceId}` : data.label.slice(0, 8)}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 8, lineHeight: 1 }}>
          folga {data.slack}d
        </span>
      </div>

      {/* ES | EF / LS | LF data box — sits below the circle */}
      <div style={{
        position: 'absolute',
        top: CIRCLE + GAP,
        left: boxLeft,
        width: BOX_W,
        height: BOX_H,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        border: `1px solid ${borderColor}`,
        borderRadius: 4,
        overflow: 'hidden',
        background: cellBg,
        fontSize: 10,
        fontWeight: 700,
        color: '#e2e8f0',
      }}>
        <div style={cellStyle(true, true)}>{data.es}</div>
        <div style={cellStyle(false, true)}>{data.ef}</div>
        <div style={cellStyle(true, false)}>{data.ls}</div>
        <div style={cellStyle(false, false)}>{data.lf}</div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        style={{ top: CIRCLE / 2, background: color, width: 8, height: 8, border: '2px solid #0f172a' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ top: CIRCLE / 2, background: color, width: 8, height: 8, border: '2px solid #0f172a' }}
      />
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
    position: {
      x: (n.position as { x: number })?.x ?? 0,
      y: (n.position as { y: number })?.y ?? 0,
    },
    data: {
      label: (n.data as Record<string, unknown>)?.label ?? n.id,
      sequenceId: (n.data as Record<string, unknown>)?.sequence_id ?? null,
      duration: (n.data as Record<string, number>)?.duration ?? 0,
      es: (n.data as Record<string, number>)?.es ?? 0,
      ef: (n.data as Record<string, number>)?.ef ?? 0,
      ls: (n.data as Record<string, number>)?.ls ?? 0,
      lf: (n.data as Record<string, number>)?.lf ?? 0,
      slack: (n.data as Record<string, number>)?.slack ?? 0,
      is_critical: (n.data as Record<string, boolean>)?.is_critical ?? false,
    },
  }))

  const edges: Edge[] = (network.edges ?? []).map((e: Record<string, unknown>) => {
    const isCritical = !!(e.style as Record<string, unknown>)?.stroke
    const color = isCritical ? '#ef4444' : '#3b82f6'
    return {
      id: e.id as string,
      source: e.source as string,
      target: e.target as string,
      type: 'smoothstep',
      style: { stroke: color, strokeWidth: 2 },
      markerEnd: { type: MarkerType.Arrow, color, width: 22, height: 22 },
    }
  })

  return (
    <div className="h-full w-full">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.1}>
        <Background gap={24} color="#1e293b" />
        <Controls />
        <MiniMap
          nodeColor={(n) => ((n.data as Record<string, unknown>)?.is_critical ? '#ef4444' : '#3b82f6')}
        />
        <Panel position="bottom-left">
          <div style={{
            background: 'rgba(15,23,42,0.88)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '7px 12px',
            fontSize: 10,
            color: '#64748b',
            lineHeight: 1.8,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '0 4px', marginBottom: 5 }}>
              <span style={{ color: '#93c5fd', fontWeight: 700 }}>ES</span><span>Início mais cedo</span>
              <span style={{ color: '#93c5fd', fontWeight: 700 }}>EF</span><span>Término mais cedo</span>
              <span style={{ color: '#93c5fd', fontWeight: 700 }}>LS</span><span>Início mais tarde</span>
              <span style={{ color: '#93c5fd', fontWeight: 700 }}>LF</span><span>Término mais tarde</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span><span style={{ color: '#ef4444' }}>●</span> Caminho crítico</span>
              <span><span style={{ color: '#3b82f6' }}>●</span> Com folga</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
