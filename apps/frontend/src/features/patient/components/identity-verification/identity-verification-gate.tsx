'use client';

import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/shared/icons/icon';
import { Link } from '@/shared/i18n/navigation';
import { Button } from '@/shared/ui/button';

export type GatedAction = 'booking' | 'consultation' | 'documentUpload' | 'payment';

export interface IdentityVerificationGateProps {
  /** Which of the four gated actions triggered this -- selects per-action copy (§7a: "explains why, specific to the action," never one generic message). */
  action: GatedAction;
  /** The current page's own path (e.g. from `usePathname()`), carried through as `?returnTo=` so Approval can route straight back here. Omitted when there's nothing sensible to return to. */
  returnTo?: string;
}

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.4/O.7): "Verify your
 * identity to continue" -- rendered inline, at the point of the gated
 * action itself (never a full-page navigation destination the way
 * Forbidden/Unauthorized are), the moment `ApiError.code ===
 * IDENTITY_VERIFICATION_REQUIRED` is caught. Reuses `StatusPage`'s visual
 * language (icon + title + description + action) without joining the
 * `(status)` route group, since this is a mid-flow interruption, not a
 * fresh navigation.
 */
export function IdentityVerificationGate({ action, returnTo }: IdentityVerificationGateProps) {
  const t = useTranslations('patient.identityVerification.gate');
  const href = returnTo ? `/patient/verify-identity?returnTo=${encodeURIComponent(returnTo)}` : '/patient/verify-identity';

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border-default p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-secondary-subtle text-text-tertiary">
        <Icon icon={ShieldCheck} size="lg" />
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-sm font-medium text-text-primary">{t(`title.${action}`)}</p>
        <p className="text-sm text-text-secondary">{t(`description.${action}`)}</p>
      </div>
      <Button asChild>
        <Link href={href}>{t('startVerification')}</Link>
      </Button>
    </div>
  );
}
