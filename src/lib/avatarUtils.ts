import { supabase } from "@/integrations/supabase/client";

/**
 * Utility functions for working with avatar URLs
 * The system stores two versions:
 * - Original (1000x1000): stored as {userId}-{timestamp}.jpg
 * - Thumbnail (200x200): stored as {userId}-{timestamp}-thumb.jpg
 */

export interface AvatarSizes {
  thumb: Blob;    // 200x200, 80% quality
  original: Blob; // 1000x1000, 95% quality
}

/**
 * Create an HTMLImageElement from a URL.
 *
 * IMPORTANT:
 * - To generate thumbnails via canvas we must avoid a "tainted" canvas.
 * - Some providers (ex: randomuser.me) don't allow browser fetch due to CORS.
 *   For those, we fetch through a small Supabase Edge Function proxy.
 */
const SUPABASE_FUNCTIONS_BASE_URL = "https://adpnzkvzvjbervzrqhhx.supabase.co/functions/v1";

const createImage = async (url: string): Promise<HTMLImageElement> => {
  const fetchUrl = url.includes("randomuser.me/")
    ? `${SUPABASE_FUNCTIONS_BASE_URL}/image-proxy?url=${encodeURIComponent(url)}`
    : url;

  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    });
    image.addEventListener("error", (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    });
    image.src = objectUrl;
  });
};

/**
 * Generate an image at a specific size and quality
 */
const generateImageAtSize = async (
  image: HTMLImageElement,
  size: number,
  quality: number
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  canvas.width = size;
  canvas.height = size;

  // Draw the image centered and cropped to square
  const minDimension = Math.min(image.width, image.height);
  const sx = (image.width - minDimension) / 2;
  const sy = (image.height - minDimension) / 2;

  ctx.drawImage(
    image,
    sx,
    sy,
    minDimension,
    minDimension,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
};

/**
 * Process an external image URL into two resolutions
 * @param imageUrl - The external image URL
 * @returns Object with thumb and original Blobs
 */
export const processExternalAvatar = async (
  imageUrl: string
): Promise<AvatarSizes> => {
  const image = await createImage(imageUrl);

  const thumb = await generateImageAtSize(image, 200, 0.8);    // 200x200, 80%
  const original = await generateImageAtSize(image, 1000, 0.95); // 1000x1000, 95%

  return { thumb, original };
};

/**
 * Upload avatar images to Supabase storage and return the original URL
 * @param userId - The user's ID
 * @param images - Object with thumb and original Blobs
 * @returns The public URL of the original image
 */
export const uploadAvatarToStorage = async (
  userId: string,
  images: AvatarSizes
): Promise<string> => {
  const paths = generateAvatarPaths(userId);

  // Upload both sizes in parallel
  const [thumbResult, originalResult] = await Promise.all([
    supabase.storage
      .from("avatars")
      .upload(paths.thumb, images.thumb, {
        contentType: "image/jpeg",
        upsert: true,
      }),
    supabase.storage
      .from("avatars")
      .upload(paths.original, images.original, {
        contentType: "image/jpeg",
        upsert: true,
      }),
  ]);

  if (thumbResult.error) throw thumbResult.error;
  if (originalResult.error) throw originalResult.error;

  // Get public URL for the original
  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(paths.original);

  return urlData.publicUrl;
};

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
