import React from 'react';
import { Note } from '../../types';
import BacklinksDisplay from '../BacklinksDisplay';
import RelatedNotes from '../RelatedNotes';
import TagInput from '../TagInput';
import TagSuggestions from '../TagSuggestions';

interface Backlink {
    sourceNoteId: string;
    sourceNoteTitle: string;
}

interface EditorMetaProps {
    note: Note;
    backlinks: Backlink[];
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    isReadOnly: boolean;
    allExistingTags: string[];
    suggestedTags: string[];
    onAddTag: (tag: string) => void;
    isLoadingTags: boolean;
    tagSuggestionError: string | null;
    isApiKeyMissing: boolean;
}

const EditorMeta: React.FC<EditorMetaProps> = ({
    note,
    backlinks,
    tags,
    onTagsChange,
    isReadOnly,
    allExistingTags,
    suggestedTags,
    onAddTag,
    isLoadingTags,
    tagSuggestionError,
    isApiKeyMissing,
}) => (
    <div className="mt-12 space-y-8">
        <BacklinksDisplay backlinks={backlinks} />
        {!isApiKeyMissing && <RelatedNotes note={note} />}
        <div id="onboarding-tag-input" className={`pt-6 border-t border-light-border dark:border-dark-border ${isReadOnly ? 'opacity-60' : ''}`}>
            <TagInput
                tags={tags}
                setTags={onTagsChange}
                readOnly={isReadOnly}
                allExistingTags={allExistingTags}
            />
            {!isApiKeyMissing && !isReadOnly && (
                <TagSuggestions
                    suggestions={suggestedTags}
                    onAddTag={onAddTag}
                    isLoading={isLoadingTags}
                    error={tagSuggestionError}
                />
            )}
        </div>
    </div>
);

export default EditorMeta;
