'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { VerificationCase } from '@/shared/verification/types';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Illustration } from '@/shared/ui/illustrations/illustration';

export interface VerificationStatusProps {
  verificationCase: VerificationCase;
  /**
   * The `next-intl` namespace this status view's own strings live under (`badge.*`, `title.*`, `pendingDescription`,
   * `nextSteps.*`, `approvedDescription`, `rejectedDescription`, `moreInfoDescription`, `suspendedDescription`,
   * `editAndResubmit`).
   */
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
  /** Rendered while the case is pending (e.g. "Go to dashboard"). */
  pendingAction?: ReactNode;
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
 * The verification outcome screen -- what an applicant sees right after submitting and on every later visit (it
 * replaces the form until the case is decided): the verified-seal scene, a title for the state, the status, and what
 * happens next. Every line comes from the real case status; no review time is promised (none is defined anywhere).
 */
export function VerificationStatus({
  verificationCase,
  translationNamespace,
  onEditAndResubmit,
  approvedAction,
  pendingAction,
}: VerificationStatusProps) {
  const t = useTranslations(translationNamespace);
  const status = verificationCase.status;

  const isPending = status === 'submitted' || status === 'under_review' || status === 're_verification_due';
  const isMoreInfoNeeded = status === 'more_info_needed';
  const isRejectedOrMoreInfo = status === 'rejected' || isMoreInfoNeeded;
  const titleKey = isPending ? 'pending' : status;

  return (
    <section
      data-verification-status={status}
      className="flex flex-col items-center gap-5 rounded-(--r-card) border border-border-default bg-surface px-5 py-8 text-center sm:px-10 sm:py-10"
    >
      {(isPending || status === 'approved') && <Illustration name="verified-seal" />}
      <div className="flex flex-col items-center gap-2">
        <Badge variant={BADGE_VARIANT[status]}>{t(`badge.${status}`)}</Badge>
        <h1 className="font-display text-2xl font-bold text-text-primary">{t(`title.${titleKey}`)}</h1>
      </div>

      {isPending && (
        <>
          <p className="max-w-md text-sm text-text-secondary">{t('pendingDescription')}</p>
          <ol className="flex w-full max-w-md flex-col gap-2 text-start">
            {(['review', 'notify', 'access'] as const).map((step, index) => (
              <li key={step} className="flex items-start gap-3 rounded-lg bg-surface-2 px-4 py-3 text-sm text-text-primary">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-caption font-semibold tabular-nums ring-1 ring-border-default">
                  {index + 1}
                </span>
                {t(`nextSteps.${step}`)}
              </li>
            ))}
          </ol>
          {pendingAction}
        </>
      )}

      {status === 'approved' && (
        <>
          <p className="max-w-md text-sm text-text-secondary">{t('approvedDescription')}</p>
          {approvedAction}
        </>
      )}

      {isRejectedOrMoreInfo && (
        <>
          {verificationCase.reason && (
            <Alert variant={isMoreInfoNeeded ? 'warning' : 'danger'} className="w-full max-w-md text-start">
              {verificationCase.reason}
            </Alert>
          )}
          <p className="max-w-md text-sm text-text-secondary">{isMoreInfoNeeded ? t('moreInfoDescription') : t('rejectedDescription')}</p>
          {onEditAndResubmit && <Button onClick={onEditAndResubmit}>{t('editAndResubmit')}</Button>}
        </>
      )}

      {status === 'suspended' && <p className="max-w-md text-sm text-text-secondary">{t('suspendedDescription')}</p>}
    </section>
  );
}
