import { AnimatePresence, motion } from 'framer-motion';
import styles from './styles.module.css';

interface LoadingScreenProps {
  loading: boolean;
}

export default function LoadingScreen({ loading }: LoadingScreenProps) {
  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          className={styles.container}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Scanning line overlay */}
          <div className={styles.scanLineWrapper}>
            <div className={styles.scanLine} />
          </div>

          {/* Grid overlay for sci-fi feel */}
          <div className={styles.gridOverlay} />

          {/* Main content */}
          <div className={styles.content}>
            {/* Logo icon area */}
            <motion.div
              className={styles.logoWrapper}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }}
            >
              <div className={styles.logoRing}>
                <div className={styles.logoInner}>
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={styles.logoSvg}
                  >
                    <polygon
                      points="24,4 44,36 4,36"
                      stroke="#00d4ff"
                      strokeWidth="2"
                      fill="none"
                      strokeLinejoin="round"
                    />
                    <polygon
                      points="24,14 36,34 12,34"
                      stroke="#00d4ff"
                      strokeWidth="1"
                      fill="rgba(0,212,255,0.1)"
                      strokeLinejoin="round"
                    />
                    <line x1="24" y1="4" x2="24" y2="44" stroke="#00d4ff" strokeWidth="0.5" strokeDasharray="2,4" />
                    <circle cx="24" cy="24" r="3" fill="#00d4ff" />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              className={styles.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              GUNDAM SEARCH
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className={styles.subtitle}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              高达模型检索系统
            </motion.p>

            {/* Divider line */}
            <motion.div
              className={styles.divider}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            />

            {/* Loading dots */}
            <motion.div
              className={styles.loadingDots}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <span className={styles.dot} style={{ animationDelay: '0ms' }} />
              <span className={styles.dot} style={{ animationDelay: '180ms' }} />
              <span className={styles.dot} style={{ animationDelay: '360ms' }} />
            </motion.div>

            {/* Status text */}
            <motion.p
              className={styles.statusText}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.9 }}
            >
              INITIALIZING SYSTEM...
            </motion.p>
          </div>

          {/* Corner decorations */}
          <div className={`${styles.corner} ${styles.cornerTL}`} />
          <div className={`${styles.corner} ${styles.cornerTR}`} />
          <div className={`${styles.corner} ${styles.cornerBL}`} />
          <div className={`${styles.corner} ${styles.cornerBR}`} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
