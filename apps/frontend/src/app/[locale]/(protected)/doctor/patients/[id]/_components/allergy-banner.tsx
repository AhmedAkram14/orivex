'use client';

import { AlertTriangle, CheckCircle2, ShieldQuestion } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { Icon } from '@/shared/icons/icon';
import { formatDateTime } from '@/shared/lib/date/format-datetime';
import { cn } from '@/shared/lib/cn';
import type { DoctorPatientChartProfile } from '@/features/doctor/api/types';
import { getAllergyState } from '../_lib/allergy-state';
import { ConfirmNoKnownAllergiesDialog } from './confirm-no-known-allergies-dialog';

export interface AllergyBannerProps {
  profile: DoctorPatientChartProfile;
  patientProfileId: string;
}

// Patient Record Page P0 fix: a persistent, full-width, color-coded banner
// -- not a small tile competing visually with "Chronic conditions" -- so
// allergies read with the urgency they clinically need, on every tab.
export function AllergyBanner({ profile, patientProfileId }: AllergyBannerProps) {
  const t = useTranslations('publicPatient');
  const format = useFormatter();
  const state = getAllergyState(profile);

  if (state.kind === 'present') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-danger-subtle bg-danger-subtle p-4 text-danger-emphasis" role="alert">
        <Icon icon={AlertTriangle} className="mt-0.5 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide">{t('allergies')}</p>
          <p className="text-sm font-semibold">{state.text}</p>
          {/* Provenance (point 7): allergies has exactly one write path in
              this domain -- the patient's own self-service profile update --
              so this is always true, not conditional on anything. */}
          <p className="text-xs">{t('allergiesReportedByPatient')}</p>
        </div>
      </div>
    );
  }

  if (state.kind === 'confirmed-none') {
    // Aged (point 6): a year-old "no known allergies" attestation shouldn't
    // read as current fact -- soften to a neutral tone and offer to
    // re-confirm, same reasoning as vital staleness.
    const toneClasses = state.isAged
      ? 'border-border-strong bg-neutral-subtle text-text-primary'
      : 'border-success-subtle bg-success-subtle text-success-emphasis';
    return (
      <div className={cn('flex items-start justify-between gap-3 rounded-xl border p-4', toneClasses)} role="status">
        <div className="flex items-start gap-3">
          <Icon icon={CheckCircle2} className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide">{t('allergies')}</p>
            <p className="text-sm font-semibold">
              {state.confirmedByName
                ? t('allergiesConfirmedNoneByOn', {
                    name: state.confirmedByName,
                    date: formatDateTime(format, state.confirmedAt),
                  })
                : t('allergiesConfirmedNoneOn', { date: formatDateTime(format, state.confirmedAt) })}
            </p>
          </div>
        </div>
        {state.isAged && (
          <ConfirmNoKnownAllergiesDialog
            patientProfileId={patientProfileId}
            triggerLabel={t('confirmAgainNoKnownAllergies')}
            className="shrink-0"
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-warning-subtle bg-warning-subtle p-4 text-warning-emphasis sm:flex-row sm:items-center sm:justify-between" role="status">
      <div className="flex items-start gap-3">
        <Icon icon={ShieldQuestion} className="mt-0.5 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide">{t('allergies')}</p>
          <p className="text-sm font-semibold">{t('allergiesNotYetConfirmed')}</p>
        </div>
      </div>
      <ConfirmNoKnownAllergiesDialog
        patientProfileId={patientProfileId}
        triggerLabel={t('confirmNoKnownAllergies')}
        className="shrink-0 self-start sm:self-auto"
      />
    </div>
  );
}
