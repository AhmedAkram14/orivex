'use client';

import { ListFilter, Search, Shield, Stethoscope } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { DoctorRatingSummary } from '@/features/consultation/components/doctor-rating-summary';
import { DoctorCard } from '@/features/doctor/components/doctor-card';
import { useDoctorsList } from '@/features/doctor/hooks/use-doctors-list';
import { useHospitalsList } from '@/features/doctor/hooks/use-hospitals-list';
import { useSpecialtiesList } from '@/features/reference/hooks/use-specialties-list';
import { pickLocalizedName } from '@/shared/i18n/localized-name';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Icon } from '@/shared/icons/icon';
import { Input } from '@/shared/ui/input';
import { Pagination } from '@/shared/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';

const PAGE_LIMIT = 12;
const ALL = '__all__';

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
  const locale = useLocale();
  const [search, setSearch] = useState('');
  const [specialtyId, setSpecialtyId] = useState(initialSpecialtyId ?? ALL);
  const [hospitalId, setHospitalId] = useState(ALL);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useDoctorsList({
    page,
    limit: PAGE_LIMIT,
    specialty: search.trim() || undefined,
    specialtyId: specialtyId === ALL ? undefined : specialtyId,
    hospitalId: hospitalId === ALL ? undefined : hospitalId,
  });
  const { data: specialties } = useSpecialtiesList();
  const { data: hospitals } = useHospitalsList();
  const specialtyNameById = new Map(
    (specialties ?? []).map((specialty) => [specialty.id, pickLocalizedName(specialty.name, specialty.nameAr, locale)]),
  );
  const hospitalNameById = new Map((hospitals ?? []).map((hospital) => [hospital.id, hospital.name]));

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  function resetToFirstPage() {
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Icon icon={Search} size="sm" className="absolute start-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetToFirstPage();
            }}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchLabel')}
            className="ps-9"
          />
        </div>
        <Select
          value={specialtyId}
          onValueChange={(value) => {
            setSpecialtyId(value);
            resetToFirstPage();
          }}
        >
          <SelectTrigger className="lg:w-56">
            <SelectValue placeholder={t('allSpecialties')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('allSpecialties')}</SelectItem>
            {(specialties ?? []).map((specialty) => (
              <SelectItem key={specialty.id} value={specialty.id}>
                {pickLocalizedName(specialty.name, specialty.nameAr, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={hospitalId}
          onValueChange={(value) => {
            setHospitalId(value);
            resetToFirstPage();
          }}
        >
          <SelectTrigger className="lg:w-56">
            <SelectValue placeholder={t('allLocations')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('allLocations')}</SelectItem>
            {(hospitals ?? []).map((hospital) => (
              <SelectItem key={hospital.id} value={hospital.id}>
                {hospital.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" disabled>
          <Icon icon={ListFilter} size="sm" className="me-2" />
          {t('filters')}
        </Button>
      </div>

      {isError && <Alert variant="danger">{t('loadError')}</Alert>}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      ) : !data || data.doctors.length === 0 ? (
        <EmptyState icon={Stethoscope} title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.doctors.map((doctor) => (
              <DoctorCard
                key={doctor.doctorProfileId}
                doctorProfileId={doctor.doctorProfileId}
                fullName={doctor.displayName}
                specialtyLabel={specialtyNameById.get(doctor.specialtyId) ?? t('unknownSpecialty')}
                yearsOfExperience={doctor.yearsOfExperience}
                hospitalName={doctor.hospitalId ? hospitalNameById.get(doctor.hospitalId) : undefined}
                consultationFeeAmount={doctor.consultationFeeAmount}
                ratingSlot={<DoctorRatingSummary doctorProfileId={doctor.doctorProfileId} className="text-sm" />}
              />
            ))}
          </div>
          {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />}
        </>
      )}

      <div className="flex items-center gap-3 rounded-lg bg-primary-subtle p-5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
          <Icon icon={Shield} size="sm" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">{t('privacyTitle')}</p>
          <p className="text-sm text-text-secondary">{t('privacyDescription')}</p>
        </div>
      </div>
    </div>
  );
}
