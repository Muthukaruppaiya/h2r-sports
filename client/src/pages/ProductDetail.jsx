import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatINR, INDIA, BRAND } from '../utils/india';
import { buildWhatsAppOrderUrl } from '../utils/whatsapp';
import ProductGallery from '../components/ProductGallery';
import { api } from '../api/store';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [sizeId, setSizeId] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [descOpen, setDescOpen] = useState(false);
  const [addedPulse, setAddedPulse] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDescOpen(false);
    setProduct(null);
    api
      .getProduct(id)
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
        setSizeId(data.sizes?.[0]?.id || '');
      })
      .catch(() => {
        if (!cancelled) setError('Product not found');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <main className="container pdp">
        <p>{error}</p>
        <Link to="/shop">Back to shop</Link>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="pdp">
        <div className="container pdp__grid">
          <div className="skeleton skeleton--gallery" />
          <div className="skeleton-stack">
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--title" />
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line short" />
            <div className="skeleton skeleton--btn" />
          </div>
        </div>
      </main>
    );
  }

  const sizes = product.sizes?.length
    ? product.sizes
    : [{ id: 'default', label: 'Standard', price: product.price }];
  const size = sizes.find((s) => s.id === sizeId) || sizes[0];
  const trustItems = product.features?.length
    ? product.features
    : ['Free engraving', '6 months warranty', 'COD available', 'Pan-India delivery'];

  const cartPayload = {
    id: product.id,
    name: product.name,
    sizeId: size.id,
    sizeLabel: size.label,
    price: size.price,
    qty,
  };

  const addToCart = () => {
    addItem(cartPayload);
    setAddedPulse(true);
    window.setTimeout(() => setAddedPulse(false), 900);
  };

  const buyNow = () => {
    addItem(cartPayload);
    navigate('/checkout');
  };

  const buyWhatsApp = () => {
    const url = buildWhatsAppOrderUrl({
      product,
      size,
      qty,
      pageUrl: window.location.href,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="pdp">
      <div className="container pdp__grid">
        <div className="pdp__media">
          <ProductGallery
            images={product.images || []}
            alt={product.name}
            badge={product.badge}
          />
        </div>

        <div className="pdp__info">
          <Link to={`/collections/${product.collection}`} className="pdp__crumb">
            ← {product.category}
          </Link>
          <p className="product-card__vendor">{BRAND.name}</p>
          <h1 className="pdp__title">{product.name}</h1>
          <div className={`pdp__desc-wrap${descOpen ? ' is-open' : ''}`}>
            <p className="pdp__desc">{product.description}</p>
            {!descOpen && product.description?.length > 90 && (
              <button type="button" className="pdp__read-more" onClick={() => setDescOpen(true)}>
                Read more
              </button>
            )}
            {descOpen && product.description?.length > 90 && (
              <button type="button" className="pdp__read-more" onClick={() => setDescOpen(false)}>
                Show less
              </button>
            )}
          </div>

          <div className="pdp__price-row">
            <span className="pdp__price">{formatINR(size.price)}</span>
            {product.compareAt && product.compareAt > size.price && (
              <span className="pdp__compare">{formatINR(product.compareAt)}</span>
            )}
          </div>
          <p className="pdp__ship-note">
            {INDIA.gstNote} · {INDIA.shippingNote}
          </p>

          <dl className="pdp__specs">
            <div>
              <dt>Willow</dt>
              <dd>{product.willow?.trim() || '—'}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{product.weight?.trim() || '—'}</dd>
            </div>
            <div>
              <dt>Made in</dt>
              <dd>{product.madeIn?.trim() || 'Tamil Nadu, India'}</dd>
            </div>
          </dl>

          {product.features?.length > 0 && (
            <ul className="product__highlights pdp__feature-list">
              {product.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}

          <div className="pdp__field">
            <label htmlFor="pdp-size">Size / handle</label>
            <select id="pdp-size" value={sizeId} onChange={(e) => setSizeId(e.target.value)}>
              {sizes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {formatINR(s.price)}
                </option>
              ))}
            </select>
          </div>

          <div className="pdp__field">
            <label htmlFor="pdp-qty">Quantity</label>
            <input
              id="pdp-qty"
              type="number"
              min="1"
              max="10"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 1)}
            />
          </div>

          <div className="pdp__actions pdp__actions--desktop">
            <button
              type="button"
              className={`btn btn--primary btn--full${addedPulse ? ' is-pulse' : ''}`}
              onClick={addToCart}
            >
              {addedPulse ? 'Added ✓' : `Add to cart — ${formatINR(size.price * qty)}`}
            </button>
            <button type="button" className="btn btn--buy-now btn--full" onClick={buyNow}>
              Buy now
            </button>
            <button type="button" className="btn btn--whatsapp btn--full" onClick={buyWhatsApp}>
              Buy using WhatsApp
            </button>
          </div>

          <p className="pdp__ship-note">{INDIA.returnsNote} · UPI / Cards / COD</p>

          {!product.features?.length && (
            <ul className="product__highlights">
              {trustItems.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Mobile sticky CTA bar */}
      <div className="pdp-sticky" aria-label="Quick buy">
        <div className="pdp-sticky__price">
          <strong>{formatINR(size.price * qty)}</strong>
          <span>{size.label}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
          <button
            type="button"
            className={`btn btn--primary${addedPulse ? ' is-pulse' : ''}`}
            onClick={addToCart}
            style={{ flex: 1, fontSize: '0.8rem', padding: '10px 8px' }}
          >
            {addedPulse ? '✓ Added' : 'Add to cart'}
          </button>
          <button
            type="button"
            className="btn btn--buy-now"
            onClick={buyNow}
            style={{ flex: 1, fontSize: '0.8rem', padding: '10px 8px' }}
          >
            Buy Now
          </button>
          <button
            type="button"
            onClick={buyWhatsApp}
            style={{
              flex: 1,
              fontSize: '0.8rem',
              padding: '10px 8px',
              background: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
        </div>
      </div>
    </main>
  );
}

