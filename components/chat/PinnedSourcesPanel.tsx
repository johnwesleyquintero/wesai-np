import React from 'react';
import { Note } from '../../types';
import { XMarkIcon } from '../Icons';
import MarkdownPreview from '../MarkdownPreview';

interface PinnedSourcesPanelProps {
    sources: Note[];
    onClose: () => void;
}

const PinnedSourcesPanel: React.FC<PinnedSourcesPanelProps> = ({ sources, onClose }) => {
    return (
        <div className="w-full md:w-1/2 lg:w-1/3 max-w-md h-full flex flex-col border-l border-light-border dark:border-dark-border bg-light-ui/50 dark:bg-dark-ui/50">
            <div className="p-4 flex justify-between items-center border-b border-light-border dark:border-dark-border flex-shrink-0">
                <h2 className="font-bold">Cited Sources</h2>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-light-background dark:hover:bg-dark-background">
                    <XMarkIcon />
                </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {sources.map((source, index) => (
                    <div key={source.id} id={`pinned-source-${index + 1}`} className="bg-light-background dark:bg-dark-background rounded-lg p-4 border border-light-border dark:border-dark-border">
                        <h3 className="font-bold mb-2 flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-light-ui dark:bg-dark-ui">{index + 1}</span>
                            {source.title}
                        </h3>
                        <div className="text-sm max-h-64 overflow-y-auto chat-markdown">
                            <MarkdownPreview title="" content={source.content} onToggleTask={() => {}} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PinnedSourcesPanel;