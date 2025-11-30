
import { useState, useRef, useCallback } from 'react';

export const useChatAttachments = () => {
    const [image, setImage] = useState<string | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).replace('data:', '').replace(/^.+,/, '');
                setImage(base64String);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const clearAttachment = useCallback(() => {
        setImage(null);
        setIsPreviewModalOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const triggerFileInput = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    return {
        image,
        isPreviewModalOpen,
        setIsPreviewModalOpen,
        fileInputRef,
        handleFileChange,
        clearAttachment,
        triggerFileInput
    };
};
