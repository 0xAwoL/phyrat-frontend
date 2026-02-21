"use client"
import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, Controls, Background, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction, nodesep: 150, ranksep: 200, edgesep: 50 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 250, height: 100 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const newNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',
            position: {
                x: nodeWithPosition.x - 250 / 2,
                y: nodeWithPosition.y - 100 / 2,
            },
        };
    });

    return { nodes: newNodes, edges };
};

export default function FlowChart() {
    const [nodes, setNodes] = useState<any[]>([]);
    const [edges, setEdges] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const onNodesChange = useCallback(
        (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot) as any),
        [],
    );
    const onEdgesChange = useCallback(
        (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot) as any),
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
                    return;
                }

                // Map Brain Engine JSON to ReactFlow format
                const rfNodes = json.nodes.map((n: any) => {
                    let bgColor = '#fff3e0'; // Component Orange
                    let borderColor = '#e65100';

                    if (n.roles?.length > 0) {
                        bgColor = '#ffebee'; // Role Red
                        borderColor = '#b71c1c';
                    } else if (n.externalAPIs?.length > 0) {
                        bgColor = '#e8f5e9'; // API Green
                        borderColor = '#1b5e20';
                    }

                    return {
                        id: n.id,
                        data: {
                            label: (
                                <div className="flex flex-col items-start text-xs text-left p-2 w-[220px]">
                                    <strong className="text-sm font-bold truncate block w-full border-b pb-1 mb-1" style={{ borderColor }}>{n.name}</strong>
                                    {n.roles?.length > 0 && <span className="mb-1 bg-red-100 text-red-800 px-1 py-0.5 rounded flex w-full">🔒 {n.roles.join(', ')}</span>}
                                    {n.externalAPIs?.length > 0 && <span className="mb-1 text-green-700 truncate w-full block">🔌 {n.externalAPIs.length} APIs</span>}
                                    {n.stateHooks?.length > 0 && <span className="text-gray-500 truncate w-full block">💾 {n.stateHooks.length} States</span>}
                                </div>
                            )
                        },
                        style: {
                            background: bgColor,
                            border: `2px solid ${borderColor}`,
                            borderRadius: '8px',
                            minWidth: '250px'
                        }
                    };
                });

                const rfEdges = json.edges.map((e: any, idx: number) => ({
                    id: `e${idx}-${e.source}-${e.target}`,
                    source: e.source,
                    target: e.target,
                    animated: true,
                    label: e.type,
                    type: 'smoothstep',
                    style: { stroke: '#94a3b8', strokeWidth: 2 }
                }));

                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges, 'TB');

                setNodes(layoutedNodes);
                setEdges(layoutedEdges);
                setLoading(false);

            } catch (err) {
                alert("Error parsing JSON file");
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div style={{ width: '100%', height: '80vh', position: 'relative' }} className="border rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="absolute z-10 top-4 left-4 bg-white/90 p-4 rounded-xl shadow border backdrop-blur">
                <h2 className="text-lg font-bold mb-2">Frontend Logic Graph</h2>
                <p className="text-sm text-gray-500 mb-4">Upload `.brain/logic-graph.json` to visualize the Next.js AST.</p>
                <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
            </div>
            {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20">Loading Graph...</div>}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                minZoom={0.1}
            >
                <Background />
                <Controls />
                <MiniMap />
            </ReactFlow>
        </div>
    );
}