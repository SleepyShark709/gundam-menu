import type { ReactNode } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import styles from './styles.module.css';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export default function BottomSheet({ open, onClose, children, title }: BottomSheetProps) {
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 200], [1, 0]);

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number } }) {
    if (info.offset.y > 100) {
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden="true"
            style={{ opacity }}
          />

          {/* Sheet */}
          <motion.div
            className={styles.sheet}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            style={{ y }}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? '操作面板'}
          >
            {/* Drag handle */}
            <div className={styles.handleArea} aria-hidden="true">
              <div className={styles.handle} />
            </div>

            {/* Header */}
            {title && (
              <div className={styles.header}>
                <span className={styles.title}>{title}</span>
                <button
                  className={styles.closeButton}
                  onClick={onClose}
                  type="button"
                  aria-label="关闭"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Content */}
            <div className={styles.content}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
