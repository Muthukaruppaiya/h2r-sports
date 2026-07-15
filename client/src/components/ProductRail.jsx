import ProductCard from './ProductCard';

export default function ProductRail({ title, products, loading }) {
  if (!loading && (!products || products.length === 0)) return null;

  return (
    <section className="rail">
      <div className="container">
        <h2 className="rail__title">{title}</h2>
        {loading ? (
          <p className="rail__loading">Loading…</p>
        ) : (
          <div className="shop-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
