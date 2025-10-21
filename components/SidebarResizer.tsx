import React from 'react';

interface SidebarResizerProps {
    onResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const SidebarResizer: React.FC<SidebarResizerProps> = ({ onResizeStart }) => {
    return (
        <div
            onMouseDown={onResizeStart}
            className="w-1.5 h-full cursor-col-resize flex-shrink-0 group"
        >
            <div className="w-0.5 h-full bg-light-border dark:bg-dark-border group-hover:bg-light-primary dark:group-hover:bg-dark-primary transition-colors mx-auto"></div>
        </div>
    );
};

export default SidebarResizer;
