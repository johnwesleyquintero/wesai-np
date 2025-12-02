
import React from 'react';

const SkeletonBar: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`skeleton-shimmer rounded ${className || ''}`}></div>
);

const NoteEditorSkeleton: React.FC = () => {
    const editorPaddingClass = 'px-4 sm:px-8';

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Toolbar Skeleton */}
            <div className="p-2 sm:p-4 border-b border-light-border dark:border-dark-border flex-shrink-0 bg-light-background dark:bg-dark-background">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <SkeletonBar className="h-4 w-4 rounded-full" />
                        <SkeletonBar className="h-4 w-20" />
                    </div>
                    <div className="flex items-center space-x-2">
                        <SkeletonBar className="h-8 w-8 rounded-md" />
                        <SkeletonBar className="h-8 w-8 rounded-md" />
                        <div className="w-px h-6 bg-light-border dark:border-dark-border mx-1"></div>
                        <SkeletonBar className="h-8 w-20 rounded-md hidden sm:block" />
                        <SkeletonBar className="h-8 w-8 rounded-md" />
                        <SkeletonBar className="h-8 w-8 rounded-md" />
                    </div>
                </div>
            </div>
            
            {/* Editor Pane Skeleton */}
            <div className="flex-1 overflow-y-auto bg-light-background dark:bg-dark-background">
                <div className={`max-w-3xl mx-auto py-12 ${editorPaddingClass}`}>
                    {/* Title */}
                    <SkeletonBar className="h-12 w-3/4 mb-8" />
                    
                    {/* Content Blocks */}
                    <div className="space-y-4">
                        <SkeletonBar className="h-4 w-full" />
                        <SkeletonBar className="h-4 w-full" />
                        <SkeletonBar className="h-4 w-11/12" />
                        <div className="h-4" /> {/* Spacer */}
                        <SkeletonBar className="h-4 w-full" />
                        <SkeletonBar className="h-4 w-5/6" />
                        <div className="h-4" /> {/* Spacer */}
                        <SkeletonBar className="h-32 w-full rounded-lg" /> {/* Code block or Image simulation */}
                        <div className="h-4" /> {/* Spacer */}
                        <SkeletonBar className="h-4 w-full" />
                        <SkeletonBar className="h-4 w-3/4" />
                    </div>

                    {/* Meta Section */}
                    <div className="mt-16 pt-8 border-t border-light-border dark:border-dark-border">
                         <div className="flex flex-col gap-4">
                            <SkeletonBar className="h-6 w-48 mb-2" />
                            <div className="flex gap-2">
                                <SkeletonBar className="h-8 w-24 rounded-full" />
                                <SkeletonBar className="h-8 w-20 rounded-full" />
                                <SkeletonBar className="h-8 w-28 rounded-full" />
                            </div>
                         </div>
                    </div>
                </div>
            </div>
            
            {/* StatusBar Skeleton */}
            <div className="flex-shrink-0 px-4 sm:px-8 py-1.5 border-t border-light-border dark:border-dark-border flex items-center justify-end space-x-4 bg-light-ui/30 dark:bg-dark-ui/30">
                <SkeletonBar className="h-3 w-16" />
                <SkeletonBar className="h-3 w-20" />
                <SkeletonBar className="h-3 w-24" />
            </div>
        </div>
    );
};

export default NoteEditorSkeleton;
