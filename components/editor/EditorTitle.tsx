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
    isApiKeyMissing: boolean;
    isAiEnabled: boolean;
}

const EditorTitle: React.FC<EditorTitleProps> = ({
    titleInputRef,
    value,
    onChange,
    isReadOnly,
    suggestion,
    onApplySuggestion,
    isSuggesting,
    isApiKeyMissing,
    isAiEnabled,
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
        {!isApiKeyMissing && !isReadOnly && isAiEnabled && (
            <TitleSuggestion
                suggestion={suggestion}
                onApply={onApplySuggestion}
                isLoading={isSuggesting}
            />
        )}
    </>
);

export default EditorTitle;