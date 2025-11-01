import React, { useRef, useEffect, useState } from 'react';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string;
    confirmText?: string;
    confirmClass?: string;
    confirmationRequiredText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message,
    confirmText = 'Delete',
    confirmClass = 'bg-red-600 hover:bg-red-700',
    confirmationRequiredText
}) => {
    const [isConfirming, setIsConfirming] = useState(false);
    const [confirmationInput, setConfirmationInput] = useState('');
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const confirmationInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useModalAccessibility(isOpen, onClose, modalRef);

    useEffect(() => {
        if (isOpen) {
            setIsConfirming(false);
            setConfirmationInput(''); // Reset input on open
            setTimeout(() => {
                if (confirmationRequiredText) {
                    confirmationInputRef.current?.focus();
                } else {
                    cancelButtonRef.current?.focus();
                }
            }, 100);
        }
    }, [isOpen, confirmationRequiredText]);
    
    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            await onConfirm();
        } catch (e) {
            console.error("Confirmation action failed", e);
        } finally {
            // The onClose is often handled by the caller after the async op,
            // but we ensure state is reset if the modal remains open.
            setIsConfirming(false);
        }
    }

    const isConfirmationInvalid = confirmationRequiredText ? confirmationInput !== confirmationRequiredText : false;

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
                
                {confirmationRequiredText && (
                    <div className="mb-6">
                        <p className="text-sm mb-2 text-light-text/80 dark:text-dark-text/80">
                            To confirm, please type "<strong className="text-light-text dark:text-dark-text">{confirmationRequiredText}</strong>" below:
                        </p>
                        <input
                            ref={confirmationInputRef}
                            type="text"
                            value={confirmationInput}
                            onChange={(e) => setConfirmationInput(e.target.value)}
                            className="w-full p-2 bg-light-ui dark:bg-dark-ui rounded-md border border-light-border dark:border-dark-border focus:ring-2 focus:ring-light-primary focus:outline-none"
                            aria-label="Confirmation text input"
                        />
                    </div>
                )}

                <div className="flex justify-end space-x-4">
                    <button ref={cancelButtonRef} onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui" disabled={isConfirming}>
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        className={`px-4 py-2 text-white rounded-md ${confirmClass} flex items-center justify-center min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed`}
                        disabled={isConfirming || isConfirmationInvalid}
                    >
                        {isConfirming ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;