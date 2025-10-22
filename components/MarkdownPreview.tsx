import React from 'react';
import { useStoreContext, useUIContext } from '../context/AppContext';

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

const sanitizeUrl = (url: string): string => {
    const trimmedUrl = url.trim();
    if (/^javascript:/i.test(trimmedUrl)) {
        return '#';
    }
    // Allow known safe protocols, relative paths, and data URIs for images
    if (/^(https?|mailto|data:image):/i.test(trimmedUrl) || /^[./]/.test(trimmedUrl) || /^#/.test(trimmedUrl)) {
        return trimmedUrl;
    }
    return '#';
};

const InlineParser: React.FC<{ text: string }> = ({ text }) => {
    const { getNoteById, setActiveNoteId } = useStoreContext();
    const { setView } = useUIContext();

    const onSelectNote = (noteId: string) => {
        setActiveNoteId(noteId);
        setView('NOTES');
    };

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    const regex = /(\!\[(.*?)\]\((.*?)\))|(\[\[([a-zA-Z0-9-]+)(?:\|(.*?))?\]\])|(\*\*)(.*?)\1|(__)(.*?)\3|(\*)(.*?)\5|(_)(.*?)\7|(~~)(.*?)\9|`(.*?)`|(\[([^\]]+)\]\(([^)]+)\))/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
        const [
            full,
            , imgAlt, imgSrc,
            , noteId, noteText,
            , boldText1, , boldText2,
            , italicText1, , italicText2,
            , strikeText,
            codeText,
            , linkText, linkUrl
        ] = match;
        
        if (match.index > lastIndex) {
            elements.push(text.substring(lastIndex, match.index));
        }

        const key = `${match.index}-${lastIndex}`;

        if (imgSrc) {
            elements.push(<img key={key} src={sanitizeUrl(imgSrc)} alt={imgAlt} className="max-w-full my-4 rounded-lg" />);
        } else if (noteId) {
            const linkedNote = getNoteById(noteId);
            const displayText = noteText || linkedNote?.title || 'Untitled Note';
            elements.push(
                <button key={key} onClick={() => onSelectNote(noteId)} className="text-light-primary dark:text-dark-primary bg-light-primary/10 dark:bg-dark-primary/10 px-1 py-0.5 rounded-md hover:bg-light-primary/20 dark:hover:bg-dark-primary/20">
                    {displayText}
                </button>
            );
        } else if (boldText1 !== undefined) elements.push(<strong key={key}><InlineParser text={boldText1} /></strong>);
        else if (boldText2 !== undefined) elements.push(<strong key={key}><InlineParser text={boldText2} /></strong>);
        else if (italicText1 !== undefined) elements.push(<em key={key}><InlineParser text={italicText1} /></em>);
        else if (italicText2 !== undefined) elements.push(<em key={key}><InlineParser text={italicText2} /></em>);
        else if (strikeText !== undefined) elements.push(<del key={key}><InlineParser text={strikeText} /></del>);
        else if (codeText !== undefined) elements.push(<code key={key} className="bg-light-ui dark:bg-dark-ui text-red-500 rounded px-1 py-0.5 font-mono text-sm">{codeText}</code>);
        else if (linkText !== undefined && linkUrl !== undefined) {
            const youtubeId = getYoutubeVideoId(linkUrl);
            const vimeoId = getVimeoVideoId(linkUrl);
            if (youtubeId) {
                elements.push(
                    <div key={key} className="my-4 aspect-video">
                        <iframe className="w-full h-full rounded-lg" src={`https://www.youtube.com/embed/${youtubeId}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                    </div>
                );
            } else if (vimeoId) {
                 elements.push(
                    <div key={key} className="my-4 aspect-video">
                        <iframe className="w-full h-full rounded-lg" src={`https://player.vimeo.com/video/${vimeoId}`} title="Vimeo video player" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen></iframe>
                    </div>
                );
            } else {
                 elements.push(<a href={sanitizeUrl(linkUrl)} key={key} target="_blank" rel="noopener noreferrer" className="text-light-primary dark:text-dark-primary underline"><InlineParser text={linkText} /></a>);
            }
        }
        
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        elements.push(text.substring(lastIndex));
    }
    
    if (elements.length === 1 && typeof elements[0] === 'string') {
        return <>{elements[0]}</>;
    }
    return <>{elements}</>;
};

const parseInline = (text: string) => <InlineParser text={text} />;

