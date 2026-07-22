import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

function sortCollections(list) {
  return [...list].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return (a.sortOrder ?? 99) - (b.sortOrder ?? 99);
  });
}

function shortBlurb(c) {
  if (c.blurb) {
    const words = c.blurb.trim().split(/\s+/);
    if (words.length <= 14) return c.blurb.trim();
    return `${words.slice(0, 14).join(' ')}…`;
  }
  if (c.family === 'soft-tennis') return 'Light scoop profile for soft tennis stroke play.';
  return 'Hard tennis edition built for power and balance.';
}

function CollectionCard({ c, index }) {
  const family = c.familyLabel || (c.family === 'soft-tennis' ? 'Soft Tennis' : 'Hard Tennis');
  const title = c.variant || c.name;
  const badge = c.badge || (c.featured || c.slug === 'killer-edition' ? 'Fast selling' : '');
  const featured = Boolean(c.featured || c.slug === 'killer-edition');
  const blurb = shortBlurb(c);

  return (
    <Link
      to={`/collections/${c.slug}`}
      className={`collection-card collection-card--${c.slug}${featured ? ' collection-card--featured' : ''}${
        c.family === 'soft-tennis' ? ' collection-card--soft' : ' collection-card--hard'
      } reveal-up`}
      style={{ '--reveal-delay': `${Math.min(index, 6) * 70}ms` }}
    >
      {badge ? <span className="collection-card__badge">{badge}</span> : null}
      <span className="collection-card__family">{family}</span>
      <h3>{title}</h3>
      <p className="collection-card__blurb">{blurb}</p>
      <span className="collection-card__cta">
        {typeof c.count === 'number' ? `${c.count} bats` : 'Shop'}
        <span aria-hidden="true"> →</span>
      </span>
    </Link>
  );
}

export default function CollectionGrid({ collections }) {
  const sectionRef = useRef(null);
  const sorted = sortCollections(collections || []);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return undefined;
    const items = root.querySelectorAll('.reveal-up');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sorted.length]);

  return (
    <section className="collections" ref={sectionRef}>
      <div className="container">
        <header className="collections__head reveal-up">
          <p className="collections__eyebrow">H2R Editions</p>
          <h2 className="rail__title">Our Collections</h2>
          <p className="collections__lead">
            Soft Tennis · Kerala Scoop &nbsp;|&nbsp; Hard Tennis · Killer, Karrupu, Beast &amp; Stumper
          </p>
        </header>

        <div className="collections__grid">
          {sorted.map((c, i) => (
            <CollectionCard key={c.id} c={c} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
