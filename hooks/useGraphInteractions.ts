import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ForceGraphMethods, LinkObject as Link } from 'react-force-graph-2d';
import { GraphNode } from './useGraphData';
import { Note } from '../types';

interface UseGraphInteractionsProps {
    fgRef: React.MutableRefObject<ForceGraphMethods | null>;
    notes: Note[];
    graphData: { nodes: GraphNode[]; links: Link<GraphNode>[] };
    neighborsMap: Map<string, Set<string>>;
    setActiveNoteId: (id: string) => void;
    setView: (view: any) => void;
    updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
    showToast: (options: { message: string; type: 'success' | 'error' }) => void;
}

export const useGraphInteractions = ({
    fgRef,
    notes,
    graphData,
    neighborsMap,
    setActiveNoteId,
    setView,
    updateNote,
    showToast
}: UseGraphInteractionsProps) => {
    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
    const [selectedNodes, setSelectedNodes] = useState(new Set<string>());
    const [neighbors, setNeighbors] = useState(new Set<string>());
    const [highlightedLinks, setHighlightedLinks] = useState(new Set<Link<GraphNode>>());
    const [isLinkingMode, setIsLinkingMode] = useState(false);
    const [linkSourceNode, setLinkSourceNode] = useState<GraphNode | null>(null);
    const [previewNode, setPreviewNode] = useState<{ note: Note; pos: { x: number; y: number } } | null>(null);
    
    const hoverTimeoutRef = useRef<number | null>(null);
    const clickTimeoutRef = useRef<number | null>(null);
    const lastClickedNodeRef = useRef<GraphNode | null>(null);

    // Keyboard listeners for Linking Mode
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

    const clearPreview = useCallback(() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setPreviewNode(null);
    }, []);

    const handleNodeDoubleClick = useCallback((node: GraphNode) => {
        clearPreview();
        setActiveNoteId(node.id as string);
        setView('NOTES');
    }, [setActiveNoteId, setView, clearPreview]);

    const handleSingleClick = useCallback((node: GraphNode) => {
        clearPreview();
        if (isLinkingMode) return;

        if (selectedNodes.has(node.id as string) && selectedNodes.size === 1) {
            setSelectedNodes(new Set());
            setNeighbors(new Set());
            setHighlightedLinks(new Set());
            return;
        }

        const newSelected = new Set([node.id as string]);
        setSelectedNodes(newSelected);
        setNeighbors(neighborsMap.get(node.id as string) || new Set());

        const newHighlightedLinks = new Set<Link<GraphNode>>();
        graphData.links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target;
            if (sourceId === node.id || targetId === node.id) {
                newHighlightedLinks.add(link);
            }
        });
        setHighlightedLinks(newHighlightedLinks);

        if (node.x !== undefined && node.y !== undefined) {
            fgRef.current?.centerAt(node.x, node.y, 1000);
            fgRef.current?.zoom(4, 500);
        }
    }, [selectedNodes, neighborsMap, graphData.links, clearPreview, isLinkingMode, fgRef]);

    const handleNodeClick = useCallback((node: GraphNode) => {
        if (clickTimeoutRef.current && lastClickedNodeRef.current?.id === node.id) {
            // Double click logic
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            lastClickedNodeRef.current = null;
            handleNodeDoubleClick(node);
        } else {
            // Single click logic with debounce
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
            }
            lastClickedNodeRef.current = node;
            clickTimeoutRef.current = window.setTimeout(() => {
                handleSingleClick(node);
                clickTimeoutRef.current = null;
                lastClickedNodeRef.current = null;
            }, 250);
        }
    }, [handleSingleClick, handleNodeDoubleClick]);

    const handleBackgroundClick = useCallback(() => {
        clearPreview();
        setSelectedNodes(new Set());
        setNeighbors(new Set());
        setHighlightedLinks(new Set());
        fgRef.current?.zoomToFit(400, 100);
    }, [clearPreview, fgRef]);

    const handleNodeDragStart = useCallback((node: GraphNode) => {
        clearPreview();
        if (isLinkingMode) {
            setLinkSourceNode(node);
        }
    }, [isLinkingMode, clearPreview]);

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
        clearPreview();
        setHoveredNode(node);

        if (node && fgRef.current) {
            hoverTimeoutRef.current = window.setTimeout(() => {
                const fullNote = notes.find(n => n.id === node.id);
                // ForceGraph sometimes returns incomplete node objects in hover events,
                // but usually it works. We need to ensure we have coordinates.
                const nodeWithCoords = node as any; 
                if (fullNote && typeof nodeWithCoords.x === 'number' && typeof nodeWithCoords.y === 'number') {
                    // Coordinates need to be mapped to screen space
                    const { x, y } = fgRef.current!.graph2ScreenCoords(nodeWithCoords.x, nodeWithCoords.y);
                    setPreviewNode({ note: fullNote, pos: { x, y } });
                }
            }, 300);
        }
    }, [notes, clearPreview, fgRef]);

    const handleEngineStop = useCallback(() => {
        // Just a pass-through or basic zoom reset if no selection
        const fg = fgRef.current;
        if (!fg || selectedNodes.size > 0) return;
        fg.zoomToFit(400, 100);
    }, [selectedNodes, fgRef]);

    return {
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
    };
};