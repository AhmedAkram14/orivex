'use client';

import { ArrowRight } from 'lucide-react';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

export interface SettingsCrossLinkCardProps {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}

/**
 * Doctor Settings Rebuild, Phase 6: a small reusable card for settings that
 * are already fully built elsewhere (Availability defaults on the Schedule
 * page, Sessions/Login History on `/security`) -- a cross-link, not a
 * duplicate UI. The `Link` + `ArrowRight` row matches the exact idiom this
 * series already established (`AccountSecuritySection`'s `seeSecurity` link,
 * the Schedule page's own `thisWeek.viewReports` link).
 */
export function SettingsCrossLinkCard({ title, description, href, linkLabel }: SettingsCrossLinkCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={href} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {linkLabel}
          <Icon icon={ArrowRight} size="sm" flipRtl />
        </Link>
      </CardContent>
    </Card>
  );
}
