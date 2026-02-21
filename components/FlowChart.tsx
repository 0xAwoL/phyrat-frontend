"use client"
import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, Controls, Background, MiniMap, Handle, Position, Panel, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { NodeSearch } from '@/components/node-search';
import { GroupNode } from '@/components/labeled-group-node';

const CustomNode = ({ data, id }: any) => {
    return (
        <div style={{ ...data.style, borderRadius: '8px', minWidth: '250px', border: `2px solid ${data.style.borderColor}` }} className="bg-white relative flex flex-col items-start text-xs text-left p-2 w-[250px] shadow-sm">
            <Handle type="target" position={Position.Top} className="opacity-0 w-full h-full absolute top-0 left-0 cursor-default" style={{ height: '5px', top: '-5px', width: '100%', borderRadius: 0, border: 'none', background: 'transparent' }} />
            <strong className="text-sm font-bold truncate block w-full border-b pb-1 mb-1" style={{ borderColor: data.style.borderColor }}>{data.name}</strong>
            {data.roles?.length > 0 && <span className="mb-1 bg-red-100 text-red-800 px-1 py-0.5 rounded flex w-full">🔒 {data.roles.join(', ')}</span>}
            {data.externalAPIs?.length > 0 && <span className="mb-1 text-green-700 truncate w-full block bg-green-50 px-1 py-0.5 rounded">🔌 {data.externalAPIs.length} APIs</span>}
            {data.stateHooks?.length > 0 && <span className="text-gray-500 truncate w-full block bg-gray-50 px-1 py-0.5 rounded">💾 {data.stateHooks.length} States</span>}

            {data.hasChildren && (
                <button
                    onClick={() => data.onToggle(id)}
                    className="mt-2 text-center w-full bg-slate-100 hover:bg-slate-200 transition-colors py-1.5 rounded text-slate-700 border border-slate-300 font-semibold cursor-pointer z-10 relative"
                >
                    {data.isExpanded ? 'Hide Diagram Children' : 'Show Diagram Children'}
                </button>
            )}
            <Handle type="source" position={Position.Bottom} className="opacity-0 w-full h-full absolute bottom-0 left-0 cursor-default" style={{ height: '5px', bottom: '-5px', width: '100%', borderRadius: 0, border: 'none', background: 'transparent' }} />
        </div>
    );
};

