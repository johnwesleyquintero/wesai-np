import { useRef, useEffect } from 'react';

/**
 * A hook that returns a function to check if the component is still mounted.
 * This is useful for preventing state updates on unmounted components in async operations.
 * @returns {() => boolean} A function that returns true if the component is mounted, false otherwise.
 */
export const useIsMounted = () => {
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return () => isMountedRef.current;
};