import { useState, useEffect } from 'react';
import type { GundamModel } from '../../types';
import BottomSheet from '../../design-system/BottomSheet';
import Badge from '../../design-system/Badge';
import Tag from '../../design-system/Tag';
import Button from '../../design-system/Button';
import Skeleton from '../../design-system/Skeleton';
import Icon from '../../design-system/Icon';
import FavoriteButton from '../FavoriteButton';
import { useFavorites } from '../../hooks/useFavorites';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { formatJPY, formatCNY } from '../../utils/price';
import { formatDate } from '../../utils/format';
import { getImageProps, refreshSignedUrl } from '../../utils/image';
import styles from './styles.module.css';

interface ModelDetailProps {
  model: GundamModel | null;
  open: boolean;
  onClose: () => void;
}

export default function ModelDetail({ model, open, onClose }: ModelDetailProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgRetried, setImgRetried] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const { isFavorite, toggleFavorite } = useFavorites();
  const { convertToYuan } = useExchangeRate();

  // Reset image state when model changes
  useEffect(() => {
    if (model) {
      const props = getImageProps(model.imageUrl);
      setImgSrc(props.src);
      setImageLoaded(false);
      setImgRetried(false);
    }
  }, [model?.id]);

  async function handleImgError() {
    if (model && !imgRetried && (model.imageUrl.startsWith('/hobby/') || model.imageUrl.includes('cloudfront.net'))) {
      setImgRetried(true);
      const newUrl = await refreshSignedUrl(model.imageUrl);
      if (newUrl) {
        setImgSrc(newUrl);
        return;
      }
    }
  }

  function handleOpenProductUrl() {
    if (model?.productUrl) {
      window.open(model.productUrl, '_blank', 'noopener,noreferrer');
    }
  }

  function handleFavoriteToggle() {
    if (model) {
      toggleFavorite(model.id);
    }
  }

  const seriesLabel = model?.series.toUpperCase() ?? '';
  const numberLabel = `#${String(model?.number ?? 0).padStart(3, '0')}`;
  const favorited = model ? isFavorite(model.id) : false;

  return (
    <BottomSheet open={open} onClose={onClose} title={model?.name ?? ''}>
      {model && (
        <div className={styles.container}>
          {/* Model image */}
          <div className={styles.imageWrapper}>
            {!imageLoaded && (
              <Skeleton variant="image" className={styles.imageSkeleton} />
            )}
            <img
              src={imgSrc || getImageProps(model.imageUrl).src}
              referrerPolicy="no-referrer"
              loading="lazy"
              alt={model.name}
              className={[styles.image, imageLoaded ? styles.imageVisible : styles.imageHidden].join(' ')}
              onLoad={() => setImageLoaded(true)}
              onError={handleImgError}
            />
          </div>

          {/* Model name */}
          <div className={styles.nameSection}>
            <h2 className={styles.name}>{model.name}</h2>
            {model.nameJa && model.nameJa !== model.name && (
              <p className={styles.nameEn}>{model.nameJa}</p>
            )}
            {model.nameEn && (
              <p className={styles.nameEn}>{model.nameEn}</p>
            )}
          </div>

          {/* Info row: series badge + number badge + limited badge */}
          <div className={styles.infoRow}>
            <Badge variant="default" className={styles.seriesBadge}>
              {seriesLabel}
            </Badge>
            <Badge variant="default" className={styles.numberBadge}>
              {numberLabel}
            </Badge>
            {model.isLimited && (
              <Badge variant="danger" className={styles.limitedBadge}>
                限定
              </Badge>
            )}
          </div>

          {/* Price section */}
          <div className={styles.priceSection}>
            {model.price === 0 ? (
              <div className={styles.priceRow}>
                <span className={styles.priceLabel}>价格</span>
                <span className={styles.priceUnknown}>价格未知</span>
              </div>
            ) : (
              <>
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>JPY含税</span>
                  <span className={styles.priceJPY}>{formatJPY(model.price)}</span>
                </div>
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>人民币约</span>
                  <span className={styles.priceCNY}>{formatCNY(Number(convertToYuan(model.price)))}</span>
                </div>
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>日元免税</span>
                  <span className={styles.priceTaxFree}>{formatJPY(model.priceTaxFree)}</span>
                </div>
              </>
            )}
          </div>

          {/* Release date */}
          <div className={styles.releaseDateRow}>
            <span className={styles.releaseDateLabel}>发售日期</span>
            <span className={styles.releaseDateValue}>{formatDate(model.releaseDate)}</span>
          </div>

          {/* Tags section */}
          {model.tags && model.tags.length > 0 && (
            <div className={styles.tagsSection}>
              {model.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className={styles.actions}>
            <div className={styles.favoriteWrapper}>
              <FavoriteButton
                active={favorited}
                onToggle={handleFavoriteToggle}
              />
              <span className={styles.favoriteLabel}>
                {favorited ? '已收藏' : '收藏'}
              </span>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenProductUrl}
              className={styles.productButton}
            >
              <Icon name="chevronRight" size={16} />
              查看官网
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
