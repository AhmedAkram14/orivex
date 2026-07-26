'use client';

import { Search, Stethoscope } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useDoctorsList } from '@/features/doctor/hooks/use-doctors-list';
import { Alert } from '@/shared/ui/alert';
import { Card, CardContent } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/icons/icon';
import { Input } from '@/shared/ui/input';
import { Link } from '@/shared/i18n/navigation';
import { Pagination } from '@/shared/ui/pagination';
import { Skeleton } from '@/shared/ui/skeleton';

const PAGE_LIMIT = 12;

export interface DoctorDirectoryBrowserProps {
  /** Pre-filters to one specialty, e.g. arriving from the Browse Specialties screen -- the search box still narrows further within it. */
  initialSpecialtyId?: string;
}

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.5): the Patient
 * Dashboard's Browse/Search Doctors screen -- reachable immediately, no
 * identity-verification gate (§7a's four gated actions are booking/
 * consultation/document-upload/payment, never browsing). Backed by
 * DoctorProfileController's real, deliberately minimal GET /doctors
 * (free-text specialty contains-match + exact specialtyId/hospitalId,
 * paginated) -- not full-text search.
 */
export function DoctorDirectoryBrowser({ initialSpecialtyId }: DoctorDirectoryBrowserProps) {
  const t = useTranslations('patient.doctors');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useDoctorsList({
    page,
    limit: PAGE_LIMIT,
    specialty: search.trim() || undefined,
    specialtyId: initialSpecialtyId,
  });

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <Icon icon={Search} size="sm" className="absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchLabel')}
          className="ps-9"
        />
      </div>

      {isError && <Alert variant="danger">{t('loadError')}</Alert>}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : !data || data.doctors.length === 0 ? (
        <EmptyState icon={Stethoscope} title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.doctors.map((doctor) => (
              <Link key={doctor.doctorProfileId} href={`/patient/doctors/${doctor.doctorProfileId}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-2 pt-6">
                    <p className="text-sm font-medium text-text-primary">{doctor.displayName}</p>
                    <p className="text-sm text-text-secondary">{doctor.specialty}</p>
                    {doctor.yearsOfExperience !== undefined && (
                      <p className="text-xs text-text-tertiary">
                        {t('yearsOfExperience', { years: doctor.yearsOfExperience })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
