import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { getWeekDayName } from '@/features/doctor/lib/week';
import { getDoctorReviews } from '@/mocks/consultation-store';
import { listDoctors } from '@/mocks/doctor-store';
import { getPatientProfileById } from '@/mocks/patient-store';
import { listSpecialties } from '@/mocks/reference-store';
import { getAvailabilityForDoctorId, getExceptionsForDoctorId, getHolidays } from '@/mocks/scheduling-store';

const base = () => env.apiBaseUrl;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Mirrors the real backend's GetDoctorsOpenOnDatesUseCase. Demo Data &
 * Profile Avatar Pass: now genuinely per-doctor -- `scheduling-store.ts`
 * keys availability by doctor profile id, so each of the seeded doctors has
 * their own working days (Psychiatry deliberately the widest). Working-day
 * check + holiday + exception overrides, same rules as the real use case --
 * a doctor is never asserted "available" from thin air.
 */
function isDoctorOpenOn(doctorProfileId: string, date: Date): boolean {
  const isoDate = toIsoDate(date);
  if (getHolidays().some((holiday) => holiday.date === isoDate)) {
    return false;
  }
  const exception = getExceptionsForDoctorId(doctorProfileId).find((item) => item.date === isoDate);
  if (exception?.type === 'vacation' || exception?.type === 'unavailable') {
    return false;
  }
  if (exception?.type === 'extra-hours') {
    return true;
  }
  const weekday = getWeekDayName(date);
  return getAvailabilityForDoctorId(doctorProfileId).find((day) => day.dayOfWeek === weekday)?.isWorkingDay ?? false;
}

function availabilityFor(doctorProfileId: string): 'today' | 'tomorrow' | null {
  const now = new Date();
  if (isDoctorOpenOn(doctorProfileId, now)) return 'today';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isDoctorOpenOn(doctorProfileId, tomorrow)) return 'tomorrow';
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
        nameAr: specialty.nameAr,
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
    const specialtiesById = new Map(listSpecialties().map((specialty) => [specialty.id, specialty]));

    const mapped = doctors.map((doctor) => {
      const { averageRating, reviewCount, reviews } = getDoctorReviews(doctor.doctorProfileId, 1, 100);
      const writtenReviewCount = reviews.filter((review) => review.comment).length;
      return {
        doctorProfileId: doctor.doctorProfileId,
        fullName: doctor.displayName,
        avatarUrl: doctor.avatarUrl,
        specialtyName: specialtiesById.get(doctor.specialtyId)?.name ?? '',
        specialtyNameAr: specialtiesById.get(doctor.specialtyId)?.nameAr ?? null,
        hospitalId: doctor.hospitalId,
        // No hospital-name mock store exists -- an unaffiliated doctor stays
        // unaffiliated here too, same "Independent Practice" fallback the
        // real API produces for a null hospitalId, never an invented name.
        hospitalName: undefined as string | undefined,
        yearsOfExperience: doctor.yearsOfExperience,
        consultationFeeAmount: doctor.consultationFeeAmount,
        averageRating,
        reviewCount,
        writtenReviewCount,
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

  // Deliberately minimal, no auth -- backs the public patient-profile page
  // a review links to. Same "only what's safe to show a stranger"
  // narrowing as the real PublicPatientResponseDto: name and avatar only.
  http.get(`${base()}/public/patients/:id`, ({ params }) => {
    const profile = getPatientProfileById(params.id as string);
    if (!profile) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Patient profile not found.', requestId: 'mock', timestamp: new Date().toISOString() } },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      data: { patientProfileId: profile.id, fullName: profile.fullName, avatarUrl: profile.avatarUrl },
    });
  }),
];
