
import React from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import RecursiveRenderer from './markdown/RecursiveRenderer';
import { useMarkdownComponents } from '../hooks/useMarkdownComponents';

SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('tsx', typescript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);

interface MarkdownPreviewProps {
    title: string;
    content: string;
    onToggleTask: (lineNumber: number) => void;
    isStreaming?: boolean;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ title, content, onToggleTask, isStreaming }) => {
    // Logic extracted to hook to keep this component clean and focused
    const components = useMarkdownComponents({ onToggleTask });

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

export default React.memo(MarkdownPreview);
