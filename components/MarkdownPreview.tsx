import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import okaidia from 'react-syntax-highlighter/dist/esm/styles/prism/okaidia';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import { useStoreContext, useUIContext } from '../context/AppContext';
import { InformationCircleIcon, LightBulbIcon, ExclamationTriangleIcon, ExclamationCircleIcon, ClipboardDocumentIcon, CheckIcon } from './Icons';

SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('tsx', typescript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);


const CodeBlockWithCopy: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const codeString = String(children).replace(/\n$/, '');
        navigator.clipboard.writeText(codeString).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }, (err) => {
            console.error('Failed to copy code to clipboard:', err);
        });
    };
    
    const match = /language-(\w+)/.exec(className || '');
    if (!match) return null;

    return (
        <div className="code-block-wrapper markdown-preview">
            <button onClick={handleCopy} className="copy-code-btn" aria-label="Copy code">
                {copied ? (
                    <span className="flex items-center gap-1 text-green-500 dark:text-green-400"><CheckIcon className="w-4 h-4" /> Copied</span>
                ) : (
                    <span className="flex items-center gap-1"><ClipboardDocumentIcon className="w-4 h-4" /> Copy</span>
                )}
            </button>
            <SyntaxHighlighter style={okaidia} language={match[1]} PreTag="div">
                {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
        </div>
    );
};

