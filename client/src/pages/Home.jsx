import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CollectionGrid from '../components/CollectionGrid';
import ProductRail from '../components/ProductRail';
import TrustStrip from '../components/TrustStrip';
import Reviews from '../components/Reviews';

export default function Home() {
  const [collections, setCollections] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [lovedTennis, setLovedTennis] = useState([]);
  const [lovedSeason, setLovedSeason] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [cols, top, tennis, season, revs, info] = await Promise.all([
          fetch('/api/collections').then((r) => r.json()),
          fetch('/api/products?topSelling=true').then((r) => r.json()),
          fetch('/api/products?collection=hard-tennis&mostLoved=true').then((r) => r.json()),
          fetch('/api/products?collection=season&mostLoved=true').then((r) => r.json()),
          fetch('/api/reviews').then((r) => r.json()),
          fetch('/api/store-info').then((r) => r.json()),
        ]);
        if (cancelled) return;
        setCollections(cols.collections || []);
        setTopSelling(top.products || []);
        setLovedTennis(tennis.products || []);
        setLovedSeason(season.products || []);
        setReviews(revs.reviews || []);
        setBenefits(info.benefits || []);
      } catch {
        /* ignore */
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
        <div className="container home-banner__inner">
          <p className="home-banner__eyebrow">Tamil Nadu cricket bats · @h2r_sports_</p>
          <h1>H2R Sports — bats built for Indian cricket.</h1>
          <p>
            Hard tennis, soft tennis, and season willow bats. Select size, add to bag, checkout with
            UPI / Card / COD — All India delivery.
          </p>
          <div className="home-banner__actions">
            <Link to="/shop" className="btn btn--primary">
              Shop all bats
            </Link>
            <Link to="/collections/hard-tennis" className="btn btn--outline">
              Hard tennis
            </Link>
          </div>
        </div>
      </section>

      <CollectionGrid collections={collections} />
      <ProductRail title="Top Selling" products={topSelling} loading={loading} />
      <TrustStrip benefits={benefits} />
      <ProductRail title="Most Loved Tennis Bats" products={lovedTennis} loading={loading} />
      <ProductRail title="Most Loved Season Bats" products={lovedSeason} loading={loading} />
      <Reviews reviews={reviews} />
    </main>
  );
}
