import React, { useEffect, useState } from 'react';
import { CheckBadgeIcon, XMarkIcon } from './Icons';

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
        icon: <XMarkIcon className="text-red-500" />,
        style: 'bg-red-50 border-red-300 dark:bg-red-900/50 dark:border-red-700/50 text-red-800 dark:text-red-200',
    },
    info: {
        icon: <CheckBadgeIcon className="text-blue-500" />,
        style: 'bg-blue-50 border-blue-300 dark:bg-blue-900/50 dark:border-blue-700/50 text-blue-800 dark:text-blue-200',
    },
};

const Toast: React.FC<ToastProps> = ({ message, type, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Animate in
        setIsVisible(true);

        const timer = setTimeout(() => {
            // Animate out
            setIsVisible(false);
            // Fully remove from DOM after animation
            setTimeout(onDismiss, 300);
        }, 4000);

        return () => {
            clearTimeout(timer);
        };
    }, [onDismiss]);

    const { icon, style } = toastConfig[type];

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all duration-300 ${style} ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            role="alert"
        >
            <div className="flex-shrink-0">{icon}</div>
            <span>{message}</span>
        </div>
    );
};

export default Toast;
