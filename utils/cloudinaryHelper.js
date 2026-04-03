/**
 * Extracts the public_id from a Cloudinary URL.
 * @param {string} url The Cloudinary URL.
 * @returns {string|null} The public_id or null if not found.
 * Example: 'university-images/some-image-name'
 */
export const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  // This regex is designed to capture the public ID including folder paths,
  // but excluding the version number and file extension.
  const match = url.match(/\/v\d+\/(.+?)(?:\.\w+)?$/);
  return match ? match[1] : null;
};
