import { useEffect, useRef, useState } from 'react';

/**
 * Store trust points — always curated on the client so stale API copy
 * (COD, engraving, gloves, etc.) never appears.
 */
const TRUST_ITEMS = [
  { icon: '🚚', label: 'All India Free Shipping' },
  { icon: '⚡', label: 'Free premium cover' },
  { icon: '💯', label: '6 months handle warranty' },
  { icon: '🔒', label: 'UPI & Cards accepted' },
];

export default function TrustStrip() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -6% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="trust" ref={ref}>
      <div className="container">
        <div className="trust__grid">
          {TRUST_ITEMS.map((item, i) => (
            <div
              key={item.label}
              className={`trust__item reveal-up${visible ? ' is-visible' : ''}`}
              style={{ '--reveal-delay': `${i * 70}ms` }}
            >
              <span className="trust__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="trust__label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
