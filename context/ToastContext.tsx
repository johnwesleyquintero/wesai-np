import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastMessage } from '../types';
import Toast from '../components/Toast';

type ToastContextType = {
    showToast: (options: Omit<ToastMessage, 'id'>) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((options: Omit<ToastMessage, 'id'>) => {
        const newToast: ToastMessage = {
            id: Date.now(),
            ...options,
        };
        // Prepend new toasts so they appear at the "start" of the flex container (bottom)
        setToasts(prevToasts => {
            const updated = [newToast, ...prevToasts];
            return updated.slice(0, 3); // Limit to 3 toasts to avoid clutter
        });
    }, []);

    const removeToast = (id: number) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed z-[100] flex flex-col-reverse gap-2 pointer-events-none
                bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 sm:items-end">
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onDismiss={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};