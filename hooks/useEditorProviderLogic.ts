import { useState, useCallback, useMemo } from 'react';
import { EditorActions } from '../types';

export const useEditorProviderLogic = () => {
    const [editorActions, setEditorActions] = useState<EditorActions | null>(null);

    const registerEditorActions = useCallback((actions: EditorActions) => setEditorActions(actions), []);
    const unregisterEditorActions = useCallback(() => setEditorActions(null), []);

    return useMemo(() => ({ editorActions, registerEditorActions, unregisterEditorActions }), [editorActions, registerEditorActions, unregisterEditorActions]);
};
