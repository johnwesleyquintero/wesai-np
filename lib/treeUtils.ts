
import { Note, Collection, TreeNode } from '../types';

export const buildTree = (notes: Note[], collections: Collection[]): TreeNode[] => {
    const noteMap = new Map(notes.map(note => [note.id, { ...note, children: [] as TreeNode[] }]));
    const collectionMap = new Map(collections.map(c => [c.id, { ...c, type: 'collection' as const, children: [] as TreeNode[] }]));
    const tree: TreeNode[] = [];
    const allItemsMap: Map<string, TreeNode> = new Map([...noteMap, ...collectionMap] as [string, TreeNode][]);
    
    allItemsMap.forEach(item => {
        if (item.parentId === null) tree.push(item);
        else {
            const parent = collectionMap.get(item.parentId);
            if (parent) parent.children.push(item);
            else tree.push(item);
        }
    });

    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            const aIsCollection = 'type' in a && a.type === 'collection';
            const bIsCollection = 'type' in b && b.type === 'collection';
            if (aIsCollection && !bIsCollection) return -1;
            if (!aIsCollection && bIsCollection) return 1;
            const aName = aIsCollection ? (a as any).name : (a as any).title;
            const bName = bIsCollection ? (b as any).name : (b as any).title;
            return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
        });
        nodes.forEach(node => {
            if ('children' in node && node.children.length > 0) sortNodes(node.children);
        });
    };
    
    sortNodes(tree);
    return tree;
};

/**
 * Recursively determines which nodes should be visible in the sidebar based on 
 * search state and expansion state.
 */
export const getVisibleNodes = (
    nodes: TreeNode[], 
    searchData: { isSearching: boolean; visibleIds: Set<string> | null },
    expandedFolders: Record<string, boolean>
): string[] => {
    let ids: string[] = [];
    for (const node of nodes) {
        if (searchData.isSearching && searchData.visibleIds && !searchData.visibleIds.has(node.id)) {
            continue;
        }
        ids.push(node.id);
        const isCollection = 'name' in node;
        const isExpanded = searchData.isSearching || (expandedFolders[node.id] ?? true);
        if (isCollection && isExpanded) {
            ids = ids.concat(getVisibleNodes(node.children, searchData, expandedFolders));
        }
    }
    return ids;
};
