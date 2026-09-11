import { randomUUID } from 'node:crypto';

import { WaitlistDomainError } from '../exceptions/waitlist-domain.error.js';
import { WaitlistEntryStatus } from '../enums/waitlist-entry-status.enum.js';
import type { ConsultationType } from '../enums/consultation-type.enum.js';

export interface JoinWaitlistProps {
  patientId: string;
  doctorId: string;
  consultationType?: ConsultationType;
  earliestAcceptableAt: Date;
  latestAcceptableAt: Date;
}

export interface ReconstituteWaitlistEntryProps {
  id: string;
  patientId: string;
  doctorId: string;
  consultationType?: ConsultationType;
  earliestAcceptableAt: Date;
  latestAcceptableAt: Date;
  status: WaitlistEntryStatus;
  notifiedAt?: Date;
  fulfilledAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
}

// N8-Waitlist (ORIVEX Remaining Work Audit): a patient's standing request
// to hear about the next opening for a doctor within a date range, when
// nothing bookable exists today. Deliberately notification-only -- it
// never books on the patient's behalf (see MatchAvailabilityWithWaitlistUseCase's
// own header comment for why), so its lifecycle has exactly one forward
// path: Waiting -> Notified -> Fulfilled (the patient booked) or Cancelled
// (either party gave up on it). No Notified -> Waiting reversal -- once an
// opportunity has been surfaced, the entry has done its one job; a patient
// who wants to keep watching joins again.
export class WaitlistEntry {
  private constructor(
    private readonly id: string,
    private readonly patientId: string,
    private readonly doctorId: string,
    private readonly consultationType: ConsultationType | undefined,
    private readonly earliestAcceptableAt: Date,
    private readonly latestAcceptableAt: Date,
    private status: WaitlistEntryStatus,
    private notifiedAt: Date | undefined,
    private fulfilledAt: Date | undefined,
    private cancelledAt: Date | undefined,
    private readonly createdAt: Date,
  ) {}

  static join(props: JoinWaitlistProps): WaitlistEntry {
    if (props.latestAcceptableAt.getTime() <= props.earliestAcceptableAt.getTime()) {
      throw new WaitlistDomainError('latestAcceptableAt must be after earliestAcceptableAt.');
    }
    if (props.latestAcceptableAt.getTime() < Date.now()) {
      throw new WaitlistDomainError('The desired date range has already passed.');
    }
    return new WaitlistEntry(
      randomUUID(),
      props.patientId,
      props.doctorId,
      props.consultationType,
      props.earliestAcceptableAt,
      props.latestAcceptableAt,
      WaitlistEntryStatus.Waiting,
      undefined,
      undefined,
      undefined,
      new Date(),
    );
  }

  static reconstitute(props: ReconstituteWaitlistEntryProps): WaitlistEntry {
    return new WaitlistEntry(
      props.id,
      props.patientId,
      props.doctorId,
      props.consultationType,
      props.earliestAcceptableAt,
      props.latestAcceptableAt,
      props.status,
      props.notifiedAt,
      props.fulfilledAt,
      props.cancelledAt,
      props.createdAt,
    );
  }

  /** True if a slot starting at `windowStart`, of `windowType`, would satisfy this entry. */
  isMatchedBy(windowStart: Date, windowType: ConsultationType): boolean {
    if (this.status !== WaitlistEntryStatus.Waiting) {
      return false;
    }
    if (this.consultationType !== undefined && this.consultationType !== windowType) {
      return false;
    }
    return windowStart.getTime() >= this.earliestAcceptableAt.getTime() && windowStart.getTime() <= this.latestAcceptableAt.getTime();
  }

  notify(): void {
    if (this.status !== WaitlistEntryStatus.Waiting) {
      throw new WaitlistDomainError('Only a waiting entry can be notified.');
    }
    this.status = WaitlistEntryStatus.Notified;
    this.notifiedAt = new Date();
  }

  fulfill(): void {
    if (this.status !== WaitlistEntryStatus.Waiting && this.status !== WaitlistEntryStatus.Notified) {
      throw new WaitlistDomainError('Only a waiting or notified entry can be fulfilled.');
    }
    this.status = WaitlistEntryStatus.Fulfilled;
    this.fulfilledAt = new Date();
  }

  cancel(): void {
    if (this.status === WaitlistEntryStatus.Fulfilled || this.status === WaitlistEntryStatus.Cancelled) {
      throw new WaitlistDomainError('This entry can no longer be cancelled.');
    }
    this.status = WaitlistEntryStatus.Cancelled;
    this.cancelledAt = new Date();
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

  getConsultationType(): ConsultationType | undefined {
    return this.consultationType;
  }

  getEarliestAcceptableAt(): Date {
    return this.earliestAcceptableAt;
  }

  getLatestAcceptableAt(): Date {
    return this.latestAcceptableAt;
  }

  getStatus(): WaitlistEntryStatus {
    return this.status;
  }

  getNotifiedAt(): Date | undefined {
    return this.notifiedAt;
  }

  getFulfilledAt(): Date | undefined {
    return this.fulfilledAt;
  }

  getCancelledAt(): Date | undefined {
    return this.cancelledAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
