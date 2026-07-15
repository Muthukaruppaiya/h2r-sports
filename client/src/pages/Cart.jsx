import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatINR, INDIA } from '../utils/india';

export default function Cart() {
  const { items, total, setQty, removeItem, clear, count } = useCart();
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('h2r_token');

  const handleCheckout = () => {
    if (!isLoggedIn) {
      navigate('/login?redirect=checkout');
    } else {
      navigate('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <main className="cart-page">
        <div className="container cart-page__empty">
          <h1>Your cart</h1>
          <p>Your cart is empty. Add a bat to continue.</p>
          <Link to="/shop" className="btn btn--primary">
            Browse bats
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <div className="container cart-page__layout">
        <section className="cart-page__list-wrap">
          <div className="cart-page__head">
            <h1>Your cart</h1>
            <span>{count} item{count === 1 ? '' : 's'}</span>
          </div>

          <ul className="cart-page__list">
            {items.map((item) => (
              <li key={item.key} className="cart-page__item">
                <div className="cart-page__item-info">
                  <Link to={`/shop/${item.id}`}>
                    <strong>{item.name}</strong>
                  </Link>
                  <span>{item.sizeLabel}</span>
                  <span className="cart-page__unit">{formatINR(item.price)} each</span>
                </div>

                <div className="cart-page__item-controls">
                  <div className="cart-drawer__qty">
                    <button type="button" onClick={() => setQty(item.key, item.qty - 1)}>
                      −
                    </button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => setQty(item.key, item.qty + 1)}>
                      +
                    </button>
                  </div>
                  <strong>{formatINR(item.price * item.qty)}</strong>
                  <button type="button" className="cart-page__remove" onClick={() => removeItem(item.key)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button type="button" className="cart-drawer__clear" onClick={clear}>
            Clear cart
          </button>
        </section>

        <aside className="cart-page__summary">
          <h2>Order summary</h2>
          <div className="checkout__totals">
            <div>
              <span>Subtotal (incl. GST)</span>
              <span>{formatINR(total)}</span>
            </div>
            <div>
              <span>Shipping</span>
              <span>FREE</span>
            </div>
            <div className="checkout__payable">
              <span>Total</span>
              <strong>{formatINR(total)}</strong>
            </div>
          </div>
          <p className="cart-drawer__ship">✓ {INDIA.shippingNote}</p>

          {!isLoggedIn && (
            <p style={{ 
              marginBottom: '0.75rem', 
              padding: '0.6rem 0.75rem', 
              background: '#fff8e1', 
              borderRadius: '8px', 
              color: '#7a5f00', 
              fontSize: '0.82rem',
              border: '1px solid #ffe082'
            }}>
              🔒 You need to <strong>log in</strong> or <strong>register</strong> to place an order.
            </p>
          )}

          <button
            type="button"
            className="btn btn--primary btn--full"
            onClick={handleCheckout}
          >
            {isLoggedIn ? 'Proceed to checkout' : 'Log in to checkout'}
          </button>

          {!isLoggedIn && (
            <Link
              to="/register?redirect=checkout"
              className="btn btn--full"
              style={{
                marginTop: '0.75rem',
                display: 'block',
                textAlign: 'center',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--navy)',
                color: 'var(--navy)',
                fontWeight: '700',
                fontSize: '0.875rem',
              }}
            >
              New customer? Sign up
            </Link>
          )}

          <Link to="/shop" className="cart-page__continue">
            ← Continue shopping
          </Link>
        </aside>
      </div>
    </main>
  );
}
