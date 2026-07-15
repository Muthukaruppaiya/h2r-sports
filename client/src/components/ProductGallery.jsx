import { useEffect, useRef, useState } from 'react';

export default function ProductGallery({ images = [], alt = 'Product', badge }) {
  const list = images.length ? images : ['/products/placeholders/front.svg'];
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const touchX = useRef(null);

  useEffect(() => {
    setActive(0);
  }, [list.join('|')]);

  const goTo = (next) => {
    if (next === active || list.length < 2) return;
    setFading(true);
    window.setTimeout(() => {
      setActive(((next % list.length) + list.length) % list.length);
      setFading(false);
    }, 140);
  };

  const prev = () => goTo(active - 1);
  const next = () => goTo(active + 1);

  const current = list[Math.min(active, list.length - 1)];

  return (
    <div className="gallery">
      <div
        className="gallery__main"
        onTouchStart={(e) => {
          touchX.current = e.changedTouches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) < 40) return;
          if (dx < 0) next();
          else prev();
        }}
      >
        {badge && <span className="pdp__badge">{badge}</span>}

        <img
          src={current}
          alt={`${alt} — image ${active + 1}`}
          className={`gallery__image${fading ? ' is-fading' : ''}`}
        />

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
              onClick={() => goTo(i)}
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
