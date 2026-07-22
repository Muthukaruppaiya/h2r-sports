import { useEffect, useRef, useState } from 'react';

const STATS = [
  { value: 1020, suffix: '+', label: 'Happy Customers', icon: '😊' },
  { value: 2000, suffix: '+', label: 'Bats Delivered', icon: '🏏' },
  { value: 4.9, decimals: 1, suffix: '★', label: 'Average Rating', icon: '⭐' },
];

function useCountUp(target, decimals, active) {
  const [value, setValue] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (!active) return undefined;
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(target * eased);
      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, target]);

  return decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-IN');
}

function StatCard({ stat, active, index }) {
  const display = useCountUp(stat.value, stat.decimals, active);

  return (
    <div
      className={`stats__item reveal-up${active ? ' is-visible' : ''}`}
      style={{ '--reveal-delay': `${index * 90}ms` }}
    >
      <span className="stats__icon" aria-hidden="true">
        {stat.icon}
      </span>
      <strong className="stats__value">
        {display}
        <span className="stats__suffix">{stat.suffix}</span>
      </strong>
      <span className="stats__label">{stat.label}</span>
    </div>
  );
}

export default function StatsStrip() {
  const [active, setActive] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="stats" ref={ref} aria-label="H2R Sports in numbers">
      <div className="container stats__grid">
        {STATS.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} active={active} index={i} />
        ))}
      </div>
    </section>
  );
}
