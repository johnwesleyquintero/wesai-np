import React from 'react';

const SkeletonBar: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`bg-light-ui/80 dark:bg-dark-ui/80 rounded ${className || ''}`}></div>
);

const NoteEditorSkeleton: React.FC = () => {
    const editorPaddingClass = 'px-4 sm:px-8';

    return (
        <div className="flex-1 flex flex-col h-full animate-pulse">
            {/* Toolbar Skeleton */}
            <div className="p-2 sm:p-4 border-b border-light-border dark:border-dark-border flex-shrink-0">
                <div className="flex justify-between items-center">
                    <SkeletonBar className="h-6 w-24" />
                    <div className="flex items-center space-x-2">
                        <SkeletonBar className="h-8 w-8 rounded-md" />
                        <SkeletonBar className="h-8 w-8 rounded-md" />
                        <SkeletonBar className="h-8 w-20 rounded-md hidden sm:block" />
                        <SkeletonBar className="h-8 w-8 rounded-md" />
                    </div>
                </div>
            </div>
            
            {/* Editor Pane Skeleton */}
            <div className="flex-1 overflow-y-auto">
                <div className={`max-w-3xl mx-auto py-12 ${editorPaddingClass}`}>
                    {/* Title */}
                    <SkeletonBar className="h-10 w-3/4 mb-6" />
                    
                    {/* Content */}
                    <div className="space-y-3 mt-4">
                        <SkeletonBar className="h-4 w-full" />
                        <SkeletonBar className="h-4 w-full" />
                        <SkeletonBar className="h-4 w-5/6" />
                        <SkeletonBar className="h-4 w-full" />
                        <SkeletonBar className="h-4 w-3/4" />
                    </div>

                    {/* Tags Skeleton */}
                    <div className="mt-12 pt-6 border-t border-light-border dark:border-dark-border">
                         <div className="flex items-center flex-wrap gap-2">
                            <SkeletonBar className="h-6 w-20 rounded-full" />
                            <SkeletonBar className="h-6 w-24 rounded-full" />
                         </div>
                    </div>
                </div>
            </div>
            
            {/* StatusBar Skeleton */}
            <div className="flex-shrink-0 px-4 sm:px-8 py-1.5 border-t border-light-border dark:border-dark-border flex items-center justify-end space-x-4">
                <SkeletonBar className="h-4 w-16" />
                <SkeletonBar className="h-4 w-20" />
            </div>
        </div>
    );
};

export default NoteEditorSkeleton;
