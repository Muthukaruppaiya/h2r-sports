import { useEffect, useRef, useState } from 'react';

const ICONS = {
  customers: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  bats: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M14.5 3.5 5 18l1.2 2.2L18.5 7.5z" />
      <path d="M4.2 19.4 3 21l2.1-.8" />
      <circle cx="18.5" cy="18.5" r="2.2" />
    </svg>
  ),
  rating: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M12 2.8l2.4 5.1 5.6.7-4.1 3.8 1.1 5.5L12 15.2l-4.9 2.7 1.1-5.5-4.1-3.8 5.6-.7L12 2.8z" />
    </svg>
  ),
  india: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 12h17M12 3.5c2.4 2.7 3.8 5.5 3.8 8.5S14.4 17.8 12 20.5C9.6 17.8 8.2 15 8.2 12S9.6 6.2 12 3.5z" />
    </svg>
  ),
};

const STATS = [
  {
    value: 1020,
    suffix: '+',
    label: 'Happy Customers',
    hint: 'Repeat buyers & referrals',
    icon: 'customers',
  },
  {
    value: 2000,
    suffix: '+',
    label: 'Bats Delivered',
    hint: 'Across India',
    icon: 'bats',
  },
  {
    value: 4.9,
    decimals: 1,
    suffix: '',
    label: 'Average Rating',
    hint: 'From verified players',
    icon: 'rating',
    star: true,
  },
  {
    value: 28,
    suffix: '+',
    label: 'States Covered',
    hint: 'Free shipping pan-India',
    icon: 'india',
  },
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
    <article
      className={`stats__item reveal-up${active ? ' is-visible' : ''}`}
      style={{ '--reveal-delay': `${index * 80}ms` }}
    >
      <span className="stats__icon" aria-hidden="true">
        {ICONS[stat.icon]}
      </span>
      <strong className="stats__value">
        {display}
        {stat.suffix ? <span className="stats__suffix">{stat.suffix}</span> : null}
        {stat.star ? <span className="stats__star" aria-hidden="true">★</span> : null}
      </strong>
      <span className="stats__label">{stat.label}</span>
      <span className="stats__hint">{stat.hint}</span>
    </article>
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
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="stats" ref={ref} aria-label="H2R Sports in numbers">
      <div className="stats__glow" aria-hidden="true" />
      <div className="container stats__inner">
        <header className="stats__head">
          <p className="stats__eyebrow">H2R by the numbers</p>
          <h2>Built for match day. Trusted across India.</h2>
        </header>
        <div className="stats__grid">
          {STATS.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} active={active} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
