'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { VerificationCase } from '@/shared/verification/types';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';

export interface VerificationStatusProps {
  verificationCase: VerificationCase;
  /** The `next-intl` namespace this status view's own strings live under (`badge.*`/`pendingDescription`/`approvedDescription`/`rejectedDescription`/`moreInfoDescription`/`suspendedDescription`/`editAndResubmit`). */
  translationNamespace: string;
  /** Rejected/more-info-needed only: lets the applicant go edit their profile/documents and resubmit. */
  onEditAndResubmit?: () => void;
  /**
   * Rendered under the Approved description -- e.g. Doctor's "Go to Doctor
   * Portal" link. Omitted for Patient: Approval raises no event and changes
   * no role (§7a), so there is nothing subject-specific to link to; the
   * caller may still pass a `returnTo`-aware action instead.
   */
  approvedAction?: ReactNode;
}

const BADGE_VARIANT: Record<VerificationCase['status'], 'warning' | 'success' | 'danger' | 'info' | 'neutral'> = {
  submitted: 'warning',
  under_review: 'warning',
  more_info_needed: 'warning',
  approved: 'success',
  rejected: 'danger',
  re_verification_due: 'info',
  suspended: 'neutral',
};

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.2/O.6/O.7): the
 * applicant's own status view for every non-Draft state -- Pending
 * (Submitted/UnderReview/MoreInfoNeeded/ReVerificationDue), Approved,
 * Rejected, Suspended -- shared between Doctor Onboarding and Patient
 * Identity Verification (the same generalized `VerificationCase` aggregate,
 * Stage O.2). Reuses the exact `VerificationStatus` values TrustModule
 * already models; no new status vocabulary invented here.
 */
export function VerificationStatus({
  verificationCase,
  translationNamespace,
  onEditAndResubmit,
  approvedAction,
}: VerificationStatusProps) {
  const t = useTranslations(translationNamespace);

  const isPending =
    verificationCase.status === 'submitted' ||
    verificationCase.status === 'under_review' ||
    verificationCase.status === 're_verification_due';
  const isMoreInfoNeeded = verificationCase.status === 'more_info_needed';
  const isRejectedOrMoreInfo = verificationCase.status === 'rejected' || isMoreInfoNeeded;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-center gap-2">
          <Badge variant={BADGE_VARIANT[verificationCase.status]}>{t(`badge.${verificationCase.status}`)}</Badge>
        </div>

        {isPending && <p className="text-sm text-text-secondary">{t('pendingDescription')}</p>}

        {verificationCase.status === 'approved' && (
          <>
            <p className="text-sm text-text-secondary">{t('approvedDescription')}</p>
            {approvedAction}
          </>
        )}

        {isRejectedOrMoreInfo && (
          <>
            {verificationCase.reason && (
              <Alert variant={isMoreInfoNeeded ? 'warning' : 'danger'}>{verificationCase.reason}</Alert>
            )}
            <p className="text-sm text-text-secondary">
              {isMoreInfoNeeded ? t('moreInfoDescription') : t('rejectedDescription')}
            </p>
            {onEditAndResubmit && <Button onClick={onEditAndResubmit}>{t('editAndResubmit')}</Button>}
          </>
        )}

        {verificationCase.status === 'suspended' && (
          <p className="text-sm text-text-secondary">{t('suspendedDescription')}</p>
        )}
      </CardContent>
    </Card>
  );
}
