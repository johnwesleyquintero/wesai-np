
import React from 'react';

const SkeletonBar: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`skeleton-shimmer rounded ${className || ''}`}></div>
);

const TrendAnalysisDashboardSkeleton: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col h-full bg-light-background dark:bg-dark-background p-4 sm:p-8 overflow-y-auto">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <SkeletonBar className="h-8 w-8 rounded-md" />
                    <SkeletonBar className="h-8 w-48" />
                </div>
                <SkeletonBar className="h-4 w-64" />
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hot Topics Skeleton */}
                <div>
                    <SkeletonBar className="h-6 w-32 mb-4" />
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-ui/20 dark:bg-dark-ui/20">
                                <SkeletonBar className="h-4 w-4 rounded-sm flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <SkeletonBar className="h-5 w-3/4" />
                                    <div className="flex gap-3">
                                        <SkeletonBar className="h-3 w-12" />
                                        <SkeletonBar className="h-3 w-16" />
                                        <SkeletonBar className="h-3 w-16" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Most Frequent Connections Skeleton */}
                <div>
                    <SkeletonBar className="h-6 w-48 mb-4" />
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-ui/20 dark:bg-dark-ui/20">
                                <div className="flex items-center justify-between mb-3">
                                     <SkeletonBar className="h-4 w-2/3" />
                                     <SkeletonBar className="h-5 w-16 rounded-full" />
                                </div>
                                <SkeletonBar className="h-7 w-32 rounded-md" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrendAnalysisDashboardSkeleton;
