import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { GraphIcon } from './Icons';

const noteLinkRegex = /\[\[([a-zA-Z0-9-]+)(?:\|.*?)?\]\]/g;

// FIX: Define a type for graph nodes to include coordinates added by the physics engine.
type GraphNode = {
    id: string;
    name: string;
    val: number;
    x?: number;
    y?: number;
};

const GraphView: React.FC = () => {
    const { notes, setActiveNoteId } = useStoreContext();
    const { setView, theme } = useUIContext();
    const containerRef = useRef<HTMLDivElement>(null);
    // FIX: Initialize useRef with null for component refs.
    const fgRef = useRef<ForceGraphMethods | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight,
                });
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { graphData, hotNodeId } = useMemo(() => {
        const links: { source: string, target: string }[] = [];
        const noteIds = new Set(notes.map(n => n.id));
        const degrees = new Map<string, number>();

        notes.forEach(note => {
            degrees.set(note.id, 0); // Initialize all nodes with degree 0
            const matches = [...note.content.matchAll(noteLinkRegex)];
            matches.forEach(match => {
                const targetId = match[1];
                if (note.id !== targetId && noteIds.has(targetId)) {
                    links.push({ source: note.id, target: targetId });
                    degrees.set(note.id, (degrees.get(note.id) || 0) + 1);
                    degrees.set(targetId, (degrees.get(targetId) || 0) + 1);
                }
            });
        });
        
        const nodes: GraphNode[] = notes.map(note => ({
            id: note.id,
            name: note.title || 'Untitled Note',
            val: (degrees.get(note.id) || 0) + 1, // Node size based on connections
        }));
        
        let hotNodeId: string | null = null;
        let maxDegree = 0; // Start at 0 to only select nodes with at least one connection
        degrees.forEach((degree, nodeId) => {
            if (degree > maxDegree) {
                maxDegree = degree;
                hotNodeId = nodeId;
            }
        });

        return { graphData: { nodes, links }, hotNodeId };
    }, [notes]);

    const handleNodeClick = useCallback((node: GraphNode) => {
        setActiveNoteId(node.id);
        setView('NOTES');
    }, [setActiveNoteId, setView]);
    
    const handleEngineStop = useCallback(() => {
        const fg = fgRef.current;
        if (!fg) return;

        if (hotNodeId) {
            const hotNode = graphData.nodes.find(n => n.id === hotNodeId);
            // After engine stop, node positions are fixed
            if (hotNode && typeof hotNode.x === 'number' && typeof hotNode.y === 'number') {
                fg.centerAt(hotNode.x, hotNode.y, 1000); // 1-second transition
                fg.zoom(4, 500); // Zoom in
                return;
            }
        }
        
        // Fallback for no hot node or if something goes wrong
        fg.zoomToFit(400, 100);

    }, [graphData, hotNodeId]);

    const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        // FIX: Guard against undefined coordinates before drawing.
        if (node.x === undefined || node.y === undefined) return;

        const label = node.name;
        const fontSize = 12 / globalScale;
        const isHotNode = node.id === hotNodeId;

        const baseRadius = 3 + Math.log2(node.val || 1);
        const nodeRadius = isHotNode ? baseRadius * 1.5 : baseRadius;

        // Halo for hot node
        if (isHotNode) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeRadius + 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = theme === 'dark' ? 'rgba(34, 211, 238, 0.25)' : 'rgba(6, 182, 212, 0.25)'; // cyan-400 or cyan-500
            ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
        ctx.fillStyle = theme === 'dark' ? '#22d3ee' : '#06b6d4'; // cyan-400 or cyan-500
        ctx.fill();

        // Node label
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme === 'dark' ? 'rgba(248, 250, 252, 0.8)' : 'rgba(2, 6, 23, 0.8)';
        ctx.fillText(label, node.x, node.y + nodeRadius + 8);
    }, [theme, hotNodeId]);

    if (notes.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-light-text/60 dark:text-dark-text/60 p-4">
                <GraphIcon className="w-16 h-16 mb-4" />
                <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">Your Knowledge Graph is Empty</h2>
                <p className="mt-1">Create some notes and link them together using `[[...]]` syntax to see your ideas connect.</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex-1 w-full h-full relative bg-light-background dark:bg-dark-background">
            {dimensions.width > 0 && (
                <ForceGraph2D
                    ref={fgRef as any}
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={graphData}
                    nodeLabel="name"
                    nodeCanvasObject={nodeCanvasObject}
                    linkColor={() => theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(203, 213, 225, 0.7)'}
                    linkWidth={1}
                    onNodeClick={handleNodeClick}
                    cooldownTicks={100}
                    onEngineStop={handleEngineStop}
                />
            )}
        </div>
    );
};

export default GraphView;
