import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Duotone scenes for empty/error/success states. House style: 1.5px
 * `currentColor` (ink) linework, ONE flat disc in `pulse` or `warm-1`, cards
 * filled with `surface`, no gradients and no faces (hands and objects only).
 * Everything is token-driven, so the lines invert in dark mode for free. The
 * card fill is the `--scene-surface` variable (the page surface by default), so a
 * scene placed on a dark band can cut its cards out of that band instead of
 * showing solid white shapes with invisible lines (see `Illustration`'s
 * `context="inverse"`).
 */
export type SceneProps = { className?: string };

const disc = (tone: 'pulse' | 'warm') => (
  <circle cx="60" cy="62" r="40" className={tone === 'pulse' ? 'fill-pulse' : 'fill-warm-1'} stroke="none" />
);

function Scene({ children, className }: SceneProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('[--scene-surface:var(--color-surface)]', className)}
    >
      {children}
    </svg>
  );
}

const S = 'fill-(--scene-surface)';

export const CalendarClear = (p: SceneProps) => (
  <Scene {...p}>
    {disc('pulse')}
    <rect x="28" y="34" width="64" height="58" rx="8" className={S} />
    <path d="M28 50H92M44 28v10M76 28v10M48 72l9 9 16-17" />
  </Scene>
);

export const WaitingRoomEmpty = (p: SceneProps) => (
  <Scene {...p}>
    {disc('warm')}
    <circle cx="60" cy="34" r="10" className={S} />
    <path d="M60 34v-5M60 34l4 3" />
    <rect x="26" y="70" width="28" height="8" rx="3" className={S} />
    <path d="M28 70V54h22v16M30 78v12M50 78v12" />
    <rect x="66" y="70" width="28" height="8" rx="3" className={S} />
    <path d="M68 70V54h22v16M70 78v12M90 78v12" />
  </Scene>
);

export const InboxQuiet = (p: SceneProps) => (
  <Scene {...p}>
    {disc('pulse')}
    <rect x="42" y="28" width="36" height="26" rx="4" className={S} />
    <path d="M42 34l18 12 18-12" />
    <path d="M24 66l10-16h52l10 16v20a4 4 0 0 1-4 4H28a4 4 0 0 1-4-4z" className={S} />
    <path d="M24 66h22a4 4 0 0 1 4 4 10 10 0 0 0 20 0 4 4 0 0 1 4-4h22" />
  </Scene>
);

export const PrescriptionNone = (p: SceneProps) => (
  <Scene {...p}>
    {disc('warm')}
    <rect x="32" y="26" width="44" height="62" rx="6" className={S} />
    <path d="M46 26v-4h16v4M42 46h24M42 56h24M42 66h14" />
    <g transform="rotate(-35 82 78)">
      <rect x="68" y="68" width="28" height="14" rx="7" className="fill-pulse" />
      <path d="M82 68v14" />
    </g>
  </Scene>
);

export const RecordsStart = (p: SceneProps) => (
  <Scene {...p}>
    {disc('pulse')}
    <path d="M26 40a4 4 0 0 1 4-4h20l6 8h34a4 4 0 0 1 4 4v38a4 4 0 0 1-4 4H30a4 4 0 0 1-4-4z" className={S} />
    <rect x="38" y="30" width="34" height="24" rx="3" className={S} />
    <path d="M60 62v16M52 70h16" />
  </Scene>
);

export const LabsNone = (p: SceneProps) => (
  <Scene {...p}>
    {disc('warm')}
    <path d="M40 30h12M46 30v40a8 8 0 0 1-16 0V30h0" className={S} />
    <path d="M30 30h16" />
    <path d="M70 30h12M76 30v40a8 8 0 0 1-16 0V30" className={S} />
    <path d="M60 30h16" />
    <path d="M62 56h16v14a8 8 0 0 1-16 0z" className="fill-pulse" stroke="none" />
    <path d="M24 90h72M32 78v12M88 78v12" />
  </Scene>
);

export const ArticlesNone = (p: SceneProps) => (
  <Scene {...p}>
    {disc('pulse')}
    <path d="M28 36c10-4 22-4 32 2v46c-10-6-22-6-32-2z" className={S} />
    <path d="M92 36c-10-4-22-4-32 2v46c10-6 22-6 32-2z" className={S} />
    <path d="M36 48h16M36 58h16M68 48h16M68 58h16M60 38v46" />
    <path d="M78 26v14l4-3 4 3V26" className="fill-warm-2" />
  </Scene>
);

export const WaitlistNone = (p: SceneProps) => (
  <Scene {...p}>
    {disc('warm')}
    <path d="M40 28h40M40 96h40M44 28c0 20 32 20 32 40S44 76 44 96M76 28c0 20-32 20-32 40" className={S} />
    <path d="M52 84h16l4 12H48z" className="fill-pulse" />
    <path d="M60 58v8" />
  </Scene>
);

export const DisputesNone = (p: SceneProps) => (
  <Scene {...p}>
    {disc('pulse')}
    <path d="M60 28v58M46 90h28M34 42h52" />
    <path d="M34 42l-10 22h20zM86 42l-10 22h20z" className={S} />
    <path d="M24 64a10 4 0 0 0 20 0M76 64a10 4 0 0 0 20 0" />
    <circle cx="60" cy="28" r="3" className={S} />
  </Scene>
);

export const SearchNoResults = (p: SceneProps) => (
  <Scene {...p}>
    {disc('warm')}
    <circle cx="54" cy="54" r="24" className={S} />
    <path d="M72 72l22 22" strokeWidth="3" />
    <path d="M44 54h20M54 44v20" transform="rotate(45 54 54)" />
  </Scene>
);

export const ConnectionError = (p: SceneProps) => (
  <Scene {...p}>
    {disc('pulse')}
    <path d="M26 50h18a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H26M14 56h12M14 64h12" className={S} />
    <path d="M94 50H76a4 4 0 0 0-4 4v12a4 4 0 0 0 4 4h18M94 56h12M94 64h12" className={S} />
    <path d="M56 42l-4 12 8-4-4 14" />
    <path d="M44 84h32" />
  </Scene>
);

export const VerifiedSeal = (p: SceneProps) => (
  <Scene {...p}>
    <circle cx="60" cy="56" r="34" className="fill-pulse" stroke="none" />
    <path d="M60 24l8 6 10-1 4 9 8 6-3 10 3 10-8 6-4 9-10-1-8 6-8-6-10 1-4-9-8-6 3-10-3-10 8-6 4-9 10 1z" className={S} transform="translate(0 4) scale(.98) translate(1 0)" />
    <path d="M48 58l9 9 16-18" strokeWidth="2.5" />
    <path d="M46 96l6-16M74 96l-6-16" />
  </Scene>
);

export const BookingConfirmed = (p: SceneProps) => (
  <Scene {...p}>
    {disc('warm')}
    <rect x="26" y="32" width="68" height="60" rx="8" className={S} />
    <path d="M26 48h68M42 26v10M78 26v10" />
    <circle cx="60" cy="70" r="14" className="fill-pulse" />
    <path d="M53 70l5 5 9-10" strokeWidth="2.5" />
    <path d="M100 30v8M96 34h8M18 84v6M15 87h6" />
  </Scene>
);

export const ConsultationEnded = (p: SceneProps) => (
  <Scene {...p}>
    {disc('pulse')}
    <rect x="24" y="34" width="72" height="46" rx="6" className={S} />
    <path d="M44 92h32M60 80v12" />
    <circle cx="60" cy="57" r="12" className="fill-warm-1" />
    <path d="M54 57l4 4 8-8" strokeWidth="2.5" />
  </Scene>
);
