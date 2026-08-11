export interface BookAppointmentCommandProps {
  patientId: string;
  doctorId: string;
  availabilityWindowId: string;
  reasonForVisit?: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style). linkedJourneyId is
// deliberately not a field here -- accepted-and-discarded at the DTO layer,
// never reaching the application or domain layers (Health Journey doesn't
// exist yet).
//
// Consultation Pricing Redesign: no longer carries a client-supplied
// consultationType -- pricing is now inherent to the AvailabilityWindow
// being booked, snapshotted onto the Appointment from the window itself,
// never asserted by the client. The old "does the client's stated type
// match the window's?" validation is now unnecessary (and unrepresentable
// -- there's nothing left for a client to get wrong here).
export class BookAppointmentCommand {
  readonly patientId: string;
  readonly doctorId: string;
  readonly availabilityWindowId: string;
  readonly reasonForVisit?: string;

  constructor(props: BookAppointmentCommandProps) {
    this.patientId = props.patientId;
    this.doctorId = props.doctorId;
    this.availabilityWindowId = props.availabilityWindowId;
    this.reasonForVisit = props.reasonForVisit;
  }
}
