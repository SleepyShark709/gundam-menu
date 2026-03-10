import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { GundamModel } from '../../types';
import ModelCard from '../ModelCard';
import Skeleton from '../../design-system/Skeleton';
import styles from './styles.module.css';

interface ModelGridProps {
  models: GundamModel[];
  onSelect: (model: GundamModel) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  convertToYuan?: (price: number) => string;
  loading?: boolean;
}

const SKELETON_COUNT = 6;
const ROW_HEIGHT = 280;
const GAP = 12;
const COLS = 2;

export default function ModelGrid({
  models,
  onSelect,
  isFavorite,
  onToggleFavorite,
  convertToYuan,
  loading = false,
}: ModelGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Group models into rows of 2
  const rows: GundamModel[][] = [];
  for (let i = 0; i < models.length; i += COLS) {
    rows.push(models.slice(i, i + COLS));
  }

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT + GAP,
    overscan: 3,
  });

  if (loading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div key={i} className={styles.skeletonCard}>
            <Skeleton variant="image" className={styles.skeletonImage} />
            <div className={styles.skeletonInfo}>
              <Skeleton variant="text" width="40%" height={12} />
              <Skeleton variant="text" width="90%" height={14} />
              <Skeleton variant="text" width="70%" height={14} />
              <Skeleton variant="text" width="55%" height={12} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>未找到匹配的模型</p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className={styles.virtualContainer}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className={styles.row}>
                {row.map((model) => (
                  <div key={model.id} className={styles.cell}>
                    <ModelCard
                      model={model}
                      onSelect={onSelect}
                      isFavorite={isFavorite(model.id)}
                      onToggleFavorite={onToggleFavorite}
                      convertToYuan={convertToYuan}
                    />
                  </div>
                ))}
                {/* Fill empty cell if row has only 1 item */}
                {row.length < COLS && <div className={styles.cell} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
