"use client"
import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, Controls, Background, MiniMap, Handle, Position, Panel, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { NodeSearch } from '@/components/node-search';
import { GroupNode } from '@/components/labeled-group-node';
import { useFlowUpload } from '@/context/flowUploadContext';
import FlowUploader from '@/features/FlowUploader';

/* ────────────────────────────────────────────────────────────
   Custom node renderers for reactflow-graph.json schema
   Node types: component, condition, branch, thread
   ──────────────────────────────────────────────────────────── */

const ComponentNode = ({ data }: any) => (
    <div className="bg-white rounded-lg border-2 border-blue-300 shadow-md min-w-[220px] max-w-[280px] text-xs">
        <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-3 !h-3 !border-2 !border-white" />

        <div className={`flex items-center gap-2 px-3 py-2 rounded-t-md ${data.isServer ? 'bg-indigo-50 border-b border-indigo-200' : 'bg-amber-50 border-b border-amber-200'}`}>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${data.isServer ? 'bg-indigo-200 text-indigo-800' : 'bg-amber-200 text-amber-800'}`}>
                {data.isServer ? 'Server' : 'Client'}
            </span>
            <strong className="text-sm font-bold truncate">{data.label}</strong>
        </div>

        {data.summary && (
            <p className="px-3 py-1.5 text-gray-600 leading-snug border-b border-gray-100">{data.summary}</p>
        )}

        <div className="flex gap-3 px-3 py-1.5 text-gray-500">
            {data.stateCount > 0 && <span>🗂 {data.stateCount} state{data.stateCount > 1 ? 's' : ''}</span>}
            {data.contextCount > 0 && <span>🔗 {data.contextCount} ctx</span>}
            {data.requestCount > 0 && <span>📡 {data.requestCount} req</span>}
        </div>

        {data.contexts?.length > 0 && (
            <div className="px-3 py-1 border-t border-gray-100 text-gray-500">
                ctx: {data.contexts.join(', ')}
            </div>
        )}

        <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-3 !h-3 !border-2 !border-white" />
    </div>
);

const ConditionNode = ({ data }: any) => (
    <div className="bg-yellow-50 rounded-lg border-2 border-yellow-400 shadow-sm min-w-[120px] text-xs text-center">
        <Handle type="target" position={Position.Top} className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white" />

        <div className="px-4 py-3">
            <span className="text-[10px] text-yellow-700 font-medium uppercase tracking-wide">{data.conditionType || 'if'}</span>
            <div className="text-sm font-bold text-yellow-900 mt-0.5">{data.label}</div>
        </div>

        {(data.sourceContexts?.length > 0 || data.sourceStates?.length > 0 || data.sourceProps?.length > 0) && (
            <div className="border-t border-yellow-200 px-3 py-1 text-yellow-700 text-left">
                {data.sourceContexts?.length > 0 && <div>ctx: {data.sourceContexts.join(', ')}</div>}
                {data.sourceStates?.length > 0 && <div>state: {data.sourceStates.join(', ')}</div>}
                {data.sourceProps?.length > 0 && <div>props: {data.sourceProps.join(', ')}</div>}
            </div>
        )}

        <Handle type="source" position={Position.Bottom} className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
);

const BranchNode = ({ data }: any) => (
    <div className="bg-green-50 rounded-lg border-2 border-green-400 shadow-sm min-w-[140px] text-xs">
        <Handle type="target" position={Position.Top} className="!bg-green-500 !w-3 !h-3 !border-2 !border-white" />

        <div className="px-3 py-2 border-b border-green-200">
            <strong className="text-sm font-bold text-green-900">{data.label}</strong>
            {data.guard && <div className="text-green-700 mt-0.5">guard: <code className="bg-green-100 px-1 rounded">{data.guard}</code></div>}
        </div>

        {data.renderedChildren?.length > 0 && (
            <div className="px-3 py-1.5 text-green-800">
                renders: {data.renderedChildren.join(', ')}
            </div>
        )}

        {data.threadIds?.length > 0 && (
            <div className="px-3 py-1 border-t border-green-200 flex gap-1 flex-wrap">
                {data.threadIds.map((t: string, i: number) => (
                    <span key={t} className="px-1.5 py-0.5 rounded-full text-white text-[9px] font-medium"
                        style={{ backgroundColor: data.threadColors?.[i] || '#6b7280' }}>
                        {t}
                    </span>
                ))}
            </div>
        )}

        <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
);

const ThreadNode = ({ data }: any) => (
    <div className="rounded-lg border-2 shadow-sm min-w-[180px] text-xs"
        style={{ borderColor: data.color || '#6b7280', backgroundColor: `${data.color}10` }}>
        <Handle type="target" position={Position.Top} className="!w-3 !h-3 !border-2 !border-white"
            style={{ backgroundColor: data.color || '#6b7280' }} />

        <div className="px-3 py-2 border-b" style={{ borderColor: `${data.color}40` }}>
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                <strong className="text-sm font-bold">{data.label}</strong>
            </div>
            {data.description && <div className="text-gray-600 mt-0.5">{data.description}</div>}
        </div>

        {data.terminalComponents?.length > 0 && (
            <div className="px-3 py-1.5 text-gray-700">
                terminals: {data.terminalComponents.join(', ')}
            </div>
        )}

        {data.steps != null && (
            <div className="px-3 py-1 border-t text-gray-500" style={{ borderColor: `${data.color}40` }}>
                {data.steps} step{data.steps > 1 ? 's' : ''}
            </div>
        )}

        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !border-2 !border-white"
            style={{ backgroundColor: data.color || '#6b7280' }} />
    </div>
);

/* Fallback for unknown node types */
const DefaultCustomNode = ({ data }: any) => (
    <div className="bg-white rounded-lg border border-gray-300 shadow-sm min-w-[180px] text-xs p-3">
        <Handle type="target" position={Position.Top} style={{ height: '6px', top: '-6px', width: '100%', borderRadius: 0, border: 'none', background: 'transparent' }} />
        {data?.label && <strong className="text-sm font-bold truncate block w-full border-b pb-1 mb-1">{data.label}</strong>}
        <pre className="text-[10px] overflow-x-auto max-h-28 p-1 bg-gray-50 rounded" style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data, null, 2)}</pre>
        <Handle type="source" position={Position.Bottom} style={{ height: '6px', bottom: '-6px', width: '100%', borderRadius: 0, border: 'none', background: 'transparent' }} />
    </div>
);

/* ── Node type registry ─────────────────────────────────── */

const nodeTypes = {
    component: ComponentNode,
    condition: ConditionNode,
    branch: BranchNode,
    thread: ThreadNode,
    custom: DefaultCustomNode,
    labeledGroupNode: GroupNode,
};

/* ── Dagre auto-layout ──────────────────────────────────── */

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph({ compound: true });
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction, nodesep: 150, ranksep: 200, edgesep: 50 });

    nodes.forEach((node) => {
        if (node.type === 'labeledGroupNode') {
            dagreGraph.setNode(node.id, { label: node.data.label, clusterLabelPos: 'top' });
        } else {
            dagreGraph.setNode(node.id, { width: 250, height: 150 });
        }
    });

    nodes.forEach((node) => {
        if (node.parentId) {
            dagreGraph.setParent(node.id, node.parentId);
        }
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        let x = nodeWithPosition.x - nodeWithPosition.width / 2;
        let y = nodeWithPosition.y - nodeWithPosition.height / 2;

        if (node.parentId) {
            const parentWithPosition = dagreGraph.node(node.parentId);
            const parentX = parentWithPosition.x - parentWithPosition.width / 2;
            const parentY = parentWithPosition.y - parentWithPosition.height / 2;
            x = x - parentX;
            y = y - parentY;
        }

        return {
            ...node,
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',
            position: {
                x: Math.round(x),
                y: Math.round(y),
            },
            ...(node.type === 'labeledGroupNode' ? {
                style: {
                    width: Math.round(nodeWithPosition.width),
                    height: Math.round(nodeWithPosition.height),
                }
            } : {})
        };
    });

    return { nodes: newNodes, edges };
};

/* ── FlowWithSearch wrapper ─────────────────────────────── */

function FlowWithSearch({
    nodes, edges, nodeTypes, onNodesChange, onEdgesChange, rawGraph
}: any) {
    const { fitView } = useReactFlow();

    const handleSearch = useCallback((searchString: string) => {
        if (!rawGraph) return [];
        return rawGraph.nodes
            .filter((n: any) =>
                n.data?.label?.toLowerCase().includes(searchString.toLowerCase())
            )
            .map((n: any) => ({ id: n.id, data: { label: n.data?.label || n.id } }));
    }, [rawGraph]);

    const handleSelectNode = useCallback((searchNode: any) => {
        if (!rawGraph) return;
        setTimeout(() => {
            fitView({ nodes: [{ id: searchNode.id }], duration: 600 });
        }, 100);
    }, [rawGraph, fitView]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            minZoom={0.1}
        >
            <Background />
            <Controls />
            <MiniMap />
            <Panel position="top-right" className="m-4">
                <NodeSearch
                    onSearch={handleSearch}
                    onSelectNode={handleSelectNode}
                />
            </Panel>
        </ReactFlow>
    );
}

/* ── Main FlowChart component ───────────────────────────── */

export default function FlowChart() {
    const { rawGraph, loading } = useFlowUpload();

    const [nodes, setNodes] = useState<any[]>([]);
    const [edges, setEdges] = useState<any[]>([]);

    const onNodesChange = useCallback(
        (changes: any) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot) as any),
        [],
    );
    const onEdgesChange = useCallback(
        (changes: any) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot) as any),
        [],
    );

    useEffect(() => {
        if (!rawGraph) return;

        const { nodes: rawNodes, edges: rawEdges } = rawGraph;

        // Map JSON nodes to React Flow nodes.
        // The JSON already has the correct { id, type, position, data } structure,
        // so we pass `n.data` as the React Flow node `data` (not the entire node).
        const rfNodes = rawNodes.map((n: any) => ({
            id: n.id,
            type: n.type || 'custom',
            position: n.position || undefined,
            data: n.data || {},
            ...(n.parentId ? { parentId: n.parentId } : {}),
        }));

        // Map edges — include label, animated, style, and data from the JSON
        const rfEdges = rawEdges.map((e: any) => ({
            id: e.id || `e-${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
            ...(e.type ? { type: e.type } : {}),
            ...(e.label ? { label: e.label } : {}),
            ...(e.animated ? { animated: e.animated } : {}),
            style: e.style || undefined,
            data: e.data || undefined,
        }));

        // Auto-layout via dagre if no node has a defined position
        const anyPositioned = rfNodes.some((n: any) => n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number');
        if (!anyPositioned) {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges, 'TB');
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        } else {
            setNodes(rfNodes);
            setEdges(rfEdges);
        }

    }, [rawGraph]);

    return (
        <div style={{ width: '100%', height: '80vh', position: 'relative' }} className="border rounded-xl bg-white shadow-sm overflow-hidden">
            {/* <FlowUploader /> */}
            {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20">Loading Tree Layout...</div>}

            <ReactFlowProvider>
                <FlowWithSearch
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    rawGraph={rawGraph}
                />
            </ReactFlowProvider>
        </div>
    );
}
