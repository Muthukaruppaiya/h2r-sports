import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl, mediaUrl } from '../config/api.js';

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD = 40;

function shortestOffset(index, active, count) {
  let raw = index - active;
  if (raw > count / 2) raw -= count;
  if (raw < -count / 2) raw += count;
  return raw;
}

function VideoCard({ video, offset, onSelect, onBuy }) {
  const ref = useRef(null);
  const isCenter = offset === 0;
  const hidden = Math.abs(offset) > 1;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isCenter) {
      el.muted = true;
      el.playsInline = true;
      const p = el.play();
      if (p?.catch) p.catch(() => {});
    } else {
      el.pause();
    }
  }, [isCenter]);

  const style = {
    transform: `translate(-50%, 0) translateX(${offset * 64}%) scale(${isCenter ? 1 : 0.82})`,
    zIndex: isCenter ? 3 : 2 - Math.abs(offset),
    opacity: hidden ? 0 : isCenter ? 1 : 0.6,
    pointerEvents: hidden ? 'none' : 'auto',
  };

  return (
    <div
      className={`video-showcase__card${isCenter ? ' is-active' : ''}`}
      style={style}
      role="button"
      tabIndex={hidden ? -1 : 0}
      aria-label={isCenter ? `Buy ${video.productName}` : `Show ${video.productName} video`}
      onClick={() => (isCenter ? onBuy(video) : onSelect())}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isCenter) onBuy(video);
          else onSelect();
        }
      }}
    >
      <video
        ref={ref}
        className="video-showcase__video"
        src={mediaUrl(video.videoUrl)}
        muted
        loop
        playsInline
        preload={hidden ? 'metadata' : 'auto'}
        draggable={false}
      />
      <div className="video-showcase__scrim" />
      {!isCenter ? <span className="video-showcase__play">▶</span> : null}
      {isCenter ? (
        <div className="video-showcase__info">
          <span className="video-showcase__badge">H2R Sports</span>
          <h3 className="video-showcase__title">{video.productName}</h3>
          <button
            type="button"
            className="video-showcase__cta"
            onClick={(e) => {
              e.stopPropagation();
              onBuy(video);
            }}
          >
            Buy Now
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Homepage "watch before you buy" carousel — managed in Admin → Marketing → Homepage Showcase.
 * Coverflow-style: center card autoplays, side cards peek and are tappable to bring to front.
 */
export default function VideoShowcase() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const touchRef = useRef({ x: 0, active: false });

  useEffect(() => {
    let mounted = true;
    fetch(apiUrl('/marketing/public'))
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setVideos((data.showcaseVideos || []).filter((v) => v.videoUrl));
      })
      .catch(() => {
        if (mounted) setVideos([]);
      })
      .finally(() => {
        if (mounted) setLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (videos.length <= 1) return undefined;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % videos.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [videos.length]);

  if (!loaded || videos.length === 0) return null;

  const go = (delta) => {
    setIndex((i) => ((i + delta) % videos.length + videos.length) % videos.length);
  };

  const handleBuy = (video) => {
    navigate(video.productPath || '/shop');
  };

  const onTouchStart = (e) => {
    touchRef.current = { x: e.touches[0].clientX, active: true };
  };
  const onTouchEnd = (e) => {
    if (!touchRef.current.active) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    touchRef.current.active = false;
    if (dx > SWIPE_THRESHOLD) go(-1);
    else if (dx < -SWIPE_THRESHOLD) go(1);
  };

  return (
    <section className="video-showcase" aria-label="Watch H2R bats in action">
      <div className="container video-showcase__head">
        <span className="video-showcase__eyebrow">Watch &amp; Buy</span>
        <h2>See H2R In Action</h2>
        <p>Real players middling it with our bats — watch before you buy.</p>
      </div>

      <div className="video-showcase__stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {videos.length > 1 ? (
          <button
            type="button"
            className="video-showcase__arrow video-showcase__arrow--prev"
            aria-label="Previous video"
            onClick={() => go(-1)}
          >
            ‹
          </button>
        ) : null}

        <div className="video-showcase__track">
          {videos.map((v, i) => (
            <VideoCard
              key={v.id || i}
              video={v}
              offset={shortestOffset(i, index, videos.length)}
              onSelect={() => setIndex(i)}
              onBuy={handleBuy}
            />
          ))}
        </div>

        {videos.length > 1 ? (
          <button
            type="button"
            className="video-showcase__arrow video-showcase__arrow--next"
            aria-label="Next video"
            onClick={() => go(1)}
          >
            ›
          </button>
        ) : null}
      </div>

      {videos.length > 1 ? (
        <div className="video-showcase__dots">
          {videos.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`video-showcase__dot${i === index ? ' is-active' : ''}`}
              aria-label={`Go to video ${i + 1}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
