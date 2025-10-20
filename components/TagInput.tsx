import React, { useState } from 'react';
import { XMarkIcon } from './Icons';

interface TagInputProps {
    tags: string[];
    setTags: (tags: string[]) => void;
    readOnly?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({ tags, setTags, readOnly = false }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (readOnly) return;
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            const newTag = inputValue.trim();
            if (!tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setInputValue('');
        } else if (e.key === 'Backspace' && !inputValue) {
            e.preventDefault();
            setTags(tags.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        if (readOnly) return;
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className="flex items-center flex-wrap gap-2">
            {tags.map(tag => (
                <div key={tag} className="flex items-center bg-light-ui dark:bg-dark-ui rounded-full px-3 py-1 text-sm">
                    <span>{tag}</span>
                    {!readOnly && (
                        <button onClick={() => removeTag(tag)} className="ml-2">
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={readOnly ? '' : 'Add a tag...'}
                className="bg-transparent focus:outline-none flex-1 min-w-[100px]"
                readOnly={readOnly}
            />
        </div>
    );
};

export default TagInput;