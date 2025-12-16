import { supabase } from "@/integrations/supabase/client";

/**
 * Utility functions for working with avatar URLs
 * The system stores two versions:
 * - Original (1000x1000): stored as {userId}-{timestamp}.jpg
 * - Thumbnail (200x200): stored as {userId}-{timestamp}-thumb.jpg
 */

/**
 * Get the thumbnail URL from the original avatar URL
 * @param avatarUrl - The original avatar URL
 * @returns The thumbnail URL or the original if parsing fails
 */
export const getAvatarThumbUrl = (avatarUrl: string | null): string | null => {
  if (!avatarUrl) return null;
  
  // Check if it's already a thumb URL
  if (avatarUrl.includes('-thumb.jpg')) {
    return avatarUrl;
  }
  
  // Convert original URL to thumb URL
  // Pattern: profiles/{userId}-{timestamp}.jpg -> profiles/{userId}-{timestamp}-thumb.jpg
  return avatarUrl.replace('.jpg', '-thumb.jpg');
};

/**
 * Get the original (full size) URL from any avatar URL
 * @param avatarUrl - Any avatar URL (thumb or original)
 * @returns The original URL
 */
export const getAvatarOriginalUrl = (avatarUrl: string | null): string | null => {
  if (!avatarUrl) return null;
  
  // If it's a thumb URL, convert to original
  if (avatarUrl.includes('-thumb.jpg')) {
    return avatarUrl.replace('-thumb.jpg', '.jpg');
  }
  
  return avatarUrl;
};

/**
 * Generate file paths for both avatar sizes
 * @param userId - The user's ID
 * @returns Object with thumb and original file paths
 */
export const generateAvatarPaths = (userId: string): { thumb: string; original: string } => {
  const timestamp = Date.now();
  const basePath = `profiles/${userId}-${timestamp}`;
  
  return {
    thumb: `${basePath}-thumb.jpg`,
    original: `${basePath}.jpg`,
  };
};
