import type { ReactNode } from 'react';
import styles from './styles.module.css';

interface CardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  glowing?: boolean;
}

export default function Card({ children, onClick, className, glowing = false }: CardProps) {
  return (
    <div
      className={[
        styles.card,
        glowing ? styles.glowing : '',
        className ?? '',
      ].join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
