import { useState, useEffect } from 'react';

export const useMobileView = (breakpoint: number = 768): boolean => {
    const [isMobileView, setIsMobileView] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
        
        const handleMediaQueryChange = (event: MediaQueryListEvent) => {
            setIsMobileView(event.matches);
        };

        // Set initial state
        setIsMobileView(mediaQuery.matches);

        // Listen for changes
        try {
             mediaQuery.addEventListener('change', handleMediaQueryChange);
        } catch (e) {
            // Safari < 14 uses deprecated addListener
            mediaQuery.addListener(handleMediaQueryChange);
        }
       
        // Cleanup listener on component unmount
        return () => {
            try {
                mediaQuery.removeEventListener('change', handleMediaQueryChange);
            } catch(e) {
                 mediaQuery.removeListener(handleMediaQueryChange);
            }
        };
    }, [breakpoint]);

    return isMobileView;
};
