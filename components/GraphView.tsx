import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { NetworkIcon } from './Icons';

const noteLinkRegex = /\[\[([a-zA-Z0-9-]+)(?:\|.*?)?\]\]/g;

const GraphView: React.FC = () => {
    const { notes, setActiveNoteId } = useStoreContext();
    const { setView, theme } = useUIContext();
    const containerRef = useRef<HTMLDivElement>(null);
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

    const graphData = useMemo(() => {
        const nodes = notes.map(note => ({
            id: note.id,
            name: note.title || 'Untitled Note',
            val: 1, // Default size
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
    }, [notes]);

    const handleNodeClick = useCallback((node: any) => {
        setActiveNoteId(node.id);
        setView('NOTES');
    }, [setActiveNoteId, setView]);

    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D) => {
        const label = node.name;
        const fontSize = 12 / (node.k || 1); // Adjust font size on zoom
        ctx.font = `${fontSize}px Sans-Serif`;
        
        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
        ctx.fillStyle = theme === 'dark' ? '#60a5fa' : '#3b82f6'; // dark-primary / light-primary
        ctx.fill();

        // Node label
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme === 'dark' ? 'rgba(245, 245, 244, 0.8)' : 'rgba(24, 24, 27, 0.8)'; // dark-text / light-text
        ctx.fillText(label, node.x, node.y + 10);
    }, [theme]);

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
                    nodeLabel="name"
                    nodeCanvasObject={nodeCanvasObject}
                    linkColor={() => theme === 'dark' ? 'rgba(63, 63, 70, 0.5)' : 'rgba(212, 212, 216, 0.7)'}
                    linkWidth={1}
                    onNodeClick={handleNodeClick}
                    cooldownTicks={100}
                    onEngineStop={(fg) => fg.zoomToFit(400, 100)}
                />
            )}
        </div>
    );
};

export default GraphView;