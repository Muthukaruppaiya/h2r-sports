import { useEffect, useRef } from 'react';

/**
 * Reveals children with a smooth upward fade (+ slight scale/blur) as they
 * enter the viewport. Pass `stagger` to animate direct children one-by-one
 * instead of the whole block at once.
 */
export default function RevealOnScroll({
  children,
  className = '',
  as: Tag = 'div',
  stagger = false,
  step = 90,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let targets;
    if (stagger) {
      targets = Array.from(el.children);
      targets.forEach((node, i) => {
        node.classList.add('reveal-up');
        node.style.setProperty('--reveal-delay', `${Math.min(i, 8) * step}ms`);
      });
    } else {
      el.classList.add('reveal-up');
      targets = [el];
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );

    targets.forEach((node) => io.observe(node));
    return () => io.disconnect();
  }, [stagger, step]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
