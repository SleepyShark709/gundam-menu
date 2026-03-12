import { motion, AnimatePresence } from 'framer-motion';
import type { LimitedType, GundamModel } from '../../types';
import styles from './styles.module.css';

export type LimitedSubFilterValue = 'all' | LimitedType;

interface LimitedSubFilterProps {
  value: LimitedSubFilterValue;
  onChange: (value: LimitedSubFilterValue) => void;
  models: GundamModel[];
  visible: boolean;
}

const SUB_FILTERS: { key: LimitedSubFilterValue; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pbandai', label: 'P-Bandai' },
  { key: 'gbase', label: '高达基地' },
  { key: 'event', label: '活动限定' },
  { key: 'sidef', label: 'SIDE-F' },
  { key: 'other', label: '其他' },
];

function getCountByType(models: GundamModel[]): Record<LimitedSubFilterValue, number> {
  const counts: Record<string, number> = { all: models.length };
  for (const m of models) {
    const type = m.limitedType ?? 'other';
    counts[type] = (counts[type] || 0) + 1;
  }
  for (const f of SUB_FILTERS) {
    if (!(f.key in counts)) counts[f.key] = 0;
  }
  return counts as Record<LimitedSubFilterValue, number>;
}

export default function LimitedSubFilter({
  value,
  onChange,
  models,
  visible,
}: LimitedSubFilterProps) {
  const counts = getCountByType(models);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={styles.container}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        >
          <div className={styles.scrollArea}>
            {SUB_FILTERS.map((filter) => {
              const count = counts[filter.key];
              const isActive = value === filter.key;
              const isDisabled = count === 0 && filter.key !== 'all';

              return (
                <button
                  key={filter.key}
                  className={[
                    styles.pill,
                    isActive ? styles.pillActive : '',
                    isDisabled ? styles.pillDisabled : '',
                  ].join(' ')}
                  onClick={() => !isDisabled && onChange(filter.key)}
                  disabled={isDisabled}
                  type="button"
                >
                  {filter.label}
                  <span className={styles.pillCount}>({count})</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
