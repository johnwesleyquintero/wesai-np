import React, { useState } from 'react';
import { Note, Template } from '../../types';
import {
    EllipsisVerticalIcon, DocumentDuplicateIcon, DocumentPlusIcon,
    ClipboardDocumentIcon, ArrowDownTrayIcon, InformationCircleIcon
} from '../Icons';
import { useToast } from '../../context/ToastContext';
import { useStoreContext } from '../../context/AppContext';
import NoteInfoPopover from '../NoteInfoPopover';

interface MoreActionsMenuProps {
    note: Note;
    onApplyTemplate: (template: Template) => void;
    onSaveAsTemplate: () => void;
    isDisabled: boolean;
    wordCount: number;
    charCount: number;
}

const MoreActionsMenu: React.FC<MoreActionsMenuProps> = ({
    note,
    onApplyTemplate,
    onSaveAsTemplate,
    isDisabled,
    wordCount,
    charCount,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isTemplatesSubMenuOpen, setIsTemplatesSubMenuOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const { showToast } = useToast();
    const { templates } = useStoreContext();

    const sanitizeFilename = (name: string) => name.replace(/[\\/\\?%*:|"<>]/g, '-').trim() || 'Untitled';

    const handleExport = (format: 'md' | 'json') => {
        setIsOpen(false);
        const filename = `${sanitizeFilename(note.title)}.${format}`;
        let content = '';
        let mimeType = '';

        if (format === 'md') {
            const tagsLine = note.tags.length > 0 ? `**Tags:** ${note.tags.join(', ')}\n\n` : '';
            content = `# ${note.title}\n\n${tagsLine}---\n\n${note.content}`;
            mimeType = 'text/markdown';
        } else {
            content = JSON.stringify(note, null, 2);
            mimeType = 'application/json';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCopyMarkdown = () => {
        setIsOpen(false);
        const markdownContent = `# ${note.title}\n\n${note.content}`;
        navigator.clipboard.writeText(markdownContent)
            .then(() => showToast({ message: "Note copied as Markdown!", type: 'success' }))
            .catch(err => showToast({ message: "Failed to copy note.", type: 'error' }));
    };

    const handleToggleInfo = () => {
        setIsInfoOpen(prev => !prev);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="p-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDisabled}
            >
                <EllipsisVerticalIcon />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10 py-1">
                    <button onClick={handleToggleInfo} className="w-full text-left flex items-center gap-2 block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">
                        <InformationCircleIcon /> Note Info
                    </button>
                    <div className="my-1 border-t border-light-border dark:border-dark-border"></div>
                    <div
                        onMouseEnter={() => setIsTemplatesSubMenuOpen(true)}
                        onMouseLeave={() => setIsTemplatesSubMenuOpen(false)}
                        className="relative"
                    >
                        <button className="w-full text-left flex items-center justify-between gap-2 block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">
                           <span className="flex items-center gap-2"><DocumentDuplicateIcon /> Apply Template</span> &rarr;
                        </button>
                        {isTemplatesSubMenuOpen && (
                             <div className="absolute right-full -top-1 mr-1 w-56 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border py-1">
                                {templates.length > 0 ? (
                                    templates.map(template => <button key={template.id} onClick={() => { onApplyTemplate(template); setIsOpen(false); }} className="w-full text-left block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui">{template.title}</button>)
                                ) : (
                                    <p className="px-4 py-2 text-sm text-light-text/60 dark:text-dark-text/60">No templates.</p>
                                )}
                            </div>
                        )}
                    </div>
                    <button onClick={() => { onSaveAsTemplate(); setIsOpen(false); }} className="w-full text-left flex items-center gap-2 block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui"><DocumentPlusIcon /> Save as Template</button>
                    <div className="my-1 border-t border-light-border dark:border-dark-border"></div>
                    <button onClick={handleCopyMarkdown} className="w-full text-left flex items-center gap-2 block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui"><ClipboardDocumentIcon /> Copy as Markdown</button>
                    <button onClick={() => handleExport('md')} className="w-full text-left flex items-center gap-2 block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui"><ArrowDownTrayIcon /> Export as .md</button>
                    <button onClick={() => handleExport('json')} className="w-full text-left flex items-center gap-2 block px-4 py-2 text-sm hover:bg-light-ui dark:hover:bg-dark-ui"><ArrowDownTrayIcon /> Export as .json</button>
                </div>
            )}
             {isInfoOpen && <NoteInfoPopover note={note} wordCount={wordCount} charCount={charCount} />}
        </div>
    );
};

export default MoreActionsMenu;
