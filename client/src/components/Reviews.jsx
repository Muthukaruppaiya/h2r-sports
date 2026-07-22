import { useEffect, useMemo, useRef } from 'react';

function ReviewCard({ review }) {
  return (
    <blockquote className="review-card review-card--marquee">
      {review.image ? (
        <div className="review-card__photo">
          <img src={review.image} alt="" loading="lazy" />
        </div>
      ) : null}
      <div className="review-card__body">
        <div className="review-card__stars" aria-hidden="true">
          {'★'.repeat(Math.min(5, Math.max(1, Number(review.rating) || 5)))}
        </div>
        <p>“{review.text}”</p>
        <cite>{review.name}</cite>
      </div>
    </blockquote>
  );
}

function MarqueeRow({ reviews, direction }) {
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
          <ReviewCard key={`${r._id || r.id || r.name}-${direction}-${i}`} review={r} />
        ))}
      </div>
    </div>
  );
}

export default function Reviews({ reviews, loading = false }) {
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
        <MarqueeRow reviews={rowLeft} direction="ltr" />
        <MarqueeRow reviews={rowRight} direction="rtl" />
      </div>
    </section>
  );
}
