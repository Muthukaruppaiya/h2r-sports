export default function TrustStrip({ benefits }) {
  const items = benefits?.length
    ? benefits
    : [
        '🚚 All India Free Shipping',
        '⚡ Free premium cover & batting gloves worth ₹650*',
        '🏆 Free engraving on prepaid orders',
        '💯 6 months full bat warranty',
        'COD available',
      ];

  return (
    <section className="trust">
      <div className="container trust__grid">
        {items.map((item) => (
          <div key={item} className="trust__item">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
