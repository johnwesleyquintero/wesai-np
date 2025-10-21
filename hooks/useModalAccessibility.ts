import { useEffect, useRef } from 'react';

/**
 * A hook to improve modal accessibility. It handles:
 * - Trapping focus within the modal.
 * - Closing the modal on 'Escape' key press.
 * - Returning focus to the element that opened the modal.
 *
 * @param isOpen - Whether the modal is currently open.
 * @param onClose - Function to call to close the modal.
 * @param modalRef - A ref to the modal's root element.
 */
export const useModalAccessibility = (
    isOpen: boolean,
    onClose: () => void,
    modalRef: React.RefObject<HTMLElement>
) => {
    const lastFocusedElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Save the element that was focused before the modal opened
            lastFocusedElementRef.current = document.activeElement as HTMLElement;

            const modalElement = modalRef.current;
            if (!modalElement) return;

            // Find all focusable elements within the modal
            const focusableElements = Array.from(
                modalElement.querySelectorAll<HTMLElement>(
                    'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])'
                )
            ).filter(el => el.offsetParent !== null); // Ensure they are visible

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleKeyDown = (e: KeyboardEvent) => {
                // Close on Escape
                if (e.key === 'Escape') {
                    onClose();
                    return;
                }

                // Trap focus with Tab
                if (e.key === 'Tab' && focusableElements.length > 0) {
                    if (e.shiftKey) { // Shift + Tab
                        if (document.activeElement === firstElement) {
                            lastElement?.focus();
                            e.preventDefault();
                        }
                    } else { // Tab
                        if (document.activeElement === lastElement) {
                            firstElement?.focus();
                            e.preventDefault();
                        }
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown);

            // Cleanup function
            return () => {
                document.removeEventListener('keydown', handleKeyDown);
                // Return focus to the previously focused element when the modal closes
                lastFocusedElementRef.current?.focus();
            };
        }
    }, [isOpen, onClose, modalRef]);
};
