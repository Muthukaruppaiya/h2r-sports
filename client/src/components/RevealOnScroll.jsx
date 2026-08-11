import { useEffect, useRef } from 'react';

/**
 * Reveals children with a smooth upward fade (+ slight scale/blur) as they
 * enter the viewport. Pass `stagger` to animate direct children one-by-one
 * instead of the whole block at once. Pass `variant="fast"` for a lighter,
 * quicker fade (no blur) suited to small inline elements like buttons or
 * form fields, where the heavier default feels sluggish.
 */
export default function RevealOnScroll({
  children,
  className = '',
  as: Tag = 'div',
  stagger = false,
  step = 90,
  variant = 'up',
}) {
  const ref = useRef(null);
  const revealClass = variant === 'fast' ? 'reveal-fast' : 'reveal-up';

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let targets;
    if (stagger) {
      targets = Array.from(el.children);
      targets.forEach((node, i) => {
        node.classList.add(revealClass);
        node.style.setProperty('--reveal-delay', `${Math.min(i, 8) * step}ms`);
      });
    } else {
      el.classList.add(revealClass);
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
  }, [stagger, step, revealClass]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
