import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildAppointmentIcs } from './build-appointment-ics.js';

describe('buildAppointmentIcs', () => {
  it('produces a valid VCALENDAR/VEVENT block with the real appointment data', () => {
    const ics = buildAppointmentIcs({
      appointmentId: '11111111-1111-4111-8111-111111111111',
      doctorDisplayName: 'Dr. Sarah Ahmed',
      patientDisplayName: 'Ahmed Ali',
      startsAt: new Date('2026-10-01T09:00:00.000Z'),
      endsAt: new Date('2026-10-01T09:30:00.000Z'),
      reasonForVisit: 'Follow-up',
      isVirtual: true,
    });

    assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
    assert.match(ics, /END:VCALENDAR\r\n$/);
    assert.match(ics, /UID:11111111-1111-4111-8111-111111111111@orivex\.dev/);
    assert.match(ics, /DTSTART:20261001T090000Z/);
    assert.match(ics, /DTEND:20261001T093000Z/);
    assert.match(ics, /SUMMARY:Orivex consultation with Dr\. Sarah Ahmed/);
    assert.match(ics, /DESCRIPTION:Patient: Ahmed Ali\\nDoctor: Dr\. Sarah Ahmed\\nReason: Follow-up/);
    assert.match(ics, /LOCATION:Orivex video consultation/);
  });

  it('omits LOCATION for a non-virtual appointment', () => {
    const ics = buildAppointmentIcs({
      appointmentId: '22222222-2222-4222-8222-222222222222',
      doctorDisplayName: 'Dr. Omar Hassan',
      patientDisplayName: 'Mariam Ahmed',
      startsAt: new Date('2026-10-02T10:00:00.000Z'),
      endsAt: new Date('2026-10-02T10:30:00.000Z'),
      isVirtual: false,
    });

    assert.doesNotMatch(ics, /LOCATION:/);
  });

  it('escapes semicolons, commas, and backslashes in free-text fields', () => {
    const ics = buildAppointmentIcs({
      appointmentId: '33333333-3333-4333-8333-333333333333',
      doctorDisplayName: 'Dr. Test',
      patientDisplayName: 'Patient Test',
      startsAt: new Date('2026-10-03T10:00:00.000Z'),
      endsAt: new Date('2026-10-03T10:30:00.000Z'),
      reasonForVisit: 'Chest pain; shortness of breath, and cough',
      isVirtual: true,
    });

    assert.match(ics, /Reason: Chest pain\\; shortness of breath\\, and cough/);
  });

  it('uses a stable per-appointment UID so re-importing updates rather than duplicates', () => {
    const first = buildAppointmentIcs({
      appointmentId: '44444444-4444-4444-8444-444444444444',
      doctorDisplayName: 'Dr. A',
      patientDisplayName: 'Patient A',
      startsAt: new Date('2026-10-04T10:00:00.000Z'),
      endsAt: new Date('2026-10-04T10:30:00.000Z'),
      isVirtual: true,
    });
    const second = buildAppointmentIcs({
      appointmentId: '44444444-4444-4444-8444-444444444444',
      doctorDisplayName: 'Dr. A',
      patientDisplayName: 'Patient A',
      startsAt: new Date('2026-10-04T10:00:00.000Z'),
      endsAt: new Date('2026-10-04T10:30:00.000Z'),
      isVirtual: true,
    });

    const extractUid = (ics: string) => ics.match(/UID:([^\r\n]+)/)?.[1];
    assert.equal(extractUid(first), extractUid(second));
  });
});
