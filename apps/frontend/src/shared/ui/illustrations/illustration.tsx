import type { ComponentType } from 'react';
import { cn } from '@/shared/lib/cn';
import {
  ArticlesNone,
  BookingConfirmed,
  CalendarClear,
  ConnectionError,
  ConsultationEnded,
  DisputesNone,
  InboxQuiet,
  LabsNone,
  PrescriptionNone,
  RecordsStart,
  SearchNoResults,
  VerifiedSeal,
  WaitingRoomEmpty,
  WaitlistNone,
  type SceneProps,
} from '@/shared/ui/illustrations/scenes';

const SCENES = {
  'calendar-clear': CalendarClear,
  'waiting-room-empty': WaitingRoomEmpty,
  'inbox-quiet': InboxQuiet,
  'prescription-none': PrescriptionNone,
  'records-start': RecordsStart,
  'labs-none': LabsNone,
  'articles-none': ArticlesNone,
  'waitlist-none': WaitlistNone,
  'disputes-none': DisputesNone,
  'search-no-results': SearchNoResults,
  'connection-error': ConnectionError,
  'verified-seal': VerifiedSeal,
  'booking-confirmed': BookingConfirmed,
  'consultation-ended': ConsultationEnded,
} as const satisfies Record<string, ComponentType<SceneProps>>;

export type IllustrationKey = keyof typeof SCENES;

export interface IllustrationProps {
  name: IllustrationKey;
  /** 120px by default; the inline (`sm`) size is 72px. */
  size?: 72 | 120;
  className?: string;
}

/** A decorative scene (always `aria-hidden`); the surrounding title/description carry the meaning. */
export function Illustration({ name, size = 120, className }: IllustrationProps) {
  const Scene = SCENES[name];
  return <Scene className={cn('shrink-0 text-text-primary', size === 72 ? 'size-18' : 'size-30', className)} />;
}
