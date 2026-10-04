'use client';

import { useLayoutEffect, useRef, useState } from 'react';

/**
 * An element's own rendered width, kept current as it resizes -- for a component that lays itself out by the space
 * it really has (a dialog, a card in a grid), not by the viewport. 0 until measured (and in environments with no
 * layout, such as jsdom), so callers treat 0 as "unknown".
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    setWidth(node.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}
