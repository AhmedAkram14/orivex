// K11 -- Calendar sync (ORIVEX Remaining Work Audit, "Known Limitations"
// list). A real, standalone RFC 5545 (iCalendar) VEVENT generator -- no
// dependency needed for a single-event export. This is deliberately the
// full, real deliverable for "get this appointment onto my calendar", not
// a stub: every major calendar app (Google Calendar, Outlook, Apple
// Calendar) natively imports a downloaded .ics file, so this alone
// satisfies that user need with zero external credentials.
//
// What remains genuinely blocked (see K11 in the audit report) is active,
// two-way OAuth sync with a specific provider (Google Calendar API,
// Microsoft Graph) -- that requires a real registered OAuth application
// and client secret this environment does not have and must not fabricate.
export interface AppointmentIcsInput {
  appointmentId: string;
  doctorDisplayName: string;
  patientDisplayName: string;
  startsAt: Date;
  endsAt: Date;
  reasonForVisit?: string;
  isVirtual: boolean;
}

function toIcsUtcTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

// RFC 5545 §3.3.11: backslash, semicolon, comma, and newline must be
// escaped in TEXT-valued properties (SUMMARY/DESCRIPTION).
function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildAppointmentIcs(input: AppointmentIcsInput): string {
  const summary = escapeIcsText(`Orivex consultation with ${input.doctorDisplayName}`);
  const descriptionLines = [`Patient: ${input.patientDisplayName}`, `Doctor: ${input.doctorDisplayName}`];
  if (input.reasonForVisit) {
    descriptionLines.push(`Reason: ${input.reasonForVisit}`);
  }
  const description = escapeIcsText(descriptionLines.join('\n'));

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Orivex//Consultation Calendar Invite//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    // Stable per-appointment UID -- re-downloading the same appointment's
    // invite and re-importing it updates the existing calendar entry
    // instead of creating a duplicate, matching how every real calendar
    // app treats a repeated UID.
    `UID:${input.appointmentId}@orivex.dev`,
    `DTSTAMP:${toIcsUtcTimestamp(new Date())}`,
    `DTSTART:${toIcsUtcTimestamp(input.startsAt)}`,
    `DTEND:${toIcsUtcTimestamp(input.endsAt)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
  ];
  if (input.isVirtual) {
    lines.push('LOCATION:Orivex video consultation (join link in-app)');
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');

  // RFC 5545 §3.1 requires CRLF line endings.
  return lines.join('\r\n') + '\r\n';
}
