export default function Integrations() {
  return (
    <div className="admin-stub">
      <h1>Integrations</h1>
      <p>Connected tools for payments, shipping, and marketing.</p>
      <ul>
        <li>
          <strong>Razorpay</strong> — checkout uses <code>RAZORPAY_KEY_ID</code> /{' '}
          <code>RAZORPAY_KEY_SECRET</code> on Render (live keys: <code>rzp_live_…</code>).
          Add webhook URL <code>/api/payments/razorpay/webhook</code> with{' '}
          <code>RAZORPAY_WEBHOOK_SECRET</code> for payment.captured.
        </li>
        <li>Shiprocket — planned</li>
        <li>WhatsApp Business API — planned</li>
      </ul>
    </div>
  );
}
