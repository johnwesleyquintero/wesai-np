import React from 'react';
import { Note } from '../../types';

interface SourceNotesProps {
    sources: Note[];
}

const SourceNotes: React.FC<SourceNotesProps> = ({ sources }) => {
    if (!sources || sources.length === 0) return null;

    const handleSourceClick = (index: number) => {
        const sourceEl = document.getElementById(`pinned-source-${index + 1}`);
        if (sourceEl) {
            sourceEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            sourceEl.classList.add('highlight-source');
            setTimeout(() => sourceEl.classList.remove('highlight-source'), 1500);
        }
    };

    return (
        <div className="mt-2">
            <p className="text-xs font-semibold text-light-text/60 dark:text-dark-text/60 mb-1">Sources:</p>
            <ol className="list-decimal list-inside text-xs space-y-1">
                {sources.map((note, index) => (
                    <li key={note.id}>
                        <button
                            onClick={() => handleSourceClick(index)}
                            className="hover:underline text-light-primary dark:text-dark-primary"
                        >
                            {note.title}
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    );
};

export default SourceNotes;