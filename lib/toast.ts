
import { ToastMessage } from '../types';

// Centralized dictionary for application messages
export const TOAST_MESSAGES = {
    SAVE_SUCCESS: "Note saved successfully.",
    SAVE_ERROR: "Failed to save note. Your changes are cached locally.",
    DELETE_SUCCESS: "Item deleted permanently.",
    RESTORE_SUCCESS: "Version restored successfully.",
    TEMPLATE_APPLIED: "Template content applied.",
    TEMPLATE_SAVED: "Template saved successfully.",
    TEMPLATE_DELETED: "Template deleted.",
    AI_ERROR: "AI processing failed. Please try again.",
    AI_SUCCESS: "AI action completed.",
    COPY_SUCCESS: "Copied to clipboard!",
    COPY_ERROR: "Failed to copy to clipboard.",
    IMPORT_SUCCESS: "Data imported successfully! Reloading...",
    EXPORT_SUCCESS: "Data exported successfully.",
    IMAGE_UPLOAD_SUCCESS: "Image uploaded successfully!",
    IMAGE_UPLOAD_ERROR: "Failed to upload image.",
    GENERIC_ERROR: "An unexpected error occurred.",
};

// Custom Event Definition
export const TOAST_EVENT_NAME = 'wescore-toast';

export type ToastEventDetail = Omit<ToastMessage, 'id'>;

/**
 * Static Toast Utility
 * Dispatches events to the ToastProvider without needing React Context hooks.
 * Can be used in hooks, services, or standard JS files.
 */
export const toast = {
    show: (message: string, type: ToastMessage['type']) => {
        const event = new CustomEvent<ToastEventDetail>(TOAST_EVENT_NAME, { 
            detail: { message, type } 
        });
        window.dispatchEvent(event);
    },
    
    success: (message: string = TOAST_MESSAGES.SAVE_SUCCESS) => {
        toast.show(message, 'success');
    },
    
    error: (errorOrMessage: unknown = TOAST_MESSAGES.GENERIC_ERROR) => {
        let message = TOAST_MESSAGES.GENERIC_ERROR;
        
        if (typeof errorOrMessage === 'string') {
            message = errorOrMessage;
        } else if (errorOrMessage instanceof Error) {
            message = errorOrMessage.message;
        }
        
        toast.show(message, 'error');
    },
    
    info: (message: string) => {
        toast.show(message, 'info');
    }
};
