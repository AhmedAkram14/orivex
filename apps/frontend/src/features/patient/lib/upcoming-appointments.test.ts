import { describe, expect, it } from 'vitest';

import type { Appointment, AppointmentStatus } from '@/features/patient/api/types';
import {
  selectLastCompletedAppointment,
  selectNeedsAttention,
  selectPastAppointments,
  selectUpcomingAppointments,
} from '@/features/patient/lib/upcoming-appointments';

// A fixed "now" well clear of midnight so same-day logic is unambiguous.
const NOW = new Date(2026, 8, 24, 12, 0, 0);
const at = (dayOffset: number, hour = 12, minute = 0) => new Date(2026, 8, 24 + dayOffset, hour, minute).toISOString();

function appt(id: string, status: AppointmentStatus, scheduledAt: string): Appointment {
  return {
    id,
    scheduledAt,
    doctorId: 'd1',
    doctorName: 'Dr. Test',
    specialization: 'ENT',
    specializationAr: null,
    status,
    consultationType: 'free',
    consultationSessionId: null,
    paymentRequired: false,
    feeAmount: null,
  } as Appointment;
}

describe('selectUpcomingAppointments', () => {
  it('drops a past Confirmed appointment (the bug: Sep 8 shown as next on Sep 24)', () => {
    expect(selectUpcomingAppointments([appt('old', 'confirmed', at(-16))], NOW)).toEqual([]);
  });

  it('keeps a future Confirmed appointment and sorts soonest first', () => {
    const result = selectUpcomingAppointments([appt('later', 'confirmed', at(5)), appt('sooner', 'requested', at(2))], NOW);
    expect(result.map((a) => a.id)).toEqual(['sooner', 'later']);
  });

  it('excludes terminal statuses even when dated in the future', () => {
    const all = (['cancelled', 'completed', 'no_show', 'expired'] as const).map((status) => appt(status, status, at(3)));
    expect(selectUpcomingAppointments(all, NOW)).toEqual([]);
  });

  it('treats an appointment starting exactly now as upcoming', () => {
    expect(selectUpcomingAppointments([appt('now', 'confirmed', NOW.toISOString())], NOW)).toHaveLength(1);
  });

  it('keeps a same-day appointment whose start already passed (sessions can run late)', () => {
    expect(selectUpcomingAppointments([appt('earlier-today', 'confirmed', at(0, 9))], NOW)).toHaveLength(1);
  });

  it('drops an appointment from the previous calendar day', () => {
    expect(selectUpcomingAppointments([appt('yesterday', 'confirmed', at(-1, 23, 30))], NOW)).toEqual([]);
  });

  it('partitions with selectPastAppointments -- every appointment lands in exactly one of the two', () => {
    const all = [appt('a', 'confirmed', at(-16)), appt('b', 'confirmed', at(2)), appt('c', 'completed', at(-3)), appt('d', 'requested', at(-1))];
    const upcoming = selectUpcomingAppointments(all, NOW).map((x) => x.id);
    const past = selectPastAppointments(all, NOW).map((x) => x.id);
    expect([...upcoming, ...past].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(upcoming).toEqual(['b']);
  });
});

describe('selectNeedsAttention', () => {
  it('separates past non-terminal appointments from recently expired requests', () => {
    const result = selectNeedsAttention(
      [
        appt('stale', 'confirmed', at(-16)),
        appt('lapsed', 'expired', at(-12)),
        appt('ancient-expired', 'expired', at(-90)),
        appt('future', 'confirmed', at(4)),
        appt('done', 'completed', at(-20)),
      ],
      NOW,
    );
    expect(result.awaitingUpdate.map((a) => a.id)).toEqual(['stale']);
    expect(result.expired.map((a) => a.id)).toEqual(['lapsed']);
  });
});

describe('selectLastCompletedAppointment', () => {
  it('returns the most recent completed appointment, ignoring other statuses', () => {
    const result = selectLastCompletedAppointment([appt('c1', 'completed', at(-30)), appt('c2', 'completed', at(-5)), appt('x', 'cancelled', at(-1))]);
    expect(result?.id).toBe('c2');
    expect(selectLastCompletedAppointment([appt('x', 'cancelled', at(-1))])).toBeUndefined();
  });
});
