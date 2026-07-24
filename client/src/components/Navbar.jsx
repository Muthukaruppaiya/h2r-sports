import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { BRAND } from '../utils/india';
import { api } from '../api/store';

const Icon = {
  home: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  ),
  killer: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 10-14h-7l1-6z" />
    </svg>
  ),
  karrupu: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  ),
  beast: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3c2.5 2 4 4.5 4 7.5S14.2 16 12 16s-4-2.5-4-5.5S9.5 5 12 3z" />
      <path d="M8 16c-2 1-3.5 3-3.5 5h15c0-2-1.5-4-3.5-5" />
    </svg>
  ),
  stumper: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 21V8l4-5 4 5v13" />
      <path d="M6 21h12" />
    </svg>
  ),
  soft: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 12h17M12 3.5c2.5 2.8 4 5.6 4 8.5s-1.5 5.7-4 8.5c-2.5-2.8-4-5.6-4-8.5s1.5-5.7 4-8.5z" />
    </svg>
  ),
  shop: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16l-1.2 12.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 7z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

const COLLECTIONS = [
  { to: '/collections/killer-edition', label: 'Killer', hint: 'Hard-hitting range', icon: Icon.killer },
  { to: '/collections/karrupu-edition', label: 'Karrupu', hint: 'Dark edition bats', icon: Icon.karrupu },
  { to: '/collections/beast-edition', label: 'Beast', hint: 'Power profile', icon: Icon.beast },
  { to: '/collections/stumper-edition', label: 'Stumper', hint: 'Match ready', icon: Icon.stumper },
  { to: '/collections/soft-tennis-kerala-scoop', label: 'Soft Tennis', hint: 'Kerala scoop', icon: Icon.soft },
];

function NavItem({ to, end, onClick, icon, label, hint, accent, className = '' }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `navbar__item${isActive ? ' is-active' : ''}${accent ? ' navbar__item--accent' : ''}${className ? ` ${className}` : ''}`
      }
    >
      <span className="navbar__item-icon">{icon}</span>
      <span className="navbar__item-text">
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      <span className="navbar__item-chev">{Icon.chevron}</span>
    </NavLink>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [signedIn, setSignedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem('h2r_token');
      const user = JSON.parse(localStorage.getItem('h2r_user') || '{}');
      setSignedIn(Boolean(token));
      setUserName(user?.name?.split?.(' ')?.[0] || '');
    };
    syncAuth();
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

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

  const drawer = (
    <>
      <button type="button" className="navbar__backdrop" aria-label="Close menu" onClick={close} />
      <nav className="navbar__drawer open" aria-label="Main menu">
        <div className="navbar__nav-head">
          <div>
            <p className="navbar__nav-kicker">H2R Sports</p>
            <strong>{signedIn ? `Hi, ${userName || 'Player'}` : 'Browse bats'}</strong>
          </div>
          <button type="button" className="navbar__nav-close" onClick={close} aria-label="Close menu">
            ✕
          </button>
        </div>

        <div className="navbar__nav-scroll">
          <div className="navbar__group">
            <p className="navbar__group-label">Browse</p>
            <NavItem to="/" end onClick={close} icon={Icon.home} label="Home" hint="Shop & offers" />
            <NavItem to="/shop" onClick={close} icon={Icon.shop} label="All Products" hint="Full bat catalogue" />
          </div>

          <div className="navbar__group">
            <p className="navbar__group-label">Collections</p>
            {COLLECTIONS.map((c) => (
              <NavItem
                key={c.to}
                to={c.to}
                onClick={close}
                icon={c.icon}
                label={c.label}
                hint={c.hint}
              />
            ))}
          </div>

          <div className="navbar__group navbar__group--account">
            <p className="navbar__group-label">Your account</p>
            {signedIn ? (
              <>
                <NavItem
                  to="/my-orders"
                  onClick={close}
                  icon={Icon.orders}
                  label="Your Orders"
                  hint="Track packages"
                  accent
                />
                <NavItem
                  to="/my-orders?tab=account"
                  onClick={close}
                  icon={Icon.account}
                  label="Account"
                  hint="Profile & addresses"
                  accent
                />
              </>
            ) : (
              <NavItem
                to="/login"
                onClick={close}
                icon={Icon.account}
                label="Sign in"
                hint="Orders & checkout"
                accent
              />
            )}
          </div>
        </div>
      </nav>
    </>
  );

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}${menuOpen ? ' navbar--menu-open' : ''}`}>
      <div className="navbar__inner container">
        <Link to="/" className="navbar__logo" onClick={close}>
          <img
            src={BRAND.logo}
            alt=""
            width="52"
            height="52"
            className="brand-logo brand-logo--nav"
          />
          <span>
            {BRAND.name}
            <small>{BRAND.tagline}</small>
          </span>
        </Link>

        <nav className="navbar__nav" aria-label="Main">
          <NavItem to="/" end onClick={close} icon={Icon.home} label="Home" />
          {COLLECTIONS.map((c) => (
            <NavItem key={c.to} to={c.to} onClick={close} icon={c.icon} label={c.label} />
          ))}
          <NavItem to="/shop" onClick={close} icon={Icon.shop} label="All Products" />
          <NavItem
            to={signedIn ? '/my-orders?tab=account' : '/login'}
            onClick={close}
            icon={Icon.account}
            label={signedIn ? 'Account' : 'Sign in'}
            accent
          />
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
        </div>

        <button
          className={`navbar__toggle${menuOpen ? ' is-open' : ''}`}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuOpen ? createPortal(drawer, document.body) : null}

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
