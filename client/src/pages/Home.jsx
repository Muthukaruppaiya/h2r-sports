import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CollectionGrid from '../components/CollectionGrid';
import ProductRail from '../components/ProductRail';
import TrustStrip from '../components/TrustStrip';
import StatsStrip from '../components/StatsStrip';
import Reviews from '../components/Reviews';
import AnnouncementBar from '../components/AnnouncementBar';
import WhatsAppStatusBar from '../components/WhatsAppStatusBar';
import RevealOnScroll from '../components/RevealOnScroll';
import { api } from '../api/store';

export default function Home() {
  const [collections, setCollections] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [mostLoved, setMostLoved] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [cols, all, revs] = await Promise.all([
          api.getCollections(),
          api.getProducts(),
          api.getReviews(),
        ]);
        if (cancelled) return;

        const products = all.products || [];
        setCollections(cols.collections || []);
        setFeatured(products);
        setTopSelling(products.filter((p) => p.topSelling));
        setMostLoved(products.filter((p) => p.mostLoved));
        setReviews(revs.reviews || []);
      } catch {
        /* keep empty UI — never surface raw errors */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="home-shop">
      <section className="home-banner">
        <div className="home-banner__media" aria-hidden="true">
          <img
            src="/hero/h2r-workshop.png"
            alt=""
            className="home-banner__photo"
            fetchPriority="high"
          />
          <div className="home-banner__scrim" />
        </div>

        <RevealOnScroll as="div" className="container home-banner__inner" stagger step={110}>
          <p className="home-banner__eyebrow">H2R Sports · Tamil Nadu</p>
          <h1>India’s Trusted Cricket Bat Seller</h1>
          <p>
            Exclusive Hard Tennis, Soft Tennis &amp; Premium Willow Cricket Bats. Crafted for powerful
            hitting, perfect balance, and lasting performance. Trusted by thousands of cricketers
            across India.
          </p>
          <div className="home-banner__actions">
            <Link to="/shop" className="btn btn--primary">
              Shop all bats
            </Link>
            <Link to="/collections/killer-edition" className="btn btn--outline">
              Shop Killer Edition
            </Link>
          </div>
          <div className="home-banner__badges">
            <span className="home-banner__badge">
              <strong>4.9★</strong> Average rating
            </span>
            <span className="home-banner__badge">
              <strong>1,020+</strong> Happy customers
            </span>
            <span className="home-banner__badge">
              <strong>2,000+</strong> Bats delivered
            </span>
          </div>
        </RevealOnScroll>

        <span className="home-banner__scroll-cue" aria-hidden="true">
          <svg width="18" height="28" viewBox="0 0 18 28" fill="none">
            <rect x="1" y="1" width="16" height="26" rx="8" stroke="currentColor" strokeWidth="1.4" />
            <circle className="home-banner__scroll-dot" cx="9" cy="8" r="2.4" fill="currentColor" />
          </svg>
        </span>
      </section>

      <WhatsAppStatusBar />

      <StatsStrip />

      <CollectionGrid collections={collections} />

      <RevealOnScroll className="reveal-section">
        <ProductRail title="Our Bats" products={featured} loading={loading} />
      </RevealOnScroll>

      <RevealOnScroll className="reveal-section">
        <AnnouncementBar variant="inline" />
      </RevealOnScroll>

      <TrustStrip />

      {topSelling.length > 0 && (
        <RevealOnScroll className="reveal-section">
          <ProductRail title="Top Selling" products={topSelling} loading={false} />
        </RevealOnScroll>
      )}

      {mostLoved.length > 0 && (
        <RevealOnScroll className="reveal-section">
          <ProductRail title="Most Loved Bats" products={mostLoved} loading={false} />
        </RevealOnScroll>
      )}

      <RevealOnScroll className="reveal-section">
        <Reviews reviews={reviews} loading={loading} />
      </RevealOnScroll>
    </main>
  );
}
