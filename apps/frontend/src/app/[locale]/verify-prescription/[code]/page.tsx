'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useVerifyPrescription } from '@/features/consultation/hooks/use-verify-prescription';
import { Link } from '@/shared/i18n/navigation';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';
import { Icon } from '@/shared/icons/icon';
import { Page } from '@/shared/ui/layout/page';
import { Skeleton } from '@/shared/ui/skeleton';
import { WorkspaceHeader } from '@/shared/ui/layout/workspace-header';

/**
 * A minimal, chrome-only top bar -- this page lives OUTSIDE the
 * `(protected)` route group deliberately, mirroring
 * `PublicPatientProfilePage`'s own precedent: the whole point of a
 * prescription's QR code is that a pharmacy who has never signed into this
 * platform can still verify it.
 */
function PublicChrome() {
  return (
    <header className="border-b border-border-default bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-semibold text-text-primary">
          ORIVEX
        </Link>
      </div>
    </header>
  );
}

/**
 * I12 -- Prescription digital signature and verification marker (ORIVEX
 * Remaining Work Audit): the page a prescription PDF's QR code (or its
 * printed code, typed in manually) resolves to -- a real, public,
 * unauthenticated read (`GET /prescriptions/verify/:code`). Shows exactly
 * what the PDF itself already prints (doctor identity, patient name, the
 * medication list) -- never the underlying diagnosis, which stays inside
 * the authenticated record.
 */
export default function VerifyPrescriptionPage() {
  const t = useTranslations('verifyPrescription');
  const format = useFormatter();
  const params = useParams<{ code: string }>();
  const { data: result, isLoading, isError } = useVerifyPrescription(params.code);

  return (
    <>
      <PublicChrome />
      <Page>
        <WorkspaceHeader title={t('title')} description={t('description')} />

        {isLoading && <Skeleton className="h-40 w-full" />}
        {isError && <Alert variant="danger">{t('loadError')}</Alert>}

        {result && !result.valid && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <Icon icon={XCircle} size="lg" className="text-danger" />
              <p className="text-lg font-semibold text-text-primary">{t('invalidTitle')}</p>
              <p className="text-sm text-text-secondary">{t('invalidDescription')}</p>
            </CardContent>
          </Card>
        )}

        {result && result.valid && (
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="flex items-center gap-2">
                  <Icon icon={CheckCircle2} size="md" className="text-success" />
                  <p className="text-lg font-semibold text-text-primary">{t('validTitle')}</p>
                </div>
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-text-tertiary">{t('doctorLabel')}</dt>
                    <dd className="text-text-primary">{result.doctorName}</dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t('licenseLabel')}</dt>
                    <dd className="text-text-primary">{result.doctorLicenseNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t('patientLabel')}</dt>
                    <dd className="text-text-primary">{result.patientName}</dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t('signedAtLabel')}</dt>
                    <dd className="text-text-primary">
                      {format.dateTime(new Date(result.signedAt), { dateStyle: 'medium', timeStyle: 'short' })}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-3 p-6">
                <p className="text-sm font-semibold text-text-primary">{t('medicationsTitle')}</p>
                <ul className="flex flex-col gap-2">
                  {result.lineItems.map((item, index) => (
                    <li key={index} className="flex flex-col gap-1 rounded-md border border-border-default p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-text-primary">{item.drugName}</p>
                        <Badge variant="neutral">{item.dosage}</Badge>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {t('frequencyAndDuration', { frequency: item.frequency, days: item.durationDays })}
                      </p>
                      {item.instructions && <p className="text-xs text-text-tertiary">{item.instructions}</p>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </Page>
    </>
  );
}
