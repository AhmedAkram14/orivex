'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useAuth } from '@/shared/auth/auth-context';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';

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
        <AvatarFallback className="text-lg">{initialsFor(user.fullName)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-semibold text-text-primary">
          {t('welcome', { name: toDisplayCase(stripExistingTitle(user.fullName)) })}
        </p>
        <p className="text-sm text-text-secondary">
          {format.dateTime(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
