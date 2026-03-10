import type { ReactNode } from 'react';
import styles from './styles.module.css';

type BadgeVariant = 'default' | 'danger';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant], className ?? ''].join(' ')}>
      {children}
    </span>
  );
}
