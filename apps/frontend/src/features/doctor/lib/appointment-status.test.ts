import { describe, expect, it } from 'vitest';

import { isUpcomingAppointment, NON_TERMINAL_APPOINTMENT_STATUSES } from '@/features/doctor/lib/appointment-status';

describe('doctor appointment status buckets', () => {
  const now = new Date('2026-10-14T10:00:00.000Z');
  const later = '2026-10-20T10:00:00.000Z';

  it('treats requested and confirmed future appointments as upcoming', () => {
    expect(isUpcomingAppointment({ status: 'requested', scheduledAt: later }, now)).toBe(true);
    expect(isUpcomingAppointment({ status: 'confirmed', scheduledAt: later }, now)).toBe(true);
  });

  // `rescheduled` marks the OLD appointment a reschedule superseded; the new time is its own appointment.
  it('never treats a superseded (rescheduled) appointment as upcoming or unresolved', () => {
    expect(isUpcomingAppointment({ status: 'rescheduled', scheduledAt: later }, now)).toBe(false);
    expect(NON_TERMINAL_APPOINTMENT_STATUSES.has('rescheduled')).toBe(false);
  });
});
