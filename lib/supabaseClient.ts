import { createClient } from '@supabase/supabase-js';

// FIX: Explicitly type as string to allow comparison with placeholder values without TypeScript errors.
const supabaseUrl: string = 'https://kdohgvaoefxkfbcsjnmw.supabase.co';
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkb2hndmFvZWZ4a2ZiY3Nqbm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MDgzNzYsImV4cCI6MjA3NjQ4NDM3Nn0.jQoaYIVUVTG6Kqmh2Fe3OadsHwRRSMZV2qIIBpPrh9A';

// This flag checks if you have updated the placeholder values.
// The app will show a configuration screen until these are changed.
export const isSupabaseConfigured = 
    supabaseUrl !== 'YOUR_SUPABASE_URL_PLACEHOLDER' && 
    supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY_PLACEHOLDER';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);