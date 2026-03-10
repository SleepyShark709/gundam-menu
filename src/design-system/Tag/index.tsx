import type { ReactNode } from 'react';
import styles from './styles.module.css';

interface TagProps {
  children: ReactNode;
  className?: string;
}

export default function Tag({ children, className }: TagProps) {
  return (
    <span className={[styles.tag, className ?? ''].join(' ')}>
      {children}
    </span>
  );
}
