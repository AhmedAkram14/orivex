import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { DOCTOR_PATHS } from '@/features/doctor/api/paths';
import { getDashboardSummary, getUpcomingWork } from '@/mocks/doctor-store';

const base = () => env.apiBaseUrl;

export const doctorHandlers = [
  http.get(`${base()}${DOCTOR_PATHS.dashboardSummary}`, () => HttpResponse.json({ data: getDashboardSummary() })),

  http.get(`${base()}${DOCTOR_PATHS.upcomingWork}`, () => HttpResponse.json({ data: getUpcomingWork() })),
];
