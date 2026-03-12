import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { SeriesCode, GundamModel, FilterConfig, SortConfig } from '../../types';
import Header from '../../components/Header';
import ModelGrid from '../../components/ModelGrid';
import ModelDetail from '../../components/ModelDetail';
import CategoryTabs from '../../components/CategoryTabs';
import type { TabType } from '../../components/CategoryTabs';
import LimitedSubFilter from '../../components/LimitedSubFilter';
import type { LimitedSubFilterValue } from '../../components/LimitedSubFilter';
import SearchBar from '../../design-system/SearchBar';
import FilterPanel from '../../design-system/FilterPanel';
import SortSelector from '../../design-system/SortSelector';
import Icon from '../../design-system/Icon';
import { useModels } from '../../hooks/useModels';
import { useFavorites } from '../../hooks/useFavorites';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { useDebounce } from '../../hooks/useDebounce';
import { filterModels, sortModels } from '../../services/modelService';
import styles from './styles.module.css';

const SERIES_NAMES: Record<SeriesCode, string> = {
  hg: 'HG - High Grade',
  rg: 'RG - Real Grade',
  mg: 'MG - Master Grade',
  pg: 'PG - Perfect Grade',
};

const SORT_OPTIONS = [
  { label: '编号↑', value: 'number-asc' },
  { label: '编号↓', value: 'number-desc' },
  { label: '价格↑', value: 'price-asc' },
  { label: '价格↓', value: 'price-desc' },
  { label: '日期↑', value: 'releaseDate-asc' },
  { label: '日期↓', value: 'releaseDate-desc' },
];

function parseSortValue(value: string): SortConfig {
  const [field, order] = value.split('-') as [SortConfig['field'], SortConfig['order']];
  return { field, order };
}

