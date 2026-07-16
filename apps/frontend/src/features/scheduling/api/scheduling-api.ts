import { apiFetch } from '@/shared/lib/api/client';
import { SCHEDULING_PATHS } from '@/features/scheduling/api/paths';
import type { SchedulingRules } from '@/features/scheduling/types';

/**
 * The only module that talks to `/scheduling/*` — mirrors `patientApi`'s
 * shape. Backed by an MSW mock today (`src/mocks/handlers/scheduling.ts`);
 * this phase builds the Scheduling & Appointment Infrastructure
 * architecture only, not a real `SchedulingModule` integration.
 */
export const schedulingApi = {
  getRules: () => apiFetch<SchedulingRules>({ path: SCHEDULING_PATHS.rules }),
};
