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
    const [isConfirming, setIsConfirming] = useState(false);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useModalAccessibility(isOpen, onClose, modalRef);

    useEffect(() => {
        if (isOpen) {
            setIsConfirming(false);
            setTimeout(() => cancelButtonRef.current?.focus(), 100);
        }
    }, [isOpen]);
    
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
                    <button ref={cancelButtonRef} onClick={onClose} className="px-4 py-2 rounded-md hover:bg-light-ui dark:hover:bg-dark-ui" disabled={isConfirming}>
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        className={`px-4 py-2 text-white rounded-md ${confirmClass} flex items-center justify-center min-w-[80px]`}
                        disabled={isConfirming}
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