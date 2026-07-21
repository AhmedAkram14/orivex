'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/shared/i18n/navigation';
import type { VerificationCase } from '@/features/doctor/api/types';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';

export interface VerificationStatusProps {
  verificationCase: VerificationCase;
  /** Rejected/more-info-needed only: lets the applicant go edit their profile/documents and resubmit. */
  onEditAndResubmit?: () => void;
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
 * Doctor Onboarding (Phase 4 continuation): the applicant's own status
 * view for every non-Draft state -- Pending (Submitted/UnderReview/
 * MoreInfoNeeded/ReVerificationDue), Approved, Rejected, Suspended. Reuses
 * the exact `VerificationStatus` values TrustModule already models; no new
 * status vocabulary invented here.
 */
export function VerificationStatus({ verificationCase, onEditAndResubmit }: VerificationStatusProps) {
  const t = useTranslations('doctor.onboarding.status');

  const isPending =
    verificationCase.status === 'submitted' ||
    verificationCase.status === 'under_review' ||
    verificationCase.status === 're_verification_due';
  const isRejectedOrMoreInfo =
    verificationCase.status === 'rejected' || verificationCase.status === 'more_info_needed';

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
            <Button asChild>
              <Link href="/doctor">{t('goToDoctorPortal')}</Link>
            </Button>
          </>
        )}

        {isRejectedOrMoreInfo && (
          <>
            {verificationCase.reason && <Alert variant="danger">{verificationCase.reason}</Alert>}
            <p className="text-sm text-text-secondary">{t('rejectedDescription')}</p>
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
