"use client"
import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, Controls, Background, MiniMap, Handle, Position, Panel, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { NodeSearch } from '@/components/node-search';
import { GroupNode } from '@/components/labeled-group-node';
import { useFlowUpload } from '@/context/flowUploadContext';
import { useThreadSelect } from '@/context/threadSelectContext';

/* ────────────────────────────────────────────────────────────
   Custom node renderers
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

/* Thread group container — wraps its children */
const ThreadGroupNode = ({ data }: any) => (
    <div
        className="rounded-xl border-2 text-xs h-full w-full overflow-visible"
        style={{
            borderColor: data.color || '#6b7280',
            backgroundColor: `${data.color}08`,
        }}
    >
        <div
            className="flex items-center gap-2 px-3 py-2 rounded-t-[10px]"
            style={{ backgroundColor: `${data.color}15` }}
        >
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
            <strong className="text-sm font-bold">{data.label}</strong>
            {data.description && (
                <span className="text-[10px] text-gray-500 truncate">— {data.description}</span>
            )}
        </div>
    </div>
);

/* ── Node type registry ─────────────────────────────────── */

const nodeTypes = {
    component: ComponentNode,
    condition: ConditionNode,
    thread: ThreadGroupNode,
    labeledGroupNode: GroupNode,
};

/* ── Dagre auto-layout ──────────────────────────────────── */

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph({ compound: true });
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction, nodesep: 150, ranksep: 200, edgesep: 50 });

    nodes.forEach((node) => {
        if (node.type === 'thread' || node.type === 'labeledGroupNode') {
            dagreGraph.setNode(node.id, { label: node.data?.label, clusterLabelPos: 'top' });
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
        if (!nodeWithPosition) return node;

        let x = nodeWithPosition.x - nodeWithPosition.width / 2;
        let y = nodeWithPosition.y - nodeWithPosition.height / 2;

        if (node.parentId) {
            const parentWithPosition = dagreGraph.node(node.parentId);
            if (parentWithPosition) {
                const parentX = parentWithPosition.x - parentWithPosition.width / 2;
                const parentY = parentWithPosition.y - parentWithPosition.height / 2;
                x = x - parentX;
                y = y - parentY;
            }
        }

        const isGroup = node.type === 'thread' || node.type === 'labeledGroupNode';

        return {
            ...node,
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',
            position: {
                x: Math.round(x),
                y: Math.round(y),
            },
            ...(isGroup ? {
                style: {
                    width: Math.round(nodeWithPosition.width),
                    height: Math.round(nodeWithPosition.height),
                }
            } : {})
        };
    });

    return { nodes: newNodes, edges };
};

/* ── Thread grouping helper ─────────────────────────────── */

