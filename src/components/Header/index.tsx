import type { ReactNode } from 'react';
import styles from './styles.module.css';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export default function Header({
  title,
  showBack = false,
  onBack,
  rightAction,
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Left: back button or spacer */}
        <div className={styles.leftSlot}>
          {showBack && (
            <button
              className={styles.backButton}
              onClick={onBack}
              aria-label="返回"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4L6 10L12 16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Center: title */}
        <h1 className={styles.title}>{title}</h1>

        {/* Right: action slot */}
        <div className={styles.rightSlot}>
          {rightAction ?? null}
        </div>
      </div>

      {/* Bottom border glow */}
      <div className={styles.borderBottom} />
    </header>
  );
}
