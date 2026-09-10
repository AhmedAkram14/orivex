import { randomUUID } from 'node:crypto';

export interface StartMessageThreadProps {
  appointmentId: string;
  patientId: string;
  doctorId: string;
}

export interface ReconstituteMessageThreadProps {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  createdAt: Date;
}

// I7 -- Messaging (docs/01-prd.md §2.13). Aggregate root identifying a
// conversation between exactly one patient and one doctor, scoped to a
// single Appointment (a real-world encounter) -- fully immutable identity,
// Message rows are the only thing that changes over a thread's lifetime.
export class MessageThread {
  private constructor(
    private readonly id: string,
    private readonly appointmentId: string,
    private readonly patientId: string,
    private readonly doctorId: string,
    private readonly createdAt: Date,
  ) {}

  static start(props: StartMessageThreadProps): MessageThread {
    return new MessageThread(randomUUID(), props.appointmentId, props.patientId, props.doctorId, new Date());
  }

  static reconstitute(props: ReconstituteMessageThreadProps): MessageThread {
    return new MessageThread(props.id, props.appointmentId, props.patientId, props.doctorId, props.createdAt);
  }

  getId(): string {
    return this.id;
  }

  getAppointmentId(): string {
    return this.appointmentId;
  }

  getPatientId(): string {
    return this.patientId;
  }

  getDoctorId(): string {
    return this.doctorId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
