import { Link } from 'react-router-dom';

export default function CollectionGrid({ collections }) {
  return (
    <section className="collections">
      <div className="container">
        <h2 className="rail__title">Our Collection</h2>
        <div className="collections__grid">
          {collections.map((c) => (
            <Link
              key={c.id}
              to={`/collections/${c.slug}`}
              className={`collection-tile collection-tile--${c.slug}`}
            >
              <div className="collection-tile__content">
                <h3>{c.name}</h3>
                <p>{c.blurb}</p>
                <span>{c.count} products →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
