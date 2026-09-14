'use client';

import { useEffect } from 'react';

/**
 * Warns before losing unsaved form edits -- two distinct exit paths, since
 * Next.js App Router has no stable `usePrompt`/navigation-blocker API
 * (that's a React Router/Remix primitive) to intercept client-side route
 * changes directly:
 *
 * 1. A real browser-level exit (tab close, refresh, typed URL, external
 *    link) -- the standard `beforeunload` confirmation.
 * 2. An in-app navigation via any same-document `<a>` click (e.g. a
 *    sidebar `Link`) -- caught in the capture phase before the click
 *    reaches the anchor's own handler, so it can be cancelled with a
 *    native `confirm()` before Next.js ever starts the transition. Only
 *    intercepts a plain left-click on a same-origin link that isn't
 *    opening in a new tab/window and doesn't already point at the current
 *    page -- never form controls, buttons, or the Cancel/Save actions
 *    inside the guarded form itself.
 */
export function useUnsavedChangesGuard(isDirty: boolean, message: string) {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Chrome requires a truthy returnValue to show its own generic
      // "leave site?" prompt -- the string itself is never actually shown
      // by any modern browser.
      event.returnValue = '';
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor || !anchor.href || anchor.target === '_blank') return;

      let destination: URL;
      try {
        destination = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick, true);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isDirty, message]);
}
