import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { BRAND } from '../utils/india';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const close = () => setMenuOpen(false);

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
          <NavLink to="/collections/hard-tennis" onClick={close}>
            Hard Tennis
          </NavLink>
          <NavLink to="/collections/soft-tennis" onClick={close}>
            Soft Tennis
          </NavLink>
          <NavLink to="/collections/season" onClick={close}>
            Season Bats
          </NavLink>
          <NavLink to="/shop" onClick={close}>
            All Products
          </NavLink>
        </nav>

        <div className="navbar__actions">
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
    </header>
  );
}
