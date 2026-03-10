import type { CSSProperties } from 'react';
import styles from './styles.module.css';

export type IconName =
  | 'search'
  | 'close'
  | 'heart'
  | 'heartFilled'
  | 'filter'
  | 'sort'
  | 'chevronLeft'
  | 'chevronRight'
  | 'star';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
}

const paths: Record<IconName, string> = {
  search:
    'M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z',
  close:
    'M18 6L6 18M6 6l12 12',
  heart:
    'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  heartFilled:
    'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  filter:
    'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  sort:
    'M3 6h18M7 12h10M11 18h2',
  chevronLeft:
    'M15 18l-6-6 6-6',
  chevronRight:
    'M9 18l6-6-6-6',
  star:
    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
};

const filledIcons = new Set<IconName>(['heartFilled', 'star']);

export default function Icon({ name, size = 24, color, className }: IconProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    ...(color ? { color } : {}),
  };

  const isFilled = filledIcons.has(name);

  return (
    <svg
      className={`${styles.icon} ${className ?? ''}`}
      style={style}
      viewBox="0 0 24 24"
      fill={isFilled ? 'currentColor' : 'none'}
      stroke={isFilled ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
