'use client';

import { Calendar, ChevronRight, Search, TrendingUp, UserCheck, Users, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useDoctorPatients } from '@/features/doctor/hooks/use-doctor-patients';
import type { DoctorPatientListItem } from '@/features/doctor/api/types';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { PersonAvatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { ErrorState } from '@/shared/ui/error-state';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { MetricStat, MetricStrip } from '@/shared/ui/metric-stat';
import { SkeletonRow } from '@/shared/ui/skeletons';
import { Pagination } from '@/shared/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

type PatientType = 'all' | 'new' | 'returning';
type PatientStatus = 'all' | 'active' | 'follow_up' | 'completed' | 'inactive';
type LastVisitSort = 'newest' | 'oldest';

const PAGE_SIZE = 25;
const INACTIVE_AFTER_DAYS = 90;

/**
 * A real, non-fabricated status derived from real fields only -- never a
 * stored, separately-editable value. 'active': has a real upcoming
 * appointment. 'follow_up': the last visit finished with a real follow-up
 * recommendation on record (ClinicalModule's `FollowUpRecommendation`,
 * reused via `hasFollowUpRecommendation`) but nothing booked yet --
 * becomes 'active' again the moment that follow-up is actually scheduled.
 * 'completed': finished with no follow-up recommended and nothing booked.
 * 'inactive': no completed visit in the last 90 days (or ever) and nothing
 * booked. `lastVisitAt`/`lastVisitStatus` are Completed-only now (see
 * DoctorPatientListItemResponseDto's own comment) -- absent entirely for a
 * patient with no completed visit yet, which reads as 'inactive' here
 * rather than crashing on `new Date(undefined)`.
 */
function derivePatientStatus(patient: DoctorPatientListItem, now: Date): Exclude<PatientStatus, 'all'> {
  if (patient.nextAppointmentAt) return 'active';
  if (patient.hasFollowUpRecommendation) return 'follow_up';
  if (!patient.lastVisitAt) return 'inactive';
  const daysSinceLastVisit = (now.getTime() - new Date(patient.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastVisit <= INACTIVE_AFTER_DAYS) return 'completed';
  return 'inactive';
}

function calculateAge(dateOfBirth: string, now: Date): number {
  const birth = new Date(dateOfBirth);
  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear = now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

const patientStatusDot: Record<Exclude<PatientStatus, 'all'>, string> = {
  active: 'bg-success',
  follow_up: 'bg-warning',
  completed: 'bg-info',
  inactive: 'bg-text-tertiary',
};

/** A patient's relationship status -- deliberately a different visual from an appointment's StatusBadge (outlined with a dot, not a tinted fill), so the two vocabularies are never confused. */
function PatientStatusChip({ status, label }: { status: Exclude<PatientStatus, 'all'>; label: string }) {
  return (
    <span className="inline-flex h-5.5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border-default bg-surface px-2.5 text-caption font-semibold tracking-normal text-text-secondary">
      <span aria-hidden="true" className={`size-1.5 rounded-full ${patientStatusDot[status]}`} />
      {label}
    </span>
  );
}

/**
 * The Doctor Workspace's "Patients" page — a real, distinct-patient list
 * from `GET /appointments/doctor/patients` (every patient this doctor has
 * ever had a real appointment with, grouped server-side). Search/filter/
 * sort/pagination are all real, client-side operations over that same real
 * list -- no fabricated page of data. `View` opens the real clinical chart
 * at `/doctor/patients/:id` (protected, real doctor-patient relationship
 * check server-side); notes/message/more remain `aria-disabled` with a
 * "coming soon" tooltip -- no clinical-notes editor or messaging feature
 * exists yet, so they stay honest about that rather than pretending to work.
 */
export function PatientsList() {
  const t = useTranslations('doctor.patients');
  const tPatientStatus = useTranslations('doctor.patients.patientStatus');
  const tGender = useTranslations('doctor.patients.gender');
  const format = useFormatter();
  const { data: patients, isLoading, isError, refetch } = useDoctorPatients();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<PatientType>('all');
  const [statusFilter, setStatusFilter] = useState<PatientStatus>('all');
  const [sort, setSort] = useState<LastVisitSort>('newest');
  const [page, setPage] = useState(1);

  const now = useMemo(() => getCairoNow(), []);

  const kpis = useMemo(() => {
    if (!patients) return { total: 0, active: 0, thisMonth: 0, thisWeek: 0 };
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      total: patients.length,
      active: patients.filter((patient) => Boolean(patient.nextAppointmentAt)).length,
      thisMonth: patients.filter((patient) => {
        if (!patient.lastVisitAt) return false;
        // Cairo-anchored: "this month" must agree with Egypt's calendar,
        // not the viewer's browser timezone (`now` above is already
        // shifted; the visit date must be shifted the same way for a
        // consistent comparison).
        const visit = getCairoNow(new Date(patient.lastVisitAt));
        return visit.getFullYear() === now.getFullYear() && visit.getMonth() === now.getMonth();
      }).length,
      thisWeek: patients.filter((patient) => patient.lastVisitAt && new Date(patient.lastVisitAt) >= weekAgo).length,
    };
  }, [patients, now]);

  const filtered = useMemo(() => {
    if (!patients) return [];
    const query = search.trim().toLowerCase();
    return patients
      .filter((patient) => {
        if (query) {
          const haystack = `${patient.patientName} ${patient.email} ${patient.phoneNumber ?? ''}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        if (typeFilter === 'new' && patient.visitCount > 1) return false;
        if (typeFilter === 'returning' && patient.visitCount <= 1) return false;
        if (statusFilter !== 'all' && derivePatientStatus(patient, now) !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        // A patient with no completed visit yet has nothing to compare --
        // sorts after every real visit date regardless of direction,
        // rather than collapsing to epoch 0 and reading as "ancient".
        if (!a.lastVisitAt && !b.lastVisitAt) return 0;
        if (!a.lastVisitAt) return 1;
        if (!b.lastVisitAt) return -1;
        const diff = new Date(a.lastVisitAt).getTime() - new Date(b.lastVisitAt).getTime();
        return sort === 'newest' ? -diff : diff;
      });
  }, [patients, search, typeFilter, statusFilter, sort, now]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (isError) {
    return <ErrorState description={t('loadError')} onRetry={() => void refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (!patients || patients.length === 0) {
    return <EmptyState illustration="inbox-quiet" title={t('emptyTitle')} description={t('emptyDescription')} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Average Rating KPI removed (Phase 6 UX remediation, P2-5): a
          doctor's own rating is not patient data and doesn't belong on a
          clinical patient list -- it's already shown consistently on
          Overview/Profile/Reports (Phase 1 consolidation via
          `getRatingDisplay`/`useDoctorReviews`). Removing it here loses no
          real data, just a vanity metric out of place. */}
      <MetricStrip>
        <MetricStat variant="inline" icon={Users} label={t('kpis.totalPatients')} value={String(kpis.total)} helperText={t('kpis.totalPatientsHelper')} />
        <MetricStat variant="inline" icon={UserCheck} label={t('kpis.activePatients')} value={String(kpis.active)} helperText={t('kpis.activePatientsHelper')} />
        <MetricStat variant="inline" icon={Calendar} label={t('kpis.thisMonth')} value={String(kpis.thisMonth)} helperText={t('kpis.thisMonthHelper')} />
        <MetricStat variant="inline" icon={TrendingUp} label={t('kpis.thisWeek')} value={String(kpis.thisWeek)} helperText={t('kpis.thisWeekHelper')} />
      </MetricStrip>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Icon icon={Search} size="sm" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t('searchPlaceholder')}
            className="ps-9 pe-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              aria-label={t('clearSearch')}
              className="absolute end-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-text-tertiary hover:text-text-primary"
            >
              <Icon icon={X} size="sm" />
            </button>
          )}
        </div>
        <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value as PatientType); setPage(1); }}>
          <SelectTrigger className="w-44" aria-label={t('filterType.all')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filterType.all')}</SelectItem>
            <SelectItem value="new">{t('filterType.new')}</SelectItem>
            <SelectItem value="returning">{t('filterType.returning')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as PatientStatus); setPage(1); }}>
          <SelectTrigger className="w-40" aria-label={t('filterStatus.all')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filterStatus.all')}</SelectItem>
            <SelectItem value="active">{tPatientStatus('active')}</SelectItem>
            <SelectItem value="follow_up">{tPatientStatus('follow_up')}</SelectItem>
            <SelectItem value="completed">{tPatientStatus('completed')}</SelectItem>
            <SelectItem value="inactive">{tPatientStatus('inactive')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as LastVisitSort)}>
          <SelectTrigger className="w-48" aria-label={t('columns.lastVisit')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('sortLastVisit.newest')}</SelectItem>
            <SelectItem value="oldest">{t('sortLastVisit.oldest')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-4 p-6">
            <EmptyState illustration="search-no-results" title={t('noResultsTitle')} description={t('noResultsDescription')} />
            {(search || typeFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setPage(1);
                }}
              >
                {t('clearFilters')}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          {/* Compact rows (44px) from md up; stacked tappable cards below. Both branches read the same `pageItems`/derived status. */}
          <Card className="hidden overflow-hidden md:block" data-testid="patients-table">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t('columns.name')}</TableHead>
                  <TableHead>{t('columns.ageGender')}</TableHead>
                  <TableHead>{t('columns.visitCount')}</TableHead>
                  <TableHead>{t('columns.lastVisit')}</TableHead>
                  <TableHead>{t('columns.nextAppointment')}</TableHead>
                  <TableHead>{t('columns.patientStatus')}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t('columns.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((patient) => {
                  const status = derivePatientStatus(patient, now);
                  return (
                    // Stretched link: the whole row opens the chart via the name link's
                    // `after:absolute after:inset-0`, keyboard-focusable without an onClick
                    // on a <tr>. The labeled "Open chart" button is raised above the overlay.
                    <TableRow key={patient.patientProfileId} className="relative">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <PersonAvatar name={patient.patientName} src={patient.avatarUrl} size="sm" />
                          <div className="flex min-w-0 flex-col">
                            <span className="flex items-center gap-2 text-small font-medium text-text-primary">
                              <Link
                                href={`/doctor/patients/${patient.patientProfileId}`}
                                className="rounded-sm after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                              >
                                <bdi>{patient.patientName}</bdi>
                              </Link>
                              {patient.visitCount > 1 && <Badge variant="neutral">{t('returning')}</Badge>}
                            </span>
                            <span className="truncate text-caption text-text-tertiary">
                              <bdi>{patient.email}</bdi>
                              {patient.phoneNumber && (
                                <>
                                  {' · '}
                                  <bdi dir="ltr">{patient.phoneNumber}</bdi>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-small text-text-secondary">
                        {patient.dateOfBirth ? calculateAge(patient.dateOfBirth, now) : '—'}
                        {patient.gender ? ` • ${tGender(patient.gender)}` : ''}
                      </TableCell>
                      <TableCell className="text-small text-text-secondary">{patient.visitCount}</TableCell>
                      <TableCell className="text-small text-text-secondary">
                        {patient.lastVisitAt
                          ? format.dateTime(new Date(patient.lastVisitAt), { year: 'numeric', month: 'short', day: 'numeric' })
                          : t('columns.lastVisitNone')}
                      </TableCell>
                      <TableCell className="text-small text-text-secondary">
                        {patient.nextAppointmentAt
                          ? format.dateTime(new Date(patient.nextAppointmentAt), { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })
                          : t('noUpcoming')}
                      </TableCell>
                      <TableCell>
                        <PatientStatusChip status={status} label={tPatientStatus(status)} />
                      </TableCell>
                      <TableCell className="text-end">
                        <Button asChild variant="ghost" size="sm" className="relative z-10">
                          <Link href={`/doctor/patients/${patient.patientProfileId}`}>
                            {t('actions.openChart')}
                            <Icon icon={ChevronRight} size="sm" flipRtl />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t border-border-default p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-small text-text-tertiary">
                {t('showingRange', {
                  from: (currentPage - 1) * PAGE_SIZE + 1,
                  to: Math.min(currentPage * PAGE_SIZE, filtered.length),
                  total: filtered.length,
                })}
              </p>
              <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
            </div>
          </Card>

          <div className="flex flex-col gap-3 md:hidden" data-testid="patients-card-list">
            {pageItems.map((patient) => {
              const status = derivePatientStatus(patient, now);
              return (
                <Card key={patient.patientProfileId} className="relative p-4">
                  <div className="flex items-start gap-3">
                    <PersonAvatar name={patient.patientName} src={patient.avatarUrl} size="md" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/doctor/patients/${patient.patientProfileId}`}
                          className="truncate rounded-sm text-body font-medium text-text-primary after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                          <bdi>{patient.patientName}</bdi>
                        </Link>
                        {patient.visitCount > 1 && <Badge variant="neutral" className="shrink-0">{t('returning')}</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-text-tertiary">
                        <span>
                          {patient.dateOfBirth ? calculateAge(patient.dateOfBirth, now) : '—'}
                          {patient.gender ? ` • ${tGender(patient.gender)}` : ''}
                        </span>
                        <span aria-hidden="true">·</span>
                        <bdi>{patient.email}</bdi>
                      </div>
                      <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-small">
                        <div>
                          <dt className="text-text-tertiary">{t('columns.lastVisit')}</dt>
                          <dd className="text-text-secondary">
                            {patient.lastVisitAt
                              ? format.dateTime(new Date(patient.lastVisitAt), { year: 'numeric', month: 'short', day: 'numeric' })
                              : t('columns.lastVisitNone')}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-text-tertiary">{t('columns.nextAppointment')}</dt>
                          <dd className="text-text-secondary">
                            {patient.nextAppointmentAt
                              ? format.dateTime(new Date(patient.nextAppointmentAt), { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })
                              : t('noUpcoming')}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-1">
                        <PatientStatusChip status={status} label={tPatientStatus(status)} />
                      </div>
                    </div>
                    <Icon icon={ChevronRight} size="sm" flipRtl className="mt-1 shrink-0 text-text-tertiary" />
                  </div>
                </Card>
              );
            })}
            <div className="flex flex-col gap-3 border-t border-border-default pt-4">
              <p className="text-small text-text-tertiary">
                {t('showingRange', {
                  from: (currentPage - 1) * PAGE_SIZE + 1,
                  to: Math.min(currentPage * PAGE_SIZE, filtered.length),
                  total: filtered.length,
                })}
              </p>
              <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
