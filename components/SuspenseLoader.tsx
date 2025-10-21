import React from 'react';

const SuspenseLoader: React.FC = () => (
    <div className="flex-1 flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-light-ui dark:border-dark-ui border-t-light-primary dark:border-t-dark-primary rounded-full animate-spin"></div>
    </div>
);

export default SuspenseLoader;
