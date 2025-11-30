
import React, { useState } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import okaidia from 'react-syntax-highlighter/dist/esm/styles/prism/okaidia';
import { ClipboardDocumentIcon, CheckIcon } from '../Icons';

interface CodeBlockWithCopyProps {
    children: React.ReactNode;
    className?: string;
}

const CodeBlockWithCopy: React.FC<CodeBlockWithCopyProps> = ({ children, className }) => {
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

export default CodeBlockWithCopy;
