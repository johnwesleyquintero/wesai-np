import React from 'react';

interface StatusIndicatorProps {
    saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
    isFullAiActionLoading: string | null;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    saveStatus,
    isFullAiActionLoading
}) => {
    if (isFullAiActionLoading) {
        return (
            <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-light-ui dark:border-dark-ui border-t-light-primary dark:border-t-dark-primary rounded-full animate-spin"></div>
                <span className="text-sm text-light-text/60 dark:text-dark-text/60">{isFullAiActionLoading}</span>
            </div>
        );
    }

    let colorClass = 'bg-yellow-500';
    let text: string | null = 'Unsaved changes';
    let pulse = false;

    switch (saveStatus) {
        case 'saving':
            colorClass = 'bg-yellow-500';
            text = 'Saving...';
            pulse = true;
            break;
        case 'saved':
            return null; // Don't show anything when saved
        case 'error':
            colorClass = 'bg-red-500';
            text = 'Save Failed';
            break;
        case 'unsaved':
            // No need to render anything here, the Save button will appear
            return null;
    }


    return (
        <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${colorClass} ${pulse ? 'animate-pulse' : ''}`}></span>
            <span className="text-sm text-light-text/60 dark:text-dark-text/60">{text}</span>
        </div>
    );
};

export default StatusIndicator;