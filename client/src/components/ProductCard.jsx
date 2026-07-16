import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatINR } from '../utils/india';
import { mediaUrl } from '../config/api.js';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const [swapped, setSwapped] = useState(false);
  const defaultSize = product.sizes?.[0];
  const primary = mediaUrl(product.image || product.images?.[0] || '/products/placeholders/front.svg');
  const secondary = mediaUrl(product.hoverImage || product.images?.[1] || primary);
  const showSecondary = swapped && secondary !== primary;
  const imageCount = product.images?.length || 0;

  return (
    <article className="product-card">
      <Link
        to={`/shop/${product.id}`}
        className="product-card__media"
        onMouseEnter={() => setSwapped(true)}
        onMouseLeave={() => setSwapped(false)}
        onTouchStart={() => setSwapped(true)}
        onTouchEnd={() => {
          window.setTimeout(() => setSwapped(false), 600);
        }}
      >
        {product.badge && <span className="product-card__badge">{product.badge}</span>}
        {imageCount > 1 && (
          <span className="product-card__pics">{Math.min(imageCount, 5)} photos</span>
        )}
        <img
          src={primary}
          alt={product.name}
          className={`product-card__img${showSecondary ? ' product-card__img--dim' : ''}`}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = '/products/placeholders/front.svg';
          }}
        />
        {secondary !== primary && (
          <img
            src={secondary}
            alt=""
            aria-hidden="true"
            className={`product-card__img product-card__img--hover${
              showSecondary ? ' is-visible' : ''
            }`}
            loading="lazy"
          />
        )}
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
        <button
          type="button"
          className="btn btn--sm btn--full"
          onClick={() =>
            addItem({
              id: product.id,
              name: product.name,
              sizeId: defaultSize?.id || 'default',
              sizeLabel: defaultSize?.label || 'Standard',
              price: defaultSize?.price || product.price,
              qty: 1,
            })
          }
        >
          Add to bag
        </button>
      </div>
    </article>
  );
}
