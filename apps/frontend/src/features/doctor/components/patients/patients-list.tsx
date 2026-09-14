'use client';

import { Calendar, Eye, Search, Star, TrendingUp, UserCheck, Users, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useDoctorPatients } from '@/features/doctor/hooks/use-doctor-patients';
import { useDoctorReportsSummary } from '@/features/doctor/hooks/use-doctor-reports-summary';
import type { DoctorPatientListItem } from '@/features/doctor/api/types';
import { getCairoNow } from '@/shared/lib/date/timezone';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';
import { Pagination } from '@/shared/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

type PatientType = 'all' | 'new' | 'returning';
type PatientStatus = 'all' | 'active' | 'follow_up' | 'completed' | 'inactive';
type LastVisitSort = 'newest' | 'oldest';

const PAGE_SIZE = 25;
const INACTIVE_AFTER_DAYS = 90;
// Threshold below which a rating count reads as marketing rather than
// evidence, same reasoning as the Doctor Card's Top Rated/Most Booked
// ribbons and the Profile page's own rating tile.
const MIN_RATING_COUNT_TO_DISPLAY = 5;

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

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

const patientStatusBadgeVariant: Record<Exclude<PatientStatus, 'all'>, 'success' | 'primary' | 'neutral' | 'warning'> = {
  active: 'success',
  follow_up: 'primary',
  completed: 'neutral',
  inactive: 'warning',
};

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
  const { data: patients, isLoading, isError } = useDoctorPatients();
  const { data: reportsSummary } = useDoctorReportsSummary();

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
    return <Alert variant="danger">{t('loadError')}</Alert>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!patients || patients.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <LinkableStatCard
          icon={Users}
          label={t('kpis.totalPatients')}
          value={String(kpis.total)}
          helperText={t('kpis.totalPatientsHelper')}
          iconClassName="bg-info-subtle text-info-emphasis"
        />
        <LinkableStatCard
          icon={UserCheck}
          label={t('kpis.activePatients')}
          value={String(kpis.active)}
          helperText={t('kpis.activePatientsHelper')}
          iconClassName="bg-success-subtle text-success-emphasis"
        />
        <LinkableStatCard
          icon={Calendar}
          label={t('kpis.thisMonth')}
          value={String(kpis.thisMonth)}
          helperText={t('kpis.thisMonthHelper')}
          iconClassName="bg-primary-subtle text-primary-emphasis"
        />
        <LinkableStatCard
          icon={TrendingUp}
          label={t('kpis.thisWeek')}
          value={String(kpis.thisWeek)}
          helperText={t('kpis.thisWeekHelper')}
          iconClassName="bg-warning-subtle text-warning-emphasis"
        />
        <LinkableStatCard
          icon={Star}
          label={t('kpis.averageRating')}
          value={reportsSummary?.averageRating != null ? reportsSummary.averageRating.toFixed(1) : '—'}
          helperText={
            reportsSummary?.averageRating == null
              ? t('kpis.noRatingsYet')
              : reportsSummary.reviewCount >= MIN_RATING_COUNT_TO_DISPLAY
                ? t('kpis.averageRatingHelper', { count: reportsSummary.reviewCount })
                : t('kpis.averageRatingHelperNoCount')
          }
          iconClassName="bg-secondary-subtle text-text-secondary"
        />
      </div>

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
            <EmptyState title={t('noResultsTitle')} description={t('noResultsDescription')} />
            {(search || typeFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                type="button"
                variant="outline"
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
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t('columns.name')}</TableHead>
                <TableHead>{t('columns.ageGender')}</TableHead>
                <TableHead>{t('columns.visitCount')}</TableHead>
                <TableHead>{t('columns.lastVisit')}</TableHead>
                <TableHead>{t('columns.nextAppointment')}</TableHead>
                <TableHead>{t('columns.patientStatus')}</TableHead>
                <TableHead>{t('columns.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((patient) => {
                const status = derivePatientStatus(patient, now);
                return (
                  <TableRow key={patient.patientProfileId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          {patient.avatarUrl && <AvatarImage src={patient.avatarUrl} alt={patient.patientName} />}
                          <AvatarFallback>{initialsFor(patient.patientName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                            {patient.patientName}
                            {patient.visitCount > 1 && (
                              <Badge variant="primary" className="text-[10px]">
                                {t('returning')}
                              </Badge>
                            )}
                          </span>
                          <span className="text-xs text-text-tertiary">{patient.email}</span>
                          {patient.phoneNumber && <span className="text-xs text-text-tertiary">{patient.phoneNumber}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {patient.dateOfBirth ? calculateAge(patient.dateOfBirth, now) : '—'}
                      {patient.gender ? ` • ${tGender(patient.gender)}` : ''}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">{patient.visitCount}</TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {/* Completed-only now (see DoctorPatientListItem's own
                          comment) -- when present this can only ever read
                          "Completed", so the old per-row status badge here
                          (Waiting doctor approval/Cancelled/Confirmed) was
                          dropped: it was never actually describing a visit,
                          just whatever appointment happened to be most
                          recently scheduled. */}
                      {patient.lastVisitAt
                        ? format.dateTime(new Date(patient.lastVisitAt), { year: 'numeric', month: 'short', day: 'numeric' })
                        : t('columns.lastVisitNone')}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {patient.nextAppointmentAt
                        ? format.dateTime(new Date(patient.nextAppointmentAt), { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })
                        : t('noUpcoming')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={patientStatusBadgeVariant[status]}>{tPatientStatus(status)}</Badge>
                    </TableCell>
                    <TableCell>
                      {/* The three placeholder actions (notes/message/more)
                          are gone -- no clinical-notes editor or messaging
                          feature exists yet, and a permanently-disabled
                          "Coming soon" icon (no accessible name, unreachable
                          by keyboard) was worse than not offering it at all.
                          `aria-label` on the anchor itself, not just its
                          inner icon/title, so the link has a real
                          accessible name of its own. */}
                      <Link
                        href={`/doctor/patients/${patient.patientProfileId}`}
                        aria-label={t('actions.view')}
                        className="flex size-7 items-center justify-center rounded-md text-text-secondary hover:bg-secondary-subtle hover:text-text-primary"
                      >
                        <Icon icon={Eye} size="sm" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-3 border-t border-border-default p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-tertiary">
              {t('showingRange', {
                from: (currentPage - 1) * PAGE_SIZE + 1,
                to: Math.min(currentPage * PAGE_SIZE, filtered.length),
                total: filtered.length,
              })}
            </p>
            <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
          </div>
        </Card>
      )}
    </div>
  );
}
