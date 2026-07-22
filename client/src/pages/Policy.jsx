import { Link, useParams } from 'react-router-dom';
import { BRAND } from '../utils/india';

const POLICIES = {
  shipping: {
    title: 'Shipping Policy',
    body: [
      `H2R Sports ships cricket bats across India from ${BRAND.address}.`,
      'Orders are typically dispatched within 1–2 business days. Delivery timelines vary by pin code (usually 3–7 days).',
      'Free shipping applies on eligible prepaid orders as shown at checkout. Tracking details are shared by WhatsApp/SMS once your order ships.',
    ],
  },
  returns: {
    title: 'Return / Refund Policy',
    body: [
      'Unused bats in original packaging may be returned within 7 days of delivery if they arrive damaged or incorrect.',
      'Bats showing match wear, oiling, or knocking are not eligible for return.',
      'Approved refunds are processed to the original payment method within 5–7 business days after inspection.',
      'Warranty covers manufacturing defects on the bat handle for 6 months from delivery — contact support with photos for claim review.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'We collect name, phone, email, and shipping details only to fulfil orders and support.',
      'Payment details entered at checkout are processed securely; we do not store full card numbers.',
      'We do not sell personal data. Contact us to update or delete your stored order contact details.',
    ],
  },
  terms: {
    title: 'Terms of Service',
    body: [
      `By shopping on ${BRAND.name} you agree that product photos are illustrative and natural wood grain may vary.`,
      'Prices are listed in Rs. and include GST unless otherwise stated.',
      'We reserve the right to cancel suspicious or undeliverable orders and will notify you promptly.',
      `For disputes, contact ${BRAND.email} or ${BRAND.phone}.`,
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
