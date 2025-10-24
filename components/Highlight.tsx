import React from 'react';

interface HighlightProps {
    text: string;
    highlight: string;
}

const Highlight: React.FC<HighlightProps> = ({ text, highlight }) => {
    if (!highlight.trim()) {
        return <>{text}</>;
    }

    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-300/70 dark:bg-yellow-500/50 text-inherit rounded-sm px-0.5 py-0">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
};

export default React.memo(Highlight);