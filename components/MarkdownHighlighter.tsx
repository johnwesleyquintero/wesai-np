import React from 'react';
import { SpellingError } from '../types';

interface Token {
    type: string;
    content: string;
    start: number;
    end: number;
}

const markdownRegex = new RegExp(
    [
        /(^#+\s+.*$)/,                                          // Headers
        /(\*{1,2}|_{1,2}|~~)/,                                  // Bold/Italic/Strikethrough punctuation
        /(`)/,                                                  // Inline code punctuation
        /(!?\[.*?\]\(.*?\))/,                                    // Links & Images
        /(\[\[.*?\]\])/,                                        // Note Links
        /(^>+\s+.*$)/,                                          // Blockquotes
        /(^(\s*)(([-*+])|(\d+\.))\s+)/,                          // List markers
        /^(---|___|\*\*\*)\s*$/,                                 // Horizontal rules
    ].map(r => r.source).join('|'),
    'gm'
);

const tokenize = (text: string): Omit<Token, 'start' | 'end'>[] => {
    if (!text) return [];

    const tokens: Omit<Token, 'start' | 'end'>[] = [];
    let lastIndex = 0;

    for (const match of text.matchAll(markdownRegex)) {
        const matchIndex = match.index!;
        const [fullMatch] = match;

        if (matchIndex > lastIndex) {
            tokens.push({ type: 'text', content: text.slice(lastIndex, matchIndex) });
        }
        
        let type = 'punctuation';
        if (fullMatch.startsWith('#')) type = 'header';
        else if (fullMatch.startsWith('>')) type = 'blockquote';
        else if (/^(\s*)(([-*+])|(\d+\.))\s+/.test(fullMatch)) type = 'list-punctuation';
        else if (/^(---|___|\*\*\*)\s*$/.test(fullMatch)) type = 'hr';
        else if (fullMatch.startsWith('**') || fullMatch.startsWith('__')) type = 'bold-punctuation';
        else if (fullMatch.startsWith('*') || fullMatch.startsWith('_')) type = 'italic-punctuation';
        else if (fullMatch.startsWith('~~')) type = 'strikethrough-punctuation';
        else if (fullMatch.startsWith('`')) type = 'code';
        else if (/!?\[.*?\]\(.*?\)/.test(fullMatch)) type = 'link';
        else if (/\[\[.*?\]\]/.test(fullMatch)) type = 'link';


        tokens.push({ type, content: fullMatch });
        lastIndex = matchIndex + fullMatch.length;
    }

    if (lastIndex < text.length) {
        tokens.push({ type: 'text', content: text.slice(lastIndex) });
    }
    
    const finalTokens: Omit<Token, 'start' | 'end'>[] = [];
    const inlineRegex = /(\*\*|__)(.*?)(\1)|(\*|_)(.*?)(\4)|(~~)(.*?)(~\7)|(`)(.*?)(`)|(!?\[)(.*?)(\]\()(.*?)(\))|(\[\[)(.*?)(?:\|(.*?))?(\]\])/g;

    for (const token of tokens) {
        if (token.type !== 'text' && !['link'].includes(token.type) ) {
            finalTokens.push(token);
            continue;
        }
        
        let lastInlineIndex = 0;
        const contentSource = token.type === 'link' ? token.content : token.content;

        for (const inlineMatch of contentSource.matchAll(inlineRegex)) {
            const [
                , bpu1, bold, , ipu1, italic, , spu1, strike, , cpu1, code, , lpu1, linkText, lpu2, linkUrl, lpu3,
                , nlpu1, noteId, noteText, nlpu2,
            ] = inlineMatch;

            const matchIndex = inlineMatch.index!;

            if (matchIndex > lastInlineIndex) {
                finalTokens.push({ type: 'text', content: contentSource.slice(lastInlineIndex, matchIndex) });
            }
            
            if (bold !== undefined) {
                finalTokens.push({ type: 'bold-punctuation', content: bpu1 });
                finalTokens.push({ type: 'bold', content: bold });
                finalTokens.push({ type: 'bold-punctuation', content: bpu1 });
            } else if (italic !== undefined) {
                finalTokens.push({ type: 'italic-punctuation', content: ipu1 });
                finalTokens.push({ type: 'italic', content: italic });
                finalTokens.push({ type: 'italic-punctuation', content: ipu1 });
            } else if (strike !== undefined) {
                finalTokens.push({ type: 'strikethrough-punctuation', content: spu1 });
                finalTokens.push({ type: 'strikethrough', content: strike });
                finalTokens.push({ type: 'strikethrough-punctuation', content: spu1 });
            } else if (code !== undefined) {
                finalTokens.push({ type: 'punctuation', content: cpu1 });
                finalTokens.push({ type: 'code', content: code });
                finalTokens.push({ type: 'punctuation', content: cpu1 });
            } else if (linkText !== undefined) {
                finalTokens.push({ type: 'punctuation', content: lpu1 });
                finalTokens.push({ type: 'link', content: linkText });
                finalTokens.push({ type: 'punctuation', content: lpu2 });
                finalTokens.push({ type: 'link-url', content: linkUrl });
                finalTokens.push({ type: 'punctuation', content: lpu3 });
            } else if (noteId !== undefined) {
                 finalTokens.push({ type: 'punctuation', content: nlpu1 });
                 const displayText = noteText || noteId;
                 finalTokens.push({ type: 'link', content: displayText });
                 finalTokens.push({ type: 'punctuation', content: nlpu2 });
            }


            lastInlineIndex = matchIndex + inlineMatch[0].length;
        }
        
         if (lastInlineIndex < contentSource.length) {
            finalTokens.push({ type: 'text', content: contentSource.slice(lastInlineIndex) });
        }
    }

    return finalTokens;
};


interface MarkdownHighlighterProps {
    content: string;
    spellingErrors: SpellingError[];
}

const MarkdownHighlighter: React.FC<MarkdownHighlighterProps> = ({ content, spellingErrors }) => {

    const renderWithSpelling = (tokens: Omit<Token, 'start' | 'end'>[]): React.ReactNode[] => {
        const elements: React.ReactNode[] = [];
        let currentIndex = 0;

        tokens.forEach((token, i) => {
            const tokenStart = currentIndex;
            const tokenEnd = tokenStart + token.content.length;
            
            const relevantErrors = spellingErrors.filter(err => err.index < tokenEnd && (err.index + err.length) > tokenStart);
            
            if (token.type !== 'text' || relevantErrors.length === 0) {
                 elements.push(<span key={i} className={`token ${token.type}`}>{token.content}</span>);
            } else {
                const parts: React.ReactNode[] = [];
                let lastErrorEnd = tokenStart;
                
                relevantErrors.forEach((err, errIndex) => {
                     const errorStartInToken = Math.max(tokenStart, err.index);
                     const errorEndInToken = Math.min(tokenEnd, err.index + err.length);
                     
                     // Text before the error
                     if (errorStartInToken > lastErrorEnd) {
                         parts.push(content.substring(lastErrorEnd, errorStartInToken));
                     }
                     // The error itself
                     parts.push(
                         <mark key={`${i}-${errIndex}`} className="bg-transparent text-transparent underline decoration-red-500 decoration-wavy">
                            {content.substring(errorStartInToken, errorEndInToken)}
                         </mark>
                     );
                     lastErrorEnd = errorEndInToken;
                });

                // Text after the last error
                if (lastErrorEnd < tokenEnd) {
                    parts.push(content.substring(lastErrorEnd, tokenEnd));
                }

                elements.push(<span key={i} className={`token ${token.type}`}>{parts}</span>);
            }
            currentIndex = tokenEnd;
        });

        return elements;
    };
    
    const tokenList = tokenize(content);
    const nodes = renderWithSpelling(tokenList);

    return (
        <>
            {nodes}
            {/* Add a newline to ensure the highlighter div has the same height as the textarea when the last line is empty */}
            {'\n'}
        </>
    );
};

export default React.memo(MarkdownHighlighter);