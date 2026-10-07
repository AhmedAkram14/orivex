import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { getWeekDayName } from '@/features/doctor/lib/week';
import { getDoctorReviews } from '@/mocks/consultation-store';
import { listAllDoctorProfiles, listDoctors } from '@/mocks/doctor-store';
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

/** The `availability=week` filter: open on at least one of the next `days` days, today included. */
function isDoctorOpenWithinDays(doctorProfileId: string, days: number): boolean {
  const day = new Date();
  for (let index = 0; index < days; index += 1) {
    if (isDoctorOpenOn(doctorProfileId, day)) return true;
    day.setDate(day.getDate() + 1);
  }
  return false;
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

  // Mirrors ListPublicDoctorsUseCase: column filters (specialty, name, rank,
  // hospital/independent, fee, experience), then the cross-aggregate ones
  // (rating, availability) and sorts, then pagination. No booking-count mock
  // exists, so `most_booked` keeps the store's order rather than inventing counts.
  http.get(`${base()}/public/doctors`, ({ request }) => {
    const url = new URL(request.url);
    const params = url.searchParams;
    const page = Number(params.get('page') ?? '1');
    const limit = Number(params.get('limit') ?? '20');
    const numberParam = (key: string) => (params.get(key) === null ? undefined : Number(params.get(key)));
    const q = params.get('q')?.trim().toLowerCase();
    const ranks = params.get('ranks')?.split(',').filter(Boolean);
    const practice = params.get('practice');
    const minRating = numberParam('minRating');
    const availabilityFilter = params.get('availability');
    const sort = params.get('sort');

    const { doctors } = listDoctors({
      specialtyId: params.get('specialtyId') ?? undefined,
      minFeeAmount: numberParam('minFeeAmount'),
      maxFeeAmount: numberParam('maxFeeAmount'),
      minYearsOfExperience: numberParam('minYearsOfExperience'),
      page: 1,
      limit: 10_000,
    });
    const specialtiesById = new Map(listSpecialties().map((specialty) => [specialty.id, specialty]));
    const rankById = new Map(listAllDoctorProfiles().map((profile) => [profile.id, profile.professionalRank]));

    let mapped = doctors
      .filter((doctor) => !q || doctor.displayName.toLowerCase().includes(q))
      .filter((doctor) => !ranks?.length || ranks.includes(rankById.get(doctor.doctorProfileId) ?? ''))
      .filter((doctor) => (practice === 'hospital' ? Boolean(doctor.hospitalId) : practice === 'independent' ? !doctor.hospitalId : true))
      .map((doctor) => {
        const { averageRating, reviewCount, reviews } = getDoctorReviews(doctor.doctorProfileId, 1, 100);
        const writtenReviewCount = reviews.filter((review) => review.comment).length;
        return {
          doctorProfileId: doctor.doctorProfileId,
          fullName: doctor.displayName,
          avatarUrl: doctor.avatarUrl,
          professionalRank: rankById.get(doctor.doctorProfileId),
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

    if (minRating !== undefined) mapped = mapped.filter((doctor) => doctor.averageRating !== null && doctor.averageRating >= minRating);
    if (availabilityFilter === 'today') mapped = mapped.filter((doctor) => doctor.availability === 'today');
    if (availabilityFilter === 'week') mapped = mapped.filter((doctor) => isDoctorOpenWithinDays(doctor.doctorProfileId, 7));

    if (sort === 'top_rated') mapped.sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1) || b.reviewCount - a.reviewCount);
    if (sort === 'lowest_fee') mapped.sort((a, b) => (a.consultationFeeAmount ?? Infinity) - (b.consultationFeeAmount ?? Infinity));
    if (sort === 'most_experienced') mapped.sort((a, b) => (b.yearsOfExperience ?? -1) - (a.yearsOfExperience ?? -1));

    const total = mapped.length;
    const offset = (page - 1) * limit;
    const pageDoctors = mapped.slice(offset, offset + limit);
    if (!sort) pageDoctors.sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1));

    // Page-local tags, same rule as the real ListPublicDoctorsUseCase: only
    // a reviewed doctor can be "top rated"; "most booked" has no seeded
    // booking-count mock yet, so it's never fabricated true here.
    const topRated = [...pageDoctors].sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1)).find((d) => d.reviewCount > 0);
    if (topRated) {
      topRated.isTopRated = true;
    }

    return HttpResponse.json({ data: { doctors: pageDoctors, total, page, limit } });
  }),

  // Mirrors PaymentModule's PLATFORM_COMMISSION_RATE (GET /public/platform-fees).
  http.get(`${base()}/public/platform-fees`, () => HttpResponse.json({ data: { commissionRate: 0.15 } })),

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
