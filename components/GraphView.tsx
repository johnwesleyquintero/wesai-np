
import React, { useCallback, useRef, useEffect, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { GraphIcon } from './Icons';
import { useToast } from '../context/ToastContext';
import NotePreviewPopover from './graph/NotePreviewPopover';
import { useGraphData } from '../hooks/useGraphData';
import { useGraphInteractions } from '../hooks/useGraphInteractions';
import { useGraphRendering } from '../hooks/useGraphRendering';

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

    const { nodeCanvasObject, linkColor, onRenderFramePost } = useGraphRendering({
        theme,
        selectedNodes,
        neighbors,
        highlightedLinks,
        hoveredNode,
        hotNodeId,
        linkSourceNode,
        fgRef
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