// Node wrapper to get ReactFlow instance context for Search
function FlowWithSearch({
    nodes, edges, nodeTypes, onNodesChange, onEdgesChange, rawGraph, setExpandedNodes, handleToggleNode
}: any) {
    const { fitView } = useReactFlow();

    const handleSearch = useCallback((searchString: string) => {
        if (!rawGraph) return [];
        return rawGraph.nodes.filter((n: any) =>
            n.name?.toLowerCase().includes(searchString.toLowerCase())
        ).map((n: any) => ({
            id: n.id,
            data: { label: n.name } // Adapt to command item
        }));
    }, [rawGraph]);

    const handleSelectNode = useCallback((searchNode: any) => {
        if (!rawGraph) return;

        // Ensure this node's path to root is expanded
        // Since we have a DAG, we can backtrack using edges
        const inEdges = new Map<string, string[]>();
        rawGraph.edges.forEach((e: any) => {
            if (!inEdges.has(e.target)) inEdges.set(e.target, []);
            inEdges.get(e.target)!.push(e.source);
        });

        const pathIds = new Set<string>();
        const queue = [searchNode.id];
        while (queue.length > 0) {
            const curr = queue.shift()!;
            pathIds.add(curr);
            const parents = inEdges.get(curr) || [];
            parents.forEach(p => {
                if (!pathIds.has(p)) queue.push(p);
            });
        }

        // Add to expanded state
        setExpandedNodes((prev: Set<string>) => {
            const next = new Set(prev);
            // In the tree, node IDs are constructed as `parentId_childId`.
            // Expanding just the raw node IDs might not match treeNodeIds precisely depending on the depth, 
            // but we'll approximate expanding any treeNodeId that ends with the requested path segments.
            // Wait, for exact tree expansion we should just expand everything in the path manually. 
            // This is complex so let's just expand all currently visible nodes that map to these parents.
            // But we actually just need to mark them as expanded. We'll add the raw IDs to a set, 
            // and in buildTree, we can check if `expandedNodes.has(nodeId)`.
            pathIds.forEach(id => next.add(id));
            return next;
        });

        // Small delay to allow react flow to layout the newly expanded tree before focusing
        setTimeout(() => {
            // Find a rendered node whose id ends with or is the requested id
            const targetRenderedId = nodes.find((n: any) => n.id === searchNode.id || n.id.endsWith(`_${searchNode.id}`))?.id;
            if (targetRenderedId) {
                fitView({ nodes: [{ id: targetRenderedId }], duration: 800 });
            }
        }, 100);

    }, [rawGraph, setExpandedNodes, fitView, nodes]);

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

const nodeTypes = { custom: CustomNode, labeledGroupNode: GroupNode };

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

        // Dagre computes center global coordinates. We need to translate to React Flow top-left.
        let x = nodeWithPosition.x - nodeWithPosition.width / 2;
        let y = nodeWithPosition.y - nodeWithPosition.height / 2;

        if (node.parentId) {
            const parentWithPosition = dagreGraph.node(node.parentId);
            const parentX = parentWithPosition.x - parentWithPosition.width / 2;
            const parentY = parentWithPosition.y - parentWithPosition.height / 2;

            // React Flow requires child node positions to be relative to the parent
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

export default function FlowChart() {
    const [rawGraph, setRawGraph] = useState<{ nodes: any[], edges: any[] } | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const [nodes, setNodes] = useState<any[]>([]);
    const [edges, setEdges] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const onNodesChange = useCallback(
        (changes: any) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot) as any),
        [],
    );
    const onEdgesChange = useCallback(
        (changes: any) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot) as any),
        [],
    );

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);

                if (!json.nodes || !json.edges) {
                    alert("Invalid logic-graph.json format");
                    setLoading(false);
                    return;
                }

                // Filter out isolated nodes (nodes not connected to any edges)
                const connectedNodeIds = new Set<string>();
                json.edges.forEach((e: any) => {
                    connectedNodeIds.add(e.source);
                    connectedNodeIds.add(e.target);
                });
                json.nodes = json.nodes.filter((n: any) => connectedNodeIds.has(n.id));

                setRawGraph(json);

                // Find roots to automatically expand them at depth 0
                const inDegrees = new Map<string, number>();
                json.nodes.forEach((n: any) => inDegrees.set(n.id, 0));
                json.edges.forEach((e: any) => {
                    inDegrees.set(e.target, (inDegrees.get(e.target) || 0) + 1);
                });

                let roots = json.nodes.filter((n: any) => n.name && n.name.includes('page.tsx'));
                if (roots.length === 0) {
                    roots = json.nodes.filter((n: any) => inDegrees.get(n.id) === 0);
                }
                if (roots.length === 0 && json.nodes.length > 0) roots = [json.nodes[0]];

                const initials = new Set<string>();
                roots.forEach((r: any) => initials.add(r.id));
                setExpandedNodes(initials);

                setLoading(false);

            } catch (err) {
                alert("Error parsing JSON file");
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleToggleNode = useCallback((id: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    useEffect(() => {
        if (!rawGraph) return;

        const { nodes: rawNodes, edges: rawEdges } = rawGraph;

        const nodeMap = new Map(rawNodes.map((n: any) => [n.id, n]));
        const outEdges = new Map<string, any[]>();
        const inDegrees = new Map<string, number>();

        rawNodes.forEach((n: any) => inDegrees.set(n.id, 0));

        rawEdges.forEach((e: any) => {
            if (!outEdges.has(e.source)) outEdges.set(e.source, []);
            outEdges.get(e.source)!.push(e);
            inDegrees.set(e.target, (inDegrees.get(e.target) || 0) + 1);
        });

        // Find root nodes: prefer node.isRoot explicitly set by AST analyzer, otherwise fallback to page.tsx or in-degree 0
        let roots = rawNodes.filter((n: any) => n.isRoot === true);
        if (roots.length === 0) {
            roots = rawNodes.filter((n: any) => n.name && n.name.includes('page.tsx'));
            if (roots.length === 0) {
                roots = rawNodes.filter((n: any) => inDegrees.get(n.id) === 0);
            }
        }
        if (roots.length === 0 && rawNodes.length > 0) roots = [rawNodes[0]];

        const rfNodes: any[] = [];
        const rfEdges: any[] = [];
        const activeGroups = new Set<string>();

        // A hard limit to prevent the browser from freezing if expanded too deep
        let nodeCount = 0;
        const MAX_NODES = 500;

        const buildTree = (nodeId: string, parentTreeId: string | null, path: Set<string>) => {
            if (nodeCount > MAX_NODES) return;
            const node = nodeMap.get(nodeId);
            if (!node) return;

            const treeNodeId = parentTreeId ? `${parentTreeId}_${nodeId}` : nodeId;

            // Determine Group based on the first directory of the file path
            // e.g. "app/dashboard/page.tsx" -> "app"
            // e.g. "components/ui/button.tsx" -> "components"
            let groupDir = null;
            if (node.name && node.name.includes('/')) {
                const parts = node.name.split('/');
                if (parts.length > 1) {
                    groupDir = parts[0];
                }
            }

            if (groupDir && !activeGroups.has(groupDir)) {
                activeGroups.add(groupDir);
                rfNodes.push({
                    id: `group_${groupDir}`,
                    type: 'labeledGroupNode',
                    data: { label: groupDir.toUpperCase() },
                });
            }

            let bgColor = '#fff3e0'; // Component Orange
            let borderColor = '#e65100';

            if (node.roles?.length > 0) {
                bgColor = '#ffebee'; // Role Red
                borderColor = '#b71c1c';
            } else if (node.externalAPIs?.length > 0) {
                bgColor = '#e8f5e9'; // API Green
                borderColor = '#1b5e20';
            } else if (node.name && node.name.includes('page.tsx')) {
                bgColor = '#e0f2fe'; // Page Blue
                borderColor = '#0284c7';
            }

            const childrenEdges = outEdges.get(nodeId) || [];
            const nonCycleChildren = childrenEdges.filter(e => !path.has(e.target));
            const hasChildren = nonCycleChildren.length > 0;
            // Also expand if the generic raw ID is in expandedNodes (from Search zoom)
            const isExpanded = expandedNodes.has(treeNodeId) || expandedNodes.has(nodeId);

            rfNodes.push({
                id: treeNodeId,
                type: 'custom',
                parentId: groupDir ? `group_${groupDir}` : undefined,
                extent: groupDir ? 'parent' : undefined,
                data: {
                    ...node,
                    hasChildren,
                    isExpanded,
                    onToggle: handleToggleNode,
                    style: {
                        background: bgColor,
                        borderColor: borderColor,
                    }
                }
            });
            nodeCount++;

            if (parentTreeId) {
                rfEdges.push({
                    id: `e-${parentTreeId}-${treeNodeId}`,
                    source: parentTreeId,
                    target: treeNodeId,
                    animated: true,
                    type: 'smoothstep',
                    style: { stroke: '#94a3b8', strokeWidth: 2 }
                });
            }

            // ONLY process children if explicitly expanded
            if (isExpanded && hasChildren) {
                nonCycleChildren.forEach(e => {
                    const targetId = e.target;
                    buildTree(targetId, treeNodeId, new Set([...path, targetId]));
                });
            }
        };

        roots.forEach((root: any) => buildTree(root.id, null, new Set([root.id])));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges, 'TB');

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

    }, [rawGraph, expandedNodes, handleToggleNode]);

    return (
        <div style={{ width: '100%', height: '80vh', position: 'relative' }} className="border rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="absolute z-10 top-4 left-4 bg-white/90 p-4 rounded-xl shadow border backdrop-blur">
                <h2 className="text-lg font-bold mb-2">Frontend Tree Logic Graph</h2>
                <p className="text-sm text-gray-500 mb-4">Upload `.brain/logic-graph.json` to visualize.</p>
                <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
            </div>
            {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20">Loading Tree Layout...</div>}

            <ReactFlowProvider>
                <FlowWithSearch
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    rawGraph={rawGraph}
                    setExpandedNodes={setExpandedNodes}
                    handleToggleNode={handleToggleNode}
                />
            </ReactFlowProvider>
        </div>
    );
}