const getYoutubeVideoId = (url: string) => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const getVimeoVideoId = (url: string) => {
    const regex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const ImageRenderer = ({ src, alt, ...props }: { src?: string, alt?: string, [key: string]: any }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        setHasError(false);
        if (!src) {
            setHasError(true);
            setIsLoading(false);
        }
    }, [src]);

    const handleLoad = () => setIsLoading(false);
    const handleError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    if (hasError || !src) {
        return (
            <div className="my-4 p-4 bg-light-ui dark:bg-dark-ui rounded-lg flex flex-col items-center justify-center text-center text-sm text-light-text/60 dark:text-dark-text/60">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{!src ? "Image source missing." : "Could not load image."}</span>
                <span className="text-xs truncate max-w-full">{alt || src}</span>
            </div>
        );
    }
    
    return (
        <div className="relative my-4">
            {isLoading && (
                <div className="absolute inset-0 bg-light-ui dark:bg-dark-ui rounded-lg animate-pulse"></div>
            )}
            <img 
                src={src} 
                alt={alt || ''}
                onLoad={handleLoad}
                onError={handleError}
                className={`rounded-lg transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                {...props} 
            />
        </div>
    );
};

interface MarkdownPreviewProps {
    title: string;
    content: string;
    onToggleTask: (lineNumber: number) => void;
    isStreaming?: boolean;
}

const alertTypes = {
  NOTE: { icon: InformationCircleIcon, colorClass: 'blue' },
  TIP: { icon: LightBulbIcon, colorClass: 'green' },
  IMPORTANT: { icon: ExclamationCircleIcon, colorClass: 'purple' },
  WARNING: { icon: ExclamationTriangleIcon, colorClass: 'yellow' },
  CAUTION: { icon: ExclamationTriangleIcon, colorClass: 'red' },
};


const RecursiveRenderer: React.FC<{
    content: string;
    onToggleTask: (lineNumber: number) => void;
    components: any;
    recursionDepth?: number;
}> = ({ content, onToggleTask, components, recursionDepth = 0 }) => {
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

                // Pre-process this part for note links and sources
                const preprocessedPart = part
                    .replace(/\[\[([a-zA-Z0-9-]+)(?:\|(.*?))?\]\]/g, (match, noteId, noteText) => {
                        const displayText = noteText || noteId;
                        return `<a href="note://${noteId}">${displayText}</a>`;
                    })
                    .replace(/\[(\d+)\]/g, '<a href="source://$1">[$1]</a>');

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


const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ title, content, onToggleTask, isStreaming }) => {
    const { getNoteById, setActiveNoteId } = useStoreContext();
    const { setView } = useUIContext();

    const components: any = {
        code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return match ? (
                <CodeBlockWithCopy className={className}>{children}</CodeBlockWithCopy>
            ) : (
                <code className="bg-light-ui dark:bg-dark-ui text-red-500 rounded px-1 py-0.5 font-mono text-sm" {...props}>
                    {children}
                </code>
            );
        },
        a({ node, children, href, ...props }: any) {
            const url = href || '';

            if (url.startsWith('source://')) {
                const sourceNum = url.substring(9);
                const handleClick = (e: React.MouseEvent) => {
                    e.preventDefault();
                    const sourceEl = document.getElementById(`pinned-source-${sourceNum}`);
                    if (sourceEl) {
                        sourceEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        sourceEl.classList.add('highlight-source');
                        setTimeout(() => sourceEl.classList.remove('highlight-source'), 1500);
                    }
                };
                return (
                    <button onClick={handleClick} className="source-citation">
                        {children}
                    </button>
                );
            }

            if (url.startsWith('note://')) {
                const noteId = url.substring(7);
                const linkedNote = getNoteById(noteId);
                const displayText = children[0] || linkedNote?.title || 'Untitled Note';
                return (
                    <button onClick={() => { setActiveNoteId(noteId); setView('NOTES'); }} className="text-light-primary dark:text-dark-primary bg-light-primary/10 dark:bg-dark-primary/10 px-1 py-0.5 rounded-md hover:bg-light-primary/20 dark:hover:bg-dark-primary/20">
                        {displayText}
                    </button>
                );
            }
            
            const youtubeId = getYoutubeVideoId(url);
            if (youtubeId) {
                return (
                    <div className="my-4 aspect-video">
                        <iframe className="w-full h-full rounded-lg" src={`https://www.youtube.com/embed/${youtubeId}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                    </div>
                );
            }
            
            const vimeoId = getVimeoVideoId(url);
            if (vimeoId) {
                 return (
                    <div className="my-4 aspect-video">
                        <iframe className="w-full h-full rounded-lg" src={`https://player.vimeo.com/video/${vimeoId}`} title="Vimeo video player" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen></iframe>
                    </div>
                );
            }

            return <a href={url} target="_blank" rel="noopener noreferrer" className="text-light-primary dark:text-dark-primary underline" {...props}>{children}</a>;
        },
        img: ({node, ...props}) => <ImageRenderer {...props} />,
        input({ node, className, ...props }: any) {
            const { type, checked } = props;
            if (type === 'checkbox') {
                const pos = node.position?.start.line;
                const handleChange = () => {
                    if (pos !== undefined) {
                        onToggleTask(pos - 1);
                    }
                };
                return <input type="checkbox" checked={checked} onChange={handleChange} className="w-4 h-4 rounded cursor-pointer text-light-primary dark:text-dark-primary bg-light-ui dark:bg-dark-ui border-light-border dark:border-dark-border focus:ring-light-primary dark:focus:ring-dark-primary mr-2"/>;
            }
            return <input className={className} {...props} />;
        },
        li({ node, children, ...props }: any) {
            if (props.className === 'task-list-item') {
                return <li className="list-none my-1 flex items-center" {...props}>{children}</li>
            }
            return <li {...props}>{children}</li>
        },
        blockquote: ({ node, children, ...props }: any) => {
            try {
                const p = children[0] as React.ReactElement<any>;
                if (p && p.props && p.props.children) {
                    let text = '';
                    const childNodes = Array.isArray(p.props.children) ? p.props.children : [p.props.children];
                    if (typeof childNodes[0] === 'string') {
                        text = childNodes[0];
                    }

                    const match = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/);

                    if (match) {
                        const type = match[1] as keyof typeof alertTypes;
                        const { icon: IconComponent, colorClass } = alertTypes[type];
                        
                        const newText = text.substring(match[0].length);
                        
                        const newChildren = [...childNodes];
                        newChildren[0] = newText;
                        
                        const newP = React.cloneElement(p, { children: newChildren });
                        const finalChildren = [newP, ...(children as any[]).slice(1)];

                        return (
                            <div className={`callout callout-${colorClass}`}>
                                <div className="callout-icon">
                                    <IconComponent className="w-5 h-5" />
                                </div>
                                <div className="callout-content">
                                    {finalChildren}
                                </div>
                            </div>
                        );
                    }
                }
            } catch (e) {
                 console.warn("Could not parse blockquote for callout", e);
            }
            
            return <blockquote className="border-l-4 border-light-border dark:border-dark-border pl-4 italic text-light-text/80 dark:text-dark-text/80 my-4" {...props}>{children}</blockquote>;
        },
        h1: ({node, ...props}) => <h1 className="text-4xl font-bold mt-8 mb-4 border-b border-light-border dark:border-dark-border pb-2" {...props} />,
        h2: ({node, ...props}) => <h2 className="text-3xl font-bold mt-6 mb-3 border-b border-light-border dark:border-dark-border pb-2" {...props} />,
        h3: ({node, ...props}) => <h3 className="text-2xl font-bold mt-5 mb-2" {...props} />,
        h4: ({node, ...props}) => <h4 className="text-xl font-semibold mt-4 mb-2" {...props} />,
        h5: ({node, ...props}) => <h5 className="text-lg font-semibold mt-3 mb-1" {...props} />,
        h6: ({node, ...props}) => <h6 className="text-base font-semibold mt-2 mb-1" {...props} />,
        p: ({node, ...props}) => <p className="my-4 leading-relaxed" {...props} />,
        ul: ({node, ...props}) => <ul className="list-disc pl-6 my-4 space-y-2" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-4 space-y-2" {...props} />,
        hr: ({node, ...props}) => <hr className="my-6 border-light-border dark:border-dark-border" {...props} />,
        table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="min-w-full my-0 border-collapse border border-light-border dark:border-dark-border" {...props} /></div>,
        thead: ({node, ...props}) => <thead className="bg-light-ui dark:bg-dark-ui" {...props} />,
        tbody: ({node, ...props}) => <tbody {...props} />,
        tr: ({node, ...props}) => <tr className="even:bg-light-ui/50 dark:even:bg-dark-ui/50" {...props} />,
        th: ({node, ...props}) => <th className="border border-light-border dark:border-dark-border px-4 py-2 font-semibold text-left" {...props} />,
        td: ({node, ...props}) => <td className="border border-light-border dark:border-dark-border px-4 py-2 text-left" {...props} />,
    };

    return (
        <div className="max-w-none markdown-preview">
            {title && <h1 className="w-full bg-transparent text-3xl sm:text-4xl font-bold focus:outline-none mb-4">{title}</h1>}
            <div className="text-base sm:text-lg">
                <RecursiveRenderer content={content} onToggleTask={onToggleTask} components={components} />
                {isStreaming && <span className="blinking-cursor"></span>}
            </div>
        </div>
    );
};

export default MarkdownPreview;