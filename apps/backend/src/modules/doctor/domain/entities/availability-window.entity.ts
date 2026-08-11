import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { AvailabilityChangedEvent } from '../events/availability-changed.event.js';
import { AvailabilityWindowConflictError } from '../exceptions/availability-window-conflict.error.js';
import { DoctorDomainError } from '../exceptions/doctor-domain.error.js';
import { AvailabilityWindowStatus } from '../enums/availability-window-status.enum.js';
import type { ConsultationPricing } from '../value-objects/consultation-pricing.value-object.js';

const DEFAULT_HOLD_MINUTES = 15;

export interface DefineAvailabilityWindowProps {
  doctorId: string;
  startTime: Date;
  endTime: Date;
  pricing: ConsultationPricing;
}

export interface ReconstituteAvailabilityWindowProps {
  id: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  pricing: ConsultationPricing;
  status: AvailabilityWindowStatus;
  holdExpiresAt?: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// Aggregate root of DoctorModule (docs/10-backend-architecture.md's
// DoctorModule entry: "Owned entities: ... AvailabilityWindow"). Modeled as
// its own aggregate root, not a DoctorProfile child, since its reservation
// lifecycle is a concurrency-sensitive hot path deserving an independent
// transactional boundary (docs/06-system-architecture.md's Scalability
// section flags this as the clearest near-term performance risk).
// Deliberately has no reference to Appointment -- Booking (Sprint 9)
// integrates later, through SchedulingModule's own orchestration, never by
// this entity reaching into another module's aggregate.
export class AvailabilityWindow {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly doctorId: string,
    private readonly startTime: Date,
    private readonly endTime: Date,
    private pricing: ConsultationPricing,
    private status: AvailabilityWindowStatus,
    private holdExpiresAt: Date | undefined,
    private readonly version: number,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static define(props: DefineAvailabilityWindowProps): AvailabilityWindow {
    if (props.startTime.getTime() >= props.endTime.getTime()) {
      throw new DoctorDomainError('startTime must be before endTime.');
    }
    if (props.startTime.getTime() < Date.now()) {
      throw new DoctorDomainError('startTime must not be in the past.');
    }

    const now = new Date();
    const window = new AvailabilityWindow(
      randomUUID(),
      props.doctorId,
      props.startTime,
      props.endTime,
      props.pricing,
      AvailabilityWindowStatus.Open,
      undefined,
      1,
      now,
      now,
    );

    window.record(new AvailabilityChangedEvent(window.id));
    return window;
  }

  static reconstitute(props: ReconstituteAvailabilityWindowProps): AvailabilityWindow {
    return new AvailabilityWindow(
      props.id,
      props.doctorId,
      props.startTime,
      props.endTime,
      props.pricing,
      props.status,
      props.holdExpiresAt,
      props.version,
      props.createdAt,
      props.updatedAt,
    );
  }

  // Places a short-lived hold (docs/10-backend-architecture.md's
  // SchedulingModule entry: reserveSlot()). Allowed from Open, or from a
  // Held window whose hold has already lapsed -- expired holds are
  // evaluated lazily here, never by a background sweep.
  hold(now: Date = new Date(), holdMinutes: number = DEFAULT_HOLD_MINUTES): void {
    if (this.status === AvailabilityWindowStatus.Booked) {
      throw new AvailabilityWindowConflictError(`AvailabilityWindow "${this.id}" is already booked.`);
    }
    if (this.status === AvailabilityWindowStatus.Held && !this.isHoldExpired(now)) {
      throw new AvailabilityWindowConflictError(`AvailabilityWindow "${this.id}" is already held.`);
    }

    this.status = AvailabilityWindowStatus.Held;
    this.holdExpiresAt = new Date(now.getTime() + holdMinutes * 60_000);
    this.updatedAt = now;
    this.record(new AvailabilityChangedEvent(this.id));
  }

  // Releases a hold back to Open (docs/10-backend-architecture.md's
  // SchedulingModule entry: releaseSlot()).
  release(now: Date = new Date()): void {
    if (this.status !== AvailabilityWindowStatus.Held) {
      throw new AvailabilityWindowConflictError(`AvailabilityWindow "${this.id}" is not held.`);
    }

    this.status = AvailabilityWindowStatus.Open;
    this.holdExpiresAt = undefined;
    this.updatedAt = now;
    this.record(new AvailabilityChangedEvent(this.id));
  }

  // Confirms a held window as booked (docs/10-backend-architecture.md's
  // SchedulingModule entry: confirmSlot()). A lapsed hold cannot be
  // confirmed -- it must be re-held first.
  confirm(now: Date = new Date()): void {
    if (this.status !== AvailabilityWindowStatus.Held) {
      throw new AvailabilityWindowConflictError(`AvailabilityWindow "${this.id}" is not held.`);
    }
    if (this.isHoldExpired(now)) {
      throw new AvailabilityWindowConflictError(`AvailabilityWindow "${this.id}"'s hold has expired.`);
    }

    this.status = AvailabilityWindowStatus.Booked;
    this.holdExpiresAt = undefined;
    this.updatedAt = now;
    this.record(new AvailabilityChangedEvent(this.id));
  }

  // Consultation Pricing Redesign: per-slot pricing override. A doctor may
  // reprice (or flip Free/Paid on) any individual generated-but-not-yet-
  // booked window without touching the recurring template it came from --
  // only while genuinely still Open, mirroring hold()/release()/confirm()'s
  // own status-guard style. Once Held (a patient is mid-booking) or Booked,
  // the price is frozen -- Appointment snapshots it at booking time anyway,
  // so this guard exists to prevent a confusing mid-transaction price
  // change, not to protect data that's already immutable elsewhere.
  updatePricing(newPricing: ConsultationPricing, now: Date = new Date()): void {
    if (this.status !== AvailabilityWindowStatus.Open) {
      throw new AvailabilityWindowConflictError(
        `AvailabilityWindow "${this.id}" can only be repriced while Open (current status: ${this.status}).`,
      );
    }
    this.pricing = newPricing;
    this.updatedAt = now;
    this.record(new AvailabilityChangedEvent(this.id));
  }

  isHoldExpired(now: Date = new Date()): boolean {
    return this.holdExpiresAt !== undefined && this.holdExpiresAt.getTime() < now.getTime();
  }

  getId(): string {
    return this.id;
  }

  getDoctorId(): string {
    return this.doctorId;
  }

  getStartTime(): Date {
    return this.startTime;
  }

  getEndTime(): Date {
    return this.endTime;
  }

  getPricing(): ConsultationPricing {
    return this.pricing;
  }

  getStatus(): AvailabilityWindowStatus {
    return this.status;
  }

  getHoldExpiresAt(): Date | undefined {
    return this.holdExpiresAt;
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
