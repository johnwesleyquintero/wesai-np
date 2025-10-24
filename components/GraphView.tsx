import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { NetworkIcon } from './Icons';

const noteLinkRegex = /\[\[([a-zA-Z0-9-]+)(?:\|.*?)?\]\]/g;

const Legend: React.FC = () => (
    <div className="absolute bottom-4 right-4 bg-light-ui/80 dark:bg-dark-ui/80 backdrop-blur-sm p-3 rounded-lg text-xs text-light-text dark:text-dark-text border border-light-border dark:border-dark-border shadow-lg">
        <h4 className="font-bold mb-2">Legend</h4>
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-light-primary dark:bg-dark-primary"></div>
            <span>Note</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
            <div className="w-3 h-3 rounded-full bg-light-primary dark:bg-dark-primary"></div>
            <span>"Hot Topic" Note (larger)</span>
        </div>
         <div className="flex items-center gap-2 mt-1">
             <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0"><path d="M0 6 L10 6" stroke="currentColor" strokeWidth="1.5"/><path d="M7 3 L10 6 L7 9" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
            <span>Link Direction</span>
        </div>
    </div>
);


const GraphView: React.FC = () => {
    const { notes, setActiveNoteId, getTrendAnalytics } = useStoreContext();
    const { setView, theme } = useUIContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [hotTopics, setHotTopics] = useState<any[]>([]);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    useEffect(() => {
        getTrendAnalytics().then(data => {
            setHotTopics(data.hotTopics || []);
        });
    }, [getTrendAnalytics, notes]);

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
        const resizeObserver = new ResizeObserver(handleResize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        return () => resizeObserver.disconnect();
    }, []);

    const graphData = useMemo(() => {
        const scoreMap = new Map(hotTopics.map(t => [t.noteId, t.score]));
        
        const nodes = notes.map(note => ({
            id: note.id,
            name: note.title || 'Untitled Note',
            val: 4 + (scoreMap.get(note.id) || 0) * 2, // Base size 4, hot topics are larger
        }));

        const links: { source: string, target: string }[] = [];
        const noteIds = new Set(notes.map(n => n.id));

        notes.forEach(note => {
            const matches = [...note.content.matchAll(noteLinkRegex)];
            matches.forEach(match => {
                const targetId = match[1];
                if (note.id !== targetId && noteIds.has(targetId)) {
                    links.push({ source: note.id, target: targetId });
                }
            });
        });

        return { nodes, links };
    }, [notes, hotTopics]);

    const { highlightNodes, highlightLinks } = useMemo(() => {
        const highlightNodes = new Set<string>();
        const highlightLinks = new Set<object>();

        if (hoveredNode) {
            highlightNodes.add(hoveredNode);
            graphData.links.forEach(link => {
                // FIX: Handle cases where react-force-graph mutates source/target from string ID to a node object.
                const source = link.source as any;
                const target = link.target as any;
                const sourceId = source.id ?? source;
                const targetId = target.id ?? target;

                if (sourceId === hoveredNode || targetId === hoveredNode) {
                    highlightLinks.add(link);
                    highlightNodes.add(sourceId);
                    highlightNodes.add(targetId);
                }
            });
        }
        return { highlightNodes, highlightLinks };
    }, [hoveredNode, graphData.links]);

    const handleNodeClick = useCallback((node: any) => {
        setActiveNoteId(node.id);
        setView('NOTES');
    }, [setActiveNoteId, setView]);
    
    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.name;
        const fontSize = 12 / globalScale;
        const size = node.val;

        const isHovered = node.id === hoveredNode;
        const isHighlighted = highlightNodes.has(node.id);
        const isDimmed = hoveredNode && !isHighlighted;

        // Glow for hovered node
        if (isHovered) {
            ctx.shadowColor = theme === 'dark' ? '#60a5fa' : '#3b82f6';
            ctx.shadowBlur = 20;
        }

        // Main node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
        ctx.fillStyle = isDimmed 
            ? (theme === 'dark' ? 'rgba(63, 63, 70, 0.2)' : 'rgba(203, 213, 225, 0.4)')
            : (theme === 'dark' ? '#60a5fa' : '#3b82f6');
        ctx.fill();

        ctx.shadowColor = 'transparent'; // Reset shadow

        // Node label
        if (isHighlighted && fontSize > 4) {
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = theme === 'dark' ? 'rgba(245, 245, 244, 0.9)' : 'rgba(24, 24, 27, 0.9)';
            ctx.fillText(label, node.x, node.y + size + fontSize);
        }
    }, [hoveredNode, highlightNodes, theme]);

    if (notes.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-light-text/60 dark:text-dark-text/60 p-4">
                <NetworkIcon className="w-16 h-16 mb-4" />
                <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">Your Knowledge Graph is Empty</h2>
                <p className="mt-1">Create some notes and link them together using `[[...]]` syntax to see your ideas connect.</p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex-1 w-full h-full relative bg-light-background dark:bg-dark-background">
            {dimensions.width > 0 && (
                <ForceGraph2D
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={graphData}
                    nodeCanvasObject={nodeCanvasObject}
                    linkColor={link => (highlightLinks.has(link) || !hoveredNode) 
                        ? (theme === 'dark' ? 'rgba(96, 165, 250, 0.6)' : 'rgba(59, 130, 246, 0.6)') 
                        : (theme === 'dark' ? 'rgba(63, 63, 70, 0.15)' : 'rgba(212, 212, 216, 0.25)')
                    }
                    linkWidth={link => (highlightLinks.has(link) || !hoveredNode) ? 1.5 : 0.5}
                    linkDirectionalArrowLength={3.5}
                    linkDirectionalArrowRelPos={1}
                    onNodeClick={handleNodeClick}
                    onNodeHover={node => setHoveredNode(node ? (node.id as string) : null)}
                    cooldownTicks={100}
                    onEngineStop={(fg) => fg.zoomToFit(400, 100)}
                />
            )}
            <Legend />
        </div>
    );
};

export default GraphView;
