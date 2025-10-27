import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStoreContext, useChatContext, useUIContext } from '../context/AppContext';

type OnboardingStepId = 'note' | 'tag' | 'ai';

interface CoachMarkData {
    id: OnboardingStepId;
    targetSelector: string;
    title: string;
    content: string;
}

const coachMarkMap: Record<OnboardingStepId, CoachMarkData> = {
    note: {
        id: 'note',
        targetSelector: '#onboarding-new-note-btn',
        title: "Create Your First Note",
        content: "Click 'New Note' to get started. All your thoughts will be saved securely.",
    },
    tag: {
        id: 'tag',
        targetSelector: '#onboarding-tag-input',
        title: "Organize with Tags",
        content: "Add tags to your note to categorize it. You'll even get AI-powered suggestions!",
    },
    ai: {
        id: 'ai',
        targetSelector: '#onboarding-ask-ai-btn',
        title: "Ask the AI",
        content: "Switch to the chat view to ask questions about your notes or generate new ideas.",
    }
};


interface OnboardingState {
    createdNote: boolean;
    addedTag: boolean;
    askedAI: boolean;
    skippedNote: boolean;
    skippedTag: boolean;
    skippedAI: boolean;
}

const ONBOARDING_STORAGE_KEY = 'wesai-onboarding-state';

const getInitialState = (): OnboardingState => {
    try {
        const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                createdNote: !!parsed.createdNote,
                addedTag: !!parsed.addedTag,
                askedAI: !!parsed.askedAI,
                skippedNote: !!parsed.skippedNote,
                skippedTag: !!parsed.skippedTag,
                skippedAI: !!parsed.skippedAI,
            };
        }
    } catch (error) {
        console.error("Failed to parse onboarding state from localStorage", error);
    }
    return { createdNote: false, addedTag: false, askedAI: false, skippedNote: false, skippedTag: false, skippedAI: false };
};

export const useOnboarding = () => {
    const { notes, activeNote } = useStoreContext();
    const { chatMessages } = useChatContext();
    const { view, isWelcomeModalOpen } = useUIContext();
    
    const [onboardingState, setOnboardingState] = useState<OnboardingState>(getInitialState);
    const [activeCoachMarkId, setActiveCoachMarkId] = useState<OnboardingStepId | null>(null);

    // Effect to check conditions and update step completion state
    useEffect(() => {
        const checks: Partial<OnboardingState> = {};
        
        if (!onboardingState.createdNote && notes.length > 0) {
            checks.createdNote = true;
        }

        if (!onboardingState.addedTag && notes.some(note => note.tags && note.tags.length > 0)) {
            checks.addedTag = true;
        }

        if (!onboardingState.askedAI && chatMessages.length > 0) {
            checks.askedAI = true;
        }

        if (Object.keys(checks).length > 0) {
            setOnboardingState(prevState => ({ ...prevState, ...checks }));
        }

    }, [notes, chatMessages, onboardingState]);
    
    const dismissCoachMark = useCallback(() => {
        if (activeCoachMarkId) {
            const skipKeyMap: Record<OnboardingStepId, keyof OnboardingState> = {
                note: 'skippedNote',
                tag: 'skippedTag',
                ai: 'skippedAI',
            };
            const keyToSkip = skipKeyMap[activeCoachMarkId];
            setOnboardingState(prev => ({ ...prev, [keyToSkip]: true }));
        }
        setActiveCoachMarkId(null);
    }, [activeCoachMarkId]);
    
     // Effect to manage which coach mark is active
    useEffect(() => {
        const isComplete = onboardingState.createdNote && onboardingState.addedTag && onboardingState.askedAI;
        if (isComplete || isWelcomeModalOpen) {
            setActiveCoachMarkId(null);
            return;
        }

        let nextMark: OnboardingStepId | null = null;
        if (!onboardingState.createdNote && !onboardingState.skippedNote) {
            nextMark = 'note';
        } else if (onboardingState.createdNote && !onboardingState.addedTag && !onboardingState.skippedTag && activeNote) {
            nextMark = 'tag';
        } else if (onboardingState.createdNote && onboardingState.addedTag && !onboardingState.askedAI && !onboardingState.skippedAI && view !== 'CHAT') {
            nextMark = 'ai';
        }

        // Prevent flicker by only setting if it's different
        if (activeCoachMarkId !== nextMark) {
            setActiveCoachMarkId(nextMark);
        }

    }, [onboardingState, activeNote, view, isWelcomeModalOpen, activeCoachMarkId]);


    // Effect to persist completion state to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(onboardingState));
        } catch (error) {
            console.error("Failed to save onboarding state to localStorage", error);
        }
    }, [onboardingState]);

    const onboardingSteps = useMemo(() => [
        { id: 'createdNote', text: 'Create your first note', isComplete: onboardingState.createdNote },
        { id: 'addedTag', text: 'Add a tag to a note', isComplete: onboardingState.addedTag },
        { id: 'askedAI', text: 'Ask the AI a question', isComplete: onboardingState.askedAI },
    ], [onboardingState]);

    const isOnboardingComplete = useMemo(() => 
        onboardingState.createdNote && onboardingState.addedTag && onboardingState.askedAI
    , [onboardingState]);

    const activeCoachMark = activeCoachMarkId ? coachMarkMap[activeCoachMarkId] : null;

    return { onboardingSteps, isOnboardingComplete, activeCoachMark, dismissCoachMark };
};