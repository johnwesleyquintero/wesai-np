
import React, { useState, useEffect } from 'react';
import { PhotoIcon } from '../Icons';

const ImageRenderer = ({ src, alt, ...props }: { src?: string, alt?: string, [key: string]: any }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        setHasError(false);
        if (!src) {
            setHasError(true);
            setIsLoading(false);
        }
    }, [src]);

    const handleLoad = () => setIsLoading(false);
    const handleError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    if (hasError || !src) {
        return (
            <div className="my-4 p-4 bg-light-ui dark:bg-dark-ui rounded-lg flex flex-col items-center justify-center text-center text-sm text-light-text/60 dark:text-dark-text/60 border border-light-border dark:border-dark-border">
                <PhotoIcon className="h-8 w-8 mb-2" />
                <span>{!src ? "Image source missing." : "Could not load image."}</span>
                <span className="text-xs truncate max-w-full">{alt || src}</span>
            </div>
        );
    }
    
    return (
        <div className="relative my-4 min-h-[5rem] flex items-center justify-center bg-light-ui/50 dark:bg-dark-ui/50 rounded-lg border border-dashed border-light-border dark:border-dark-border overflow-hidden">
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-light-text/60 dark:text-dark-text/60 animate-pulse">
                    <PhotoIcon className="h-8 w-8 mb-2" />
                    {alt && <span className="text-xs truncate max-w-full">{alt}</span>}
                </div>
            )}
            <img 
                src={src} 
                alt={alt || ''}
                onLoad={handleLoad}
                onError={handleError}
                className={`rounded-lg transition-opacity duration-500 w-full relative z-10 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                {...props} 
            />
        </div>
    );
};

export default ImageRenderer;
