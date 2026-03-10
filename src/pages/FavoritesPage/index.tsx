import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GundamModel, SeriesCode } from '../../types';
import { fetchModels } from '../../services/modelService';
import { useFavorites } from '../../hooks/useFavorites';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import ParticleBackground from '../../components/ParticleBackground';
import Header from '../../components/Header';
import ModelCard from '../../components/ModelCard';
import ModelDetail from '../../components/ModelDetail';
import Skeleton from '../../design-system/Skeleton';
import Icon from '../../design-system/Icon';
import Button from '../../design-system/Button';
import styles from './styles.module.css';

const ALL_SERIES: SeriesCode[] = ['hg', 'rg', 'mg', 'pg'];
const SKELETON_COUNT = 4;

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const { convertToYuan } = useExchangeRate();

  const [allModels, setAllModels] = useState<GundamModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<GundamModel | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    Promise.all(ALL_SERIES.map((code) => fetchModels(code)))
      .then((results) => {
        if (!cancelled) {
          setAllModels(results.flat());
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch models:', err);
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const favoriteModels = allModels.filter((m) => favorites.includes(m.id));

  function handleBack() {
    navigate('/');
  }

  function handleExplore() {
    navigate('/');
  }

  function handleSelect(model: GundamModel) {
    setSelectedModel(model);
    setSheetOpen(true);
  }

  function handleSheetClose() {
    setSheetOpen(false);
  }

  return (
    <div className={styles.page}>
      {/* Particle background layer */}
      <div className={styles.particleBg}>
        <ParticleBackground />
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Fixed header */}
        <div className={styles.headerWrapper}>
          <Header
            title="我的收藏"
            showBack
            onBack={handleBack}
          />
        </div>

        {/* Main scrollable area */}
        <main className={styles.main}>
          {loading ? (
            /* Loading skeleton grid */
            <div className={styles.grid}>
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <Skeleton variant="image" className={styles.skeletonImage} />
                  <div className={styles.skeletonInfo}>
                    <Skeleton variant="text" width="40%" height={12} />
                    <Skeleton variant="text" width="90%" height={14} />
                    <Skeleton variant="text" width="55%" height={12} />
                  </div>
                </div>
              ))}
            </div>
          ) : favoriteModels.length === 0 ? (
            /* Empty state */
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Icon name="heart" size={64} color="var(--color-text-muted)" />
              </div>
              <p className={styles.emptyTitle}>还没有收藏的模型</p>
              <p className={styles.emptySubtitle}>去探索精彩的高达世界吧</p>
              <Button variant="primary" size="lg" onClick={handleExplore}>
                去探索
              </Button>
            </div>
          ) : (
            /* Favorites grid */
            <div className={styles.grid}>
              {favoriteModels.map((model) => (
                <div key={model.id} className={styles.cell}>
                  <ModelCard
                    model={model}
                    onSelect={handleSelect}
                    isFavorite={isFavorite(model.id)}
                    onToggleFavorite={toggleFavorite}
                    convertToYuan={convertToYuan}
                  />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ModelDetail bottom sheet */}
      <ModelDetail
        model={selectedModel}
        open={sheetOpen}
        onClose={handleSheetClose}
      />
    </div>
  );
}
