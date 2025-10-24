import { createClient } from '@supabase/supabase-js';

const supabaseUrl: string = 'https://kdohgvaoefxkfbcsjnmw.supabase.co';
// CRITICAL: The key below was corrupted. I have fixed the structural damage, 
// but please double-check and ensure this is your correct and valid Supabase anonymous key.
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkb2hndmFvZWZ4a2ZiY3Nqbm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MDgzNzYsImV4cCI6MjA3NjQ4NDM3Nn0.jQoaYIVUVTG6Kqmh2Fe3OadsHwRRSMZV2qIIBpPrh9A';

// The app will function correctly assuming these values are set for the hosted environment.
export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Supabase Storage Helpers ---
export const IMAGE_BUCKET = 'note_images';

/**
 * Checks if the storage bucket exists, and creates it if it doesn't.
 * This is set to run once on app load for an authenticated user.
 */
export const setupStorageBucket = async () => {
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) throw error;

        const bucketExists = buckets.some((bucket) => bucket.name === IMAGE_BUCKET);

        if (!bucketExists) {
            const { error: createError } = await supabase.storage.createBucket(IMAGE_BUCKET, {
                public: true, // Images will be publicly accessible via URL
                fileSizeLimit: '5MB',
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
            });
            if (createError) throw createError;
            console.log(`Successfully created public bucket: ${IMAGE_BUCKET}`);
        }
    } catch (error) {
        // We log the error but don't re-throw, as the app can function without image uploads.
        // A user trying to upload will receive a specific error toast.
        console.error('Error setting up storage bucket:', error);
    }
};

/**
 * Uploads an image file to the dedicated Supabase Storage bucket.
 * @param userId - The ID of the user uploading the file.
 * @param noteId - The ID of the note the image is associated with.
 * @param file - The image file to upload.
 * @returns The storage path of the uploaded file.
 */
export const uploadImage = async (userId: string, noteId: string, file: File) => {
    if (!userId || !noteId || !file) {
        throw new Error('User ID, Note ID, and file are required for upload.');
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${noteId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(filePath, file);

    if (error) {
        throw new Error(`Failed to upload image: ${error.message}`);
    }

    return data.path;
};

/**
 * Retrieves the public URL for a file from Supabase Storage.
 * @param path - The storage path of the file.
 * @returns The public URL of the file.
 */
export const getPublicUrl = (path: string) => {
    const { data } = supabase.storage
        .from(IMAGE_BUCKET)
        .getPublicUrl(path);
    
    return data.publicUrl;
};