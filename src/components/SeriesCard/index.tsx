import { useNavigate } from 'react-router-dom';
import type { SeriesMeta, SeriesCode } from '../../types';
import styles from './styles.module.css';

const SERIES_ACCENT: Record<SeriesCode, string> = {
  hg: '#00d4ff',
  rg: '#ff8800',
  mg: '#aa44ff',
  pg: '#ffcc00',
};

interface SeriesCardProps {
  series: SeriesMeta;
}

export default function SeriesCard({ series }: SeriesCardProps) {
  const navigate = useNavigate();
  const accent = SERIES_ACCENT[series.code];

  function handleClick() {
    navigate(`/series/${series.code}`);
  }

  return (
    <div
      className={styles.card}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      style={{ '--series-accent': accent } as React.CSSProperties}
    >
      {/* Circuit board pattern background */}
      <div className={styles.circuitBg} />

      {/* Accent color radial overlay */}
      <div className={styles.accentOverlay} />

      {/* Hexagon decorative SVG */}
      <svg className={styles.hexDecor} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon
          points="100,10 173,50 173,150 100,190 27,150 27,50"
          stroke={accent}
          strokeWidth="2"
          fill="none"
        />
        <polygon
          points="100,35 151,65 151,135 100,165 49,135 49,65"
          stroke={accent}
          strokeWidth="1"
          fill="none"
        />
      </svg>

      {/* Corner brackets */}
      <div className={styles.cornerTL} />
      <div className={styles.cornerTR} />
      <div className={styles.cornerBL} />
      <div className={styles.cornerBR} />

      {/* Main content */}
      <div className={styles.content}>
        <span className={styles.shortName}>{series.shortName}</span>

        <div className={styles.divider} />

        <div className={styles.info}>
          <span className={styles.fullName}>{series.name}</span>
          <span className={styles.scale}>{series.scale}</span>
        </div>

        <div className={styles.countArea}>
          <span className={styles.countLabel}>收录型号</span>
          <span className={styles.countBadge}>
            {series.totalCount > 0 ? series.totalCount : '—'}
          </span>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className={styles.bottomLine} />
    </div>
  );
}
