import React, { useEffect } from 'react';

export const useAutoResizeTextArea = (
    textAreaRef: React.RefObject<HTMLTextAreaElement>,
    value: string,
    maxHeight: number | null = null
) => {
    useEffect(() => {
        const textarea = textAreaRef.current;
        if (textarea) {
            const adjustHeight = () => {
                textarea.style.height = 'auto';
                const scrollHeight = textarea.scrollHeight;
                if (maxHeight) {
                    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
                } else {
                    textarea.style.height = `${scrollHeight}px`;
                }
            };

            adjustHeight();

            // Add resize listener to handle window changes
            window.addEventListener('resize', adjustHeight);
            return () => window.removeEventListener('resize', adjustHeight);
        }
    }, [value, maxHeight, textAreaRef]);
};