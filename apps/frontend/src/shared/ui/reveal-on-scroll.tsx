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
 * Fades + slides a section in the first time it scrolls into view. Progressive
 * enhancement: the server render and the first client paint are FULLY VISIBLE,
 * so content never depends on JavaScript (and never leaves a viewport-tall
 * blank gap). Only after mount, and only for a section that starts below the
 * fold, is it hidden and then revealed `once` at a 10% threshold. Reduced
 * motion skips all of it.
 */
export function RevealOnScroll({ children, className, delayMs = 0 }: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'visible' | 'hidden'>('visible');
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = node.getBoundingClientRect();
    // Already on screen (or above it): stay visible, no animation.
    if (rect.top < window.innerHeight * 0.9) return;

    setAnimate(true);
    setState('hidden');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('visible');
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        animate && 'transition-[opacity,transform] duration-700 ease-out',
        state === 'hidden' ? 'translate-y-6 opacity-0' : 'translate-y-0 opacity-100',
        className,
      )}
      style={delayMs && animate ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
