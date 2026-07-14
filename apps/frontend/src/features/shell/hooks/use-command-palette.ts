'use client';

import { useEffect, useState } from 'react';

/**
 * Owns the command palette's open state and the global ⌘K/Ctrl+K
 * shortcut — a single document-level listener (not one per trigger
 * button), so the shortcut works from anywhere on a protected page, not
 * just while the trigger button has focus.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { open, setOpen };
}
