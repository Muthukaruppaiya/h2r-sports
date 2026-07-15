import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatINR, INDIA, savePercent, BRAND } from '../utils/india';
import { buildWhatsAppOrderUrl } from '../utils/whatsapp';
import ProductGallery from '../components/ProductGallery';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [sizeId, setSizeId] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
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
      <main className="container pdp">
        <p>Loading…</p>
      </main>
    );
  }

  const size = product.sizes.find((s) => s.id === sizeId) || product.sizes[0];
  const save = savePercent(size.price, product.compareAt);

  const cartPayload = {
    id: product.id,
    name: product.name,
    sizeId: size.id,
    sizeLabel: size.label,
    price: size.price,
    qty,
  };

  const addToCart = () => addItem(cartPayload);

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
            saveLabel={save ? `SAVE ${save}%` : null}
          />
        </div>

        <div className="pdp__info">
          <Link to={`/collections/${product.collection}`} className="pdp__crumb">
            ← {product.category}
          </Link>
          <p className="product-card__vendor">{BRAND.name}</p>
          <h1>{product.name}</h1>
          <p className="pdp__desc">{product.description}</p>

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
              <dd>{product.willow}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{product.weight}</dd>
            </div>
            <div>
              <dt>Made in</dt>
              <dd>{product.madeIn}</dd>
            </div>
          </dl>

          <div className="pdp__field">
            <label htmlFor="pdp-size">Size / handle</label>
            <select id="pdp-size" value={sizeId} onChange={(e) => setSizeId(e.target.value)}>
              {product.sizes.map((s) => (
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

          <div className="pdp__actions">
            <button type="button" className="btn btn--primary btn--full" onClick={addToCart}>
              Add to cart — {formatINR(size.price * qty)}
            </button>
            <button type="button" className="btn btn--buy-now btn--full" onClick={buyNow}>
              Buy now
            </button>
            <button type="button" className="btn btn--whatsapp btn--full" onClick={buyWhatsApp}>
              Buy using WhatsApp
            </button>
          </div>

          <p className="pdp__ship-note">{INDIA.returnsNote} · UPI / Cards / COD</p>

          <ul className="product__highlights">
            {product.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
