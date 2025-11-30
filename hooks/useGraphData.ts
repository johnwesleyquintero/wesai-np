
import { useMemo } from 'react';
import { Note } from '../types';
import { NodeObject, LinkObject } from 'react-force-graph-2d';

const noteLinkRegex = /\[\[([a-zA-Z0-9-]+)(?:\|.*?)?\]\]/g;

export type GraphNode = NodeObject & {
    id: string;
    name: string;
    val: number;
    x?: number;
    y?: number;
};

export const useGraphData = (notes: Note[]) => {
    return useMemo(() => {
        const links: LinkObject<GraphNode>[] = [];
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
            const sourceId = typeof source === 'object' ? (source as GraphNode).id as string : source as string;
            const targetId = typeof target === 'object' ? (target as GraphNode).id as string : target as string;
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
};
