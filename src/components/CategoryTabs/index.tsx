import { motion } from 'framer-motion';
import styles from './styles.module.css';

type TabType = 'regular' | 'limited';

interface CategoryTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  regularCount: number;
  limitedCount: number;
}

export type { TabType };

export default function CategoryTabs({
  activeTab,
  onTabChange,
  regularCount,
  limitedCount,
}: CategoryTabsProps) {
  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'regular', label: '\u901A\u8CA9', count: regularCount },
    { key: 'limited', label: '\u9650\u5B9A', count: limitedCount },
  ];

  return (
    <div className={styles.tabBar}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={[
            styles.tab,
            activeTab === tab.key ? styles.tabActive : '',
          ].join(' ')}
          onClick={() => onTabChange(tab.key)}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
        >
          <span className={styles.tabLabel}>{tab.label}</span>
          <span className={styles.tabCount}>({tab.count})</span>
          {activeTab === tab.key && (
            <motion.div
              className={styles.indicator}
              layoutId="categoryTabIndicator"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
