import React, { useEffect, useState, useRef } from 'react';
import { CheckBadgeIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from './Icons';
import { useIsMounted } from '../hooks/useIsMounted';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onDismiss: () => void;
}

const toastConfig = {
    success: {
        icon: <CheckBadgeIcon className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
    },
    error: {
        icon: <ExclamationTriangleIcon className="w-5 h-5 text-rose-500 dark:text-rose-400" />,
    },
    info: {
        icon: <InformationCircleIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />,
    },
};

const Toast: React.FC<ToastProps> = ({ message, type, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<number | null>(null);
    const dismissedRef = useRef(false);
    const isMounted = useIsMounted();

    const handleDismiss = React.useCallback(() => {
        if (dismissedRef.current) return;
        dismissedRef.current = true;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
        // Allow time for fade-out animation before calling the parent to remove the toast
        setTimeout(() => {
            if (isMounted()) {
                onDismiss();
            }
        }, 300); 
    }, [onDismiss, isMounted]);

    useEffect(() => {
        // Use requestAnimationFrame to ensure the entry transition plays
        requestAnimationFrame(() => setIsVisible(true));
        
        // Auto-dismiss logic
        if (type !== 'error') {
            timeoutRef.current = window.setTimeout(handleDismiss, 4000);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [type, handleDismiss]);

    const { icon } = toastConfig[type];

    return (
        <div
            className={`flex items-start gap-3 p-3 rounded-xl shadow-2xl border text-sm transition-all duration-300 transform w-full max-w-sm pointer-events-auto
            bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200
            ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
            `}
            role="alert"
            onMouseEnter={() => {
                if (timeoutRef.current && type !== 'error') {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
            }}
            onMouseLeave={() => {
                if (!timeoutRef.current && type !== 'error' && !dismissedRef.current) {
                    timeoutRef.current = window.setTimeout(handleDismiss, 2000);
                }
            }}
        >
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 pt-0.5 min-w-0">
                <p className="leading-snug break-words font-medium">{message}</p>
            </div>
            <button 
                onClick={handleDismiss} 
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0 -mr-1"
                aria-label="Dismiss"
            >
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

export default Toast;