import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Collapsed circular bubble by default — expands to video on tap.
 * Close (X) dismisses the player back to the bubble.
 */
export default function WatchBuyVideo({
  productPath = '/shop/thala-hard',
  productName = 'Thala Edition Hard Tennis Bat',
}) {
  const videoRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !open) return;
    el.muted = true;
    setMuted(true);
    const play = el.play();
    if (play?.catch) play.catch(() => {});
  }, [open]);

  useEffect(() => {
    if (open) return undefined;
    const el = videoRef.current;
    if (el) {
      el.pause();
    }
    return undefined;
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        className="watchbuy-bubble"
        onClick={() => setOpen(true)}
        aria-label="Open Watch & Buy video"
      >
        <span className="watchbuy-bubble__icon" aria-hidden="true">
          ▶
        </span>
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
          preload="metadata"
          poster="/hero/banner.jpg"
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

      <Link to={productPath} className="watchbuy__cta" onClick={() => setOpen(false)}>
        Watch &amp; Buy
        <span>{productName}</span>
      </Link>
    </aside>
  );
}
