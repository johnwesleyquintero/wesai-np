import React, { useState } from 'react';
import { EllipsisHorizontalIcon, TrashIcon, CheckIcon, ClipboardDocumentIcon } from '../Icons';
import Tooltip from '../Tooltip';

export const MessageActions: React.FC<{ onDelete: () => void }> = ({ onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(p => !p)}
                className="p-1 rounded-full text-light-text/40 dark:text-dark-text/40 hover:bg-light-ui dark:hover:bg-dark-ui hover:text-light-text dark:hover:text-dark-text transition-colors"
                aria-label="Message options"
            >
                <EllipsisHorizontalIcon className="w-4 h-4" />
            </button>
            {isOpen && (
                <div className="absolute top-0 right-full mr-2 bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10 py-1 min-w-[100px]">
                    <button
                        onClick={onDelete}
                        className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10"
                    >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};

export const ActionButton: React.FC<{ tooltip: string; onClick: () => void; children: React.ReactNode; className?: string }> = ({ tooltip, onClick, children, className }) => (
    <Tooltip content={tooltip} position="top">
        <button onClick={onClick} className={`p-1.5 rounded-md text-light-text/40 dark:text-dark-text/40 hover:text-light-text dark:hover:text-dark-text hover:bg-light-ui dark:hover:bg-dark-ui transition-colors ${className}`}>
            {children}
        </button>
    </Tooltip>
);

export const CopyMessageButton: React.FC<{ content: string }> = ({ content }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <ActionButton tooltip={isCopied ? "Copied!" : "Copy"} onClick={handleCopy}>
            {isCopied ? (
                <CheckIcon className="w-4 h-4 text-green-500 dark:text-green-400" />
            ) : (
                <ClipboardDocumentIcon className="w-4 h-4" />
            )}
        </ActionButton>
    );
};