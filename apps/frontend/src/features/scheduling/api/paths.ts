/** Path constants for `/scheduling/*` — mirrors `features/patient/api/paths.ts`'s convention exactly. */
export const SCHEDULING_PATHS = {
  rules: '/scheduling/rules',
  doctorAvailability: '/scheduling/doctor-availability',
  doctorExceptions: '/scheduling/doctor-exceptions',
  holidays: '/scheduling/holidays',
  // Onboarding Redesign integration-gap closure (2026-07-25): the real
  // backend route (SchedulingModule's DoctorAvailabilityController) --
  // patient-facing discovery of a specific doctor's real bookable windows.
  availabilityWindows: (doctorId: string) => `/doctors/${doctorId}/availability-windows`,
} as const;
