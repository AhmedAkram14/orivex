'use client';

import { useEffect, type RefObject } from 'react';

const DEFAULT_MAX_LINES = 6;
/** Fallback used only when `getComputedStyle` can't resolve a usable line-height/font-size (e.g. a detached node) -- real measurement below always wins when it's available. */
const FALLBACK_LINE_HEIGHT_PX = 20;

/**
 * Auto-grows a textarea to fit its content as the user types, capped at
 * roughly `maxLines` lines so the composer can't take over the screen.
 * The cap is computed from the textarea's own line-height/padding/border
 * (via `getComputedStyle`) rather than a guessed pixel number, so it stays
 * correct across font-size changes, zoom, and locale-specific fonts.
 *
 * Recomputes whenever `value` changes -- pass the same string driving the
 * textarea's `value` prop so a paste, programmatic clear, etc. all resize
 * it, not just direct keystrokes.
 */
export function useAutoGrowTextarea(ref: RefObject<HTMLTextAreaElement | null>, value: string, maxLines = DEFAULT_MAX_LINES) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const style = window.getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize);
    const lineHeight = parseFloat(style.lineHeight) || (Number.isFinite(fontSize) ? fontSize * 1.2 : FALLBACK_LINE_HEIGHT_PX);
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const borderBottom = parseFloat(style.borderBottomWidth) || 0;
    const maxHeight = lineHeight * maxLines + paddingTop + paddingBottom + borderTop + borderBottom;

    // Reset height first so shrinking (e.g. deleting text) is measured
    // correctly -- scrollHeight only ever grows against a fixed height.
    el.style.height = 'auto';
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [ref, value, maxLines]);
}
