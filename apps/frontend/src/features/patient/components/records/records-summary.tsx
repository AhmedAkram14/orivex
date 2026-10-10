'use client';

import { CalendarClock, FileText, HeartPulse, Stethoscope } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { MetricStat, MetricStrip } from '@/shared/ui/metric-stat';

export interface RecordsSummaryProps {
  visitCount: number;
  conditionCount: number;
  documentCount: number;
  /** The newest visit record's date -- the same data the Visits tab lists. */
  lastVisitAt: string | undefined;
  loading: { records: boolean; documents: boolean };
  className?: string;
}

/**
 * The Medical Records summary: record counts and the last visit, every figure computed from the same lists
 * the tabs show, so the strip can never disagree with them.
 *
 * "Last visit" is the newest visit RECORD (a clinical note), not the dashboard summary's `lastVisitAt` -- that
 * one is the most recent completed appointment's scheduled time, which includes an appointment no note was
 * written for, so it named a visit the Visits list doesn't have.
 */
export function RecordsSummary({ visitCount, conditionCount, documentCount, lastVisitAt, loading, className }: RecordsSummaryProps) {
  const t = useTranslations('patient.records.summary');
  const format = useFormatter();
  return (
    <MetricStrip className={className}>
      <MetricStat variant="inline" icon={Stethoscope} label={t('visits')} value={String(visitCount)} loading={loading.records} />
      <MetricStat variant="inline" icon={HeartPulse} label={t('conditions')} value={String(conditionCount)} loading={loading.records} />
      <MetricStat variant="inline" icon={FileText} label={t('documents')} value={String(documentCount)} loading={loading.documents} />
      <MetricStat
        variant="inline"
        icon={CalendarClock}
        label={t('lastVisit')}
        // A figure, never a sentence: with no visit yet the value is a dash and the sentence is the caption.
        value={lastVisitAt ? format.dateTime(new Date(lastVisitAt), { month: 'short', day: 'numeric' }) : '—'}
        helperText={lastVisitAt ? undefined : t('noVisitYet')}
        loading={loading.records}
      />
    </MetricStrip>
  );
}
