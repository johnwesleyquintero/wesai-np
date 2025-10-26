import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon } from './Icons';
import { useDynamicPosition } from '../hooks/useDynamicPosition';

interface TagInputProps {
    tags: string[];
    setTags: (tags: string[]) => void;
    readOnly?: boolean;
    allTags: string[];
}

const TagInput: React.FC<TagInputProps> = ({ tags, setTags, readOnly = false, allTags }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(-1);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const anchorRect = inputRef.current?.getBoundingClientRect() ?? null;
    
    const style = useDynamicPosition({
        anchorRect,
        isOpen: showSuggestions,
        menuRef,
    });

    useEffect(() => {
        if (inputValue.trim() && !readOnly) {
            const lowerInput = inputValue.toLowerCase();
            const filtered = allTags.filter(tag =>
                !tags.some(t => t.toLowerCase() === tag.toLowerCase()) && tag.toLowerCase().includes(lowerInput)
            );
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
            setSuggestionIndex(-1);
        } else {
            setShowSuggestions(false);
        }
    }, [inputValue, allTags, tags, readOnly]);

    const handleAddTag = (tag: string) => {
        if (tag.trim() && !tags.some(t => t.toLowerCase() === tag.trim().toLowerCase())) {
            setTags([...tags, tag.trim()]);
        }
        setInputValue('');
        setShowSuggestions(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (readOnly) return;

        if (showSuggestions && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSuggestionIndex(prev => (prev + 1) % suggestions.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestionIndex > -1) {
                    handleAddTag(suggestions[suggestionIndex]);
                } else {
                    handleAddTag(inputValue);
                }
                return;
            }
            if (e.key === 'Escape') {
                setShowSuggestions(false);
                return;
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue) {
            e.preventDefault();
            setTags(tags.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        if (readOnly) return;
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleBlur = () => {
        setTimeout(() => {
            setShowSuggestions(false);
        }, 200);
    };

    return (
        <div className="relative">
            <div className="flex items-center flex-wrap gap-2 p-1 rounded-md border border-transparent focus-within:border-light-border dark:focus-within:border-dark-border">
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
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    onFocus={() => { if (inputValue) setShowSuggestions(true); }}
                    placeholder={readOnly ? '' : 'Add a tag...'}
                    className="bg-transparent focus:outline-none flex-1 min-w-[100px] p-1"
                    readOnly={readOnly}
                />
            </div>
             {showSuggestions && (
                <div 
                    ref={menuRef} 
                    style={style}
                    className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl border border-light-border dark:border-dark-border w-56 animate-fade-in-down py-1 max-h-48 overflow-y-auto"
                >
                    {suggestions.map((tag, index) => (
                        <button
                            key={tag}
                            className={`w-full text-left block px-3 py-2 text-sm ${index === suggestionIndex ? 'bg-light-ui dark:bg-dark-ui' : 'hover:bg-light-ui dark:hover:bg-dark-ui'} transition-colors`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleAddTag(tag);
                            }}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TagInput;