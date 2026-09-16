const SUPABASE_URL = 'https://sbhgubonxoogtjiuslk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiaGd1Ym9ueG9vZ3RqdGl1c2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MzU5ODksImV4cCI6MjEwNTExMTk4OX0.cewT0RcWI95207kvsXtgjqSUN4lssYr4hCAfVY6wG3k';

// Environment Variables
// Initialize the Supabase client
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global Media Upload Utility
window.uploadMedia = async function (file) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await window.supabase.storage
        .from('media')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Upload Error:', error);
        throw error;
    }

    const { data: publicUrlData } = window.supabase.storage
        .from('media')
        .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
};
