import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="policy-page">
      <div className="container policy-card policy-card--empty">
        <p className="home-banner__eyebrow">404</p>
        <h1>Page not found</h1>
        <p>That link does not exist. Browse the shop or go back home.</p>
        <p>
          <Link to="/shop" className="btn btn--primary">
            Shop bats
          </Link>
        </p>
        <p>
          <Link to="/">← Back home</Link>
        </p>
      </div>
    </main>
  );
}
