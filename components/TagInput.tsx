import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from './Icons';

interface TagInputProps {
    tags: string[];
    setTags: (tags: string[]) => void;
    allExistingTags?: string[];
    readOnly?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({ tags, setTags, allExistingTags = [], readOnly = false }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleAddTag = (tag: string) => {
        const newTag = tag.trim();
        if (newTag && !tags.includes(newTag)) {
            setTags([...tags, newTag]);
        }
        setInputValue('');
        setSuggestions([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (readOnly) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestions.length > 0 && activeIndex < suggestions.length) {
                handleAddTag(suggestions[activeIndex]);
            } else if (inputValue.trim()) {
                handleAddTag(inputValue);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === 'Escape') {
            setSuggestions([]);
        } else if (e.key === 'Backspace' && !inputValue) {
            e.preventDefault();
            setTags(tags.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        if (readOnly) return;
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        if (value && allExistingTags.length > 0) {
            const filtered = allExistingTags
                .filter(t => t.toLowerCase().includes(value.toLowerCase()) && !tags.includes(t))
                .slice(0, 5); // Limit suggestions
            setSuggestions(filtered);
            setActiveIndex(0);
        } else {
            setSuggestions([]);
        }
    };
    
    useEffect(() => {
        const activeItem = wrapperRef.current?.querySelector('[data-active-suggestion="true"]');
        activeItem?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    return (
        <div ref={wrapperRef} className="relative">
            <div className={`flex items-center flex-wrap gap-2 p-2 border rounded-md transition-colors ${isFocused ? 'border-light-primary dark:border-dark-primary' : 'border-light-border dark:border-dark-border'}`}>
                {tags.map(tag => (
                    <div key={tag} className="flex items-center bg-light-ui dark:bg-dark-ui rounded-full px-3 py-1 text-sm">
                        <span>{tag}</span>
                        {!readOnly && (
                            <button onClick={() => removeTag(tag)} className="ml-2 p-0.5 rounded-full transition-colors hover:bg-light-ui-hover dark:hover:bg-dark-ui-hover">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    placeholder={readOnly ? '' : 'Add a tag...'}
                    className="bg-transparent focus:outline-none flex-1 min-w-[100px]"
                    readOnly={readOnly}
                />
            </div>
            {isFocused && suggestions.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-light-background dark:bg-dark-background rounded-md shadow-lg border border-light-border dark:border-dark-border z-10 p-1">
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={suggestion}
                            data-active-suggestion={index === activeIndex}
                            onMouseDown={(e) => { e.preventDefault(); handleAddTag(suggestion); }}
                            className={`px-3 py-2 text-sm rounded-md cursor-pointer ${index === activeIndex ? 'bg-light-ui dark:bg-dark-ui' : 'hover:bg-light-ui/50 dark:hover:bg-dark-ui/50'}`}
                        >
                            {suggestion}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TagInput;