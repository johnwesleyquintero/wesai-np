import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
// FIX: Import `LinkObject` as `Link` as `Link` is not an exported member.
import ForceGraph2D, { ForceGraphMethods, LinkObject as Link, NodeObject } from 'react-force-graph-2d';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { GraphIcon } from './Icons';
import { useToast } from '../context/ToastContext';

const noteLinkRegex = /\[\[([a-zA-Z0-9-]+)(?:\|.*?)?\]\]/g;

type GraphNode = NodeObject & {
    id: string;
    name: string;
    val: number;
};

const GraphView: React.FC = () => {
    const { notes, setActiveNoteId, updateNote } = useStoreContext();
    const { setView, theme } = useUIContext();
    const { showToast } = useToast();
    const containerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<ForceGraphMethods | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
    const [selectedNodes, setSelectedNodes] = useState(new Set<string>());
    const [neighbors, setNeighbors] = useState(new Set<string>());
    const [highlightedLinks, setHighlightedLinks] = useState(new Set<Link>());
    const [isLinkingMode, setIsLinkingMode] = useState(false);
    const [linkSourceNode, setLinkSourceNode] = useState<GraphNode | null>(null);

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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Alt') setIsLinkingMode(true);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Alt') {
                setIsLinkingMode(false);
                setLinkSourceNode(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);
    
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.style.cursor = isLinkingMode ? 'crosshair' : 'grab';
        }
    }, [isLinkingMode]);

    const { graphData, neighborsMap, hotNodeId } = useMemo(() => {
        const links: Link[] = [];
        const noteIds = new Set(notes.map(n => n.id));
        const degrees = new Map<string, number>();
        const neighborsMap = new Map<string, Set<string>>();

        notes.forEach(note => {
            degrees.set(note.id, 0);
            neighborsMap.set(note.id, new Set());
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

        links.forEach(({ source, target }) => {
            const sourceId = typeof source === 'object' ? source.id as string : source as string;
            const targetId = typeof target === 'object' ? target.id as string : target as string;
            neighborsMap.get(sourceId)?.add(targetId);
            neighborsMap.get(targetId)?.add(sourceId);
        });
        
        const nodes: GraphNode[] = notes.map(note => ({
            id: note.id,
            name: note.title || 'Untitled Note',
            val: (degrees.get(note.id) || 0) + 1,
        }));
        
        let hotNodeId: string | null = null;
        let maxDegree = 0;
        degrees.forEach((degree, nodeId) => {
            if (degree > maxDegree) {
                maxDegree = degree;
                hotNodeId = nodeId;
            }
        });

        return { graphData: { nodes, links }, neighborsMap, hotNodeId };
    }, [notes]);

    const handleNodeClick = useCallback((node: GraphNode) => {
        if (selectedNodes.has(node.id as string) && selectedNodes.size === 1) {
            setSelectedNodes(new Set());
            setNeighbors(new Set());
            setHighlightedLinks(new Set());
            return;
        }

        const newSelected = new Set([node.id as string]);
        setSelectedNodes(newSelected);
        setNeighbors(neighborsMap.get(node.id as string) || new Set());

        const newHighlightedLinks = new Set<Link>();
        graphData.links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            if (sourceId === node.id || targetId === node.id) {
                newHighlightedLinks.add(link);
            }
        });
        setHighlightedLinks(newHighlightedLinks);

        if (node.x !== undefined && node.y !== undefined) {
            fgRef.current?.centerAt(node.x, node.y, 1000);
            fgRef.current?.zoom(4, 500);
        }
    }, [selectedNodes, neighborsMap, graphData.links]);

    const handleNodeDoubleClick = useCallback((node: GraphNode) => {
        setActiveNoteId(node.id as string);
        setView('NOTES');
    }, [setActiveNoteId, setView]);

    const handleBackgroundClick = useCallback(() => {
        setSelectedNodes(new Set());
        setNeighbors(new Set());
        setHighlightedLinks(new Set());
        fgRef.current?.zoomToFit(400, 100);
    }, []);
    
    const handleNodeDragStart = useCallback((node: GraphNode) => {
        if (isLinkingMode) {
            setLinkSourceNode(node);
        }
    }, [isLinkingMode]);

    const handleNodeDragEnd = useCallback(async (node: GraphNode) => {
        if (isLinkingMode && linkSourceNode && hoveredNode && linkSourceNode.id !== hoveredNode.id) {
            const sourceNote = notes.find(n => n.id === linkSourceNode.id);
            if (sourceNote) {
                const linkText = `\n[[${hoveredNode.id}]]`;
                if (!sourceNote.content.includes(linkText.trim())) {
                    const newContent = `${sourceNote.content}${linkText}`;
                    try {
                        await updateNote(sourceNote.id, { content: newContent });
                        showToast({ message: `Linked to "${hoveredNode.name}"!`, type: 'success' });
                    } catch (err) {
                        showToast({ message: 'Failed to create link.', type: 'error' });
                    }
                }
            }
        }
        setLinkSourceNode(null);
    }, [isLinkingMode, linkSourceNode, hoveredNode, notes, updateNote, showToast]);

    const handleNodeHover = useCallback((node: GraphNode | null) => {
        setHoveredNode(node);
        if (containerRef.current) {
            containerRef.current.style.cursor = node ? (isLinkingMode ? 'crosshair' : 'pointer') : (isLinkingMode ? 'crosshair' : 'grab');
        }
    }, [isLinkingMode]);

    const handleEngineStop = useCallback(() => {
        const fg = fgRef.current;
        if (!fg || selectedNodes.size > 0) return;

        if (hotNodeId) {
            const hotNode = graphData.nodes.find(n => n.id === hotNodeId);
            if (hotNode && typeof hotNode.x === 'number' && typeof hotNode.y === 'number') {
                fg.centerAt(hotNode.x, hotNode.y, 1000);
                fg.zoom(4, 500);
                return;
            }
        }
        
        fg.zoomToFit(400, 100);

    }, [graphData, hotNodeId, selectedNodes]);
    
    const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        if (node.x === undefined || node.y === undefined) return;
        const isSelected = selectedNodes.has(node.id as string);
        const isNeighbor = neighbors.has(node.id as string);
        const isDimmed = selectedNodes.size > 0 && !isSelected && !isNeighbor;
        
        const label = node.name;
        const fontSize = 12 / globalScale;
        const nodeRadius = 3 + Math.log2(node.val || 1) * (isSelected ? 1.5 : 1);
        
        const nodeColor = theme === 'dark' ? '#22d3ee' : '#06b6d4';
        const selectedColor = '#facc15'; // yellow-400
        const labelColor = theme === 'dark' ? 'rgba(248, 250, 252, 0.8)' : 'rgba(2, 6, 23, 0.8)';
        
        ctx.globalAlpha = isDimmed ? 0.1 : 1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
        ctx.fillStyle = isSelected ? selectedColor : nodeColor;
        ctx.fill();

        if (!isDimmed) {
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = labelColor;
            ctx.fillText(label, node.x, node.y + nodeRadius + 8);
        }

        ctx.globalAlpha = 1;
    }, [theme, selectedNodes, neighbors]);
    
    const linkColor = useCallback((link: Link) => {
        const isDimmed = selectedNodes.size > 0 && !highlightedLinks.has(link);
        return isDimmed ? 'rgba(128, 128, 128, 0.05)' : (theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(203, 213, 225, 0.7)');
    }, [highlightedLinks, selectedNodes, theme]);
    
    const postRender = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
        if (!linkSourceNode || !fgRef.current) return;
        
        // FIX: Use correct methods (`graph2ScreenCoords`, `getPointerPosition`) and cast to 'any' to bypass incomplete type definitions.
        const { x, y } = (fgRef.current as any).graph2ScreenCoords(linkSourceNode.x || 0, linkSourceNode.y || 0);
        const mousePos = (fgRef.current as any).getPointerPosition();
        if (!mousePos || mousePos.x === undefined || mousePos.y === undefined) return;
        const { x: mouseX, y: mouseY } = mousePos;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = theme === 'dark' ? 'rgba(34, 211, 238, 0.5)' : 'rgba(6, 182, 212, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }, [linkSourceNode, theme]);

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
                    linkColor={linkColor}
                    linkWidth={link => highlightedLinks.has(link) ? 2 : 1}
                    onNodeClick={handleNodeClick}
                    // FIX: The correct prop name is `onNodeDblClick`.
                    onNodeDblClick={handleNodeDoubleClick}
                    onBackgroundClick={handleBackgroundClick}
                    onNodeDragStart={handleNodeDragStart}
                    onNodeDragEnd={handleNodeDragEnd}
                    onNodeHover={handleNodeHover}
                    cooldownTicks={100}
                    onEngineStop={handleEngineStop}
                    postRender={postRender}
                />
            )}
        </div>
    );
};

export default GraphView;
