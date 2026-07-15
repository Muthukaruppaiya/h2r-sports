import { useMemo } from 'react';

function ReviewCard({ review }) {
  return (
    <blockquote className="review-card review-card--marquee">
      <div className="review-card__stars" aria-hidden="true">
        ★★★★★
      </div>
      <p>“{review.text}”</p>
      <cite>{review.name}</cite>
    </blockquote>
  );
}

function MarqueeRow({ reviews, direction }) {
  const loop = useMemo(() => [...reviews, ...reviews], [reviews]);

  return (
    <div className={`reviews-marquee reviews-marquee--${direction}`} aria-hidden={false}>
      <div className="reviews-marquee__track">
        {loop.map((r, i) => (
          <ReviewCard key={`${r.id}-${direction}-${i}`} review={r} />
        ))}
      </div>
    </div>
  );
}

export default function Reviews({ reviews }) {
  if (!reviews?.length) return null;

  const mid = Math.ceil(reviews.length / 2);
  const rowLeft = reviews.slice(0, mid);
  const rowRight = reviews.slice(mid).length ? reviews.slice(mid) : reviews;

  return (
    <section className="reviews" aria-label="Customer reviews">
      <div className="container">
        <h2 className="rail__title">Why Players Choose H2R Sports</h2>
      </div>
      <div className="reviews-marquee-wrap">
        <MarqueeRow reviews={rowLeft} direction="ltr" />
        <MarqueeRow reviews={rowRight} direction="rtl" />
      </div>
    </section>
  );
}
