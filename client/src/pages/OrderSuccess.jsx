import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { BRAND, formatINR } from '../utils/india';

export default function OrderSuccess() {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (order || !id) return;
    fetch(`/api/orders/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Order not found');
        return r.json();
      })
      .then(setOrder)
      .catch((err) => setError(err.message));
  }, [id, order]);

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

  const payLabel =
    order.paymentMethod === 'cod'
      ? 'Cash on Delivery'
      : order.paymentMethod === 'upi'
        ? `UPI (${order.paymentMeta?.upiId || ''})`
        : `Card ending ${order.paymentMeta?.cardLast4 || '****'}`;

  return (
    <main className="checkout">
      <div className="container order-success">
        <div className="order-success__badge">Order confirmed</div>
        <h1>Thank you, {order.customer.name}!</h1>
        <p>
          Your {BRAND.name} order <strong>{order.id}</strong> is placed.
          {order.paymentMethod === 'cod'
            ? ' Pay cash when your bat is delivered.'
            : ' Payment received (demo).'}
        </p>

        <div className="order-success__grid">
          <section>
            <h2>Items</h2>
            <ul>
              {order.items.map((item) => (
                <li key={`${item.id}-${item.sizeId}`}>
                  <span>
                    {item.name} · {item.sizeLabel} × {item.qty}
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
            <p>{payLabel}</p>
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
          <a
            className="btn btn--outline-dark"
            href={BRAND.instagram}
            target="_blank"
            rel="noreferrer"
          >
            Follow {BRAND.instagramHandle}
          </a>
        </div>
      </div>
    </main>
  );
}
