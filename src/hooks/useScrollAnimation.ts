import { useRef, useState, useEffect } from 'react';

interface UseScrollAnimationResult {
  ref: React.RefObject<HTMLElement | null>;
  inView: boolean;
}

export function useScrollAnimation(): UseScrollAnimationResult {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          // Once visible, no need to keep observing
          observer.unobserve(element);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, inView };
}
