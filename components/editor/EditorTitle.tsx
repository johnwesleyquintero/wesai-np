import React from 'react';
import TitleSuggestion from '../TitleSuggestion';

interface EditorTitleProps {
    titleInputRef: React.RefObject<HTMLInputElement>;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isReadOnly: boolean;
    suggestion: string | null;
    onApplySuggestion: (title: string) => void;
    isSuggesting: boolean;
    error: string | null;
    isApiKeyMissing: boolean;
}

const EditorTitle: React.FC<EditorTitleProps> = ({
    titleInputRef,
    value,
    onChange,
    isReadOnly,
    suggestion,
    onApplySuggestion,
    isSuggesting,
    error,
    isApiKeyMissing,
}) => (
    <>
        <input
            ref={titleInputRef}
            type="text"
            value={value}
            onChange={onChange}
            placeholder="Note Title"
            className={`w-full bg-transparent text-3xl sm:text-4xl font-bold focus:outline-none rounded-md ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
            readOnly={isReadOnly}
        />
        {!isApiKeyMissing && !isReadOnly && (
            <TitleSuggestion
                suggestion={suggestion}
                onApply={onApplySuggestion}
                isLoading={isSuggesting}
                error={error}
            />
        )}
    </>
);

export default EditorTitle;