function buildThreadGroups(rawNodes: any[], rawEdges: any[]) {
    // Index nodes and edges
    const nodeById = new Map<string, any>();
    rawNodes.forEach((n: any) => nodeById.set(n.id, n));

    // Build adjacency: source → targets, target → sources
    const outEdges = new Map<string, any[]>(); // source → edges
    const inEdges = new Map<string, any[]>();  // target → edges
    rawEdges.forEach((e: any) => {
        if (!outEdges.has(e.source)) outEdges.set(e.source, []);
        outEdges.get(e.source)!.push(e);
        if (!inEdges.has(e.target)) inEdges.set(e.target, []);
        inEdges.get(e.target)!.push(e);
    });

    // Find all thread nodes and their associated branch nodes
    const threadNodes = rawNodes.filter((n: any) => n.type === 'thread');

    // For each thread, trace its member nodes
    // A thread's label (e.g. "t1") maps to branch nodes via data.threadIds
    const threadMembers = new Map<string, Set<string>>(); // threadNodeId → set of member node IDs

    for (const threadNode of threadNodes) {
        const threadLabel = threadNode.data?.label;
        if (!threadLabel) continue;

        const members = new Set<string>();
        threadMembers.set(threadNode.id, members);

        // Find all branch nodes that belong to this thread
        const branchNodes = rawNodes.filter(
            (n: any) => n.type === 'branch' && n.data?.threadIds?.includes(threadLabel)
        );

        for (const branch of branchNodes) {
            members.add(branch.id);

            // Walk backwards: branch ← condition ← component
            const condEdges = inEdges.get(branch.id) || [];
            for (const ce of condEdges) {
                const sourceNode = nodeById.get(ce.source);
                if (sourceNode) {
                    members.add(sourceNode.id);
                    // If it's a condition, walk one more step back to the component
                    if (sourceNode.type === 'condition') {
                        const compEdges = inEdges.get(sourceNode.id) || [];
                        for (const compE of compEdges) {
                            const compNode = nodeById.get(compE.source);
                            if (compNode) members.add(compNode.id);
                        }
                    }
                }
            }

            // Walk forwards: branch → child components
            const childEdges = outEdges.get(branch.id) || [];
            for (const childE of childEdges) {
                const childNode = nodeById.get(childE.target);
                if (childNode) members.add(childNode.id);
            }
        }
    }

    // Find nodes that appear in multiple threads (need duplication)
    const nodeToThreads = new Map<string, string[]>(); // nodeId → [threadNodeId, ...]
    for (const [threadNodeId, members] of threadMembers) {
        for (const memberId of members) {
            if (!nodeToThreads.has(memberId)) nodeToThreads.set(memberId, []);
            nodeToThreads.get(memberId)!.push(threadNodeId);
        }
    }

    // Build output nodes and edges
    const outputNodes: any[] = [];
    const outputEdges: any[] = [];
    const idRemap = new Map<string, Map<string, string>>(); // threadNodeId → (oldId → newId)

    // Add thread group nodes first
    for (const threadNode of threadNodes) {
        outputNodes.push({
            id: threadNode.id,
            type: 'thread',
            data: threadNode.data,
            position: { x: 0, y: 0 },
        });
        idRemap.set(threadNode.id, new Map());
    }

    // Process member nodes — duplicate those shared across threads
    const processedStandalone = new Set<string>();
    for (const [threadNodeId, members] of threadMembers) {
        const remap = idRemap.get(threadNodeId)!;

        for (const memberId of members) {
            const node = nodeById.get(memberId);
            if (!node) continue;

            const threads = nodeToThreads.get(memberId) || [];
            if (threads.length > 1) {
                // Shared node — duplicate with unique ID per thread
                const newId = `${memberId}__${threadNodeId}`;
                remap.set(memberId, newId);
                outputNodes.push({
                    ...node,
                    id: newId,
                    parentId: threadNodeId,
                    position: { x: 0, y: 0 },
                    extent: 'parent' as const,
                });
            } else {
                // Unique to this thread
                remap.set(memberId, memberId);
                outputNodes.push({
                    ...node,
                    id: memberId,
                    parentId: threadNodeId,
                    position: { x: 0, y: 0 },
                    extent: 'parent' as const,
                });
                processedStandalone.add(memberId);
            }
        }
    }

    // Add nodes not in any thread as standalone
    for (const node of rawNodes) {
        if (node.type === 'thread') continue;
        if (processedStandalone.has(node.id)) continue;
        if (nodeToThreads.has(node.id)) continue; // handled via duplication
        outputNodes.push({
            ...node,
            position: node.position || { x: 0, y: 0 },
        });
    }

    // Remap edges
    // For edges between nodes within the same thread, remap IDs
    // For edges between threads or standalone nodes, create edges for each thread copy
    const addedEdgeIds = new Set<string>();

    for (const edge of rawEdges) {
        // Find which threads contain source and target
        const sourceThreads = nodeToThreads.get(edge.source) || [];
        const targetThreads = nodeToThreads.get(edge.target) || [];

        if (sourceThreads.length === 0 && targetThreads.length === 0) {
            // Both standalone — keep original edge
            if (!addedEdgeIds.has(edge.id)) {
                outputEdges.push({ ...edge });
                addedEdgeIds.add(edge.id);
            }
        } else {
            // Find common threads (both in same thread group)
            const commonThreads = sourceThreads.filter(t => targetThreads.includes(t));

            if (commonThreads.length > 0) {
                // Nodes share thread(s) — create edge per common thread
                for (const threadNodeId of commonThreads) {
                    const remap = idRemap.get(threadNodeId)!;
                    const newSource = remap.get(edge.source) || edge.source;
                    const newTarget = remap.get(edge.target) || edge.target;
                    const newEdgeId = `${edge.id}__${threadNodeId}`;
                    if (!addedEdgeIds.has(newEdgeId)) {
                        outputEdges.push({
                            ...edge,
                            id: newEdgeId,
                            source: newSource,
                            target: newTarget,
                        });
                        addedEdgeIds.add(newEdgeId);
                    }
                }
            } else {
                // Source and target in different threads or one is standalone
                // Create edge for each thread the source is in, connecting to each thread the target is in
                const srcIds = sourceThreads.length > 0
                    ? sourceThreads.map(t => idRemap.get(t)!.get(edge.source) || edge.source)
                    : [edge.source];
                const tgtIds = targetThreads.length > 0
                    ? targetThreads.map(t => idRemap.get(t)!.get(edge.target) || edge.target)
                    : [edge.target];

                for (const src of srcIds) {
                    for (const tgt of tgtIds) {
                        const newEdgeId = `${edge.id}__${src}__${tgt}`;
                        if (!addedEdgeIds.has(newEdgeId)) {
                            outputEdges.push({
                                ...edge,
                                id: newEdgeId,
                                source: src,
                                target: tgt,
                            });
                            addedEdgeIds.add(newEdgeId);
                        }
                    }
                }
            }
        }
    }

    return { nodes: outputNodes, edges: outputEdges };
}

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
    const { selectedThreadIds } = useThreadSelect();

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

        /* ── Step 1: Build thread groups (duplication + parentId) ── */
        const { nodes: groupedNodes, edges: groupedEdges } = buildThreadGroups(rawNodes, rawEdges);

        /* ── Step 2: Thread filtering ──────────────────────────── */
        const filteredNodes = groupedNodes.filter((node: any) => {
            if (node.type === 'thread') {
                return selectedThreadIds.has(node.data.label);
            }
            if (node.parentId) {
                // Children of a thread group: visible only if the parent thread is visible
                const parentNode = groupedNodes.find((n: any) => n.id === node.parentId && n.type === 'thread');
                if (parentNode) {
                    return selectedThreadIds.has(parentNode.data.label);
                }
            }
            return true;
        });

        const visibleNodeIds = new Set(filteredNodes.map((n: any) => n.id));

        const filteredEdges = groupedEdges.filter((edge: any) => {
            return visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target);
        });

        /* ── Step 3: Map to React Flow format ──────────────────── */
        const rfNodes = filteredNodes.map((n: any) => ({
            id: n.id,
            type: n.type || 'component',
            position: n.position || { x: 0, y: 0 },
            data: n.data || {},
            ...(n.parentId ? { parentId: n.parentId, extent: 'parent' as const } : {}),
        }));

        const rfEdges = filteredEdges.map((e: any) => ({
            id: e.id || `e-${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
            ...(e.type ? { type: e.type } : {}),
            ...(e.label ? { label: e.label } : {}),
            ...(e.animated ? { animated: e.animated } : {}),
            style: e.style || undefined,
            data: e.data || undefined,
        }));

        /* ── Step 4: Layout ────────────────────────────────────── */
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges, 'TB');
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

    }, [rawGraph, selectedThreadIds]);

    return (
        <div style={{ width: '100%', height: '80vh', position: 'relative' }} className="border rounded-xl bg-white shadow-sm overflow-hidden">
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
