import { useEffect, useState } from 'react';

export default function ProductGallery({ images = [], alt = 'Product', badge }) {
  const list = images.length ? images : ['/products/placeholders/front.svg'];
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [list.join('|')]);

  const current = list[Math.min(active, list.length - 1)];

  const prev = () => setActive((i) => (i - 1 + list.length) % list.length);
  const next = () => setActive((i) => (i + 1) % list.length);

  return (
    <div className="gallery">
      <div className="gallery__main">
        {badge && <span className="pdp__badge">{badge}</span>}

        <img src={current} alt={`${alt} — image ${active + 1}`} className="gallery__image" />

        {list.length > 1 && (
          <>
            <button
              type="button"
              className="gallery__nav gallery__nav--prev"
              onClick={prev}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              className="gallery__nav gallery__nav--next"
              onClick={next}
              aria-label="Next image"
            >
              ›
            </button>
            <div className="gallery__count">
              {active + 1} / {list.length}
            </div>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div className="gallery__thumbs" role="list">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              role="listitem"
              className={`gallery__thumb${i === active ? ' gallery__thumb--active' : ''}`}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
