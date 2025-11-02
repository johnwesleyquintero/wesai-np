import React from 'react';
import MarkdownPreview from '../MarkdownPreview';

interface EditorContentProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    viewMode: 'edit' | 'preview';
    displayedTitle: string;
    displayedContent: string;
    isReadOnly: boolean;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onSelect: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onKeyUp: () => void;
    onClick: () => void;
    onBlur: () => void;
    onToggleTask: (lineNumber: number) => void;
    sharedEditorClasses: string;
}

const EditorContent: React.FC<EditorContentProps> = ({
    textareaRef,
    viewMode,
    displayedTitle,
    displayedContent,
    isReadOnly,
    onChange,
    onSelect,
    onKeyDown,
    onKeyUp,
    onClick,
    onBlur,
    onToggleTask,
    sharedEditorClasses
}) => {
    if (viewMode === 'preview') {
        return (
            <div className="font-serif-editor">
                 <MarkdownPreview title="" content={displayedContent} onToggleTask={onToggleTask} />
            </div>
        );
    }
    
    return (
        <div className="relative mt-4">
            <textarea
                ref={textareaRef}
                onSelect={onSelect}
                onKeyDown={onKeyDown}
                onKeyUp={onKeyUp}
                onClick={onClick}
                onBlur={onBlur}
                value={displayedContent}
                onChange={onChange}
                placeholder="Start writing, drop a file, or type / for commands..."
                className={`${sharedEditorClasses} font-serif-editor relative z-10 caret-light-text dark:caret-dark-text bg-transparent block`}
                readOnly={isReadOnly}
                spellCheck={false}
            />
        </div>
    );
};

export default EditorContent;