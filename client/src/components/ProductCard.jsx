import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatINR, savePercent } from '../utils/india';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const defaultSize = product.sizes?.[0];
  const save = savePercent(product.price, product.compareAt);
  const thumb = product.image || product.images?.[0] || '/products/placeholders/front.svg';
  const imageCount = product.images?.length || 0;

  return (
    <article className="product-card">
      <Link to={`/shop/${product.id}`} className="product-card__media">
        {product.badge && <span className="product-card__badge">{product.badge}</span>}
        {save && <span className="product-card__save">SAVE {save}%</span>}
        {imageCount > 1 && (
          <span className="product-card__pics">{imageCount} photos</span>
        )}
        <img src={thumb} alt={product.name} className="product-card__img" loading="lazy" />
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
              sizeId: defaultSize.id,
              sizeLabel: defaultSize.label,
              price: defaultSize.price,
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
