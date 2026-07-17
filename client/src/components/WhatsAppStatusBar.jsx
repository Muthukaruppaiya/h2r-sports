import { useEffect, useRef, useState } from 'react';
import { apiUrl, mediaUrl } from '../config/api.js';
import { BRAND } from '../utils/india';

function buildStatusLink(prefillMessage) {
  const text = encodeURIComponent(prefillMessage || 'Hi H2R Sports! I saw your status update.');
  return `https://wa.me/${BRAND.whatsapp}?text=${text}`;
}

export default function WhatsAppStatusBar() {
  const [statuses, setStatuses] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [seen, setSeen] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('h2r_status_seen') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    let mounted = true;
    const fetchStatuses = async () => {
      try {
        const res = await fetch(apiUrl('/marketing/public'));
        const data = await res.json();
        if (!mounted) return;
        setStatuses(data.whatsappStatuses || []);
      } catch (_err) {
        if (!mounted) return;
        setStatuses([]);
      }
    };
    fetchStatuses();
    const timer = window.setInterval(fetchStatuses, 60_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('has-wa-status');
  }, []);

  const markSeen = (id) => {
    setSeen((prev) => {
      const next = { ...prev, [id]: true };
      sessionStorage.setItem('h2r_status_seen', JSON.stringify(next));
      return next;
    });
  };

  const openViewer = (index) => {
    setViewerIndex(index);
    if (statuses[index]) markSeen(statuses[index].id);
  };

  const closeViewer = () => setViewerIndex(null);

  const goNext = () => {
    if (viewerIndex == null) return;
    if (viewerIndex >= statuses.length - 1) {
      closeViewer();
      return;
    }
    const next = viewerIndex + 1;
    setViewerIndex(next);
    markSeen(statuses[next].id);
  };

  const goPrev = () => {
    if (viewerIndex == null || viewerIndex <= 0) return;
    const prev = viewerIndex - 1;
    setViewerIndex(prev);
    markSeen(statuses[prev].id);
  };

  if (!statuses.length) return null;

  return (
    <>
      <div className="wa-status-strip wa-status-strip--inline" aria-label="Story status updates">
        <div className="container wa-status-strip__inner">
          {statuses.map((status, index) => {
            const isSeen = !!seen[status.id];
            return (
              <button
                key={status.id}
                type="button"
                className={`wa-status-ring${isSeen ? ' is-seen' : ''}`}
                onClick={() => openViewer(index)}
              >
                <span className="wa-status-ring__halo">
                  <span className="wa-status-ring__media">
                    {status.mediaType === 'video' ? (
                      <video src={`${mediaUrl(status.mediaUrl)}#t=0.1`} muted playsInline preload="metadata" />
                    ) : (
                      <img src={mediaUrl(status.mediaUrl)} alt="" />
                    )}
                  </span>
                </span>
                <span className="wa-status-ring__label">{status.title || 'Update'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {viewerIndex != null && statuses[viewerIndex] && (
        <StatusViewer
          status={statuses[viewerIndex]}
          index={viewerIndex}
          total={statuses.length}
          onClose={closeViewer}
          onNext={goNext}
          onPrev={goPrev}
        />
      )}
    </>
  );
}

function StatusViewer({ status, index, total, onClose, onNext, onPrev }) {
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    document.addEventListener('keydown', onKey);

    let raf;
    let start = performance.now();
    const durationMs = status.mediaType === 'video' ? null : 5000;

    const tick = (now) => {
      if (durationMs == null) return;
      const pct = Math.min(100, ((now - start) / durationMs) * 100);
      setProgress(pct);
      if (pct >= 100) {
        onNext();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    if (durationMs != null) raf = requestAnimationFrame(tick);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [status, onClose, onNext, onPrev]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || status.mediaType !== 'video') return undefined;
    el.currentTime = 0;
    el.play().catch(() => {});
    const onTime = () => {
      if (!el.duration) return;
      setProgress((el.currentTime / el.duration) * 100);
    };
    const onEnded = () => onNext();
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnded);
    };
  }, [status, onNext]);

  return (
    <div className="wa-viewer" role="dialog" aria-modal="true" aria-label={status.title || 'Status'}>
      <div className="wa-viewer__progress">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="wa-viewer__track">
            <div
              className="wa-viewer__fill"
              style={{
                width: i < index ? '100%' : i === index ? `${progress}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      <div className="wa-viewer__top">
        <div>
          <strong>{status.title || 'Update'}</strong>
          <span>
            {status.durationDays || 1} day{(status.durationDays || 1) > 1 ? 's' : ''} · {index + 1}/{total}
          </span>
        </div>
        <button type="button" className="wa-viewer__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <button type="button" className="wa-viewer__nav wa-viewer__nav--prev" onClick={onPrev} aria-label="Previous" />
      <button type="button" className="wa-viewer__nav wa-viewer__nav--next" onClick={onNext} aria-label="Next" />

      <div className="wa-viewer__media">
        {status.mediaType === 'video' ? (
          <video ref={videoRef} src={mediaUrl(status.mediaUrl)} playsInline autoPlay muted={false} controls={false} />
        ) : (
          <img src={mediaUrl(status.mediaUrl)} alt={status.title || 'Status'} />
        )}
      </div>

      {(status.text || status.prefillMessage) && (
        <div className="wa-viewer__caption">
          {status.text && <p>{status.text}</p>}
          <a
            className="wa-viewer__cta"
            href={buildStatusLink(status.prefillMessage)}
            target="_blank"
            rel="noreferrer"
          >
            {status.ctaText || 'Message us on WhatsApp'}
          </a>
        </div>
      )}
    </div>
  );
}
