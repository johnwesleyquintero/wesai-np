
import React from 'react';
import { Note } from '../../types';
import MarkdownPreview from '../MarkdownPreview';
import { generatePreviewFromMarkdown } from '../../lib/markdownUtils';

interface NotePreviewPopoverProps {
    note: Note;
    position: { x: number; y: number };
}

const NotePreviewPopover: React.FC<NotePreviewPopoverProps> = ({ note, position }) => {
    const previewContent = generatePreviewFromMarkdown(note.content, 250);

    const style: React.CSSProperties = {
        position: 'fixed',
        top: position.y,
        left: position.x,
        transform: 'translate(15px, 15px)', // Offset from cursor/node
        zIndex: 100,
        pointerEvents: 'none',
    };

    return (
        <div
            style={style}
            className="w-80 max-h-60 overflow-hidden p-4 bg-light-background dark:bg-dark-background rounded-lg shadow-2xl border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text animate-fade-in"
        >
            <h3 className="font-bold mb-2 truncate">{note.title}</h3>
            <div className="text-light-text/80 dark:text-dark-text/80 chat-markdown">
                 <MarkdownPreview title="" content={previewContent} onToggleTask={() => {}} />
            </div>
        </div>
    );
};

export default NotePreviewPopover;
