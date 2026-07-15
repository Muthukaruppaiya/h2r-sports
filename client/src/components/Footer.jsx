import { Link } from 'react-router-dom';
import { BRAND } from '../utils/india';

export default function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Link to="/" className="footer__logo">
            <img src={BRAND.logo} alt={`${BRAND.name} logo`} width="40" height="40" className="brand-logo brand-logo--footer" />
            {BRAND.name}
          </Link>
          <p className="footer__tagline">
            {BRAND.tagline} · {BRAND.address}
          </p>
          <p className="footer__contact">
            {BRAND.phone}
            <br />
            {BRAND.email}
          </p>
          <a
            className="footer__ig"
            href={BRAND.instagram}
            target="_blank"
            rel="noreferrer"
          >
            Instagram {BRAND.instagramHandle}
          </a>
        </div>

        <nav className="footer__links">
          <div className="footer__col">
            <h3>Shop</h3>
            <Link to="/collections/hard-tennis">Hard Tennis</Link>
            <Link to="/collections/soft-tennis">Soft Tennis</Link>
            <Link to="/collections/season">Season Bats</Link>
            <Link to="/shop">All Products</Link>
          </div>
          <div className="footer__col">
            <h3>Help</h3>
            <a href="#shipping">Shipping (India)</a>
            <a href="#warranty">6 months warranty</a>
            <a href="#cod">Cash on Delivery</a>
          </div>
          <div className="footer__col">
            <h3>Payments</h3>
            <a href="#upi">UPI</a>
            <a href="#cards">Cards / NetBanking</a>
            <a href="#cod">COD</a>
          </div>
        </nav>
      </div>

      <div className="container footer__bottom">
        <p>&copy; 2026 {BRAND.name}. All prices in Rs. (incl. GST).</p>
        <div className="footer__legal">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
        </div>
      </div>
    </footer>
  );
}
