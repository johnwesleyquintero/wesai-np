
import { useCallback } from 'react';
import { ForceGraphMethods, LinkObject as Link } from 'react-force-graph-2d';
import { GraphNode } from './useGraphData';

interface UseGraphRenderingProps {
    theme: 'light' | 'dark';
    selectedNodes: Set<string>;
    neighbors: Set<string>;
    highlightedLinks: Set<Link<GraphNode>>;
    hoveredNode: GraphNode | null;
    hotNodeId: string | null;
    linkSourceNode: GraphNode | null;
    fgRef: React.MutableRefObject<ForceGraphMethods | null>;
}

export const useGraphRendering = ({
    theme,
    selectedNodes,
    neighbors,
    highlightedLinks,
    hoveredNode,
    hotNodeId,
    linkSourceNode,
    fgRef
}: UseGraphRenderingProps) => {

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
        
        // Neural Glow (Dark Mode only)
        if (theme === 'dark' && !isDimmed) {
            ctx.shadowBlur = isSelected ? 15 : 8;
            ctx.shadowColor = isSelected ? 'rgba(250, 204, 21, 0.6)' : 'rgba(250, 250, 250, 0.3)';
        } else {
            ctx.shadowBlur = 0;
        }
        
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
        
        // Reset Shadow for text
        ctx.shadowBlur = 0;

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
    }, [linkSourceNode, theme, fgRef]);

    return { nodeCanvasObject, linkColor, onRenderFramePost };
};
