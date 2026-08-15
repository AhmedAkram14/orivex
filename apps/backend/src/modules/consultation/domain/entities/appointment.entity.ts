import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { AppointmentBookedEvent } from '../events/appointment-booked.event.js';
import { AppointmentCancelledEvent } from '../events/appointment-cancelled.event.js';
import { AppointmentConfirmedEvent } from '../events/appointment-confirmed.event.js';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';
import type { ConsultationPricing } from '../value-objects/consultation-pricing.value-object.js';
import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';

export interface RequestAppointmentProps {
  patientId: string;
  doctorId: string;
  availabilityWindowId: string;
  // Snapshotted from the AvailabilityWindow's own pricing at the moment of
  // booking (Consultation Pricing Redesign) -- never re-read from the
  // window afterward, so a later slot repricing can never retroactively
  // change what this appointment was agreed to cost.
  pricing: ConsultationPricing;
  scheduledAt: Date;
  reasonForVisit?: string;
  rescheduledFromId?: string;
}

export interface ReconstituteAppointmentProps {
  id: string;
  patientId: string;
  doctorId: string;
  availabilityWindowId: string;
  pricing: ConsultationPricing;
  status: AppointmentStatus;
  scheduledAt: Date;
  reasonForVisit?: string;
  rescheduledFromId?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// Aggregate root of ConsultationModule (docs/10-backend-architecture.md's
// ConsultationModule entry: "Owned entities: Appointment, ...").
// linkedJourneyId is deliberately not modeled -- Health Journey doesn't
// exist yet (architect direction: no opaque id fields for future modules).
// Separate aggregate root from ConsultationSession -- the physical schema's
// session_id is its own PK with its own lifecycle, not a child of this one.
export class Appointment {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly patientId: string,
    private readonly doctorId: string,
    private readonly availabilityWindowId: string,
    private readonly pricing: ConsultationPricing,
    private status: AppointmentStatus,
    private readonly scheduledAt: Date,
    private readonly reasonForVisit: string | undefined,
    private readonly rescheduledFromId: string | undefined,
    private readonly version: number,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static request(props: RequestAppointmentProps): Appointment {
    const appointment = new Appointment(
      randomUUID(),
      props.patientId,
      props.doctorId,
      props.availabilityWindowId,
      props.pricing,
      AppointmentStatus.Requested,
      props.scheduledAt,
      props.reasonForVisit,
      props.rescheduledFromId,
      1,
      new Date(),
      new Date(),
    );

    appointment.record(new AppointmentBookedEvent(appointment.id));
    return appointment;
  }

  static reconstitute(props: ReconstituteAppointmentProps): Appointment {
    return new Appointment(
      props.id,
      props.patientId,
      props.doctorId,
      props.availabilityWindowId,
      props.pricing,
      props.status,
      props.scheduledAt,
      props.reasonForVisit,
      props.rescheduledFromId,
      props.version,
      props.createdAt,
      props.updatedAt,
    );
  }

  // Free bookings are confirmed immediately (no payment step); paid
  // bookings are confirmed once PaymentModule (Sprint 9) reports success.
  confirm(): void {
    if (this.status !== AppointmentStatus.Requested) {
      throw new ConsultationDomainError(`Appointment "${this.id}" is not Requested and cannot be confirmed.`);
    }
    this.status = AppointmentStatus.Confirmed;
    this.updatedAt = new Date();
    this.record(new AppointmentConfirmedEvent(this.id));
  }

  // cancelledBy is carried on the domain event only -- PaymentModule's own
  // event handler uses it (indirectly; the refund rule itself is now
  // unconditional regardless of who cancelled) and NotificationModule uses
  // it to vary its message. ConsultationModule itself has no payment
  // awareness and never will (module boundary: Payment depends on
  // Consultation, never the reverse).
  cancel(cancelledBy: 'doctor' | 'patient'): void {
    if (this.status !== AppointmentStatus.Requested && this.status !== AppointmentStatus.Confirmed) {
      throw new ConsultationDomainError(`Appointment "${this.id}" cannot be cancelled from its current status.`);
    }
    this.status = AppointmentStatus.Cancelled;
    this.updatedAt = new Date();
    this.record(new AppointmentCancelledEvent(this.id, cancelledBy));
  }

  // Marks this appointment as superseded by a new one on a different slot
  // (docs/07-domain-data-model.md's forward-only rule: reschedule creates a
  // new Appointment referencing this one, never a literal rollback).
  markRescheduled(): void {
    if (this.status !== AppointmentStatus.Requested && this.status !== AppointmentStatus.Confirmed) {
      throw new ConsultationDomainError(`Appointment "${this.id}" cannot be rescheduled from its current status.`);
    }
    this.status = AppointmentStatus.Rescheduled;
    this.updatedAt = new Date();
  }

  // Called when its ConsultationSession closes with a completed outcome.
  complete(): void {
    if (this.status !== AppointmentStatus.Confirmed) {
      throw new ConsultationDomainError(`Appointment "${this.id}" is not Confirmed and cannot be completed.`);
    }
    this.status = AppointmentStatus.Completed;
    this.updatedAt = new Date();
  }

  getId(): string {
    return this.id;
  }

  getPatientId(): string {
    return this.patientId;
  }

  getDoctorId(): string {
    return this.doctorId;
  }

  getAvailabilityWindowId(): string {
    return this.availabilityWindowId;
  }

  getPricing(): ConsultationPricing {
    return this.pricing;
  }

  getStatus(): AppointmentStatus {
    return this.status;
  }

  getScheduledAt(): Date {
    return this.scheduledAt;
  }

  getReasonForVisit(): string | undefined {
    return this.reasonForVisit;
  }

  getRescheduledFromId(): string | undefined {
    return this.rescheduledFromId;
  }

  getVersion(): number {
    return this.version;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  releaseDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents.length = 0;
    return events;
  }

  private record(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}
