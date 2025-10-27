import React, { useEffect, useState } from 'react';
import { CheckBadgeIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from './Icons';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onDismiss: () => void;
}

const toastConfig = {
    success: {
        icon: <CheckBadgeIcon className="text-green-500" />,
        style: 'bg-green-50 border-green-300 dark:bg-green-900/50 dark:border-green-700/50 text-green-800 dark:text-green-200',
    },
    error: {
        icon: <ExclamationTriangleIcon className="text-red-500" />,
        style: 'bg-red-50 border-red-300 dark:bg-red-900/50 dark:border-red-700/50 text-red-800 dark:text-red-200',
    },
    info: {
        icon: <InformationCircleIcon className="text-blue-500" />,
        style: 'bg-blue-50 border-blue-300 dark:bg-blue-900/50 dark:border-blue-700/50 text-blue-800 dark:text-blue-200',
    },
};

const Toast: React.FC<ToastProps> = ({ message, type, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = React.useRef<number | null>(null);

    const handleDismiss = React.useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Allow time for fade-out animation
    }, [onDismiss]);

    useEffect(() => {
        setIsVisible(true);
        // Only auto-dismiss non-error toasts
        if (type !== 'error') {
            timeoutRef.current = window.setTimeout(handleDismiss, 5000);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [type, handleDismiss]);

    const { icon, style } = toastConfig[type];

    return (
        <div
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all duration-300 max-w-sm ${style} ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            role="alert"
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0">{icon}</div>
                <span className="flex-1 break-words">{message}</span>
            </div>
            <button 
                onClick={handleDismiss} 
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0 -mr-1"
                aria-label="Dismiss"
            >
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

export default Toast;
