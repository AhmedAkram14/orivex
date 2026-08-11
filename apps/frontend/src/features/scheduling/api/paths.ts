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
  // Consultation Pricing Redesign: the doctor's own generated, not-yet-
  // booked windows ("Upcoming Slots" management) and the per-slot pricing
  // override.
  upcomingSlots: '/scheduling/upcoming-slots',
  upcomingSlotPricing: (id: string) => `/scheduling/upcoming-slots/${id}/pricing`,
} as const;
