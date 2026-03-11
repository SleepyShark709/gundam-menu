interface ImageProps {
  src: string;
  referrerPolicy: 'no-referrer';
  loading: 'lazy';
}

const CLOUDFRONT_HOST = 'https://d3bk8pkqsprcvh.cloudfront.net';
const SIGN_API = '/api/get-signed-url';

// Cache for signed URLs: path -> signedUrl
const signedUrlCache = new Map<string, string>();

/**
 * Rewrites image URLs based on their source:
 * - Old bandai-hobby.net direct image links -> use as-is (still live)
 * - CloudFront pathnames (e.g. /hobby/jp/...) -> full CloudFront URL (unsigned, may fail)
 * - Everything else -> passthrough
 */
function rewriteImageUrl(url: string): string {
  // CloudFront pathname stored by scraper (e.g. /hobby/jp/product/...)
  if (url.startsWith('/hobby/')) {
    return `${CLOUDFRONT_HOST}${url}`;
  }

  return url;
}

export function getImageProps(url: string): ImageProps {
  return {
    src: rewriteImageUrl(url),
    referrerPolicy: 'no-referrer',
    loading: 'lazy',
  };
}

/**
 * Attempts to get a fresh signed URL for CloudFront images.
 * Call this when an unsigned CloudFront URL fails to load.
 *
 * @param imageUrl - The image URL (can be a pathname like /hobby/... or full CloudFront URL)
 * @returns A signed URL string, or null if signing fails or the URL is not a CloudFront path
 */
export async function refreshSignedUrl(imageUrl: string): Promise<string | null> {
  // Extract the pathname from a full URL, or use as-is if already a path
  let path: string;
  try {
    const urlObj = new URL(imageUrl);
    path = urlObj.pathname;
  } catch {
    path = imageUrl;
  }

  if (!path.startsWith('/hobby/')) return null;

  // Check cache first
  const cached = signedUrlCache.get(path);
  if (cached) return cached;

  try {
    const res = await fetch(`${SIGN_API}?path=${encodeURIComponent(path)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.signedUrl) {
      signedUrlCache.set(path, data.signedUrl);
      return data.signedUrl;
    }
  } catch {
    // Signing failed -- caller should handle fallback
  }
  return null;
}

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%230a0e17'/%3E%3Crect x='1' y='1' width='198' height='198' fill='none' stroke='%2300d4ff' stroke-width='1' stroke-dasharray='4,4' opacity='0.3'/%3E%3Ctext x='100' y='95' font-family='monospace' font-size='12' fill='%2300d4ff' opacity='0.5' text-anchor='middle'%3ENO IMAGE%3C/text%3E%3Ctext x='100' y='115' font-family='monospace' font-size='10' fill='%2300d4ff' opacity='0.3' text-anchor='middle'%3E----%3C/text%3E%3C/svg%3E";
