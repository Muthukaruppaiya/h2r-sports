import { useEffect, useRef } from 'react';

/**
 * Thin gradient progress bar pinned to the very top of the viewport.
 * Tracks scroll position with rAF so it stays perfectly smooth.
 */
export default function ScrollProgress() {
  const barRef = useRef(null);
  const ticking = useRef(false);

  useEffect(() => {
    const update = () => {
      ticking.current = false;
      const el = barRef.current;
      if (!el) return;
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      const pct = height > 0 ? Math.min(1, Math.max(0, scrollTop / height)) : 0;
      el.style.transform = `scaleX(${pct})`;
    };

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="scroll-progress" aria-hidden="true">
      <div className="scroll-progress__bar" ref={barRef} />
    </div>
  );
}
