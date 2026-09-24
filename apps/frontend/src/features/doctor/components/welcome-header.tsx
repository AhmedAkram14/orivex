'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Heading } from '@/design-system/typography';
import { useAuth } from '@/shared/auth/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Display-only capitalization of the real account name (e.g. "ramy" -> "Ramy") -- never written back, just how the greeting renders it. */
function toDisplayCase(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .map((word) => (word[0] ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** Strips a leading "Dr."/"د." title some accounts' real `fullName` already embeds (e.g. the seeded "Dr. Sarah Ahmed" mock doctor) -- the greeting template below adds its own canonical, localized title, so a name that already carries one must not end up doubled ("Dr. Dr. ..."). */
function stripExistingTitle(fullName: string): string {
  return fullName.replace(/^(dr\.?|د\.?)\s+/i, '').trim();
}

/**
 * The Doctor Workspace's greeting — avatar, name, and today's date. Reads
 * the session directly (`useAuth`) rather than accepting a `user` prop,
 * since it only ever renders inside the authenticated Doctor Workspace.
 * Dashboard redesign (2026-08): no longer its own `Card` — it's now the top
 * of `DashboardHero`'s single unified hero card (the hierarchy spec's "one
 * clear focal point," not two stacked cards) — this component only ever has
 * the one caller, so folding its wrapper in has no other blast radius.
 */
export function WelcomeHeader() {
  const t = useTranslations('doctor.dashboard');
  const format = useFormatter();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="size-14">
        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
        <AvatarFallback className="text-lg">{initialsFor(user.fullName)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        {/* A real <h2>, not styled-to-look-like-one text -- Overview's own
            <h1> otherwise jumps straight to the widget cards' <h3>
            CardTitles below with nothing in between. */}
        <Heading level={2}>
          {/*
           * Phase 8 AR localization fix (reported bidi-punctuation issue):
           * in the Arabic greeting ("مرحبًا بعودتك، د. {name}.") the account
           * name is frequently Latin-script (real seeded/registered names
           * like "Dr. Sarah Ahmed") embedded inside an RTL sentence,
           * immediately followed by an ASCII "." -- the Unicode
           * bidirectional algorithm can pull that trailing punctuation to
           * the wrong visual side of the embedded LTR run, reading as if
           * the period attached to the wrong word. `t.rich` + wrapping just
           * the interpolated name in `<bdi dir="ltr">` isolates its
           * direction from the surrounding Arabic paragraph, so the
           * sentence's own punctuation stays correctly placed regardless of
           * which script the real account name happens to use. A no-op
           * visually in English (LTR-in-LTR), and doesn't change the
           * displayed name itself -- purely a bidi-isolation fix, not a
           * translation of the name (the backend's `fullName` has no
           * per-locale variant to translate, see Phase 0/8 notes).
           */}
          {t.rich('welcome', {
            name: toDisplayCase(stripExistingTitle(user.fullName)),
            bdi: (chunks) => <bdi dir="ltr">{chunks}</bdi>,
          })}
        </Heading>
        <p className="text-sm text-text-secondary">
          {format.dateTime(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
