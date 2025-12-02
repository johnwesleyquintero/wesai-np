
import React from 'react';

const SkeletonBar: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`skeleton-shimmer rounded ${className || ''}`}></div>
);

const AnalyticsDashboardSkeleton: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col h-full bg-light-background dark:bg-dark-background p-4 sm:p-8 overflow-y-auto">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <SkeletonBar className="h-8 w-8 rounded-md" />
                    <SkeletonBar className="h-8 w-48" />
                </div>
                <SkeletonBar className="h-4 w-64" />
            </header>
            
            <div className="space-y-px overflow-hidden rounded-lg border border-light-border dark:border-dark-border">
                {/* Table Header */}
                <div className="flex bg-light-ui dark:bg-dark-ui p-4 items-center">
                    <div className="w-2/6 pr-4"><SkeletonBar className="h-3 w-20" /></div>
                    <div className="w-2/6 pr-4"><SkeletonBar className="h-3 w-20" /></div>
                    <div className="w-1/6 pr-4"><SkeletonBar className="h-3 w-12" /></div>
                    <div className="w-1/6 pr-4"><SkeletonBar className="h-3 w-12" /></div>
                    <div className="w-1/6"><SkeletonBar className="h-3 w-12" /></div>
                </div>
                {/* Table Rows */}
                {[...Array(6)].map((_, i) => (
                     <div key={i} className="flex p-4 items-center bg-light-background dark:bg-dark-background border-t border-light-border/50 dark:border-dark-border/50">
                        <div className="w-2/6 pr-4 flex items-center gap-2">
                            <SkeletonBar className="h-4 w-4/5" />
                        </div>
                        <div className="w-2/6 pr-4"><SkeletonBar className="h-4 w-3/4" /></div>
                        <div className="w-1/6 pr-4"><SkeletonBar className="h-4 w-8" /></div>
                        <div className="w-1/6 pr-4"><SkeletonBar className="h-4 w-8" /></div>
                        <div className="w-1/6"><SkeletonBar className="h-4 w-12" /></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnalyticsDashboardSkeleton;
