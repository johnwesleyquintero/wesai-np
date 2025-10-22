import React, { useState } from 'react';
import { Note, Collection, SmartCollection } from '../types';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { ChevronRightIcon, DocumentTextIcon, FolderIcon, BrainIcon, EllipsisHorizontalIcon, StarIcon, PinIcon } from './Icons';
import ContextMenu from './ContextMenu';
import { useDragAndDrop } from '../hooks/useDragAndDrop';

type SidebarNodeProps = {
    item: Note | Collection | SmartCollection;
    type: 'note' | 'collection' | 'smart-collection';
    onSelect: (noteId: string) => void;
};

const SidebarNode: React.FC<SidebarNodeProps> = ({ item, type, onSelect }) => {
    const { 
        notes, collections, activeNote, bulkSelect, selectedNoteIds,
        onAddNote, onAddCollection, updateCollection, deleteCollection,
        deleteSmartCollection, setNotesToDelete,
        toggleFavorite, togglePinned
    } = useStoreContext();
    const { isSidebarOpen } = useUIContext();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('name' in item ? item.name : (item as Note).title);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const nodeRef = React.useRef<HTMLDivElement>(null);
    const isNote = type === 'note';
    const isCollection = type === 'collection';
    const isSmartCollection = type === 'smart-collection';

    const children = isCollection ? [
        ...collections.filter(c => c.parentId === item.id),
        ...notes.filter(n => n.parentId === item.id && !n.isFavorite)
    ].sort((a, b) => (a as any).name?.localeCompare((b as any).name) || (a as Note).title.localeCompare((b as Note).title)) : [];
    
    const { dragAndDropProps, isDragOver, dropPosition } = useDragAndDrop(nodeRef, {
        id: item.id,
        parentId: 'parentId' in item ? item.parentId : null,
        type: isNote ? 'note' : 'collection',
        onMoveItem: () => {}, // onMoveItem is handled at a higher level
        collections,
        isDisabled: isEditing
    });
    
    const handleNoteClick = (e: React.MouseEvent) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? e.metaKey : e.ctrlKey;
        
        if (isNote) {
            if (modKey) {
                bulkSelect(item.id, 'ctrl');
            } else if (e.shiftKey) {
                bulkSelect(item.id, 'shift');
            } else {
                bulkSelect(item.id, 'single');
                onSelect(item.id);
            }
        } else {
            setIsExpanded(!isExpanded);
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value);
    const handleNameBlur = () => {
        setIsEditing(false);
        if (isCollection && name !== (item as Collection).name) {
            updateCollection(item.id, { name });
        }
    };
    const handleNameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleNameBlur();
        if (e.key === 'Escape') {
            setIsEditing(false);
            setName((item as Collection).name);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const getContextMenuItems = () => {
        const isSelected = selectedNoteIds.includes(item.id);
        const isMultiSelect = selectedNoteIds.length > 1;

        if (isNote) {
            return [
                { label: (item as Note).isFavorite ? "Remove from Favorites" : "Add to Favorites", action: () => toggleFavorite(item.id) },
                { label: (item as Note).isPinned ? "Unpin Note" : "Pin Note", action: () => togglePinned(item.id) },
                { label: isMultiSelect && isSelected ? `Delete ${selectedNoteIds.length} notes` : "Delete Note", isDestructive: true, action: () => {
                    const notesForDeletion = isMultiSelect && isSelected ? notes.filter(n => selectedNoteIds.includes(n.id)) : [item as Note];
                    setNotesToDelete(notesForDeletion);
                }},
            ];
        }
        if (isCollection) {
            return [
                { label: "New Note", action: () => onAddNote(item.id) },
                { label: "New Folder", action: () => onAddCollection(item.id) },
                { label: "Rename", action: () => setIsEditing(true) },
                { label: "Delete Folder", isDestructive: true, action: () => deleteCollection(item.id) },
            ];
        }
         if (isSmartCollection) {
            return [
                { label: "Edit Smart Folder", action: () => {} /* Placeholder */ },
                { label: "Delete Smart Folder", isDestructive: true, action: () => deleteSmartCollection(item.id) },
            ];
        }
        return [];
    };
    
    const isActive = isNote && activeNote?.id === item.id;
    const isSelected = isNote && selectedNoteIds.includes(item.id);
    const icon = isNote ? <DocumentTextIcon /> : isSmartCollection ? <BrainIcon /> : <FolderIcon />;
    
    return (
        <div onContextMenu={handleContextMenu}>
            <div
                ref={nodeRef}
                {...dragAndDropProps}
                className={`relative group w-full flex items-center text-sm rounded-md cursor-pointer transition-colors ${
                    isActive ? 'bg-light-primary/20 dark:bg-dark-primary/20' : isSelected ? 'bg-light-primary/10 dark:bg-dark-primary/10' : 'hover:bg-light-background dark:hover:bg-dark-background'
                }`}
                style={{ paddingLeft: `${0}rem` }}
            >
                {dropPosition === 'top' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-light-primary dark:bg-dark-primary" />}
                {isDragOver && <div className="absolute inset-0 bg-light-primary/20 dark:bg-dark-primary/20 rounded-md" />}

                <div onClick={handleNoteClick} className="flex items-center flex-grow p-1.5 truncate">
                    {(isCollection && children.length > 0) && (
                        <ChevronRightIcon className={`w-4 h-4 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    )}
                    <span className="mr-2">{icon}</span>
                    {isEditing ? (
                        <input type="text" value={name} onChange={handleNameChange} onBlur={handleNameBlur} onKeyDown={handleNameKeyDown} autoFocus className="bg-transparent outline-none w-full" />
                    ) : (
                        <span className="truncate">{name}</span>
                    )}
                    {isNote && (item as Note).isFavorite && <StarIcon filled className="w-3.5 h-3.5 ml-auto text-yellow-500 flex-shrink-0" />}
                    {isNote && (item as Note).isPinned && <PinIcon filled className="w-3.5 h-3.5 ml-1 text-light-primary dark:text-dark-primary flex-shrink-0" />}
                </div>

                <div className={`flex-shrink-0 ${isSidebarOpen ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
                    {isCollection && <button onClick={() => onAddNote(item.id)} className="p-1 rounded hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover">+</button>}
                    <button onClick={handleContextMenu} className="p-1 rounded hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover"><EllipsisHorizontalIcon className="w-4 h-4" /></button>
                </div>
                
                 {dropPosition === 'bottom' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-light-primary dark:bg-dark-primary" />}
            </div>

            {isExpanded && children.length > 0 && (
                <div className="pl-4">
                    {children.map(child => <SidebarNode key={child.id} item={child} type={'content' in child ? 'note' : 'collection'} onSelect={onSelect} />)}
                </div>
            )}
            
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={getContextMenuItems()} onClose={() => setContextMenu(null)} />}
        </div>
    );
};

export default SidebarNode;