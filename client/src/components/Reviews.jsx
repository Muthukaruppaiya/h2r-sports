import { useEffect, useMemo, useRef, useState } from 'react';

function getReviewMedia(review) {
  if (Array.isArray(review?.media) && review.media.length) {
    return review.media.filter((m) => m?.url);
  }
  if (review?.image) return [{ url: review.image, type: 'image' }];
  return [];
}

function ReviewCard({ review, onOpen }) {
  const media = getReviewMedia(review);
  const thumb = media[0];

  return (
    <blockquote
      className="review-card review-card--marquee"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(review)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(review);
        }
      }}
      aria-label={`Read full review from ${review.name}`}
    >
      {thumb ? (
        <div className="review-card__photo">
          {thumb.type === 'video' ? (
            <video src={thumb.url} muted playsInline preload="metadata" />
          ) : (
            <img src={thumb.url} alt="" loading="lazy" />
          )}
          {thumb.type === 'video' ? <span className="review-card__play">▶</span> : null}
          {media.length > 1 ? <span className="review-card__count">+{media.length - 1}</span> : null}
        </div>
      ) : null}
      <div className="review-card__body">
        <div className="review-card__stars" aria-hidden="true">
          {'★'.repeat(Math.min(5, Math.max(1, Number(review.rating) || 5)))}
        </div>
        <p>“{review.text}”</p>
        <cite>
          {review.name}
          {review.location ? ` · ${review.location}` : ''}
        </cite>
      </div>
    </blockquote>
  );
}

function ReviewModal({ review, onClose }) {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  if (!review) return null;
  const media = getReviewMedia(review);

  return (
    <div className="review-modal" role="dialog" aria-modal="true" aria-label={`Review from ${review.name}`}>
      <button type="button" className="review-modal__backdrop" aria-label="Close review" onClick={onClose} />
      <div className="review-modal__panel">
        <button type="button" className="review-modal__close" aria-label="Close review" onClick={onClose}>
          ×
        </button>
        {media.length ? (
          <div className="review-modal__gallery">
            <div
              className="review-modal__slides"
              style={{ transform: `translateX(-${slide * 100}%)` }}
            >
              {media.map((m, i) =>
                m.type === 'video' ? (
                  <video key={`${m.url}-${i}`} src={m.url} controls playsInline className="review-modal__slide" />
                ) : (
                  <img key={`${m.url}-${i}`} src={m.url} alt="" loading="lazy" className="review-modal__slide" />
                )
              )}
            </div>
            {media.length > 1 ? (
              <>
                <button
                  type="button"
                  className="review-modal__nav review-modal__nav--prev"
                  aria-label="Previous"
                  onClick={() => setSlide((s) => (s - 1 + media.length) % media.length)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="review-modal__nav review-modal__nav--next"
                  aria-label="Next"
                  onClick={() => setSlide((s) => (s + 1) % media.length)}
                >
                  ›
                </button>
                <div className="review-modal__dots">
                  {media.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`review-modal__dot${i === slide ? ' is-active' : ''}`}
                      aria-label={`Go to media ${i + 1}`}
                      onClick={() => setSlide(i)}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
        <div className="review-modal__body">
          <div className="review-modal__stars" aria-hidden="true">
            {'★'.repeat(Math.min(5, Math.max(1, Number(review.rating) || 5)))}
          </div>
          <p className="review-modal__text">“{review.text}”</p>
          <cite className="review-modal__cite">
            {review.name}
            {review.location ? ` · ${review.location}` : ''}
          </cite>
          {review.productName ? (
            <span className="review-modal__product">On {review.productName}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MarqueeRow({ reviews, direction, onOpen }) {
  const scrollerRef = useRef(null);
  const rafRef = useRef(0);
  const pausedRef = useRef(false);
  const resumeTimer = useRef(0);
  const loop = useMemo(() => [...reviews, ...reviews, ...reviews], [reviews]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;

    const speed = direction === 'rtl' ? 0.55 : -0.55;

    const tick = () => {
      if (!pausedRef.current && el) {
        el.scrollLeft += speed;
        const third = el.scrollWidth / 3;
        if (el.scrollLeft <= 0) el.scrollLeft = third;
        if (el.scrollLeft >= third * 2) el.scrollLeft = third;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    requestAnimationFrame(() => {
      if (el) el.scrollLeft = el.scrollWidth / 3;
    });

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(resumeTimer.current);
    };
  }, [direction, reviews]);

  const pause = () => {
    pausedRef.current = true;
    clearTimeout(resumeTimer.current);
  };

  const scheduleResume = () => {
    clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      pausedRef.current = false;
    }, 1800);
  };

  return (
    <div
      className={`reviews-marquee reviews-marquee--${direction}`}
      ref={scrollerRef}
      onPointerDown={pause}
      onPointerUp={scheduleResume}
      onPointerCancel={scheduleResume}
      onTouchStart={pause}
      onTouchEnd={scheduleResume}
      onMouseEnter={pause}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      onWheel={pause}
      aria-label={direction === 'ltr' ? 'Reviews scrolling left to right' : 'Reviews scrolling right to left'}
    >
      <div className="reviews-marquee__track">
        {loop.map((r, i) => (
          <ReviewCard key={`${r._id || r.id || r.name}-${direction}-${i}`} review={r} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export default function Reviews({ reviews, loading = false }) {
  const [activeReview, setActiveReview] = useState(null);

  if (loading) {
    return (
      <section className="reviews" aria-label="Customer reviews">
        <div className="container">
          <h2 className="rail__title">Why Players Choose H2R Sports</h2>
          <p className="reviews__hint">Loading player reviews…</p>
        </div>
      </section>
    );
  }

  if (!reviews?.length) {
    return (
      <section className="reviews" aria-label="Customer reviews">
        <div className="container">
          <h2 className="rail__title">Why Players Choose H2R Sports</h2>
          <p className="reviews__hint">
            Reviews will appear here once published. Trusted by players across India.
          </p>
        </div>
      </section>
    );
  }

  const mid = Math.ceil(reviews.length / 2);
  const rowLeft = reviews.slice(0, mid);
  const rowRight = reviews.slice(mid).length ? reviews.slice(mid) : reviews;

  return (
    <section className="reviews" aria-label="Customer reviews">
      <div className="container">
        <h2 className="rail__title">Why Players Choose H2R Sports</h2>
        <p className="reviews__hint">Swipe to browse · auto-scrolls both ways</p>
      </div>
      <div className="reviews-marquee-wrap">
        <MarqueeRow reviews={rowLeft} direction="ltr" onOpen={setActiveReview} />
        <MarqueeRow reviews={rowRight} direction="rtl" onOpen={setActiveReview} />
      </div>
      {activeReview ? (
        <ReviewModal review={activeReview} onClose={() => setActiveReview(null)} />
      ) : null}
    </section>
  );
}
