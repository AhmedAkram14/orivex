import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { DOCTOR_PATHS } from '@/features/doctor/api/paths';
import type { DoctorProfileUpdateRequest } from '@/features/doctor/api/types';
import { getDashboardSummary, getProfile, getUpcomingWork, updateProfile } from '@/mocks/doctor-store';

const base = () => env.apiBaseUrl;

export const doctorHandlers = [
  http.get(`${base()}${DOCTOR_PATHS.dashboardSummary}`, () => HttpResponse.json({ data: getDashboardSummary() })),

  http.get(`${base()}${DOCTOR_PATHS.upcomingWork}`, () => HttpResponse.json({ data: getUpcomingWork() })),

  http.get(`${base()}${DOCTOR_PATHS.profile}`, () => HttpResponse.json({ data: getProfile() })),

  http.patch(`${base()}${DOCTOR_PATHS.profile}`, async ({ request }) => {
    const body = (await request.json()) as DoctorProfileUpdateRequest;
    return HttpResponse.json({ data: updateProfile(body) });
  }),
];
