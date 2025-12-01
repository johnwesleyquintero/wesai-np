
import React, { useCallback, useRef, useEffect, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods, LinkObject as Link } from 'react-force-graph-2d';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { GraphIcon } from './Icons';
import { useToast } from '../context/ToastContext';
import NotePreviewPopover from './graph/NotePreviewPopover';
import { useGraphData, GraphNode } from '../hooks/useGraphData';
import { useGraphInteractions } from '../hooks/useGraphInteractions';

const GraphView: React.FC = () => {
    const { notes, setActiveNoteId, updateNote } = useStoreContext();
    const { setView, theme } = useUIContext();
    const { showToast } = useToast();
    const containerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<ForceGraphMethods | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const { graphData, neighborsMap, hotNodeId } = useGraphData(notes);

    const {
        hoveredNode,
        selectedNodes,
        neighbors,
        highlightedLinks,
        isLinkingMode,
        linkSourceNode,
        previewNode,
        handleNodeClick,
        handleBackgroundClick,
        handleNodeDragStart,
        handleNodeDragEnd,
        handleNodeHover,
        handleEngineStop
    } = useGraphInteractions({
        fgRef,
        notes,
        graphData,
        neighborsMap,
        setActiveNoteId,
        setView,
        updateNote,
        showToast
    });

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
    
    // Manage Cursor Style based on Linking Mode
    useEffect(() => {
        if (containerRef.current) {
            // Priority: hovered -> linking mode
            const cursor = hoveredNode ? (isLinkingMode ? 'crosshair' : 'pointer') : (isLinkingMode ? 'crosshair' : 'grab');
            containerRef.current.style.cursor = cursor;
        }
    }, [isLinkingMode, hoveredNode]);

    // Enhanced Engine Stop to handle initial hot node centering
    const enhancedEngineStop = useCallback(() => {
        if (selectedNodes.size > 0) return;

        if (hotNodeId && fgRef.current) {
            const hotNode = graphData.nodes.find(n => n.id === hotNodeId);
            if (hotNode && typeof hotNode.x === 'number' && typeof hotNode.y === 'number') {
                fgRef.current.centerAt(hotNode.x, hotNode.y, 1000);
                fgRef.current.zoom(4, 500);
                return;
            }
        }
        handleEngineStop();
    }, [handleEngineStop, hotNodeId, graphData.nodes, selectedNodes]);
    
    const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        if (node.x === undefined || node.y === undefined) return;
        
        const isSelected = selectedNodes.has(node.id as string);
        const isNeighbor = neighbors.has(node.id as string);
        const isDimmed = selectedNodes.size > 0 && !isSelected && !isNeighbor;
        const isHovered = hoveredNode?.id === node.id;
        const isInitialHot = !selectedNodes.size && hotNodeId === node.id;
        
        const label = node.name;
        const fontSize = 12 / globalScale;
        const nodeRadius = 3 + Math.log2(node.val || 1) * (isSelected ? 1.5 : 1);
        
        // Monochrome colors
        const nodeColor = theme === 'dark' ? '#fafafa' : '#18181b'; // Zinc-50 / Zinc-950
        const selectedColor = '#facc15'; // yellow-400 (keep accent for selection)
        const labelColor = theme === 'dark' ? 'rgba(248, 250, 252, 0.8)' : 'rgba(2, 6, 23, 0.8)';
        
        ctx.globalAlpha = isDimmed ? 0.1 : 1;
        
        // Halo for hovered or initial hot node
        if (!isDimmed && (isHovered || isInitialHot)) {
            const haloRadius = nodeRadius + 4 / globalScale;
            ctx.beginPath();
            ctx.arc(node.x, node.y, haloRadius, 0, 2 * Math.PI, false);
            // Subtle halo
            ctx.fillStyle = isSelected ? 'rgba(250, 204, 21, 0.2)' : (theme === 'dark' ? 'rgba(250, 250, 250, 0.2)' : 'rgba(24, 24, 27, 0.2)');
            ctx.fill();
        }

        // Main node circle
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
    }, [theme, selectedNodes, neighbors, hoveredNode, hotNodeId]);
    
    const linkColor = useCallback((link: Link<GraphNode>) => {
        const isDimmed = selectedNodes.size > 0 && !highlightedLinks.has(link);
        return isDimmed ? 'rgba(128, 128, 128, 0.05)' : (theme === 'dark' ? 'rgba(82, 82, 91, 0.5)' : 'rgba(161, 161, 170, 0.7)'); // Zinc colors
    }, [highlightedLinks, selectedNodes, theme]);
    
    const onRenderFramePost = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
        if (!linkSourceNode || !fgRef.current) return;
        
        const { x, y } = (fgRef.current as any).graph2ScreenCoords(linkSourceNode.x || 0, linkSourceNode.y || 0);
        const mousePos = (fgRef.current as any).getPointerPosition();
        if (!mousePos || mousePos.x === undefined || mousePos.y === undefined) return;
        const { x: mouseX, y: mouseY } = mousePos;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(mouseX, mouseY);
        ctx.setLineDash([8, 4]);
        ctx.strokeStyle = theme === 'dark' ? 'rgba(250, 250, 250, 0.5)' : 'rgba(24, 24, 27, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
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
            {previewNode && (
                <NotePreviewPopover 
                    note={previewNode.note} 
                    position={previewNode.pos}
                />
            )}
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
                    onBackgroundClick={handleBackgroundClick}
                    onNodeDrag={handleNodeDragStart}
                    onNodeDragEnd={handleNodeDragEnd}
                    onNodeHover={handleNodeHover}
                    cooldownTicks={100}
                    onEngineStop={enhancedEngineStop}
                    onRenderFramePost={onRenderFramePost}
                />
            )}
        </div>
    );
};

export default GraphView;
