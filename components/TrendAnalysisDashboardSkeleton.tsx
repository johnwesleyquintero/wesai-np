import React from 'react';

const SkeletonBar: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`bg-light-ui/80 dark:bg-dark-ui/80 rounded ${className || ''}`}></div>
);

const TrendAnalysisDashboardSkeleton: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col h-full bg-light-background dark:bg-dark-background p-4 sm:p-8 overflow-y-auto animate-pulse">
            <header className="mb-8">
                <SkeletonBar className="h-9 w-3/5" />
                <SkeletonBar className="h-4 w-4/5 mt-3" />
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hot Topics Skeleton */}
                <div>
                    <SkeletonBar className="h-7 w-48 mb-4" />
                    <div className="space-y-3 rounded-lg border border-light-border dark:border-dark-border p-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <SkeletonBar className="h-6 w-6 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <SkeletonBar className="h-4 w-3/4" />
                                    <SkeletonBar className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Most Frequent Connections Skeleton */}
                <div>
                    <SkeletonBar className="h-7 w-64 mb-4" />
                    <div className="space-y-3 rounded-lg border border-light-border dark:border-dark-border p-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <SkeletonBar className="h-6 w-16" />
                                <div className="flex-1 space-y-2">
                                     <SkeletonBar className="h-4 w-full" />
                                     <SkeletonBar className="h-3 w-5/6" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrendAnalysisDashboardSkeleton;