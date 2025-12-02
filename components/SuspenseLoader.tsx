
import React from 'react';

const SuspenseLoader: React.FC = () => (
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-light-background dark:bg-dark-background">
        <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Pulsing Glow Background */}
            <div className="absolute inset-0 bg-light-primary/10 dark:bg-dark-primary/10 rounded-full blur-xl animate-pulse"></div>
            
            {/* Branded Logo SVG */}
            <svg 
                viewBox="0 0 64 64" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12 text-light-primary dark:text-dark-primary animate-[pulse_2s_ease-in-out_infinite]"
            >
                <path 
                    d="M32 14L16 25V39L32 50L48 39V25L32 14Z" 
                    stroke="currentColor" 
                    strokeWidth="4"
                    strokeLinejoin="round"
                />
                <path 
                    d="M32 22L22 29V37L32 44L42 37V29L32 22Z" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    strokeLinejoin="round"
                    className="opacity-60"
                />
                <path d="M16 25L22 29" stroke="currentColor" strokeWidth="2" className="opacity-40" />
                <path d="M48 25L42 29" stroke="currentColor" strokeWidth="2" className="opacity-40" />
                <path d="M16 39L22 37" stroke="currentColor" strokeWidth="2" className="opacity-40" />
                <path d="M48 39L42 37" stroke="currentColor" strokeWidth="2" className="opacity-40" />
            </svg>
        </div>
        
        {/* Loading Bar */}
        <div className="mt-8 w-32 h-1 bg-light-ui dark:bg-dark-ui rounded-full overflow-hidden">
            <div className="h-full bg-light-primary/30 dark:bg-dark-primary/30 w-1/2 animate-[shimmer_1.5s_infinite_linear] rounded-full" style={{
                background: 'linear-gradient(90deg, transparent, currentColor, transparent)', 
                width: '100%'
            }}></div>
        </div>
        <p className="mt-4 text-xs font-medium text-light-text/40 dark:text-dark-text/40 tracking-widest uppercase animate-pulse">
            Loading WesCore
        </p>
    </div>
);

export default SuspenseLoader;
