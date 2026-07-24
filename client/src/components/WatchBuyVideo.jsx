import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiUrl, mediaUrl } from '../config/api.js';

const DRAG_THRESHOLD = 8;
const STORAGE_KEY = 'h2r_watchbuy_dismissed';
const POS_KEY = 'h2r_watchbuy_pos';

function tryPlay(el) {
  if (!el) return;
  el.muted = true;
  el.defaultMuted = true;
  el.setAttribute('muted', '');
  el.playsInline = true;
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', '');
  const p = el.play();
  if (p?.catch) p.catch(() => {});
}

function clampPos(left, top, width, height) {
  const pad = 8;
  const maxL = Math.max(pad, window.innerWidth - width - pad);
  const maxT = Math.max(pad, window.innerHeight - height - pad);
  return {
    left: Math.min(maxL, Math.max(pad, left)),
    top: Math.min(maxT, Math.max(pad, top)),
  };
}

function readSavedPos() {
  try {
    const raw = sessionStorage.getItem(POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.left !== 'number' || typeof p?.top !== 'number') return null;
    return p;
  } catch {
    return null;
  }
}

/**
 * Mini autoplay video above WhatsApp. Drag to move; position sticks. Tap to expand.
 */
export default function WatchBuyVideo({
  productPath = '/shop',
  productName = 'Shop now',
  docked = false,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const miniRef = useRef(null);
  const fullRef = useRef(null);
  const shellRef = useRef(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    originLeft: 0,
    originTop: 0,
    pointerId: null,
  });

  const [videos, setVideos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
  const [pos, setPos] = useState(() => readSavedPos());
  const [dragging, setDragging] = useState(false);

  const currentVideo = videos[videoIndex];
  const src = mediaUrl(currentVideo?.videoUrl);
  const fallbackSrc = currentVideo?.videoUrl ? mediaUrl(currentVideo.videoUrl) : '';
  const buyPath = currentVideo?.productPath || productPath;
  const buyName = currentVideo?.productName || productName;
  const isFree = Boolean(pos);

  useEffect(() => {
    const isBrowse =
      pathname === '/' || pathname === '/shop' || pathname.startsWith('/collections');
    if (isBrowse) {
      sessionStorage.removeItem(STORAGE_KEY);
      setDismissed(false);
    } else if (sessionStorage.getItem(STORAGE_KEY) === '1') {
      setDismissed(true);
      setExpanded(false);
    }
  }, [pathname]);

  const cancelFloatingVideo = () => {
    setExpanded(false);
    setDismissed(true);
    sessionStorage.setItem(STORAGE_KEY, '1');
    miniRef.current?.pause();
    fullRef.current?.pause();
  };

  useEffect(() => {
    let mounted = true;
    const fetchConfig = async () => {
      try {
        const res = await fetch(apiUrl('/marketing/public'));
        const data = await res.json();
        if (!mounted) return;
        const list = (data.floatingVideos || []).filter((v) => v.videoUrl);
        setVideos(list);
      } catch {
        if (!mounted) return;
        setVideos([]);
      } finally {
        if (mounted) setLoaded(true);
      }
    };
    fetchConfig();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (dismissed || !src) return undefined;
    const el = expanded ? fullRef.current : miniRef.current;
    tryPlay(el);

    const onReady = () => tryPlay(el);
    el?.addEventListener('loadeddata', onReady);
    el?.addEventListener('canplay', onReady);

    const t1 = setTimeout(() => tryPlay(el), 150);
    const t2 = setTimeout(() => tryPlay(el), 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      el?.removeEventListener('loadeddata', onReady);
      el?.removeEventListener('canplay', onReady);
    };
  }, [src, videoIndex, expanded, dismissed]);

  useEffect(() => {
    if (expanded || dismissed || videos.length <= 1) return undefined;
    const interval = setInterval(() => {
      setVideoIndex((prev) => (prev + 1) % videos.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [videos.length, expanded, dismissed]);

  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  useEffect(() => {
    if (!pos) return undefined;
    const onResize = () => {
      const el = shellRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos((prev) => {
        if (!prev) return prev;
        const next = clampPos(prev.left, prev.top, rect.width, rect.height);
        sessionStorage.setItem(POS_KEY, JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pos]);

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('.watchbuy__close')) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const d = dragRef.current;
    d.active = true;
    d.moved = false;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.originLeft = pos?.left ?? rect.left;
    d.originTop = pos?.top ?? rect.top;
    d.pointerId = e.pointerId;
    el.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      d.moved = true;
      setDragging(true);
    }
    if (!d.moved) return;

    const el = shellRef.current;
    const w = el?.offsetWidth || 112;
    const h = el?.offsetHeight || 140;
    const next = clampPos(d.originLeft + dx, d.originTop + dy, w, h);
    setPos(next);
  };

  const endPointer = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const wasDrag = d.moved;
    d.active = false;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(d.pointerId);
    } catch {
      /* ignore */
    }
    if (wasDrag) {
      const el = shellRef.current;
      const w = el?.offsetWidth || 112;
      const h = el?.offsetHeight || 140;
      const next = clampPos(d.originLeft + (e.clientX - d.startX), d.originTop + (e.clientY - d.startY), w, h);
      setPos(next);
      sessionStorage.setItem(POS_KEY, JSON.stringify(next));
    } else {
      setExpanded(true);
    }
  };

  const handleBuyNow = () => {
    cancelFloatingVideo();
    navigate(buyPath);
  };

  if (!loaded || dismissed || videos.length === 0 || !src) return null;

  const miniStyle = isFree
    ? {
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        right: 'auto',
        bottom: 'auto',
        zIndex: dragging ? 1400 : 1310,
      }
    : undefined;

  return (
    <>
      {!expanded && (
        <aside
          ref={shellRef}
          className={`watchbuy watchbuy--mini${docked && !isFree ? ' watchbuy--docked' : ''}${
            isFree ? ' watchbuy--free' : ''
          }${dragging ? ' is-dragging' : ''}`}
          aria-label="Watch and buy — drag to move"
          title="Drag to move · Tap to open"
          style={miniStyle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        >
          <button
            type="button"
            className="watchbuy__close"
            onClick={(e) => {
              e.stopPropagation();
              cancelFloatingVideo();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close video"
          >
            ✕
          </button>

          <div className="watchbuy__expand-hit" role="button" tabIndex={0} aria-label="Open full size video">
            <div className="watchbuy__media watchbuy__media--mini">
              <video
                key={`mini-${src}`}
                ref={miniRef}
                className="watchbuy__video"
                src={src}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                draggable={false}
                onLoadedData={(e) => tryPlay(e.currentTarget)}
                onCanPlay={(e) => tryPlay(e.currentTarget)}
                onError={(e) => {
                  if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
                    e.currentTarget.src = fallbackSrc;
                    tryPlay(e.currentTarget);
                  }
                }}
              />
            </div>
            <span className="watchbuy__tap-hint">Drag · Tap</span>
          </div>
        </aside>
      )}

      {expanded && (
        <div className="watchbuy-full" role="dialog" aria-modal="true" aria-label="Full size video">
          <div className="watchbuy-full__backdrop" onClick={() => setExpanded(false)} />
          <div className="watchbuy-full__panel">
            <button
              type="button"
              className="watchbuy-full__close"
              onClick={() => setExpanded(false)}
              aria-label="Close full video"
            >
              ✕
            </button>

            <div className="watchbuy-full__media">
              <video
                key={`full-${src}`}
                ref={fullRef}
                className="watchbuy-full__video"
                src={src}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                controls
                onLoadedData={(e) => tryPlay(e.currentTarget)}
                onCanPlay={(e) => tryPlay(e.currentTarget)}
                onError={(e) => {
                  if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
                    e.currentTarget.src = fallbackSrc;
                    tryPlay(e.currentTarget);
                  }
                }}
              />
            </div>

            <div className="watchbuy-full__footer">
              <p className="watchbuy-full__product">{buyName}</p>
              <button type="button" className="watchbuy-full__buy" onClick={handleBuyNow}>
                Buy Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
