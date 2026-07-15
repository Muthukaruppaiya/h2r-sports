import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Floating Watch & Buy video — autoplays muted (browser policy),
 * unmute on user click. Points shoppers to a product.
 */
export default function WatchBuyVideo({
  productPath = '/shop/thala-hard',
  productName = 'Thala Edition Hard Tennis Bat',
}) {
  const videoRef = useRef(null);
  const [open, setOpen] = useState(true);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !open) return;
    el.muted = true;
    const play = el.play();
    if (play?.catch) play.catch(() => {});
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        className="watchbuy watchbuy--fab"
        onClick={() => setOpen(true)}
        aria-label="Open Watch & Buy video"
      >
        ▶ Watch
      </button>
    );
  }

  return (
    <aside className="watchbuy" aria-label="Watch and buy">
      <button
        type="button"
        className="watchbuy__close"
        onClick={() => setOpen(false)}
        aria-label="Close video"
      >
        ✕
      </button>

      <div className="watchbuy__media">
        <video
          ref={videoRef}
          className="watchbuy__video"
          autoPlay
          muted={muted}
          loop
          playsInline
          preload="auto"
          poster="/h2r-logo.png"
        >
          <source
            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
            type="video/mp4"
          />
        </video>

        <button
          type="button"
          className="watchbuy__mute"
          onClick={() => {
            const next = !muted;
            setMuted(next);
            if (videoRef.current) {
              videoRef.current.muted = next;
              videoRef.current.play().catch(() => {});
            }
          }}
        >
          {muted ? 'Unmute' : 'Mute'}
        </button>
      </div>

      <Link to={productPath} className="watchbuy__cta">
        Watch &amp; Buy
        <span>{productName}</span>
      </Link>
    </aside>
  );
}
