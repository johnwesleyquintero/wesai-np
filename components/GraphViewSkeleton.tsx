
import React from 'react';

const GraphViewSkeleton: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center h-full bg-light-background dark:bg-dark-background relative overflow-hidden">
            {/* Animated Nodes Simulation */}
            <div className="relative w-64 h-64">
                {/* Center Node */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-light-primary dark:bg-dark-primary rounded-full animate-ping opacity-20"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-light-primary dark:bg-dark-primary rounded-full shadow-lg z-10"></div>

                {/* Satellite Nodes */}
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-light-text/20 dark:bg-dark-text/20 rounded-full animate-pulse"></div>
                <div className="absolute top-3/4 left-2/3 w-2.5 h-2.5 bg-light-text/20 dark:bg-dark-text/20 rounded-full animate-pulse delay-100"></div>
                <div className="absolute top-1/3 left-3/4 w-2 h-2 bg-light-text/20 dark:bg-dark-text/20 rounded-full animate-pulse delay-200"></div>
                
                {/* Connecting Lines (Simulated via SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-light-border dark:stroke-dark-border opacity-50">
                    <line x1="50%" y1="50%" x2="25%" y2="25%" strokeWidth="1" strokeDasharray="4" className="animate-[dash_10s_linear_infinite]" />
                    <line x1="50%" y1="50%" x2="66%" y2="75%" strokeWidth="1" strokeDasharray="4" />
                    <line x1="50%" y1="50%" x2="75%" y2="33%" strokeWidth="1" strokeDasharray="4" />
                </svg>
            </div>
            
            <div className="mt-8 flex flex-col items-center space-y-2 z-10">
                <div className="skeleton-shimmer h-4 w-32 rounded"></div>
                <div className="skeleton-shimmer h-3 w-48 rounded opacity-60"></div>
            </div>
        </div>
    );
};

export default GraphViewSkeleton;
