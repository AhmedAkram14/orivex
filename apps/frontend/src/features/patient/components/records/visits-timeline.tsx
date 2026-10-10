'use client';

import { ChevronDown } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useState } from 'react';
import type { MedicalRecordEntry } from '@/features/patient/api/types';
import { parseVisitNote, RECORD_KINDS, visitSummary } from '@/features/patient/components/records/record-kinds';
import { Icon } from '@/shared/icons/icon';
import { cn } from '@/shared/lib/cn';
import { PersonAvatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { NativeSelect } from '@/shared/ui/native-select';

const ALL_DOCTORS = '';

export interface VisitsTimelineProps {
  /** Visit entries only. */
  visits: MedicalRecordEntry[];
  /** A visit to open and bring into view (`?highlight=<id>`, from Overview's "Read full note"). */
  highlightId?: string | null;
}

/**
 * Every visit, newest first, grouped by month under labels that stay on screen while their month scrolls by.
 * Each visit is collapsed to its date, doctor and one line (the doctor's assessment); opening it shows the
 * whole note in its four parts. "Expand all" opens every visit in view. A doctor filter appears only when more
 * than one doctor wrote notes.
 */
export function VisitsTimeline({ visits, highlightId }: VisitsTimelineProps) {
  const t = useTranslations('patient.records.visits');
  const format = useFormatter();
  const filterId = useId();
  const [doctor, setDoctor] = useState(ALL_DOCTORS);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(highlightId ? [highlightId] : []));

  const doctors = useMemo(
    () => [...new Set(visits.map((visit) => visit.doctorName).filter((name): name is string => Boolean(name)))].sort(),
    [visits],
  );
  const shown = useMemo(
    () =>
      visits
        .filter((visit) => doctor === ALL_DOCTORS || visit.doctorName === doctor)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [visits, doctor],
  );
  const months = useMemo(() => {
    const groups: { key: string; label: string; visits: MedicalRecordEntry[] }[] = [];
    for (const visit of shown) {
      const label = format.dateTime(new Date(visit.date), { year: 'numeric', month: 'long' });
      const last = groups.at(-1);
      if (last?.label === label) last.visits.push(visit);
      else groups.push({ key: visit.id, label, visits: [visit] });
    }
    return groups;
  }, [shown, format]);

  useEffect(() => {
    if (!highlightId) return;
    setExpanded((current) => new Set(current).add(highlightId));
    document.getElementById(`visit-${highlightId}`)?.scrollIntoView?.({ block: 'start' });
  }, [highlightId]);

  if (visits.length === 0) {
    return <EmptyState illustration="records-start" title={t('emptyTitle')} description={t('emptyDescription')} />;
  }

  const allOpen = shown.length > 0 && shown.every((visit) => expanded.has(visit.id));
  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {doctors.length > 1 ? (
          <div className="flex min-w-0 flex-col gap-(--label-gap)">
            <label htmlFor={filterId} className="text-sm font-medium text-text-primary">
              {t('doctorFilter')}
            </label>
            <NativeSelect id={filterId} value={doctor} onChange={(event) => setDoctor(event.target.value)} wrapperClassName="w-60 max-w-full">
              <option value={ALL_DOCTORS}>{t('allDoctors')}</option>
              {doctors.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : (
          <span />
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={allOpen}
          onClick={() => setExpanded(allOpen ? new Set() : new Set(shown.map((visit) => visit.id)))}
        >
          {allOpen ? t('collapseAll') : t('expandAll')}
        </Button>
      </div>

      {months.map((month) => (
        <section key={month.key} aria-label={month.label} className="flex flex-col">
          {/* Stays on screen while its month scrolls by (<main> is the scroll area). */}
          <h3 className="sticky top-0 z-(--z-sticky) -mx-1 bg-canvas px-1 py-2 text-caption font-semibold uppercase tracking-wider text-text-tertiary">
            {month.label}
          </h3>
          <ol className="flex flex-col">
            {month.visits.map((visit, index) => (
              <VisitEntry
                key={visit.id}
                visit={visit}
                isLast={index === month.visits.length - 1}
                open={expanded.has(visit.id)}
                highlighted={visit.id === highlightId}
                onToggle={() => toggle(visit.id)}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function VisitEntry({
  visit,
  isLast,
  open,
  highlighted,
  onToggle,
}: {
  visit: MedicalRecordEntry;
  isLast: boolean;
  open: boolean;
  highlighted: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('patient.records.visits');
  const format = useFormatter();
  const noteId = useId();
  const date = new Date(visit.date);
  const parts = parseVisitNote(visit.description);
  const summary = visitSummary(visit.description);

  return (
    <li id={`visit-${visit.id}`} data-record-id={visit.id} className="flex scroll-mt-12 gap-3 sm:gap-4">
      {/* Date block and the timeline line (mirrors in Arabic with the layout). */}
      <div className="flex w-11 shrink-0 flex-col items-center sm:w-14">
        <span
          className={cn('flex w-full flex-col items-center rounded-md py-1.5', RECORD_KINDS.visit.tint)}
          aria-hidden="true"
        >
          <span className="text-base font-semibold leading-none tabular-nums sm:text-lg">{format.dateTime(date, { day: 'numeric' })}</span>
          <span className="mt-0.5 text-[0.6875rem] font-medium leading-none">{format.dateTime(date, { weekday: 'short' })}</span>
        </span>
        {!isLast && <span className="mt-1 w-px flex-1 bg-border-default" aria-hidden="true" />}
      </div>

      <div className="min-w-0 flex-1 pb-4">
        <div
          className={cn(
            'flex flex-col gap-2 rounded-(--r-card) border border-border-default bg-surface p-4',
            highlighted && 'ring-2 ring-focus-ring',
          )}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {visit.doctorName && (
              <span className="flex min-w-0 items-center gap-2">
                <PersonAvatar name={visit.doctorName} size="xs" />
                <bdi className="truncate text-sm font-semibold text-text-primary">{visit.doctorName}</bdi>
              </span>
            )}
            <time dateTime={visit.date} className="text-xs text-text-tertiary">
              <bdi>{format.dateTime(date, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</bdi>
            </time>
          </div>

          {!open && summary && (
            <p dir="auto" className="truncate text-sm text-text-secondary rtl:text-right">
              {summary}
            </p>
          )}

          {open && (
            <div id={noteId}>
              {parts.length === 1 && !parts[0].section ? (
                <p dir="auto" className="whitespace-pre-line text-sm text-text-secondary rtl:text-right">
                  {parts[0].text}
                </p>
              ) : (
                <dl className="flex flex-col gap-2">
                  {parts.map((part) => (
                    <div key={part.section} className="flex flex-col gap-0.5">
                      <dt className="text-caption font-semibold text-text-tertiary">{part.section && t(`sections.${part.section}`)}</dt>
                      <dd dir="auto" className="whitespace-pre-line text-sm text-text-primary rtl:text-right">
                        {part.text}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          {parts.length > 0 && (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-controls={open ? noteId : undefined}
              className="inline-flex w-fit items-center gap-1 rounded-sm text-caption font-medium text-care-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {open ? t('hideNote') : t('showNote')}
              <Icon icon={ChevronDown} size="xs" className={cn('transition-transform', open && 'rotate-180')} />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
