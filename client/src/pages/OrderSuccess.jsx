import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { BRAND, formatINR } from '../utils/india';
import { api } from '../api/store';

function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: `${4 + ((i * 17) % 92)}%`,
        delay: `${(i % 10) * 0.04}s`,
        duration: `${1.4 + (i % 5) * 0.18}s`,
        color: ['#25d366', '#34b7f1', '#f59e0b', '#ef4444', '#a855f7', '#0a2540'][i % 6],
        rotate: `${(i * 47) % 360}deg`,
      })),
    []
  );

  return (
    <div className="pay-success__confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            background: p.color,
            ['--spin']: p.rotate,
          }}
        />
      ))}
    </div>
  );
}

export default function OrderSuccess() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [error, setError] = useState('');
  const [showSplash, setShowSplash] = useState(!!location.state?.justPaid);

  useEffect(() => {
    if (order || !id) return;
    api
      .getOrder(id)
      .then(setOrder)
      .catch(() => setError('We could not load this order. Please try again.'));
  }, [id, order]);

  useEffect(() => {
    if (!showSplash) return undefined;
    const t = window.setTimeout(() => setShowSplash(false), 2400);
    return () => window.clearTimeout(t);
  }, [showSplash]);

  if (error) {
    return (
      <main className="checkout">
        <div className="container checkout__empty">
          <h1>{error}</h1>
          <Link to="/shop" className="btn btn--primary">
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="checkout">
        <div className="container checkout__empty">
          <p>Loading order…</p>
        </div>
      </main>
    );
  }

  const orderRef = order.id || order.orderId;
  const payLabel =
    order.paymentMethod === 'upi'
      ? `UPI${order.paymentMeta?.vpa ? ` · ${order.paymentMeta.vpa}` : ''}`
      : order.paymentMethod === 'card'
        ? `Card${order.paymentMeta?.cardLast4 ? ` · •••• ${order.paymentMeta.cardLast4}` : ''}`
        : order.paymentMethod === 'razorpay'
          ? 'Razorpay'
          : String(order.paymentMethod || 'Prepaid').toUpperCase();

  return (
    <main className="checkout">
      {showSplash && (
        <div className="pay-success" role="status" aria-live="polite">
          <ConfettiBurst />
          <div className="pay-success__orb">
            <svg className="pay-success__check" viewBox="0 0 52 52" aria-hidden>
              <circle className="pay-success__circle" cx="26" cy="26" r="24" fill="none" />
              <path className="pay-success__tick" fill="none" d="M14.5 27.2l7.2 7.2 15.8-16.2" />
            </svg>
          </div>
          <p className="pay-success__label">Payment successful</p>
          <strong className="pay-success__amount">{formatINR(order.total)}</strong>
        </div>
      )}

      <div className={`container order-success${showSplash ? ' order-success--waiting' : ' order-success--in'}`}>
        <div className="order-success__badge">Order confirmed</div>
        <h1>Thank you, {order.customer.name}!</h1>
        <p>
          Your {BRAND.name} order <strong>{orderRef}</strong> is placed and payment is confirmed.
        </p>

        <div className="order-success__grid">
          <section>
            <h2>Items</h2>
            <ul>
              {order.items.map((item) => (
                <li key={`${item.id}-${item.sizeId}-${item.weightId || ''}`}>
                  <span>
                    {item.name} · {item.sizeLabel}
                    {item.weightLabel ? ` · ${item.weightLabel}` : ''} × {item.qty}
                  </span>
                  <span>{formatINR(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="order-success__total">
              <span>Total</span>
              <strong>{formatINR(order.total)}</strong>
            </div>
          </section>

          <section>
            <h2>Delivery</h2>
            <p>
              {order.shipping.addressLine1}
              {order.shipping.addressLine2 ? `, ${order.shipping.addressLine2}` : ''}
              <br />
              {order.shipping.city}, {order.shipping.state} — {order.shipping.pincode}
            </p>
            <h2>Payment</h2>
            <p>
              {payLabel}
              {order.razorpayPaymentId || order.paymentMeta?.razorpayPaymentId ? (
                <>
                  <br />
                  <small style={{ color: '#64748b' }}>
                    Ref {order.razorpayPaymentId || order.paymentMeta.razorpayPaymentId}
                  </small>
                </>
              ) : null}
            </p>
            <h2>Contact</h2>
            <p>
              {order.customer.phone}
              <br />
              {order.customer.email}
            </p>
          </section>
        </div>

        <div className="order-success__actions">
          <Link to="/shop" className="btn btn--primary">
            Continue shopping
          </Link>
          <Link to="/my-orders" className="btn btn--outline-dark">
            My orders
          </Link>
        </div>
      </div>
    </main>
  );
}
