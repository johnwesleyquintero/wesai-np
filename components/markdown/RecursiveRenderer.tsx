import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useStoreContext } from '../../context/AppContext';

interface RecursiveRendererProps {
    content: string;
    onToggleTask: (lineNumber: number) => void;
    components: any;
    recursionDepth?: number;
}

const RecursiveRenderer: React.FC<RecursiveRendererProps> = ({ content, onToggleTask, components, recursionDepth = 0 }) => {
    const { templates } = useStoreContext();
    const MAX_RECURSION = 5;

    if (recursionDepth > MAX_RECURSION) {
        return <div className="my-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-500/50 rounded-md text-sm text-red-700 dark:text-red-200">[Sync loop detected. Maximum depth exceeded.]</div>;
    }

    const parts = content.split(/(\[\[sync:[\w-]+\]\])/g);

    return (
        <>
            {parts.map((part, index) => {
                const syncMatch = part.match(/\[\[sync:([\w-]+)\]\]/);
                if (syncMatch) {
                    const templateId = syncMatch[1];
                    const template = templates.find(t => t.id === templateId);
                    if (template) {
                        return (
                            <div key={`${templateId}-${index}`} className="my-2 p-4 border border-light-border dark:border-dark-border rounded-md bg-light-ui/30 dark:bg-dark-ui/30">
                                <RecursiveRenderer
                                    content={template.content}
                                    onToggleTask={onToggleTask}
                                    components={components}
                                    recursionDepth={recursionDepth + 1}
                                />
                            </div>
                        );
                    }
                    return <div key={index} className="my-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-500/50 rounded-md text-sm text-yellow-700 dark:text-yellow-200">[Synced block not found: {templateId}]</div>;
                }

                // A single regex to match both note links and source citations to prevent replacement conflicts.
                const combinedRegex = /(\[\[([a-zA-Z0-9-]+)(?:\|(.*?))?\]\])|\[(\d+)\]/g;
                const preprocessedPart = part.replace(combinedRegex, (match, _noteLinkMatch, noteId, noteText, sourceNum) => {
                    // If noteId is truthy, it's a note link
                    if (noteId) {
                        const displayText = noteText || noteId;
                        return `<a href="note://${noteId}">${displayText}</a>`;
                    }
                    // If sourceNum is truthy, it's a source citation
                    if (sourceNum) {
                        return `<a href="source://${sourceNum}">[${sourceNum}]</a>`;
                    }
                    // Fallback, should not be reached with this regex
                    return match;
                });

                return (
                    <ReactMarkdown
                        key={index}
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={components}
                    >
                        {preprocessedPart}
                    </ReactMarkdown>
                );
            })}
        </>
    );
};

export default RecursiveRenderer;