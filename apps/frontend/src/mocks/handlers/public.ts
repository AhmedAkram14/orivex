import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { getDoctorReviews } from '@/mocks/consultation-store';
import { listDoctors } from '@/mocks/doctor-store';
import { listSpecialties } from '@/mocks/reference-store';

const base = () => env.apiBaseUrl;

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

    const data = {
      doctors: doctors.map((doctor) => {
        const { averageRating, reviewCount } = getDoctorReviews(doctor.doctorProfileId, 1, 1);
        return {
          doctorProfileId: doctor.doctorProfileId,
          fullName: doctor.displayName,
          specialtyName: specialtiesById.get(doctor.specialtyId) ?? '',
          hospitalId: doctor.hospitalId,
          consultationFeeAmount: doctor.consultationFeeAmount,
          averageRating,
          reviewCount,
        };
      }),
      total,
      page,
      limit,
    };

    return HttpResponse.json({ data });
  }),
];
