import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { getWeekDayName } from '@/features/doctor/lib/week';
import { getDoctorReviews } from '@/mocks/consultation-store';
import { listDoctors } from '@/mocks/doctor-store';
import { listSpecialties } from '@/mocks/reference-store';
import { getDoctorAvailability, getDoctorExceptions, getHolidays } from '@/mocks/scheduling-store';

const base = () => env.apiBaseUrl;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Mirrors the real backend's GetDoctorsOpenOnDatesUseCase, scoped to this
 * mock system's single seeded doctor/schedule (there is only ever one
 * `doctor-profile-1` here, so a per-doctorId lookup would be over-built).
 * Working-day check + holiday + exception overrides, same rules as the real
 * use case -- a doctor is never asserted "available" from thin air.
 */
function isDoctorOpenOn(date: Date): boolean {
  const isoDate = toIsoDate(date);
  if (getHolidays().some((holiday) => holiday.date === isoDate)) {
    return false;
  }
  const exception = getDoctorExceptions().find((item) => item.date === isoDate);
  if (exception?.type === 'vacation' || exception?.type === 'unavailable') {
    return false;
  }
  if (exception?.type === 'extra-hours') {
    return true;
  }
  const weekday = getWeekDayName(date);
  return getDoctorAvailability().find((day) => day.dayOfWeek === weekday)?.isWorkingDay ?? false;
}

function availabilityFor(doctorProfileId: string): 'today' | 'tomorrow' | null {
  if (doctorProfileId !== 'doctor-profile-1') {
    return null;
  }
  const now = new Date();
  if (isDoctorOpenOn(now)) return 'today';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isDoctorOpenOn(tomorrow)) return 'tomorrow';
  return null;
}

/**
 * Real backend endpoints (PublicModule's PublicSpecialtiesController/
 * PublicDoctorsController -- the landing page's own public data source).
 * Derives everything from the same mock stores the authenticated
 * equivalents already use (`doctor-store.ts`, `reference-store.ts`,
 * `consultation-store.ts`'s review aggregate) rather than seeding a
 * separate, parallel dataset -- so the landing page and the real
 * authenticated directory never disagree in tests.
 */
export const publicHandlers = [
  http.get(`${base()}/public/specialties`, () => {
    const { doctors } = listDoctors({});
    const countBySpecialtyId = new Map<string, number>();
    for (const doctor of doctors) {
      countBySpecialtyId.set(doctor.specialtyId, (countBySpecialtyId.get(doctor.specialtyId) ?? 0) + 1);
    }

    const data = listSpecialties()
      .filter((specialty) => specialty.isActive)
      .map((specialty) => ({
        id: specialty.id,
        name: specialty.name,
        doctorCount: countBySpecialtyId.get(specialty.id) ?? 0,
      }))
      .sort((a, b) => b.doctorCount - a.doctorCount);

    return HttpResponse.json({ data });
  }),

  http.get(`${base()}/public/doctors`, ({ request }) => {
    const url = new URL(request.url);
    const specialtyId = url.searchParams.get('specialtyId') ?? undefined;
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');

    const { doctors, total } = listDoctors({ specialtyId, page, limit });
    const specialtiesById = new Map(listSpecialties().map((specialty) => [specialty.id, specialty.name]));

    const mapped = doctors.map((doctor) => {
      const { averageRating, reviewCount } = getDoctorReviews(doctor.doctorProfileId, 1, 1);
      return {
        doctorProfileId: doctor.doctorProfileId,
        fullName: doctor.displayName,
        specialtyName: specialtiesById.get(doctor.specialtyId) ?? '',
        hospitalId: doctor.hospitalId,
        // No hospital-name mock store exists -- an unaffiliated doctor stays
        // unaffiliated here too, same "Independent Practice" fallback the
        // real API produces for a null hospitalId, never an invented name.
        hospitalName: undefined as string | undefined,
        yearsOfExperience: doctor.yearsOfExperience,
        consultationFeeAmount: doctor.consultationFeeAmount,
        averageRating,
        reviewCount,
        availability: availabilityFor(doctor.doctorProfileId),
        isTopRated: false,
        isMostBooked: false,
      };
    });

    // Page-local tags, same rule as the real ListPublicDoctorsUseCase: only
    // a reviewed doctor can be "top rated"; "most booked" has no seeded
    // booking-count mock yet, so it's never fabricated true here.
    const topRated = [...mapped].sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1)).find((d) => d.reviewCount > 0);
    if (topRated) {
      topRated.isTopRated = true;
    }

    const data = { doctors: mapped, total, page, limit };

    return HttpResponse.json({ data });
  }),
];
