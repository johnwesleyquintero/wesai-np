import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStoreContext, useChatContext, useUIContext } from '../context/AppContext';

type OnboardingStep = 'note' | 'tag' | 'ai';

interface OnboardingState {
    createdNote: boolean;
    addedTag: boolean;
    askedAI: boolean;
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
            };
        }
    } catch (error) {
        console.error("Failed to parse onboarding state from localStorage", error);
    }
    return { createdNote: false, addedTag: false, askedAI: false };
};

export const useOnboarding = () => {
    const { notes, activeNote } = useStoreContext();
    const { chatMessages } = useChatContext();
    const { view, isWelcomeModalOpen } = useUIContext();
    
    const [onboardingState, setOnboardingState] = useState<OnboardingState>(getInitialState);
    const [activeCoachMark, setActiveCoachMark] = useState<OnboardingStep | null>(null);

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
    
     // Effect to manage which coach mark is active
    useEffect(() => {
        const isComplete = onboardingState.createdNote && onboardingState.addedTag && onboardingState.askedAI;
        if (isComplete || isWelcomeModalOpen) {
            setActiveCoachMark(null);
            return;
        }

        let nextMark: OnboardingStep | null = null;
        if (!onboardingState.createdNote) {
            nextMark = 'note';
        } else if (!onboardingState.addedTag && activeNote) {
            nextMark = 'tag';
        } else if (!onboardingState.askedAI && view !== 'CHAT') {
            nextMark = 'ai';
        }

        // Prevent flicker by only setting if it's different
        if (activeCoachMark !== nextMark) {
            setActiveCoachMark(nextMark);
        }

    }, [onboardingState, activeNote, view, isWelcomeModalOpen, activeCoachMark]);


    // Effect to persist completion state to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(onboardingState));
        } catch (error) {
            console.error("Failed to save onboarding state to localStorage", error);
        }
    }, [onboardingState]);
    
    const dismissCoachMark = useCallback(() => {
        setActiveCoachMark(null);
    }, []);

    const onboardingSteps = useMemo(() => [
        { id: 'createdNote', text: 'Create your first note', isComplete: onboardingState.createdNote },
        { id: 'addedTag', text: 'Add a tag to a note', isComplete: onboardingState.addedTag },
        { id: 'askedAI', text: 'Ask the AI a question', isComplete: onboardingState.askedAI },
    ], [onboardingState]);

    const isOnboardingComplete = useMemo(() => 
        onboardingState.createdNote && onboardingState.addedTag && onboardingState.askedAI
    , [onboardingState]);

    return { onboardingSteps, isOnboardingComplete, activeCoachMark, dismissCoachMark };
};
