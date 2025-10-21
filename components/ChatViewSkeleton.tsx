import React from 'react';

const SkeletonBar: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`bg-light-ui/80 dark:bg-dark-ui/80 rounded ${className || ''}`}></div>
);

const ChatBubble: React.FC<{ align: 'left' | 'right' }> = ({ align }) => (
    <div className={`flex items-start gap-4 ${align === 'right' ? 'justify-end' : ''}`}>
        {align === 'left' && <div className="w-8 h-8 rounded-full bg-light-ui/80 dark:bg-dark-ui/80 flex-shrink-0 mt-1"></div>}
        <div className="max-w-md space-y-2">
            <SkeletonBar className="h-5 w-64" />
            <SkeletonBar className="h-5 w-48" />
        </div>
    </div>
);

const ChatViewSkeleton: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col h-full animate-pulse">
            {/* Header Skeleton */}
            <header className="p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                 <div className="flex items-center mb-4">
                    <div className="flex-1 space-y-2">
                        <SkeletonBar className="h-6 w-48" />
                        <SkeletonBar className="h-4 w-64" />
                    </div>
                </div>
                <div className="flex justify-center">
                    <SkeletonBar className="h-10 w-3/4 rounded-lg" />
                </div>
            </header>

            {/* Messages Skeleton */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                <div className="max-w-3xl mx-auto w-full space-y-6">
                    <ChatBubble align="left" />
                    <ChatBubble align="right" />
                    <ChatBubble align="left" />
                </div>
            </div>

            {/* Input Skeleton */}
            <div className="flex-shrink-0 p-4 sm:p-6 border-t border-light-border dark:border-dark-border">
                <div className="max-w-3xl mx-auto">
                    <SkeletonBar className="h-12 w-full rounded-lg" />
                </div>
            </div>
        </div>
    );
};

export default ChatViewSkeleton;
