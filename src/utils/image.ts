interface ImageProps {
  src: string;
  referrerPolicy: 'no-referrer';
  loading: 'lazy';
}

/**
 * Rewrites image URLs:
 * - Local paths (images/...) -> prepend BASE_URL
 * - External URLs (https://...) -> use as-is
 */
function rewriteImageUrl(url: string): string {
  if (url.startsWith('images/')) {
    return `${import.meta.env.BASE_URL}${url}`;
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
 * No-op for local images. Kept for API compatibility.
 */
export async function refreshSignedUrl(_imageUrl: string): Promise<string | null> {
  return null;
}

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%230a0e17'/%3E%3Crect x='1' y='1' width='198' height='198' fill='none' stroke='%2300d4ff' stroke-width='1' stroke-dasharray='4,4' opacity='0.3'/%3E%3Ctext x='100' y='95' font-family='monospace' font-size='12' fill='%2300d4ff' opacity='0.5' text-anchor='middle'%3ENO IMAGE%3C/text%3E%3Ctext x='100' y='115' font-family='monospace' font-size='10' fill='%2300d4ff' opacity='0.3' text-anchor='middle'%3E----%3C/text%3E%3C/svg%3E";
