'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { MessageThread } from '@/features/messaging/api/types';

/**
 * Messages Page Overhaul (Phase 3): the screen-reader-only complement to
 * the background-thread toast `use-realtime-socket.ts` already fires for
 * sighted users on `message.sent` (Phase 2) -- that toast never reaches a
 * screen-reader user unless it also lands in an `aria-live` region.
 * Adapted directly from `use-queue-arrival-announcer.ts`'s diff-based
 * pattern: snapshots every thread's `lastMessageAt` on each render and
 * compares it against the previously-observed snapshot, announcing the
 * first thread whose timestamp genuinely advanced.
 *
 * The first snapshot after mount is a baseline, never announced -- the
 * inbox's own starting state is not a "new message". A thread that's brand
 * new since the last snapshot (e.g. just created via "New message") is
 * also not announced here: there is no *previous* `lastMessageAt` for it
 * to have advanced past, which is deliberate -- starting a conversation
 * already has its own, separate feedback (the dialog closing, the thread
 * becoming selected), not a "you have a new message" announcement.
 */
export function useNewMessageAnnouncer(threads: MessageThread[] | undefined): string {
  const t = useTranslations('messaging.inbox');
  const previousRef = useRef<Map<string, string> | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!threads) return;

    const current = new Map(threads.map((thread) => [thread.id, thread.lastMessageAt]));

    if (previousRef.current === null) {
      previousRef.current = current;
      return;
    }

    const previous = previousRef.current;
    const advanced = threads.find((thread) => {
      const previousLastMessageAt = previous.get(thread.id);
      if (previousLastMessageAt === undefined) return false;
      return new Date(thread.lastMessageAt).getTime() > new Date(previousLastMessageAt).getTime();
    });
    previousRef.current = current;

    if (!advanced) return;
    setAnnouncement(t('newMessageAnnouncement', { name: advanced.counterpartyDisplayName ?? t('unknownCounterparty') }));
    // `threads` is a fresh array identity on every real fetch (React
    // Query), so this deliberately re-runs on every query update rather
    // than needing threads.length or another proxy in the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads]);

  return announcement;
}
