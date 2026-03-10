import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { SeriesCode, GundamModel, FilterConfig, SortConfig } from '../../types';
import Header from '../../components/Header';
import ModelGrid from '../../components/ModelGrid';
import ModelDetail from '../../components/ModelDetail';
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

  // Filter panel state
  const [filterOpen, setFilterOpen] = useState(false);

  // Filter config (not counting keyword - that's from search bar)
  const [isLimitedFilter, setIsLimitedFilter] = useState<boolean | null>(null);
  const [releaseDateFrom, setReleaseDateFrom] = useState('');
  const [releaseDateTo, setReleaseDateTo] = useState('');
  const [numberFromStr, setNumberFromStr] = useState('');
  const [numberToStr, setNumberToStr] = useState('');

  // Selected model for detail
  const [selectedModel, setSelectedModel] = useState<GundamModel | null>(null);

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

  const filterConfig: FilterConfig = useMemo(() => {
    const config: FilterConfig = {};
    if (debouncedKeyword) config.keyword = debouncedKeyword;
    if (isLimitedFilter !== null) config.isLimited = isLimitedFilter;
    if (releaseDateFrom) config.releaseDateFrom = releaseDateFrom;
    if (releaseDateTo) config.releaseDateTo = releaseDateTo;
    const nFrom = parseInt(numberFromStr, 10);
    const nTo = parseInt(numberToStr, 10);
    if (!isNaN(nFrom)) config.numberFrom = nFrom;
    if (!isNaN(nTo)) config.numberTo = nTo;
    return config;
  }, [debouncedKeyword, isLimitedFilter, releaseDateFrom, releaseDateTo, numberFromStr, numberToStr]);

  const processedModels = useMemo(() => {
    const filtered = filterModels(models, filterConfig);
    const sortConfig = parseSortValue(sortValue);
    return sortModels(filtered, sortConfig);
  }, [models, filterConfig, sortValue]);

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

            {/* Limited toggle */}
            <div className={styles.filterRow}>
              <label className={styles.filterLabel}>仅限定品</label>
              <button
                className={[styles.toggle, isLimitedFilter === true ? styles.toggleActive : ''].join(' ')}
                onClick={() => setIsLimitedFilter(isLimitedFilter === true ? null : true)}
                type="button"
                aria-pressed={isLimitedFilter === true}
              >
                {isLimitedFilter === true ? '已启用' : '关闭'}
              </button>
            </div>

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
                setIsLimitedFilter(null);
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
        <div className={styles.scrollArea}>
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

      {/* Model detail bottom sheet */}
      <ModelDetail model={selectedModel} open={!!selectedModel} onClose={handleCloseDetail} />
    </div>
  );
}
