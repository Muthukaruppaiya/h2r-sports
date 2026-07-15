import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatINR, INDIA } from '../utils/india';

export default function Cart() {
  const { items, total, setQty, removeItem, clear, count } = useCart();

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
          <Link to="/checkout" className="btn btn--primary btn--full">
            Proceed to checkout
          </Link>
          <Link to="/shop" className="cart-page__continue">
            ← Continue shopping
          </Link>
        </aside>
      </div>
    </main>
  );
}
