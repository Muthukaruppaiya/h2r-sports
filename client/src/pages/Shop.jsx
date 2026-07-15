import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';

const CATEGORIES = ['All', 'Hard Tennis', 'Soft Tennis', 'Season'];
const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'price-asc', label: 'Price, low to high' },
  { id: 'price-desc', label: 'Price, high to low' },
  { id: 'name', label: 'Alphabetically, A-Z' },
];

export default function Shop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category !== 'All') params.set('category', category);
        if (query.trim()) params.set('q', query.trim());
        const res = await fetch(`/api/products?${params}`);
        const data = await res.json();
        if (!cancelled) setProducts(data.products || []);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const t = setTimeout(load, query ? 200 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [category, query]);

  const sorted = useMemo(() => {
    const list = [...products];
    switch (sort) {
      case 'price-asc':
        return list.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return list.sort((a, b) => b.price - a.price);
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return list;
    }
  }, [products, sort]);

  return (
    <main className="shop-page">
      <div className="shop-hero">
        <div className="container">
          <p className="home-banner__eyebrow">All products</p>
          <h1>Shop cricket bats</h1>
          <p>Hard tennis · Soft tennis · Season bats — prices in Rs. (incl. GST)</p>
        </div>
      </div>

      <div className="container shop-layout">
        <aside className="shop-filters">
          <label className="shop-search">
            <span>Search</span>
            <input
              type="search"
              placeholder="Thala, Rhino, English…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <div className="shop-filter-group">
            <span>Category</span>
            <div className="shop-chips">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={category === c ? 'chip chip--active' : 'chip'}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="shop-filter-group">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <Link to="/" className="shop-back">
            ← Back to home
          </Link>
        </aside>

        <section className="shop-grid-wrap">
          <div className="shop-meta">
            <strong>{loading ? '…' : sorted.length}</strong> products
          </div>
          {loading ? (
            <div className="shop-empty">Loading catalogue…</div>
          ) : sorted.length === 0 ? (
            <div className="shop-empty">No bats match your filters.</div>
          ) : (
            <div className="shop-grid">
              {sorted.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
