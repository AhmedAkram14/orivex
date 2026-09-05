'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { MedicalRecordEntry } from '@/features/patient/api/types';
import { EmptyState } from '@/shared/ui/empty-state';

export interface ActiveConditionsPanelProps {
  entries: MedicalRecordEntry[];
}

/**
 * The Medical Records sidebar's "Conditions" panel — filters the same real
 * `MedicalRecordEntry[]` the timeline renders down to `type: 'condition'`.
 * No severity/status badge: the real `HealthGraphNode` projection this data
 * comes from has no such field, so none is ever fabricated here.
 */
export function ActiveConditionsPanel({ entries }: ActiveConditionsPanelProps) {
  const t = useTranslations('patient.records');
  const format = useFormatter();
  const conditions = [...entries]
    .filter((entry) => entry.type === 'condition')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (conditions.length === 0) {
    return (
      <EmptyState
        title={t('conditionsEmptyTitle')}
        description={t('conditionsEmptyDescription')}
        className="py-6"
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {conditions.map((condition) => (
        <li key={condition.id} className="flex flex-col gap-0.5 rounded-lg border border-border-default p-3">
          <p className="text-sm font-medium text-text-primary">{condition.title}</p>
          <p className="text-xs text-text-tertiary">
            {t('recordedOn', { date: format.dateTime(new Date(condition.date), { year: 'numeric', month: 'short', day: 'numeric' }) })}
          </p>
        </li>
      ))}
    </ul>
  );
}
