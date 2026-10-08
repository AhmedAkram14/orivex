'use client';

import { ArrowLeft, FileText, Pencil, Send } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useId, useRef, useState, type ReactNode } from 'react';
import type { DoctorProfile } from '@/features/doctor/api/types';
import { useDepartmentsList } from '@/features/doctor/hooks/use-departments-list';
import { useHospitalsList } from '@/features/doctor/hooks/use-hospitals-list';
import { useSubmitVerification } from '@/features/doctor/hooks/use-submit-verification';
import type { Account } from '@/features/identity/api/types';
import { useCountriesList } from '@/features/reference/hooks/use-countries-list';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import type { MediaAssetPurpose } from '@/shared/media/types';
import type { DocumentSlots } from '@/shared/verification/components/documents-step';
import { ApiError } from '@/shared/lib/api/client';
import { formatCurrency } from '@/shared/lib/currency/format-currency';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Icon } from '@/shared/icons/icon';
import { ActionBar } from '@/shared/ui/action-bar';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

export type ReviewEditTarget = 'personal' | 'profile' | 'documents';

export interface ReviewStepProps {
  account: Account | undefined;
  profile: DoctorProfile;
  documents: DocumentSlots;
  /** The document slots in display order. */
  slots: readonly MediaAssetPurpose[];
  onSubmitted: () => void;
  onBack: () => void;
  /** Jump to a step to change it; the flow comes back here after saving. */
  onEdit: (step: ReviewEditTarget) => void;
}

