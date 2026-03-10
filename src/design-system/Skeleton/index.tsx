import type { CSSProperties } from 'react';
import styles from './styles.module.css';

type SkeletonVariant = 'text' | 'image' | 'card';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export default function Skeleton({
  variant = 'text',
  width,
  height,
  className,
}: SkeletonProps) {
  const style: CSSProperties = {};

  if (width !== undefined) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height !== undefined) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  return (
    <div
      className={[styles.skeleton, styles[variant], className ?? ''].join(' ')}
      style={style}
      aria-hidden="true"
    />
  );
}
