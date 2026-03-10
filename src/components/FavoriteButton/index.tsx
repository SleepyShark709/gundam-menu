import Icon from '../../design-system/Icon';
import styles from './styles.module.css';

interface FavoriteButtonProps {
  active: boolean;
  onToggle: () => void;
}

export default function FavoriteButton({ active, onToggle }: FavoriteButtonProps) {
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.vibrate?.(10);
    onToggle();
  }

  return (
    <button
      className={[styles.button, active ? styles.active : ''].join(' ')}
      onClick={handleClick}
      type="button"
      aria-label={active ? '取消收藏' : '收藏'}
      aria-pressed={active}
    >
      <Icon
        name={active ? 'heartFilled' : 'heart'}
        size={18}
        color={active ? 'var(--color-accent-danger)' : 'var(--color-text-secondary)'}
      />
    </button>
  );
}
