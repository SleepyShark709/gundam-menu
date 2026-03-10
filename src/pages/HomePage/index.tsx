import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { SeriesMeta } from '../../types';
import { fetchSeriesMeta } from '../../services/modelService';
import ParticleBackground from '../../components/ParticleBackground';
import LoadingScreen from '../../components/LoadingScreen';
import Header from '../../components/Header';
import SeriesCarousel from '../../components/SeriesCarousel';
import Icon from '../../design-system/Icon';
import styles from './styles.module.css';

export default function HomePage() {
  const navigate = useNavigate();
  const [series, setSeries] = useState<SeriesMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeriesMeta()
      .then((data) => {
        setSeries(data);
      })
      .catch((err) => {
        console.error('Failed to fetch series meta:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  function handleFavoritesClick() {
    navigate('/favorites');
  }

  return (
    <div className={styles.page}>
      {/* Fixed particle background layer */}
      <div className={styles.particleBg}>
        <ParticleBackground />
      </div>

      {/* Loading screen overlay */}
      <LoadingScreen loading={loading} />

      {/* Main content */}
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.headerWrapper}>
          <Header title="GUNDAM SEARCH" showBack={false} />
        </div>

        {/* Center area with carousel */}
        <main className={styles.main}>
          {!loading && series.length > 0 && (
            <>
              <motion.div
                className={styles.carouselWrapper}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <SeriesCarousel series={series} />
              </motion.div>

              <motion.p
                className={styles.subtitle}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                选择系列开始探索
              </motion.p>
            </>
          )}
        </main>

        {/* Bottom navigation */}
        <nav className={styles.bottomNav}>
          <button
            className={styles.favButton}
            onClick={handleFavoritesClick}
            aria-label="收藏"
          >
            <Icon name="heart" size={22} />
            <span className={styles.favLabel}>收藏</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
