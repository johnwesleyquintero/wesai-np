import React from 'react';

const SkeletonBar: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`bg-light-ui/80 dark:bg-dark-ui/80 rounded ${className || ''}`}></div>
);

const AnalyticsDashboardSkeleton: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col h-full bg-light-background dark:bg-dark-background p-4 sm:p-8 overflow-y-auto animate-pulse">
            <header className="mb-8">
                <SkeletonBar className="h-9 w-3/5" />
                <SkeletonBar className="h-4 w-4/5 mt-3" />
            </header>
            
            <div className="space-y-px overflow-hidden rounded-lg border border-light-border dark:border-dark-border">
                {/* Table Header */}
                <div className="flex bg-light-ui dark:bg-dark-ui p-4">
                    <div className="w-2/6 pr-4"><SkeletonBar className="h-4" /></div>
                    <div className="w-2/6 pr-4"><SkeletonBar className="h-4" /></div>
                    <div className="w-1/6 pr-4"><SkeletonBar className="h-4" /></div>
                    <div className="w-1/6 pr-4"><SkeletonBar className="h-4" /></div>
                    <div className="w-1/6"><SkeletonBar className="h-4" /></div>
                </div>
                {/* Table Rows */}
                {[...Array(5)].map((_, i) => (
                     <div key={i} className="flex p-4 bg-light-background dark:bg-dark-background">
                        <div className="w-2/6 pr-4"><SkeletonBar className="h-5" /></div>
                        <div className="w-2/6 pr-4"><SkeletonBar className="h-5" /></div>
                        <div className="w-1/6 pr-4"><SkeletonBar className="h-5 w-8" /></div>
                        <div className="w-1/6 pr-4"><SkeletonBar className="h-5 w-8" /></div>
                        <div className="w-1/6"><SkeletonBar className="h-5 w-12" /></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnalyticsDashboardSkeleton;
