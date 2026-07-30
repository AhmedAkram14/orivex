'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  /** Stagger this element's reveal behind siblings, in ms (e.g. for a grid of cards). */
  delayMs?: number;
}

/**
 * Fades + slides a section into place the first time it scrolls into
 * view -- native IntersectionObserver, no animation library dependency.
 * Reveals once (`unobserve` after triggering) rather than on every
 * scroll-past, and respects `prefers-reduced-motion` by skipping the
 * transition and rendering visible immediately.
 */
export function RevealOnScroll({ children, className, delayMs = 0 }: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
        className,
      )}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
