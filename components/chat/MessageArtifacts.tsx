
import React from 'react';
import { Note } from '../../types';
import SourceNotes from './SourceNotes';
import { GoogleIcon, ArrowTopRightOnSquareIcon, CheckIcon, DocumentTextIcon, BoltIcon } from '../Icons';
import { useStoreContext, useUIContext } from '../../context/AppContext';

interface MessageArtifactsProps {
    sources?: Note[];
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    noteIds?: string[];
}

const MessageArtifacts: React.FC<MessageArtifactsProps> = ({ sources, groundingChunks, noteIds }) => {
    const { getNoteById, setActiveNoteId } = useStoreContext();
    const { setView } = useUIContext();

    const hasSources = sources && sources.length > 0;
    const hasWebSources = groundingChunks && groundingChunks.length > 0;
    const hasSystemUpdates = noteIds && noteIds.length > 0;

    if (!hasSources && !hasWebSources && !hasSystemUpdates) return null;

    const handleNoteClick = (noteId: string) => {
        setActiveNoteId(noteId);
        setView('NOTES');
    };

    return (
        <div className="mt-3 flex flex-col gap-2">
            {/* System Changes - High Priority */}
            {hasSystemUpdates && (
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                        <CheckIcon className="w-3.5 h-3.5"/> System Updates
                    </p>
                    <div className="flex flex-col gap-1.5">
                        {noteIds.map(noteId => {
                            const note = getNoteById(noteId);
                            return (
                                <button key={noteId} onClick={() => handleNoteClick(noteId)} className="text-xs flex items-center justify-between gap-2 w-full text-left bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-zinc-700 border border-emerald-100 dark:border-zinc-700 px-3 py-2 rounded-md transition-all shadow-sm group/note">
                                    <span className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                                        <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded text-emerald-600 dark:text-emerald-400">
                                            <DocumentTextIcon className="w-3 h-3"/>
                                        </div>
                                        <span className="font-medium truncate">{note ? note.title : 'Untitled Note'}</span>
                                    </span>
                                    <ArrowTopRightOnSquareIcon className="w-3 h-3 text-emerald-500 opacity-50 group-hover/note:opacity-100 transition-opacity" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Sources & Grounding */}
            {(hasSources || hasWebSources) && (
                <div className="bg-light-ui/30 dark:bg-dark-ui/30 border border-light-border/50 dark:border-dark-border/50 rounded-lg p-3 space-y-3">
                    {/* Internal Sources */}
                    {hasSources && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-light-text/50 dark:text-dark-text/50 mb-1.5 flex items-center gap-1.5">
                                <BoltIcon className="w-3 h-3"/> Knowledge Base Citations
                            </p>
                            <SourceNotes sources={sources} />
                        </div>
                    )}
                    
                    {/* External Web Sources */}
                    {hasWebSources && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <GoogleIcon className="w-3 h-3"/>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-light-text/50 dark:text-dark-text/50">
                                    Web Grounding
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {groundingChunks.map((chunk, index) => {
                                    if (chunk.web?.uri && chunk.web?.title) {
                                        return (
                                            <a 
                                                key={index}
                                                href={chunk.web.uri}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 max-w-full text-xs bg-white dark:bg-zinc-800 hover:bg-light-ui dark:hover:bg-dark-ui border border-light-border dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-light-text dark:text-dark-text hover:text-light-primary dark:hover:text-dark-primary transition-all shadow-sm truncate group/link"
                                            >
                                                <span className="truncate max-w-[200px]">{chunk.web.title}</span>
                                                <ArrowTopRightOnSquareIcon className="w-3 h-3 opacity-40 group-hover/link:opacity-100" />
                                            </a>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MessageArtifacts;
