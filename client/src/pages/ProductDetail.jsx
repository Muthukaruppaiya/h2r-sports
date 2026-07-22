import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatINR, INDIA, BRAND } from '../utils/india';
import { buildWhatsAppOrderUrl } from '../utils/whatsapp';
import { setBuyNowItem } from '../utils/checkoutItem';
import ProductGallery from '../components/ProductGallery';
import { api } from '../api/store';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [sizeId, setSizeId] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [descOpen, setDescOpen] = useState(false);

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
        if (!cancelled) setError('This product is unavailable right now.');
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
    : ['Free premium cover', '6 months handle warranty', 'UPI / Cards', 'Pan-India delivery'];

  const buyPayload = {
    id: product.id,
    name: product.name,
    sizeId: size.id,
    sizeLabel: size.label,
    price: size.price,
    qty,
  };

  const buyNow = () => {
    setBuyNowItem(buyPayload);
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
            <button type="button" className="btn btn--primary btn--full" onClick={buyNow}>
              Buy now — {formatINR(size.price * qty)}
            </button>
            <button type="button" className="btn btn--whatsapp btn--full" onClick={buyWhatsApp}>
              Buy using WhatsApp
            </button>
          </div>

          <p className="pdp__ship-note">{INDIA.returnsNote} · UPI / Cards</p>

          {!product.features?.length && (
            <ul className="product__highlights">
              {trustItems.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="pdp-sticky" aria-label="Quick buy">
        <div className="pdp-sticky__price">
          <strong>{formatINR(size.price * qty)}</strong>
          <span>{size.label}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
          <button
            type="button"
            className="btn btn--primary"
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
              gap: '4px',
            }}
          >
            WhatsApp
          </button>
        </div>
      </div>
    </main>
  );
}
