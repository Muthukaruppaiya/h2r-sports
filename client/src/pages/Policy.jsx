import { Link, useParams } from 'react-router-dom';
import { BRAND } from '../utils/india';

const POLICIES = {
  shipping: {
    title: 'Shipping Policy',
    body: [
      `H2R Sports ships cricket bats across India from ${BRAND.address}.`,
      'Orders are prepaid only. Cash on Delivery (COD) is not available.',
      'Orders are typically dispatched within 1–2 business days. Delivery usually takes 3–7 days depending on your pin code.',
      'Free shipping applies on eligible prepaid orders. Tracking details are shared by WhatsApp / SMS once your order ships.',
    ],
  },
  returns: {
    title: 'No Refund Policy',
    body: [
      'All sales are final. H2R Sports does not offer refunds once an order is placed and payment is received.',
      'Cash on Delivery (COD) is not available. Orders are accepted with prepaid payment via Razorpay (UPI / cards / netbanking).',
      'Warranty: manufacturing defects on the bat handle are covered for 6 months from the date of delivery. Contact support with clear photos for warranty review.',
      'Warranty does not cover normal wear, knocking, oiling, misuse, or damage after delivery.',
      `For warranty support, contact ${BRAND.email} or ${BRAND.phone}.`,
    ],
  },
  terms: {
    title: 'Terms & Policies',
    body: [
      `By placing an order with ${BRAND.name}, you agree to the following:`,
      '1. No refund — all sales are final after payment.',
      '2. No COD — only prepaid payments via Razorpay (UPI / Cards / Netbanking) are accepted.',
      '3. 6 months handle warranty — covers manufacturing defects on the bat handle only, from the date of delivery.',
      'Product photos are illustrative. Natural wood grain and finish may vary slightly.',
      'Prices are listed in Rs. and include GST unless otherwise stated.',
      `For any questions, contact ${BRAND.email} or ${BRAND.phone}.`,
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'We collect name, phone, email, and shipping details only to fulfil orders and provide support.',
      'Payment details entered at checkout are processed securely; we do not store full card numbers.',
      'We do not sell personal data. Contact us to update or delete your stored order contact details.',
    ],
  },
};

export default function Policy() {
  const { slug } = useParams();
  const policy = POLICIES[slug];

  if (!policy) {
    return (
      <main className="container policy-page">
        <h1>Policy not found</h1>
        <Link to="/">Back home</Link>
      </main>
    );
  }

  return (
    <main className="policy-page">
      <div className="container">
        <p className="home-banner__eyebrow" style={{ color: 'var(--gray-400)' }}>
          Policies
        </p>
        <h1>{policy.title}</h1>
        {policy.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <div className="policy-page__nav">
          {Object.entries(POLICIES).map(([key, val]) => (
            <Link key={key} to={`/policies/${key}`} className={key === slug ? 'is-active' : ''}>
              {val.title}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
