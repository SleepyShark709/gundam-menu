import styles from './styles.module.css';

interface SortOption {
  label: string;
  value: string;
}

interface SortSelectorProps {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
}

export default function SortSelector({ options, value, onChange }: SortSelectorProps) {
  return (
    <div className={styles.track} role="group" aria-label="排序方式">
      {options.map((option) => (
        <button
          key={option.value}
          className={[styles.pill, option.value === value ? styles.active : ''].join(' ')}
          onClick={() => onChange(option.value)}
          type="button"
          aria-pressed={option.value === value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
