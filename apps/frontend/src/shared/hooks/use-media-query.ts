'use client';

import { useEffect, useState } from 'react';

/** Subscribes to a CSS media query at runtime — for the rare case a component needs JS-level breakpoint knowledge (e.g. choosing Drawer vs. Dialog by viewport) rather than pure CSS responsive classes. Returns `false` on the server and during the first client render to avoid a hydration mismatch; the real value settles in an effect. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', listener);
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
