import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from './useDebounce';

type History<T> = {
  past: T[];
  present: T;
  future: T[];
};

interface UndoableStateOptions<T> {
  isEqual?: (a: T, b: T) => boolean;
  sessionKey?: string;
}

export const useUndoableState = <T,>(
  initialState: T,
  options: UndoableStateOptions<T> = {}
) => {
  const { 
    isEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b), 
    sessionKey 
  } = options;

  const getInitialHistory = useCallback((): History<T> => {
    if (sessionKey) {
      try {
        const savedSession = sessionStorage.getItem(sessionKey);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          // Basic validation to ensure we're not restoring corrupted data
          if ('past' in parsed && 'present' in parsed && 'future' in parsed) {
            return parsed;
          }
        }
      } catch (e) {
        console.error(`Failed to restore editor session from key "${sessionKey}":`, e);
      }
    }
    return { past: [], present: initialState, future: [] };
  }, [initialState, sessionKey]);
  
  const [history, setHistory] = useState<History<T>>(getInitialHistory);
  
  const debouncedHistory = useDebounce(history, 500);

  useEffect(() => {
      if (sessionKey) {
          try {
              sessionStorage.setItem(sessionKey, JSON.stringify(debouncedHistory));
          } catch (e) {
              console.error(`Failed to save editor session for key "${sessionKey}":`, e);
          }
      }
  }, [debouncedHistory, sessionKey]);


  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      const { past, present, future } = currentHistory;
      if (past.length === 0) {
        return currentHistory;
      }
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      const { past, present, future } = currentHistory;
      if (future.length === 0) {
        return currentHistory;
      }
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const set = useCallback((newStateOrFn: T | ((prevState: T) => T)) => {
    setHistory((currentHistory) => {
      const { past, present } = currentHistory;
      const newState = typeof newStateOrFn === 'function' 
        ? (newStateOrFn as (prevState: T) => T)(present) 
        : newStateOrFn;

      if (isEqual(newState, present)) {
        return currentHistory;
      }
      return {
        past: [...past, present],
        present: newState,
        future: [], // Clear future on new action
      };
    });
  }, [isEqual]);

  const setPresent = useCallback((newState: T) => {
    setHistory(currentHistory => {
        if (isEqual(newState, currentHistory.present)) {
            return currentHistory;
        }
        return {
            ...currentHistory,
            present: newState,
        };
    });
  }, [isEqual]);

  const reset = useCallback((newInitialState: T) => {
     setHistory({
        past: [],
        present: newInitialState,
        future: [],
     })
  }, [])

  return { state: history.present, set, setPresent, undo, redo, reset, canUndo, canRedo };
};
