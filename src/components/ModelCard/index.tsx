import { useState } from 'react';
import type { GundamModel } from '../../types';
import Badge from '../../design-system/Badge';
import Skeleton from '../../design-system/Skeleton';
import FavoriteButton from '../FavoriteButton';
import PriceDisplay from '../PriceDisplay';
import { getImageProps } from '../../utils/image';
import { formatDate } from '../../utils/format';
import styles from './styles.module.css';

interface ModelCardProps {
  model: GundamModel;
  onSelect: (model: GundamModel) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  convertToYuan?: (price: number) => string;
}

export default function ModelCard({
  model,
  onSelect,
  isFavorite,
  onToggleFavorite,
  convertToYuan,
}: ModelCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  const imageProps = getImageProps(model.imageUrl);

  function handleClick() {
    onSelect(model);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(model);
    }
  }

  function handleImgLoad() {
    setImgLoading(false);
  }

  function handleImgError() {
    setImgError(true);
    setImgLoading(false);
  }

  return (
    <div
      className={styles.card}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${model.name} - ${model.series.toUpperCase()} #${String(model.number).padStart(3, '0')}`}
    >
      {/* Image area */}
      <div className={styles.imageWrapper}>
        {(imgLoading || imgError) && (
          <Skeleton variant="image" className={styles.imageSkeleton} />
        )}
        {!imgError && (
          <img
            className={[styles.image, imgLoading ? styles.imageHidden : ''].join(' ')}
            src={imageProps.src}
            referrerPolicy={imageProps.referrerPolicy}
            loading={imageProps.loading}
            alt={model.nameEn ?? model.name}
            onLoad={handleImgLoad}
            onError={handleImgError}
          />
        )}

        {/* Limited badge */}
        {model.isLimited && (
          <div className={styles.limitedBadge}>
            <Badge variant="danger">限定</Badge>
          </div>
        )}

        {/* Favorite button */}
        <div className={styles.favoriteButton}>
          <FavoriteButton
            active={isFavorite}
            onToggle={() => onToggleFavorite(model.id)}
          />
        </div>
      </div>

      {/* Info area */}
      <div className={styles.info}>
        <div className={styles.header}>
          <span className={styles.number}>
            #{String(model.number).padStart(3, '0')}
          </span>
          <span className={styles.date}>{formatDate(model.releaseDate)}</span>
        </div>

        <p className={styles.name}>{model.name}</p>

        <PriceDisplay price={model.price} convertToYuan={convertToYuan} />
      </div>
    </div>
  );
}
