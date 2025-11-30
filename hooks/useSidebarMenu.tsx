
import React, { useCallback } from 'react';
import { Collection, Note, ContextMenuItem } from '../types';
import { 
    PencilSquareIcon, TrashIcon, FolderIcon, DocumentDuplicateIcon, 
    HashtagIcon, LinkIcon, ClipboardDocumentIcon 
} from '../components/Icons';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

export const useSidebarMenu = () => {
    const { 
        collections, notes, onAddNote, updateCollection, renameNoteTitle, 
        moveItem, copyNote, handleDeleteNoteConfirm, handleDeleteCollectionConfirm 
    } = useStoreContext();
    const { onOpenContextMenu, setRenamingItemId, showConfirmation } = useUIContext();
    const { showToast } = useToast();

    const handleContextMenu = useCallback((e: React.MouseEvent, node: Note | (Collection & { name: string }), onSelectNote: (id: string) => void) => {
        const isCollection = 'name' in node;
        let menuItems: ContextMenuItem[] = [];

        if (isCollection) {
            const collection = node as Collection;
            const hasChildren = notes.some(n => n.parentId === collection.id) || collections.some(c => c.parentId === collection.id);
            
            menuItems = [
                { label: 'New Note in Folder', action: () => onAddNote(node.id), icon: <PencilSquareIcon /> },
                { label: 'Rename Folder', action: () => setRenamingItemId(node.id), icon: <PencilSquareIcon /> },
                { divider: true },
                { 
                    label: 'Delete Folder', 
                    action: () => {
                        showConfirmation({
                            title: 'Delete Folder',
                            message: hasChildren
                                ? `Are you sure you want to delete the folder "${collection.name}"? All notes and folders inside it will also be permanently deleted. This action cannot be undone.`
                                : `Are you sure you want to delete the empty folder "${collection.name}"? This action cannot be undone.`,
                            confirmationRequiredText: hasChildren ? collection.name : undefined,
                            onConfirm: () => handleDeleteCollectionConfirm(collection),
                        });
                    }, 
                    icon: <TrashIcon />, 
                    isDestructive: true 
                },
            ];
        } else {
            const note = node as Note;
            
            const generateMoveToMenuItems = (
                targetNote: Note,
                allCollections: Collection[]
            ): ContextMenuItem[] => {
                const childrenMap = new Map<string | null, Collection[]>();
                allCollections.forEach(c => {
                    const parent = c.parentId ?? null;
                    if (!childrenMap.has(parent)) childrenMap.set(parent, []);
                    childrenMap.get(parent)!.push(c);
                });
            
                const buildMenu = (parentId: string | null): ContextMenuItem[] => {
                    const children = childrenMap.get(parentId) || [];
                    return children.sort((a, b) => a.name.localeCompare(b.name)).map(collection => ({
                        label: collection.name,
                        action: () => moveItem(targetNote.id, collection.id, 'inside')
                            .catch(err => showToast({ message: 'Failed to move note.', type: 'error' })),
                        disabled: targetNote.parentId === collection.id,
                        children: (childrenMap.get(collection.id) || []).length > 0 ? buildMenu(collection.id) : undefined
                    }));
                };
                
                return [{
                    label: "Root",
                    icon: <FolderIcon />,
                    action: () => moveItem(targetNote.id, null, 'inside')
                        .catch(err => showToast({ message: 'Failed to move note.', type: 'error' })),
                    disabled: targetNote.parentId === null
                }, ...buildMenu(null)];
            };

            menuItems = [
                { label: 'Rename Note', action: () => setRenamingItemId(node.id), icon: <PencilSquareIcon /> },
                {
                    label: 'Move to...',
                    icon: <FolderIcon />,
                    children: generateMoveToMenuItems(note, collections),
                },
                { 
                    label: 'Duplicate Note', 
                    action: () => {
                        copyNote(node.id)
                            .then((newNoteId) => {
                                onSelectNote(newNoteId);
                                showToast({ message: 'Note duplicated successfully!', type: 'success'});
                            })
                            .catch((err) => showToast({ message: `Failed to duplicate note: ${err.message}`, type: 'error'}));
                    }, 
                    icon: <DocumentDuplicateIcon /> 
                },
                { divider: true },
                {
                    label: 'Copy Note ID',
                    action: () => {
                        navigator.clipboard.writeText(note.id)
                            .then(() => showToast({ message: 'Note ID copied!', type: 'success' }))
                            .catch(() => showToast({ message: 'Failed to copy ID.', type: 'error' }));
                    },
                    icon: <HashtagIcon />
                },
                { 
                    label: 'Copy Note Link', 
                    action: () => {
                        const linkText = `[[${note.id}|${note.title}]]`;
                        navigator.clipboard.writeText(linkText)
                            .then(() => showToast({ message: 'Note link copied!', type: 'success' }))
                            .catch(() => showToast({ message: 'Failed to copy link.', type: 'error' }));
                    }, 
                    icon: <LinkIcon /> 
                },
                { 
                    label: 'Copy as Markdown', 
                    action: () => {
                        navigator.clipboard.writeText(`# ${note.title}\n\n${note.content}`)
                          .then(() => showToast({ message: 'Copied as Markdown', type: 'success' }))
                          .catch(() => showToast({ message: 'Failed to copy', type: 'error' }));
                    }, 
                    icon: <ClipboardDocumentIcon /> 
                },
                { divider: true },
                { 
                    label: 'Delete Note', 
                    action: () => showConfirmation({
                        title: 'Delete Note',
                        message: `Are you sure you want to permanently delete "${note.title}"? This action cannot be undone.`,
                        onConfirm: () => handleDeleteNoteConfirm(note),
                        confirmText: 'Delete',
                    }), 
                    icon: <TrashIcon />, 
                    isDestructive: true 
                },
            ];
        }
        onOpenContextMenu(e, menuItems);
    }, [
        collections, notes, onAddNote, setRenamingItemId, showConfirmation, 
        handleDeleteCollectionConfirm, moveItem, showToast, copyNote, 
        handleDeleteNoteConfirm, onOpenContextMenu
    ]);

    return { handleContextMenu };
};