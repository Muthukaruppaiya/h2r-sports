import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
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
        <div className="container">
          <p className="home-banner__eyebrow">
            {collection?.familyLabel || 'Collection'}
            {collection?.variant ? ` · ${collection.variant}` : ''}
          </p>
          <h1>{loading ? '…' : collection?.name}</h1>
          <p>{collection?.blurb}</p>
          {collection?.badge ? (
            <p className="shop-hero__badge">{collection.badge}</p>
          ) : null}
        </div>
      </div>
      <div className="container shop-grid-wrap" style={{ paddingBottom: 80 }}>
        <div className="shop-meta">
          <strong>{loading ? '…' : products.length}</strong> products
        </div>
        {loading ? (
          <div className="shop-empty">Loading…</div>
        ) : (
          <div className="shop-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
