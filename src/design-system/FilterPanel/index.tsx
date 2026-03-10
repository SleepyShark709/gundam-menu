import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './styles.module.css';

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function FilterPanel({ open, onClose, children }: FilterPanelProps) {
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
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            className={styles.panel}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            role="region"
            aria-label="筛选面板"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
