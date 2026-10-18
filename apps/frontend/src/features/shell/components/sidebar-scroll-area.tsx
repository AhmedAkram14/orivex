'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from '@/shared/i18n/navigation';

const FADE_TOP = '20px';
const FADE_BOTTOM = '28px';

/**
 * The desktop sidebar's one scroll region. The help card and footer scroll
 * with the nav instead of being pinned under it: pinned, they took ~95px
 * from the nav on every role, which clipped the Admin and Doctor lists
 * (their last entries -- Users, Security -- sat behind the footer) on a
 * laptop-height screen. Now the nav gets the full column, and on a tall
 * screen the footer still sits at the bottom (`mt-auto` in a min-h-full
 * column).
 *
 * An edge fades only while there is more to scroll that way, so "there's
 * more below" is visible without hover (overlay scrollbars hide until
 * scrolled) and nothing is faded when nothing overflows. The current page's
 * entry is scrolled into view on navigation, so a deep link never lands
 * with its own nav item out of sight.
 */
export function SidebarScrollArea({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [edges, setEdges] = useState({ top: false, bottom: false });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const top = element.scrollTop > 0;
      const bottom = element.scrollTop + element.clientHeight < element.scrollHeight - 1;
      setEdges((previous) => (previous.top === top && previous.bottom === bottom ? previous : { top, bottom }));
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    if (element.firstElementChild) observer?.observe(element.firstElementChild);
    return () => {
      element.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    const current = ref.current?.querySelector<HTMLElement>('[aria-current="page"]');
    current?.scrollIntoView?.({ block: 'nearest' });
  }, [pathname]);

  const mask = `linear-gradient(to bottom, ${edges.top ? 'transparent' : 'black'}, black ${FADE_TOP}, black calc(100% - ${FADE_BOTTOM}), ${edges.bottom ? 'transparent' : 'black'})`;

  return (
    <div
      ref={ref}
      data-scroll-top={edges.top || undefined}
      data-scroll-bottom={edges.bottom || undefined}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      <div className="flex min-h-full flex-col gap-3">
        {children}
        <div className="mt-auto flex flex-col gap-3 border-t border-border-default pt-3">{footer}</div>
      </div>
    </div>
  );
}
