import type { ReactNode } from 'react';
import styles from './styles.module.css';

type BadgeVariant = 'default' | 'danger' | 'pbandai' | 'gbase' | 'event' | 'sidef';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export type { BadgeVariant };

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant], className ?? ''].join(' ')}>
      {children}
    </span>
  );
}
