/** Path constants for `/scheduling/*` — mirrors `features/patient/api/paths.ts`'s convention exactly. */
export const SCHEDULING_PATHS = {
  rules: '/scheduling/rules',
  doctorAvailability: '/scheduling/doctor-availability',
  doctorExceptions: '/scheduling/doctor-exceptions',
  bookings: '/scheduling/bookings',
  waitlist: '/scheduling/waitlist',
  holidays: '/scheduling/holidays',
} as const;
