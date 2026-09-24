'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { usePatientHealthDashboard } from '@/features/patient/hooks/use-patient-health-dashboard';
import { usePatientMedicalRecords } from '@/features/patient/hooks/use-patient-medical-records';
import { usePatientProfile } from '@/features/patient/hooks/use-patient-profile';
import { Link } from '@/shared/i18n/navigation';
import { Skeleton } from '@/shared/ui/skeleton';
import { WidgetContainer } from '@/shared/ui/layout/widget-container';

interface SnapshotRow {
  id: string;
  label: string;
  value: string;
  detail?: string;
  href: string;
}

/**
 * A compact health snapshot composed only from existing queries: the latest
 * recorded weight and blood pressure (Health Dashboard), condition entries
 * on record (Records) and the free-text allergies on the patient's profile.
 * A row whose data source has nothing to show is omitted, and the whole card
 * disappears when every row is empty -- never a placeholder value.
 */
export function HealthSnapshotCard() {
  const t = useTranslations('patient.dashboard.snapshot');
  const format = useFormatter();
  const vitals = usePatientHealthDashboard();
  const records = usePatientMedicalRecords();
  const profile = usePatientProfile();

  if (vitals.isLoading || records.isLoading || profile.isLoading) {
    return (
      <WidgetContainer title={<span className="text-lg font-semibold">{t('title')}</span>} titleAs="h2" className="rounded-3xl">
        <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      </WidgetContainer>
    );
  }

  const dateOf = (iso: string) => format.dateTime(new Date(iso), { month: 'short', day: 'numeric', year: 'numeric' });
  const rows: SnapshotRow[] = [];

  const weight = vitals.data?.find((vital) => vital.type === 'weight')?.latest;
  if (weight) rows.push({ id: 'weight', label: t('weight'), value: weight.valueLabel, detail: dateOf(weight.recordedAt), href: '/patient/health' });

  const pressure = vitals.data?.find((vital) => vital.type === 'blood-pressure')?.latest;
  if (pressure) {
    rows.push({ id: 'bp', label: t('bloodPressure'), value: pressure.valueLabel, detail: dateOf(pressure.recordedAt), href: '/patient/health' });
  }

  const conditions = (records.data ?? []).filter((entry) => entry.type === 'condition');
  if (conditions.length > 0) {
    rows.push({
      id: 'conditions',
      label: t('conditions'),
      value: conditions
        .slice(0, 3)
        .map((entry) => entry.title)
        .join(' · '),
      detail: conditions.length > 3 ? t('moreConditions', { count: conditions.length - 3 }) : undefined,
      href: '/patient/records',
    });
  }

  const allergies = profile.data?.allergies?.trim();
  if (allergies) rows.push({ id: 'allergies', label: t('allergies'), value: allergies, href: '/patient/profile' });

  if (rows.length === 0) return null;

  return (
    <WidgetContainer
      title={<span className="text-lg font-semibold">{t('title')}</span>}
      titleAs="h2"
      className="rounded-3xl border-border-default shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-0.5">
            <dt className="text-xs text-text-tertiary">{row.label}</dt>
            <dd className="text-sm font-medium text-text-primary">
              <Link href={row.href} className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
                {row.value}
              </Link>
              {row.detail && <span className="block text-xs font-normal text-text-tertiary">{row.detail}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </WidgetContainer>
  );
}
