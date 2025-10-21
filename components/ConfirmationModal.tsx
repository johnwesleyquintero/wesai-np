import React, { useRef, useEffect } from 'react';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    confirmClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message,
    confirmText = 'Delete',
    confirmClass = 'bg-red-600 hover:bg-red-700'
}) => {
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useModalAccessibility(isOpen, onClose, modalRef);

    useEffect(() => {
        if (isOpen) {
            // Timeout allows the element to be in the DOM before focusing
            setTimeout(() => cancelButtonRef.current?.focus(), 100);
        }
    }, [isOpen]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div 
                ref={modalRef}
                role="dialog" 
                aria-modal="true" 
                aria-labelledby="confirmation-modal-title"
                className="bg-light-background dark:bg-dark-background rounded-lg shadow-xl w-full max-w-md p-6" 
                onClick={e => e.stopPropagation()}
            >
                <h2 id="confirmation-modal-title" className="text-xl font-bold mb-4">{title}</h2>
                <p className="mb-6 text-light-text/80 dark:text-dark-text/80">{message}</p>
                <div className="flex justify-end space-x-4">
                    <button ref={cancelButtonRef} onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui">
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className={`px-4 py-2 text-white rounded-md ${confirmClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;