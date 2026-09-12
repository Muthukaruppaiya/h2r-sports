import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BRAND, formatINR } from '../utils/india';

function waLink(text) {
  return `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(text)}`;
}

export default function PaymentFailed() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const info = state || {};
  const {
    reason,
    verificationFailed = false,
    paymentId = '',
    orderRef = '',
    amount = 0,
    productLabel = '',
  } = info;

  const supportText = verificationFailed
    ? `Hi H2R Sports, my payment for ${productLabel || 'my order'} (ref: ${orderRef || 'N/A'}, payment ID: ${
        paymentId || 'N/A'
      }) went through but the order didn't confirm on the site. Please help.`
    : `Hi H2R Sports, my payment for ${productLabel || 'an order'} failed. Reason: ${
        reason || 'unknown'
      }. Can you help me complete my order?`;

  return (
    <main className="pay-failed">
      <div className="container pay-failed__wrap">
        <div className="pay-failed__card">
          <div className={`pay-failed__icon ${verificationFailed ? 'is-warn' : 'is-error'}`}>
            {verificationFailed ? '⚠️' : '✕'}
          </div>

          <h1 className="pay-failed__title">
            {verificationFailed ? "Payment received, order not confirmed" : 'Payment failed'}
          </h1>

          <p className="pay-failed__lead">
            {verificationFailed
              ? 'Money may have been deducted, but we couldn\u2019t confirm your order automatically. Please don\u2019t pay again — contact support with the details below and our team will sort it out.'
              : reason ||
                'Your payment could not be completed. No amount has been charged. You can try again with the same or a different payment method.'}
          </p>

          {(orderRef || paymentId || amount > 0) && (
            <div className="pay-failed__meta">
              {productLabel && (
                <div className="pay-failed__meta-row">
                  <span>Item</span>
                  <strong>{productLabel}</strong>
                </div>
              )}
              {amount > 0 && (
                <div className="pay-failed__meta-row">
                  <span>Amount</span>
                  <strong>{formatINR(amount)}</strong>
                </div>
              )}
              {orderRef && (
                <div className="pay-failed__meta-row">
                  <span>Order ref</span>
                  <strong>{orderRef}</strong>
                </div>
              )}
              {paymentId && (
                <div className="pay-failed__meta-row">
                  <span>Payment ID</span>
                  <strong>{paymentId}</strong>
                </div>
              )}
            </div>
          )}

          <div className="pay-failed__actions">
            {!verificationFailed && (
              <button
                type="button"
                className="btn btn-primary pay-failed__btn"
                onClick={() => navigate('/checkout')}
              >
                Retry payment
              </button>
            )}
            <a
              href={waLink(supportText)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn pay-failed__btn pay-failed__btn--whatsapp"
            >
              Contact support on WhatsApp
            </a>
            <Link to="/shop" className="pay-failed__link">
              ← Back to shop
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
