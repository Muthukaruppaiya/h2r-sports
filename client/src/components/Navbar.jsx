import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { BRAND } from '../utils/india';
import { api } from '../api/store';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { count } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      try {
        const data = await api.getProducts({ q });
        if (!cancelled) setResults((data.products || []).slice(0, 6));
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const close = () => setMenuOpen(false);

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
    setResults([]);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    closeSearch();
    close();
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  };

  const hasResults = useMemo(() => results.length > 0, [results]);

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar__inner container">
        <Link to="/" className="navbar__logo" onClick={close}>
          <img
            src={BRAND.logo}
            alt={`${BRAND.name} logo`}
            width="44"
            height="44"
            className="brand-logo brand-logo--nav"
          />
          <span>
            {BRAND.name}
            <small>{BRAND.tagline}</small>
          </span>
        </Link>

        <nav className={`navbar__nav${menuOpen ? ' open' : ''}`}>
          <NavLink to="/" end onClick={close}>
            Home
          </NavLink>
          <NavLink to="/collections/karrupu-edition" onClick={close}>
            Karrupu
          </NavLink>
          <NavLink to="/collections/killer-edition" onClick={close}>
            Killer
          </NavLink>
          <NavLink to="/collections/stumper-edition" onClick={close}>
            Stumper
          </NavLink>
          <NavLink to="/collections/soft-tennis-kerala-scoop" onClick={close}>
            Kerala Scoop
          </NavLink>
          <NavLink to="/shop" onClick={close}>
            All Products
          </NavLink>
          <NavLink to="/my-orders" onClick={close} style={{ color: 'var(--accent)', fontWeight: '600' }}>
            Account
          </NavLink>
        </nav>

        <div className="navbar__actions">
          <button
            type="button"
            className="navbar__search-btn"
            aria-label="Search products"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((o) => !o)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <Link to="/cart" className="navbar__cart" onClick={close}>
            Cart
            {count > 0 && <span className="navbar__cart-count">{count}</span>}
          </Link>
        </div>

        <button
          className="navbar__toggle"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </div>

      {searchOpen && (
        <div className="navbar-search">
          <form className="navbar-search__form container" onSubmit={submitSearch}>
            <input
              ref={inputRef}
              type="search"
              placeholder="Search bats… Thala, Rhino, English"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products"
            />
            <button type="submit" className="btn btn--sm btn--primary">
              Search
            </button>
            <button type="button" className="navbar-search__close" onClick={closeSearch}>
              ✕
            </button>
          </form>
          {query.trim() && (
            <div className="navbar-search__results container">
              {hasResults ? (
                <ul>
                  {results.map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/shop/${p.id}`}
                        onClick={() => {
                          closeSearch();
                          close();
                        }}
                      >
                        <img src={p.image} alt="" width="40" height="40" />
                        <span>
                          {p.name}
                          <small>{formatPriceHint(p.price)}</small>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="navbar-search__empty">No products match “{query.trim()}”</p>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}

function formatPriceHint(price) {
  return `Rs. ${Number(price).toLocaleString('en-IN')}`;
}
