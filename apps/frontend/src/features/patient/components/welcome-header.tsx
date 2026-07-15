'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useAuth } from '@/shared/auth/auth-context';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Card, CardContent } from '@/shared/ui/card';

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** The Patient Portal's greeting banner — avatar, name, and today's date. Reads the session directly (`useAuth`) rather than accepting a `user` prop, since it only ever renders inside the authenticated Patient Portal. Mirrors the Doctor Workspace's `WelcomeHeader` exactly. */
export function WelcomeHeader() {
  const t = useTranslations('patient.dashboard');
  const format = useFormatter();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <Avatar size="lg">
          <AvatarFallback>{initialsFor(user.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold text-text-primary">{t('welcome', { name: user.fullName })}</p>
          <p className="text-sm text-text-secondary">
            {format.dateTime(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
