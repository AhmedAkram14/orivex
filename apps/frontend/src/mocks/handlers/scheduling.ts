import { http, HttpResponse } from 'msw';
import { env } from '@/shared/lib/env';
import { SCHEDULING_PATHS } from '@/features/scheduling/api/paths';
import { getSchedulingRules } from '@/mocks/scheduling-store';

const base = () => env.apiBaseUrl;

export const schedulingHandlers = [
  http.get(`${base()}${SCHEDULING_PATHS.rules}`, () => HttpResponse.json({ data: getSchedulingRules() })),
];
