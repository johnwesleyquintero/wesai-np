import { useState, useCallback } from 'react';

type History<T> = {
  past: T[];
  present: T;
  future: T[];
};

export const useUndoableState = <T,>(initialState: T) => {
  const [history, setHistory] = useState<History<T>>({
    past: [],
    present: initialState,
    future: [],
  });

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

  const set = useCallback((newState: T) => {
    setHistory((currentHistory) => {
      const { past, present } = currentHistory;
      // If the new state is the same as the present, do nothing
      if (JSON.stringify(newState) === JSON.stringify(present)) {
        return currentHistory;
      }
      return {
        past: [...past, present],
        present: newState,
        future: [], // Clear future on new action
      };
    });
  }, []);

  const reset = useCallback((newInitialState: T) => {
     setHistory({
        past: [],
        present: newInitialState,
        future: [],
     })
  }, [])

  return { state: history.present, set, undo, redo, reset, canUndo, canRedo };
};
