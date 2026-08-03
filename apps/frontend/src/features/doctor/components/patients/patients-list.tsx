'use client';

import { CalendarCheck, CalendarRange, Search, Star, UserCheck, Users } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useDoctorPatients } from '@/features/doctor/hooks/use-doctor-patients';
import { useDoctorReportsSummary } from '@/features/doctor/hooks/use-doctor-reports-summary';
import type { AppointmentStatus, DoctorPatientListItem } from '@/features/doctor/api/types';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Input } from '@/shared/ui/input';
import { LinkableStatCard } from '@/shared/ui/layout/linkable-stat-card';
import { Pagination } from '@/shared/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

const badgeVariantByStatus: Record<AppointmentStatus, 'neutral' | 'primary' | 'success' | 'warning' | 'danger'> = {
  requested: 'warning',
  confirmed: 'primary',
  rescheduled: 'warning',
  cancelled: 'neutral',
  no_show: 'danger',
  completed: 'success',
};

type PatientType = 'all' | 'new' | 'returning';
type PatientStatus = 'all' | 'active' | 'completed' | 'inactive';
type LastVisitSort = 'newest' | 'oldest';

const PAGE_SIZE = 5;
const INACTIVE_AFTER_DAYS = 90;

/**
 * A real, non-fabricated status derived from the same real fields every
 * other column already shows -- never a stored, separately-editable value.
 * 'active': has a real upcoming appointment. 'completed': the most recent
 * visit finished with nothing else booked. 'inactive': no visit in the last
 * 90 days and nothing booked. There is deliberately no distinct "Follow up"
 * state (unlike the reference design) -- this data model has no reliable
 * signal to tell "a booked follow-up" apart from "just another upcoming
 * visit" without guessing.
 */
function derivePatientStatus(patient: DoctorPatientListItem, now: Date): Exclude<PatientStatus, 'all'> {
  if (patient.nextAppointmentAt) return 'active';
  const daysSinceLastVisit = (now.getTime() - new Date(patient.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24);
  if (patient.lastVisitStatus === 'completed' && daysSinceLastVisit <= INACTIVE_AFTER_DAYS) return 'completed';
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

const patientStatusBadgeVariant: Record<Exclude<PatientStatus, 'all'>, 'success' | 'primary' | 'neutral'> = {
  active: 'success',
  completed: 'primary',
  inactive: 'neutral',
};

/**
 * The Doctor Workspace's "Patients" page — a real, distinct-patient list
 * from `GET /appointments/doctor/patients` (every patient this doctor has
 * ever had a real appointment with, grouped server-side). Search/filter/
 * sort/pagination are all real, client-side operations over that same real
 * list -- no fabricated page of data. No drill-through to a per-patient
 * detail page and no row actions: neither exists yet, so none are shown.
 */
export function PatientsList() {
  const t = useTranslations('doctor.patients');
  const tStatus = useTranslations('doctor.patients.status');
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

  const now = useMemo(() => new Date(), []);

  const kpis = useMemo(() => {
    if (!patients) return { total: 0, active: 0, thisMonth: 0, thisWeek: 0 };
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      total: patients.length,
      active: patients.filter((patient) => Boolean(patient.nextAppointmentAt)).length,
      thisMonth: patients.filter((patient) => {
        const visit = new Date(patient.lastVisitAt);
        return visit.getFullYear() === now.getFullYear() && visit.getMonth() === now.getMonth();
      }).length,
      thisWeek: patients.filter((patient) => new Date(patient.lastVisitAt) >= weekAgo).length,
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
        <LinkableStatCard icon={Users} label={t('kpis.totalPatients')} value={String(kpis.total)} helperText={t('kpis.totalPatientsHelper')} />
        <LinkableStatCard icon={UserCheck} label={t('kpis.activePatients')} value={String(kpis.active)} helperText={t('kpis.activePatientsHelper')} />
        <LinkableStatCard icon={CalendarRange} label={t('kpis.thisMonth')} value={String(kpis.thisMonth)} helperText={t('kpis.thisMonthHelper')} />
        <LinkableStatCard icon={CalendarCheck} label={t('kpis.thisWeek')} value={String(kpis.thisWeek)} helperText={t('kpis.thisWeekHelper')} />
        <LinkableStatCard
          icon={Star}
          label={t('kpis.averageRating')}
          value={reportsSummary?.averageRating != null ? reportsSummary.averageRating.toFixed(1) : '—'}
          helperText={reportsSummary?.averageRating == null ? t('kpis.noRatingsYet') : undefined}
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
            className="ps-9"
          />
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
        <EmptyState title={t('noResultsTitle')} description={t('noResultsDescription')} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="border-b border-border-default text-xs text-text-tertiary">
                  <th className="px-4 py-3 text-start font-medium">{t('columns.name')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('columns.ageGender')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('columns.visitCount')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('columns.lastVisit')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('columns.nextAppointment')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('columns.patientStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((patient) => {
                  const status = derivePatientStatus(patient, now);
                  return (
                    <tr key={patient.patientProfileId} className="border-b border-border-default last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar size="sm">
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
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {patient.dateOfBirth ? calculateAge(patient.dateOfBirth, now) : '—'}
                        {patient.gender ? ` • ${tGender(patient.gender)}` : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{patient.visitCount}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {format.dateTime(new Date(patient.lastVisitAt), { year: 'numeric', month: 'short', day: 'numeric' })}
                        <div>
                          <Badge variant={badgeVariantByStatus[patient.lastVisitStatus]} className="mt-1">
                            {tStatus(patient.lastVisitStatus)}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {patient.nextAppointmentAt
                          ? format.dateTime(new Date(patient.nextAppointmentAt), { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })
                          : t('noUpcoming')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={patientStatusBadgeVariant[status]}>{tPatientStatus(status)}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
