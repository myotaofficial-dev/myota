import { supabase } from '../lib/supabaseClient';

/**
 * Uploads a binary file blob (like compressed WebP image or video) to Supabase Storage.
 * Returns the public URL of the uploaded object.
 */
export const uploadMediaFile = async (fileBlob: Blob, filename: string): Promise<string> => {
  const cleanFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.]/g, '_')}`;

  const { error } = await supabase.storage
    .from('media')
    .upload(cleanFilename, fileBlob, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('[Supabase Storage] Upload failed:', error);
    throw error;
  }

  // Get public URL of the uploaded object
  const { data: publicUrlData } = supabase.storage
    .from('media')
    .getPublicUrl(cleanFilename);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Failed to retrieve public URL from storage bucket.');
  }

  return publicUrlData.publicUrl;
};
