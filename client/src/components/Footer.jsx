import { Link } from 'react-router-dom';
import { BRAND } from '../utils/india';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" id="contact">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Link to="/" className="footer__logo">
            <img
              src={BRAND.logo}
              alt={`${BRAND.name} logo`}
              width="40"
              height="40"
              className="brand-logo brand-logo--footer"
            />
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
          <div className="footer__social" aria-label="Social links">
            <a href={BRAND.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
              <SocialIcon type="instagram" />
            </a>
            <a href={BRAND.facebook || BRAND.social?.facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
              <SocialIcon type="facebook" />
            </a>
            <a href={BRAND.youtube || BRAND.social?.youtube} target="_blank" rel="noreferrer" aria-label="YouTube">
              <SocialIcon type="youtube" />
            </a>
          </div>
        </div>

        <nav className="footer__links">
          <div className="footer__col">
            <h3>Shop</h3>
            <Link to="/collections/karrupu-edition">Karrupu Edition</Link>
            <Link to="/collections/killer-edition">Killer Edition</Link>
            <Link to="/collections/stumper-edition">Stumper Edition</Link>
            <Link to="/collections/soft-tennis-kerala-scoop">Kerala Scoop</Link>
            <Link to="/shop">All Products</Link>
          </div>
          <div className="footer__col">
            <h3>Policies</h3>
            <Link to="/policies/shipping">Shipping Policy</Link>
            <Link to="/policies/returns">Return / Refund Policy</Link>
            <Link to="/policies/privacy">Privacy Policy</Link>
            <Link to="/policies/terms">Terms of Service</Link>
          </div>
          <div className="footer__col">
            <h3>Help</h3>
            <a href={`tel:${BRAND.phone.replace(/\s/g, '')}`}>Call us</a>
            <a href={`mailto:${BRAND.email}`}>Email support</a>
            <Link to="/my-orders">My Orders</Link>
          </div>
        </nav>
      </div>

      <div className="container footer__trust">
        <p className="footer__pay-label">We accept</p>
        <div className="footer__pay" aria-label="Payment methods">
          <span className="footer__pay-badge">UPI</span>
          <span className="footer__pay-badge">Visa</span>
          <span className="footer__pay-badge">Mastercard</span>
          <span className="footer__pay-badge">COD</span>
        </div>
      </div>

      <div className="container footer__bottom">
        <p>
          &copy; {year} {BRAND.name}. All prices in Rs. (incl. GST).
        </p>
        <div className="footer__legal">
          <Link to="/policies/privacy">Privacy</Link>
          <Link to="/policies/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ type }) {
  if (type === 'instagram') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
      </svg>
    );
  }
  if (type === 'facebook') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v7h3v-7h2.5l.5-3H14V9z" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23 7.5s-.2-1.5-.8-2.2c-.8-.8-1.7-.8-2.1-.9C17.2 4.2 12 4.2 12 4.2h0s-5.2 0-8.1.2c-.4.1-1.3.1-2.1.9C1.2 6 1 7.5 1 7.5S.8 9.2.8 11v1.9c0 1.8.2 3.5.2 3.5s.2 1.5.8 2.2c.8.8 1.9.8 2.4.9 1.7.2 7.8.2 7.8.2s5.2 0 8.1-.2c.4-.1 1.3-.1 2.1-.9.6-.7.8-2.2.8-2.2s.2-1.7.2-3.5V11c0-1.8-.2-3.5-.2-3.5zM9.8 14.6V8.9l6.2 2.9-6.2 2.8z" />
    </svg>
  );
}