function Summary({ title, onEdit, editLabel, children }: { title: string; onEdit: () => void; editLabel: string; children: ReactNode }) {
  const t = useTranslations('doctor.onboarding.reviewStep');
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-(--r-card) border border-border-default bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-small font-semibold text-text-secondary">
          {title}
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label={editLabel}>
          <Icon icon={Pencil} size="sm" />
          <span aria-hidden="true">{t('edit')}</span>
        </Button>
      </div>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-small text-text-tertiary">{row.label}</dt>
          <dd className="min-w-0 wrap-break-word text-text-primary">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Doctor Onboarding (Phase 4 continuation; redesigned Onboarding Redesign
 * 2026-07-21 proposal, Stage O.6): the wizard's final step -- every value entered, grouped as the steps were, each
 * group with Edit, then submits for review via the real `POST /doctors/:id/verifications`, reused as-is.
 * `specialtyCode` sends a human-readable specialty name -- a free-string historical snapshot on the
 * VerificationCase, not a live FK -- always the canonical (English) name regardless of the UI locale.
 * There is no attestation or consent field in the API or the flow, so none is shown (no legal text is invented).
 */
export function ReviewStep({ account, profile, documents, slots, onSubmitted, onBack, onEdit }: ReviewStepProps) {
  const t = useTranslations('doctor.onboarding.reviewStep');
  const tProfile = useTranslations('doctor.onboarding.profileStep');
  const tPersonal = useTranslations('identity.personalInfoStep');
  const tDocuments = useTranslations('doctor.onboarding.documentsStep');
  const tRanks = useTranslations('doctor.onboarding.profileStep.professionalRanks');
  const tLanguages = useTranslations('doctor.profile.languageNames');
  const format = useFormatter();
  const locale = useLocale();
  const submitVerification = useSubmitVerification(profile.id);
  const submitting = useRef(false);
  const [preview, setPreview] = useState<MediaAssetPurpose | undefined>(undefined);
  const { data: specialties } = useSpecialtiesList();
  const { data: countries } = useCountriesList();
  const { data: hospitals } = useHospitalsList();
  const { data: departments } = useDepartmentsList(profile.hospitalId);

  const matchedSpecialty = specialties?.find((specialty) => specialty.id === profile.specialtyId);
  const specialtyName = matchedSpecialty?.name ?? '';
  const documentAssetIds = Object.values(documents)
    .filter((document): document is NonNullable<typeof document> => Boolean(document))
    .map((document) => document.id);

  const none = <span className="text-text-tertiary">{t('notProvided')}</span>;
  const date = (value: string | undefined) =>
    value ? format.dateTime(new Date(`${value.slice(0, 10)}T00:00:00Z`), { dateStyle: 'medium', timeZone: 'UTC' }) : none;
  const hospital = profile.hospitalId ? hospitals?.find((entry) => entry.id === profile.hospitalId)?.name : undefined;
  const department = profile.departmentId ? departments?.find((entry) => entry.id === profile.departmentId)?.name : undefined;

  async function handleSubmit() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      await submitVerification.mutateAsync({ licenseNumber: profile.licenseNumber, specialtyCode: specialtyName, documentAssetIds });
      onSubmitted();
    } catch {
      submitting.current = false;
      // Inline error rendered below from submitVerification.error.
    }
  }

  const previewed = preview ? documents[preview] : undefined;
  // Lists the API always returns; tolerated if a partial profile comes back.
  const languages = profile.languages ?? [];
  const insuranceProviders = profile.insuranceProviders ?? [];
  const workExperience = profile.workExperience ?? [];

  return (
    <div className="flex flex-col gap-4">
      {submitVerification.error instanceof ApiError && (
        <Alert variant="danger" role="alert">
          {submitVerification.error.message}
        </Alert>
      )}

      <Summary title={t('sections.personal')} editLabel={t('editSection', { section: t('sections.personal') })} onEdit={() => onEdit('personal')}>
        <Rows
          rows={[
            { label: tPersonal('fullName'), value: account?.displayName ? <bdi>{account.displayName}</bdi> : none },
            { label: tPersonal('dateOfBirth'), value: date(account?.dateOfBirth) },
            { label: tPersonal('gender'), value: account?.gender ? tPersonal(`genderOptions.${account.gender}`) : none },
            { label: tPersonal('nationality'), value: countries?.find((country) => country.id === account?.nationalityId)?.name ?? none },
            { label: tPersonal('address'), value: account?.address ? <bdi>{account.address}</bdi> : none },
          ]}
        />
      </Summary>

      <Summary title={tProfile('groups.license')} editLabel={t('editSection', { section: tProfile('groups.license') })} onEdit={() => onEdit('profile')}>
        <Rows
          rows={[
            { label: tProfile('licenseNumber'), value: <bdi dir="ltr">{profile.licenseNumber}</bdi> },
            { label: tProfile('licenseExpiryDate'), value: date(profile.licenseExpiryDate) },
            { label: tProfile('professionalRank'), value: profile.professionalRank ? tRanks(profile.professionalRank) : none },
          ]}
        />
      </Summary>

      <Summary title={tProfile('groups.practice')} editLabel={t('editSection', { section: tProfile('groups.practice') })} onEdit={() => onEdit('profile')}>
        <Rows
          rows={[
            { label: tProfile('specialty'), value: matchedSpecialty ? pickLocalizedName(matchedSpecialty.name, matchedSpecialty.nameAr, locale) : none },
            { label: tProfile('experience'), value: profile.yearsOfExperience !== undefined ? t('years', { count: profile.yearsOfExperience }) : none },
            { label: tProfile('consultationFee'), value: profile.consultationFeeAmount !== undefined ? <bdi>{formatCurrency(format, profile.consultationFeeAmount, 'EGP')}</bdi> : none },
            {
              label: tProfile('hospital'),
              value: hospital ? (
                <>
                  <bdi>{hospital}</bdi>
                  {department && <span className="text-text-secondary"> · <bdi>{department}</bdi></span>}
                </>
              ) : (
                tProfile('independentPractice')
              ),
            },
          ]}
        />
      </Summary>

      <Summary title={tProfile('groups.aboutYou')} editLabel={t('editSection', { section: tProfile('groups.aboutYou') })} onEdit={() => onEdit('profile')}>
        <Rows
          rows={[
            { label: tProfile('biography'), value: profile.biography ? <bdi className="whitespace-pre-line">{profile.biography}</bdi> : none },
            { label: tProfile('languages'), value: languages.length ? languages.map((language) => tLanguages(language)).join(' · ') : none },
            { label: tProfile('insuranceProviders'), value: insuranceProviders.length ? <bdi>{insuranceProviders.join(' · ')}</bdi> : none },
          ]}
        />
      </Summary>

      <Summary title={tProfile('workExperience')} editLabel={t('editSection', { section: tProfile('workExperience') })} onEdit={() => onEdit('profile')}>
        {workExperience.length === 0 ? (
          <p className="text-sm">{none}</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {workExperience.map((entry, index) => (
              <li key={index} className="flex flex-col">
                <span className="font-semibold text-text-primary">
                  <bdi>{entry.position}</bdi>
                  {entry.professionalRank && <span className="font-normal text-text-secondary"> · {tRanks(entry.professionalRank)}</span>}
                </span>
                <span className="text-small text-text-secondary">
                  <bdi>{entry.organizationName}</bdi> · {format.number(Number(entry.startDate.slice(0, 4)), { useGrouping: false })}–
                  {entry.endDate ? format.number(Number(entry.endDate.slice(0, 4)), { useGrouping: false }) : tProfile('present')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Summary>

      <Summary title={t('documents')} editLabel={t('editSection', { section: t('documents') })} onEdit={() => onEdit('documents')}>
        <ul className="flex flex-wrap gap-2">
          {slots.map((slot) => {
            const document = documents[slot];
            if (!document) return null;
            const isImage = document.contentType?.startsWith('image/');
            return (
              <li key={slot}>
                <button
                  type="button"
                  onClick={() => setPreview(slot)}
                  className="flex max-w-60 items-center gap-2 rounded-full border border-border-default bg-surface py-1 ps-1 pe-3 text-small text-text-primary hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {isImage && document.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview of the picked file
                    <img src={document.previewUrl} alt="" className="size-6 rounded-full object-cover ring-1 ring-border-strong" />
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-full bg-surface-2">
                      <Icon icon={FileText} size="xs" />
                    </span>
                  )}
                  <span className="truncate">{tDocuments(`slots.${slot}`)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Summary>

      <Dialog open={preview !== undefined} onOpenChange={(open) => !open && setPreview(undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview ? tDocuments(`slots.${preview}`) : ''}</DialogTitle>
            <DialogDescription>{previewed ? <bdi>{previewed.fileName}</bdi> : null}</DialogDescription>
          </DialogHeader>
          {previewed?.previewUrl &&
            (previewed.contentType?.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview of the picked file
              <img src={previewed.previewUrl} alt={preview ? tDocuments(`slots.${preview}`) : ''} className="max-h-[60vh] w-full rounded-md object-contain ring-1 ring-border-default" />
            ) : (
              <iframe src={previewed.previewUrl} title={preview ? tDocuments(`slots.${preview}`) : ''} className="h-[60vh] w-full rounded-md ring-1 ring-border-default" />
            ))}
        </DialogContent>
      </Dialog>

      <ActionBar
        start={
          <Button type="button" variant="secondary" onClick={onBack}>
            <Icon icon={ArrowLeft} size="sm" flipRtl />
            {t('back')}
          </Button>
        }
        end={
          <Button type="button" onClick={handleSubmit} loading={submitVerification.isPending} disabled={submitVerification.isPending || submitVerification.isSuccess}>
            <Icon icon={Send} size="sm" flipRtl />
            {t('submit')}
          </Button>
        }
      />
    </div>
  );
}
