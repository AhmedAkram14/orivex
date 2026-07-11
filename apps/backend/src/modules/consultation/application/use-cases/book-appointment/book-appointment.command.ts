import type { ConsultationType } from '../../../domain/enums/consultation-type.enum.js';

export interface BookAppointmentCommandProps {
  patientId: string;
  doctorId: string;
  availabilityWindowId: string;
  consultationType: ConsultationType;
  reasonForVisit?: string;
}

// Commands are application messages, not structural types — immutable by
// construction (matches the established Command style). linkedJourneyId is
// deliberately not a field here -- accepted-and-discarded at the DTO layer,
// never reaching the application or domain layers (Health Journey doesn't
// exist yet).
export class BookAppointmentCommand {
  readonly patientId: string;
  readonly doctorId: string;
  readonly availabilityWindowId: string;
  readonly consultationType: ConsultationType;
  readonly reasonForVisit?: string;

  constructor(props: BookAppointmentCommandProps) {
    this.patientId = props.patientId;
    this.doctorId = props.doctorId;
    this.availabilityWindowId = props.availabilityWindowId;
    this.consultationType = props.consultationType;
    this.reasonForVisit = props.reasonForVisit;
  }
}
