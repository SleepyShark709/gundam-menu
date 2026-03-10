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

export default function ModelGrid({
  models,
  onSelect,
  isFavorite,
  onToggleFavorite,
  convertToYuan,
  loading = false,
}: ModelGridProps) {
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
    <div className={styles.grid}>
      {models.map((model, index) => (
        <div key={model.id} className={styles.cell}>
          <ModelCard
            model={model}
            onSelect={onSelect}
            isFavorite={isFavorite(model.id)}
            onToggleFavorite={onToggleFavorite}
            convertToYuan={convertToYuan}
            staggerIndex={index}
          />
        </div>
      ))}
    </div>
  );
}
