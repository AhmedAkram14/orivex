'use client';

import { ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';

/**
 * Appears once the page has scrolled a full viewport height, scrolls
 * smoothly back to the top on click (or instantly for
 * `prefers-reduced-motion` users). Fixed-position, so where it's
 * rendered in the tree doesn't matter -- mounted once per page.
 */
export function BackToTopButton() {
  const t = useTranslations('common');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > window.innerHeight * 0.75);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      }}
      aria-label={t('backToTop')}
      className={cn(
        'fixed bottom-6 end-6 z-(--z-dropdown) flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 ease-out hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <Icon icon={ArrowUp} size="md" />
    </button>
  );
}
