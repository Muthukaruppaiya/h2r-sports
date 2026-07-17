import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CollectionGrid from '../components/CollectionGrid';
import ProductRail from '../components/ProductRail';
import TrustStrip from '../components/TrustStrip';
import Reviews from '../components/Reviews';
import AnnouncementBar from '../components/AnnouncementBar';
import WhatsAppStatusBar from '../components/WhatsAppStatusBar';
import { api } from '../api/store';

export default function Home() {
  const [collections, setCollections] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [mostLoved, setMostLoved] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [cols, all, revs, info] = await Promise.all([
          api.getCollections(),
          api.getProducts(),
          api.getReviews(),
          api.getStoreInfo(),
        ]);
        if (cancelled) return;

        const products = all.products || [];
        setCollections(cols.collections || []);
        setFeatured(products);
        setTopSelling(products.filter((p) => p.topSelling));
        setMostLoved(products.filter((p) => p.mostLoved));
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
        <div className="home-banner__media" aria-hidden="true">
          <img
            src="/hero/h2r-workshop.png"
            alt=""
            className="home-banner__photo"
            fetchPriority="high"
          />
          <div className="home-banner__scrim" />
        </div>
        <div className="container home-banner__inner">
          <p className="home-banner__eyebrow">H2R Sports</p>
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
            {collections[0] && (
              <Link to={`/collections/${collections[0].slug || collections[0].id}`} className="btn btn--outline">
                {collections[0].name}
              </Link>
            )}
          </div>
        </div>
      </section>

      <WhatsAppStatusBar />

      <CollectionGrid collections={collections} />
      <ProductRail title="Our Bats" products={featured} loading={loading} />
      <AnnouncementBar variant="inline" />
      <TrustStrip benefits={benefits} />
      {topSelling.length > 0 && (
        <ProductRail title="Top Selling" products={topSelling} loading={false} />
      )}
      {mostLoved.length > 0 && (
        <ProductRail title="Most Loved Bats" products={mostLoved} loading={false} />
      )}
      <Reviews reviews={reviews} />
    </main>
  );
}
