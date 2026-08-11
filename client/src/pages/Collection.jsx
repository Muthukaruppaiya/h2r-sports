import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import RevealOnScroll from '../components/RevealOnScroll';
import { api } from '../api/store';

export default function Collection() {
  const { slug } = useParams();
  const [collection, setCollection] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getCollection(slug)
      .then((data) => {
        if (cancelled) return;
        setCollection(data.collection);
        setProducts(data.products || []);
        setError('');
      })
      .catch(() => {
        if (!cancelled) setError('This collection is unavailable right now.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <main className="container shop-page">
        <p>{error}</p>
        <Link to="/shop">Browse all products</Link>
      </main>
    );
  }

  return (
    <main className="shop-page">
      <div className="shop-hero">
        <RevealOnScroll className="container" variant="fast">
          <p className="home-banner__eyebrow">
            {collection?.familyLabel || 'Collection'}
            {collection?.variant ? ` · ${collection.variant}` : ''}
          </p>
          <h1>{loading ? '…' : collection?.name}</h1>
          <p>{collection?.blurb}</p>
          {collection?.badge ? (
            <p className="shop-hero__badge">{collection.badge}</p>
          ) : null}
        </RevealOnScroll>
      </div>
      <div className="container shop-grid-wrap" style={{ paddingBottom: 80 }}>
        <div className="shop-meta">
          <strong>{loading ? '…' : products.length}</strong> products
        </div>
        {loading ? (
          <div className="shop-grid" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="product-card product-card--skeleton">
                <div className="skeleton skeleton--gallery" />
                <div className="product-card__body">
                  <div className="skeleton skeleton--line short" />
                  <div className="skeleton skeleton--line" />
                  <div className="skeleton skeleton--btn" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="shop-empty">No bats in this collection yet.</div>
        ) : (
          <RevealOnScroll className="shop-grid" stagger step={60}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </RevealOnScroll>
        )}
      </div>
    </main>
  );
}
