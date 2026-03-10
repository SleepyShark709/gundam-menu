import { formatJPY, formatCNY, calcTaxFree } from '../../utils/price';
import styles from './styles.module.css';

interface PriceDisplayProps {
  price: number;
  convertToYuan?: (price: number) => string;
}

export default function PriceDisplay({ price, convertToYuan }: PriceDisplayProps) {
  const taxFreePrice = calcTaxFree(price);
  const cnyPrice = convertToYuan ? convertToYuan(price) : null;

  return (
    <div className={styles.wrapper}>
      <span className={styles.mainPrice}>{formatJPY(price)}</span>
      <div className={styles.subPrices}>
        {cnyPrice && (
          <span className={styles.cnyPrice}>≈ {formatCNY(Number(cnyPrice))}</span>
        )}
        <span className={styles.taxFreePrice}>税前 {formatJPY(taxFreePrice)}</span>
      </div>
    </div>
  );
}