export default function SeriesListPage() {
  const { seriesCode } = useParams<{ seriesCode: string }>();
  const navigate = useNavigate();

  const validCode = (seriesCode as SeriesCode) ?? 'hg';
  const seriesTitle = SERIES_NAMES[validCode] ?? seriesCode?.toUpperCase() ?? '';

  const { models, loading, error } = useModels(validCode);
  const { toggleFavorite, isFavorite } = useFavorites();
  const { convertToYuan } = useExchangeRate();

  // Search
  const [searchInput, setSearchInput] = useState('');
  const debouncedKeyword = useDebounce(searchInput, 300);

  // Sort
  const [sortValue, setSortValue] = useState('number-asc');

  // Tab
  const [activeTab, setActiveTab] = useState<TabType>('regular');

  // Limited sub-filter
  const [limitedSubFilter, setLimitedSubFilter] = useState<LimitedSubFilterValue>('all');

  // Filter panel state
  const [filterOpen, setFilterOpen] = useState(false);

  // Filter config (not counting keyword - that's from search bar)
  const [releaseDateFrom, setReleaseDateFrom] = useState('');
  const [releaseDateTo, setReleaseDateTo] = useState('');
  const [numberFromStr, setNumberFromStr] = useState('');
  const [numberToStr, setNumberToStr] = useState('');

  // Selected model for detail
  const [selectedModel, setSelectedModel] = useState<GundamModel | null>(null);

  // Back to top
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showBackTop, setShowBackTop] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function handleScroll() {
      setShowBackTop(el!.scrollTop > el!.clientHeight);
    }
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBackTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleFilterToggle = useCallback(() => {
    setFilterOpen((prev) => !prev);
  }, []);

  const handleModelSelect = useCallback((model: GundamModel) => {
    setSelectedModel(model);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedModel(null);
  }, []);

  // Split models by limited/regular
  const { regularModels, limitedModels } = useMemo(() => ({
    regularModels: models.filter(m => !m.isLimited),
    limitedModels: models.filter(m => m.isLimited),
  }), [models]);

  const filterConfig: FilterConfig = useMemo(() => {
    const config: FilterConfig = {};
    if (debouncedKeyword) config.keyword = debouncedKeyword;
    if (releaseDateFrom) config.releaseDateFrom = releaseDateFrom;
    if (releaseDateTo) config.releaseDateTo = releaseDateTo;
    const nFrom = parseInt(numberFromStr, 10);
    const nTo = parseInt(numberToStr, 10);
    if (!isNaN(nFrom)) config.numberFrom = nFrom;
    if (!isNaN(nTo)) config.numberTo = nTo;
    return config;
  }, [debouncedKeyword, releaseDateFrom, releaseDateTo, numberFromStr, numberToStr]);

  const processedModels = useMemo(() => {
    const tabModels = activeTab === 'regular' ? regularModels : limitedModels;
    const subFiltered = activeTab === 'limited' && limitedSubFilter !== 'all'
      ? tabModels.filter(m => (m.limitedType ?? 'other') === limitedSubFilter)
      : tabModels;
    const filtered = filterModels(subFiltered, filterConfig);
    const sortConfig = parseSortValue(sortValue);
    return sortModels(filtered, sortConfig);
  }, [activeTab, regularModels, limitedModels, limitedSubFilter, filterConfig, sortValue]);

  const filterIcon = (
    <button
      className={styles.filterIconButton}
      onClick={handleFilterToggle}
      type="button"
      aria-label="筛选"
      aria-expanded={filterOpen}
    >
      <Icon
        name="filter"
        size={20}
        color={filterOpen ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)'}
      />
    </button>
  );

  return (
    <div className={styles.page}>
      <Header
        title={seriesTitle}
        showBack
        onBack={handleBack}
        rightAction={filterIcon}
      />

      <div className={styles.content}>
        {/* Search bar */}
        <div className={styles.searchWrapper}>
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder={`搜索 ${seriesTitle} 型号...`}
            onClear={() => setSearchInput('')}
          />
        </div>

        {/* Category tabs */}
        <CategoryTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          regularCount={regularModels.length}
          limitedCount={limitedModels.length}
        />

        {/* Limited sub-filter */}
        <LimitedSubFilter
          value={limitedSubFilter}
          onChange={setLimitedSubFilter}
          models={limitedModels}
          visible={activeTab === 'limited'}
        />

        {/* Sort selector */}
        <div className={styles.sortWrapper}>
          <SortSelector
            options={SORT_OPTIONS}
            value={sortValue}
            onChange={setSortValue}
          />
        </div>

        {/* Filter panel */}
        <FilterPanel open={filterOpen} onClose={() => setFilterOpen(false)}>
          <div className={styles.filterContent}>
            <h3 className={styles.filterTitle}>筛选条件</h3>

            {/* Release date range */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>发售时间范围</label>
              <div className={styles.rangeRow}>
                <input
                  className={styles.rangeInput}
                  type="text"
                  placeholder="YYYY-MM"
                  value={releaseDateFrom}
                  onChange={(e) => setReleaseDateFrom(e.target.value)}
                  maxLength={7}
                  inputMode="numeric"
                />
                <span className={styles.rangeSep}>—</span>
                <input
                  className={styles.rangeInput}
                  type="text"
                  placeholder="YYYY-MM"
                  value={releaseDateTo}
                  onChange={(e) => setReleaseDateTo(e.target.value)}
                  maxLength={7}
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* Number range */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>编号范围</label>
              <div className={styles.rangeRow}>
                <input
                  className={styles.rangeInput}
                  type="number"
                  placeholder="起始编号"
                  value={numberFromStr}
                  onChange={(e) => setNumberFromStr(e.target.value)}
                  min={1}
                  inputMode="numeric"
                />
                <span className={styles.rangeSep}>—</span>
                <input
                  className={styles.rangeInput}
                  type="number"
                  placeholder="结束编号"
                  value={numberToStr}
                  onChange={(e) => setNumberToStr(e.target.value)}
                  min={1}
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* Reset button */}
            <button
              className={styles.resetButton}
              onClick={() => {
                setReleaseDateFrom('');
                setReleaseDateTo('');
                setNumberFromStr('');
                setNumberToStr('');
              }}
              type="button"
            >
              重置筛选
            </button>
          </div>
        </FilterPanel>

        {/* Scrollable area */}
        <div className={styles.scrollArea} ref={scrollRef}>
          {/* Result count */}
          {!loading && !error && (
            <div className={styles.resultCount}>
              <span>共 {processedModels.length} 个模型</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className={styles.errorState}>
              <p className={styles.errorText}>加载失败，请稍后重试</p>
            </div>
          )}

          {/* Model grid */}
          <ModelGrid
            models={processedModels}
            onSelect={handleModelSelect}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            convertToYuan={convertToYuan}
            loading={loading}
          />
        </div>
      </div>

      {/* Back to top */}
      {showBackTop && (
        <button
          className={styles.backTopButton}
          onClick={handleBackTop}
          type="button"
          aria-label="回到顶部"
        >
          <Icon name="chevronRight" size={20} />
        </button>
      )}

      {/* Model detail bottom sheet */}
      <ModelDetail model={selectedModel} open={!!selectedModel} onClose={handleCloseDetail} />
    </div>
  );
}
