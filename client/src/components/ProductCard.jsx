import { Link, useNavigate } from 'react-router-dom';
import { formatINR } from '../utils/india';
import { mediaUrl } from '../config/api.js';
import { setBuyNowItem } from '../utils/checkoutItem';

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const defaultSize = product.sizes?.[0];
  const primary = mediaUrl(product.image || product.images?.[0] || '/products/placeholders/front.svg');
  const imageCount = product.images?.length || 0;

  const buyNow = () => {
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
      sizeId: defaultSize?.id || 'default',
      sizeLabel: defaultSize?.label || 'Standard',
      weightId: defaultWeight?.id || '',
      weightLabel,
      price: defaultSize?.price || product.price,
      qty: 1,
    });
    navigate('/checkout');
  };

  return (
    <article className="product-card">
      <Link to={`/shop/${product.id}`} className="product-card__media">
        {product.badge && <span className="product-card__badge">{product.badge}</span>}
        {imageCount > 1 && (
          <span className="product-card__pics">{Math.min(imageCount, 5)} photos</span>
        )}
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
        <p className="product-card__vendor">H2R Sports</p>
        <h3>
          <Link to={`/shop/${product.id}`}>{product.name}</Link>
        </h3>
        <div className="product-card__prices">
          <strong>{formatINR(product.price)}</strong>
          {product.compareAt && (
            <span className="product-card__compare">{formatINR(product.compareAt)}</span>
          )}
        </div>
        <button type="button" className="btn btn--sm btn--full" onClick={buyNow}>
          Buy now
        </button>
      </div>
    </article>
  );
}
