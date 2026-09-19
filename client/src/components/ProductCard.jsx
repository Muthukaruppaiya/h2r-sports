import { Link, useNavigate } from 'react-router-dom';
import { formatINR } from '../utils/india';
import { mediaUrl } from '../config/api.js';
import { setBuyNowItem } from '../utils/checkoutItem';

function storefrontBadge(value) {
  const text = String(value || '').trim();
  if (!text || /^\d+$/.test(text) || text.length <= 1) return '';
  return text;
}

function productIsInStock(product) {
  if (product?.inStock === false) return false;
  const sizes = product?.sizes || [];
  if (!sizes.length) return true;
  return sizes.some((s) => Math.floor(Number(s.stock) || 0) > 0);
}

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const inStock = productIsInStock(product);
  const badge = storefrontBadge(product.badge);
  const defaultSize =
    product.sizes?.find((s) => Math.floor(Number(s.stock) || 0) > 0) || product.sizes?.[0];
  const primary = mediaUrl(product.image || product.images?.[0] || '/products/placeholders/front.svg');

  const buyNow = () => {
    if (!inStock) return;
    const defaultWeight = product.weights?.[0];
    const weightLabel = defaultWeight
      ? defaultWeight.label ||
        (defaultWeight.from && defaultWeight.to
          ? `${defaultWeight.from}g – ${defaultWeight.to}g`
          : '')
      : '';
    setBuyNowItem({
      id: product.id,
      name: product.name,
      image: product.images?.[0] || product.image || '',
      sizeId: defaultSize?.id || 'default',
      sizeLabel: defaultSize?.label || 'Standard',
      weightId: defaultWeight?.id || '',
      weightLabel,
      price: defaultSize?.price || product.price,
      compareAt: product.compareAt || null,
      qty: 1,
    });
    navigate('/checkout');
  };

  return (
    <article className={`product-card${inStock ? '' : ' product-card--sold'}`}>
      <Link to={`/shop/${product.id}`} className="product-card__media">
        {badge ? <span className="product-card__badge">{badge}</span> : null}
        {!inStock && <span className="product-card__badge product-card__badge--sold">Sold out</span>}
        <img
          src={primary}
          alt={product.name}
          className="product-card__img"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = '/products/placeholders/front.svg';
          }}
        />
      </Link>
      <div className="product-card__body">
        <h3>
          <Link to={`/shop/${product.id}`}>{product.name}</Link>
        </h3>
        <div className="product-card__prices">
          <strong>{formatINR(product.price)}</strong>
          {product.compareAt && (
            <span className="product-card__compare">{formatINR(product.compareAt)}</span>
          )}
        </div>
        <button
          type="button"
          className="btn btn--sm btn--full"
          onClick={buyNow}
          disabled={!inStock}
        >
          {inStock ? 'Buy now' : 'Sold out'}
        </button>
      </div>
    </article>
  );
}
