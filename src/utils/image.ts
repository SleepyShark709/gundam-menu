interface ImageProps {
  src: string;
  referrerPolicy: 'no-referrer';
  loading: 'lazy';
}

export function getImageProps(url: string): ImageProps {
  return {
    src: url,
    referrerPolicy: 'no-referrer',
    loading: 'lazy',
  };
}
