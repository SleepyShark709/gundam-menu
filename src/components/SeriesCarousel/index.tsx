import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { SeriesMeta } from '../../types';
import SeriesCard from '../SeriesCard';
import styles from './styles.module.css';

interface SeriesCarouselProps {
  series: SeriesMeta[];
}

// Card width + gap
const CARD_WIDTH = 280;
const CARD_GAP = 24; // --spacing-xl = 24px
const STEP = CARD_WIDTH + CARD_GAP;

export default function SeriesCarousel({ series }: SeriesCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Update active dot based on scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const index = Math.round(scrollLeft / STEP);
    setActiveIndex(Math.max(0, Math.min(index, series.length - 1)));
  }, [series.length]);

  // Snap to card when dot is clicked
  function scrollToIndex(index: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * STEP, behavior: 'smooth' });
    setActiveIndex(index);
  }

  return (
    <div className={styles.wrapper}>
      {/* Cards track */}
      <div
        ref={scrollRef}
        className={styles.scrollContainer}
        onScroll={handleScroll}
      >
        <div className={styles.track}>
          {series.map((s, i) => (
            <motion.div
              key={s.code}
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                ease: [0.175, 0.885, 0.32, 1.275],
              }}
            >
              <SeriesCard series={s} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Page indicator dots */}
      <div className={styles.dots} role="tablist" aria-label="系列选择">
        {series.map((s, i) => (
          <button
            key={s.code}
            className={`${styles.dot} ${i === activeIndex ? styles.active : ''}`}
            onClick={() => scrollToIndex(i)}
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={s.name}
          />
        ))}
      </div>
    </div>
  );
}