interface MarkdownPreviewProps {
    title: string;
    content: string;
    onToggleTask: (lineNumber: number) => void;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ title, content, onToggleTask }) => {
    const renderMarkdown = () => {
        const lines = content.split('\n');
        const elements: React.ReactElement[] = [];
        let listType: 'ul' | 'ol' | null = null;
        let listItems: React.ReactElement[] = [];

        const flushList = () => {
            if (listType === 'ul') {
                elements.push(<ul key={`list-${elements.length}`} className="list-inside my-4 space-y-1">{listItems}</ul>);
            } else if (listType === 'ol') {
                elements.push(<ol key={`list-${elements.length}`} className="list-decimal pl-6 my-4 space-y-1">{listItems}</ol>);
            }
            listItems = [];
            listType = null;
        };
        
        const parseTableRow = (line: string): string[] => {
            let preparedLine = line.trim();
            if (preparedLine.startsWith('|')) preparedLine = preparedLine.substring(1);
            if (preparedLine.endsWith('|')) preparedLine = preparedLine.slice(0, -1);
            return preparedLine.split('|').map(s => s.trim());
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Table check
            const isTableSeparator = (l: string) => /^\s*\|?(:?-+:?|:?--+:?)\s*\|/.test(l);
            if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
                flushList();

                const headerCells = parseTableRow(line);
                const numColumns = headerCells.length;
                const separatorLine = lines[i + 1];
                
                const alignments = parseTableRow(separatorLine).map(s => {
                    const left = s.startsWith(':');
                    const right = s.endsWith(':');
                    if (left && right) return 'center';
                    if (right) return 'right';
                    return 'left';
                });

                const tableRows: React.ReactElement[] = [];
                let rowIndex = i + 2;
                while(rowIndex < lines.length && lines[rowIndex].includes('|')) {
                    if (lines[rowIndex].trim() === '') break;
                    
                    let rowCells = parseTableRow(lines[rowIndex]);

                    if (rowCells.length > numColumns) {
                        rowCells = rowCells.slice(0, numColumns);
                    } else {
                        while (rowCells.length < numColumns) {
                            rowCells.push('');
                        }
                    }

                    tableRows.push(
                        <tr key={`row-${rowIndex}`} className={tableRows.length % 2 === 1 ? 'bg-light-ui/50 dark:bg-dark-ui/50' : ''}>
                            {rowCells.map((cell, cellIndex) => (
                                <td key={cellIndex} className={`border border-light-border dark:border-dark-border px-4 py-2 text-${alignments[cellIndex] || 'left'}`}>
                                    {parseInline(cell)}
                                </td>
                            ))}
                        </tr>
                    );
                    rowIndex++;
                }

                elements.push(
                    <div key={`table-wrapper-${i}`} className="overflow-x-auto my-4">
                        <table className="min-w-full my-0 border-collapse border border-light-border dark:border-dark-border">
                            <thead className="bg-light-ui dark:bg-dark-ui">
                                <tr>
                                    {headerCells.map((cell, cellIndex) => (
                                        <th key={cellIndex} className={`border border-light-border dark:border-dark-border px-4 py-2 font-semibold text-${alignments[cellIndex] || 'left'}`}>
                                            {parseInline(cell)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableRows}
                            </tbody>
                        </table>
                    </div>
                );
                i = rowIndex - 1;
                continue;
            }

             // Task list item
            const taskMatch = line.match(/^(\s*)(\*|-|\+)\s+\[( |x|X)\]\s+(.*)/);
            if (taskMatch) {
                if (listType !== 'ul') flushList();
                listType = 'ul';
                const isChecked = taskMatch[3].toLowerCase() === 'x';
                const taskText = taskMatch[4];
                listItems.push(
                    <li key={i} className="flex items-center gap-2 my-1 list-none -ml-6">
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleTask(i)}
                            className="w-4 h-4 rounded cursor-pointer text-light-primary dark:text-dark-primary bg-light-ui dark:bg-dark-ui border-light-border dark:border-dark-border focus:ring-light-primary dark:focus:ring-dark-primary"
                        />
                        <span className={`${isChecked ? 'line-through text-light-text/60 dark:text-dark-text/60' : ''}`}>
                            {parseInline(taskText)}
                        </span>
                    </li>
                );
                continue;
            }

            // Unordered list
            if (line.match(/^(\s*)(\*|-|\+)\s+(.*)/)) {
                if (listType !== 'ul') flushList();
                listType = 'ul';
                listItems.push(<li key={i} className="list-disc">{parseInline(line.replace(/^(\s*)(\*|-|\+)\s+/, ''))}</li>);
                continue;
            }
            // Ordered list
            if (line.match(/^(\s*)\d+\.\s+(.*)/)) {
                if (listType !== 'ol') flushList();
                listType = 'ol';
                listItems.push(<li key={i}>{parseInline(line.replace(/^(\s*)\d+\.\s+/, ''))}</li>);
                continue;
            }
            
            flushList();

            if (line.startsWith('###### ')) elements.push(<h6 key={i} className="text-lg font-semibold mt-2 mb-1">{parseInline(line.substring(7))}</h6>);
            else if (line.startsWith('##### ')) elements.push(<h5 key={i} className="text-xl font-semibold mt-3 mb-1">{parseInline(line.substring(6))}</h5>);
            else if (line.startsWith('#### ')) elements.push(<h4 key={i} className="text-2xl font-semibold mt-4 mb-2">{parseInline(line.substring(5))}</h4>);
            else if (line.startsWith('### ')) elements.push(<h3 key={i} className="text-2xl font-bold mt-5 mb-2 border-b border-light-border dark:border-dark-border pb-1">{parseInline(line.substring(4))}</h3>);
            else if (line.startsWith('## ')) elements.push(<h2 key={i} className="text-3xl font-bold mt-6 mb-3 border-b border-light-border dark:border-dark-border pb-2">{parseInline(line.substring(3))}</h2>);
            else if (line.startsWith('# ')) elements.push(<h1 key={i} className="text-4xl font-bold mt-8 mb-4 border-b border-light-border dark:border-dark-border pb-2">{parseInline(line.substring(2))}</h1>);
            else if (line.match(/^(---|___|\*\*\*)$/)) elements.push(<hr key={i} className="my-6 border-light-border dark:border-dark-border"/>);
            else if (line.startsWith('> ')) elements.push(<blockquote key={i} className="border-l-4 border-light-border dark:border-dark-border pl-4 italic text-light-text/80 dark:text-dark-text/80 my-4">{parseInline(line.substring(2))}</blockquote>);
            else if (line.trim() !== '') elements.push(<p key={i} className="my-2 leading-relaxed">{parseInline(line)}</p>);
        }
        
        flushList();
        
        return elements;
    };

    return (
        <div className="max-w-none">
             <h1 className="w-full bg-transparent text-3xl sm:text-4xl font-bold focus:outline-none mb-4">{title}</h1>
            <div className="text-base sm:text-lg leading-relaxed">
                {renderMarkdown()}
            </div>
        </div>
    );
};

export default MarkdownPreview;