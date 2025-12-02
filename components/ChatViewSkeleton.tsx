
import React from 'react';

const SkeletonBar: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`skeleton-shimmer rounded ${className || ''}`}></div>
);

const ChatBubble: React.FC<{ align: 'left' | 'right', width?: string }> = ({ align, width = 'w-64' }) => (
    <div className={`flex items-start gap-3 ${align === 'right' ? 'justify-end' : ''} animate-fade-in-up`}>
        {align === 'left' && <SkeletonBar className="w-8 h-8 rounded-lg flex-shrink-0 mt-1" />}
        <div className={`space-y-2 p-4 rounded-2xl ${align === 'right' ? 'bg-light-ui dark:bg-dark-ui rounded-tr-sm' : 'bg-transparent pl-0'}`}>
            <SkeletonBar className={`h-4 ${width}`} />
            <SkeletonBar className="h-4 w-3/4" />
            {align === 'left' && <SkeletonBar className="h-4 w-1/2" />}
        </div>
    </div>
);

const ChatViewSkeleton: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col h-full bg-light-background dark:bg-dark-background">
            {/* Header Skeleton */}
            <header className="p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SkeletonBar className="w-6 h-6 rounded-md" />
                        <div>
                            <SkeletonBar className="h-5 w-32 mb-1" />
                            <SkeletonBar className="h-3 w-48" />
                        </div>
                    </div>
                    <SkeletonBar className="h-4 w-20" />
                </div>
            </header>

            {/* Messages Skeleton */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                <div className="max-w-3xl mx-auto w-full space-y-8">
                    <ChatBubble align="right" width="w-48" />
                    <ChatBubble align="left" width="w-72" />
                    <ChatBubble align="right" width="w-56" />
                    <ChatBubble align="left" width="w-full max-w-sm" />
                </div>
            </div>

            {/* Input Skeleton */}
            <div className="flex-shrink-0 p-4 sm:p-6 border-t border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background">
                <div className="max-w-3xl mx-auto">
                    <div className="h-14 w-full rounded-2xl border border-light-border dark:border-dark-border bg-light-ui/30 dark:bg-dark-ui/30 p-2 flex items-end justify-between">
                         <div className="flex gap-2 pb-1 pl-1">
                            <SkeletonBar className="h-8 w-8 rounded-lg" />
                            <SkeletonBar className="h-8 w-8 rounded-lg" />
                         </div>
                         <SkeletonBar className="h-8 w-8 rounded-lg" />
                    </div>
                    <div className="mt-2 flex justify-center">
                        <SkeletonBar className="h-3 w-64" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatViewSkeleton;
