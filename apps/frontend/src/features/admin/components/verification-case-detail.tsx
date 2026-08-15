'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useAccountById } from '@/features/identity/hooks/use-account-by-id';
import { useDoctorByAccountId } from '@/features/doctor/hooks/use-doctor-by-account-id';
import { useVerificationCase } from '@/features/admin/hooks/use-verification-case';
import { useVerificationCaseHistory } from '@/features/admin/hooks/use-verification-case-history';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import type { VerificationCase, VerificationCaseStatus } from '@/features/admin/api/types';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Alert } from '@/shared/ui/alert';
import { Badge, badgeVariants } from '@/shared/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import { Card, CardContent } from '@/shared/ui/card';
import { Section } from '@/shared/ui/layout/section';
import { Skeleton } from '@/shared/ui/skeleton';
import { VerificationDocumentViewer } from '@/features/admin/components/verification-document-viewer';
import { VerificationReviewActions } from '@/features/admin/components/verification-review-actions';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const STATUS_BADGE_VARIANT: Record<VerificationCaseStatus, BadgeVariant> = {
  submitted: 'warning',
  under_review: 'warning',
  more_info_needed: 'warning',
  approved: 'success',
  rejected: 'danger',
  re_verification_due: 'info',
  suspended: 'neutral',
};

export interface VerificationCaseDetailProps {
  verificationCaseId: string;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="text-sm text-text-secondary">{value}</p>
    </div>
  );
}

export function VerificationCaseDetail({ verificationCaseId }: VerificationCaseDetailProps) {
  const t = useTranslations('admin.verificationCase');
  const { data: verificationCase, isLoading, isError } = useVerificationCase(verificationCaseId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const notFound = isError;
  if (notFound || !verificationCase) {
    return <Alert variant="danger">{t('notFound')}</Alert>;
  }

  return <VerificationCaseDetailBody verificationCase={verificationCase} />;
}

function VerificationCaseDetailBody({ verificationCase }: { verificationCase: VerificationCase }) {
  const t = useTranslations('admin.verificationCase');
  const format = useFormatter();
  const locale = useLocale();
  const { data: account, isLoading: isAccountLoading, isError: isAccountError } = useAccountById(
    verificationCase.subjectAccountId,
  );
  const { data: doctorProfile } = useDoctorByAccountId(
    verificationCase.subjectAccountId,
    verificationCase.subjectType === 'doctor',
  );
  const { data: history } = useVerificationCaseHistory(verificationCase.id);
  const { data: specialties } = useSpecialtiesList();
  const matchedSpecialty = specialties?.find((specialty) => specialty.id === doctorProfile?.specialtyId);
  const specialtyName = matchedSpecialty
    ? pickLocalizedName(matchedSpecialty.name, matchedSpecialty.nameAr, locale)
    : verificationCase.specialtyCode ?? t('notOnRecord');

  return (
    <div className="flex flex-col gap-6">
      <Section title={t('applicantSection')}>
        {isAccountLoading && <Skeleton className="h-24 w-full" />}
        {isAccountError && <Alert variant="danger">{t('applicantLoadError')}</Alert>}
        {account && (
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-3">
              <InfoRow label={t('applicantName')} value={account.displayName} />
              <InfoRow label={t('applicantEmail')} value={account.email} />
              <InfoRow label={t('applicantPhone')} value={account.phoneNumber ?? t('notOnRecord')} />
              <InfoRow
                label={t('applicantDateOfBirth')}
                value={account.dateOfBirth ? format.dateTime(new Date(account.dateOfBirth), { dateStyle: 'medium' }) : t('notOnRecord')}
              />
              <InfoRow label={t('applicantGender')} value={account.gender ? t(`gender.${account.gender}`) : t('notOnRecord')} />
              <InfoRow label={t('applicantAddress')} value={account.address ?? t('notOnRecord')} />
              <InfoRow label={t('applicantAccountStatus')} value={t(`accountStatus.${account.status}`)} />
              <InfoRow label={t('applicantAccountRole')} value={t(`accountRole.${account.role}`)} />
            </CardContent>
          </Card>
        )}
      </Section>

      <Section title={t('verificationInfoSection')}>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_BADGE_VARIANT[verificationCase.status]}>{t(`status.${verificationCase.status}`)}</Badge>
              <span className="text-sm text-text-secondary">
                {t(`subjectType${verificationCase.subjectType === 'doctor' ? 'Doctor' : 'Patient'}`)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <InfoRow
                label={t('submittedAt')}
                value={format.dateTime(new Date(verificationCase.submittedAt), { dateStyle: 'medium', timeStyle: 'short' })}
              />
              <InfoRow
                label={t('decidedAt')}
                value={
                  verificationCase.decidedAt
                    ? format.dateTime(new Date(verificationCase.decidedAt), { dateStyle: 'medium', timeStyle: 'short' })
                    : t('notYetDecided')
                }
              />
            </div>
            {verificationCase.reason && (
              <Alert variant={verificationCase.status === 'more_info_needed' ? 'warning' : 'danger'}>
                {verificationCase.reason}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Section>

      {verificationCase.subjectType === 'doctor' && (
        <Section title={t('doctorContextSection')}>
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-3">
              <InfoRow label={t('licenseNumber')} value={verificationCase.licenseNumber ?? t('notOnRecord')} />
              <InfoRow label={t('specialty')} value={specialtyName} />
              <InfoRow
                label={t('licenseExpiryDate')}
                value={
                  doctorProfile?.licenseExpiryDate
                    ? format.dateTime(new Date(doctorProfile.licenseExpiryDate), { dateStyle: 'medium' })
                    : t('notOnRecord')
                }
              />
              <InfoRow
                label={t('professionalRankLabel')}
                value={doctorProfile?.professionalRank ? t(`professionalRank.${doctorProfile.professionalRank}`) : t('notOnRecord')}
              />
              <InfoRow label={t('department')} value={doctorProfile?.departmentId ?? t('notOnRecord')} />
              <InfoRow
                label={t('yearsOfExperience')}
                value={doctorProfile?.yearsOfExperience !== undefined ? String(doctorProfile.yearsOfExperience) : t('notOnRecord')}
              />
            </CardContent>
          </Card>
        </Section>
      )}

      <Section title={t('documentsSection')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {verificationCase.documentAssetIds.map((mediaAssetId) => (
            <VerificationDocumentViewer key={mediaAssetId} mediaAssetId={mediaAssetId} />
          ))}
        </div>
      </Section>

      <Section title={t('actionsSection')}>
        <VerificationReviewActions verificationCase={verificationCase} />
      </Section>

      <Section title={t('historySection')} description={t('historyReviewerLimitation')}>
        {!history || history.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('historyEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {history.map((entry) => (
              <li key={entry.id}>
                <Card>
                  <CardContent className="flex flex-col gap-1 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_BADGE_VARIANT[entry.status]}>{t(`status.${entry.status}`)}</Badge>
                      <span className="text-xs text-text-tertiary">
                        {format.dateTime(new Date(entry.submittedAt), { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    {entry.reason && <p className="text-sm text-text-secondary">{entry.reason}</p>}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
