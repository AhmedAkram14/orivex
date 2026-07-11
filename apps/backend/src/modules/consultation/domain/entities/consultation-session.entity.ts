import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import { ConsultationCompletedEvent } from '../events/consultation-completed.event.js';
import { ConsultationInterruptedEvent } from '../events/consultation-interrupted.event.js';
import { ConsultationStartedEvent } from '../events/consultation-started.event.js';
import { ConsultationCompletionReason } from '../enums/consultation-completion-reason.enum.js';
import { ConsultationState } from '../enums/consultation-state.enum.js';
import { ConsultationDomainError } from '../exceptions/consultation-domain.error.js';

import { SessionConnectionLog } from './session-connection-log.entity.js';

export interface ReconstituteConsultationSessionProps {
  id: string;
  appointmentId: string;
  state: ConsultationState;
  completionReason?: ConsultationCompletionReason;
  startedAt?: Date;
  closedAt?: Date;
  connectionLogs: SessionConnectionLog[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// Aggregate root of ConsultationModule (docs/10-backend-architecture.md's
// ConsultationModule entry: "Owned entities: ... ConsultationSession, ...").
// Separate aggregate from Appointment -- created only once an Appointment
// is confirmed (docs/09-physical-database.md's consultation_sessions
// lifecycle "Waiting room -> closed"; docs/12-openapi.md's ConsultationSummary
// enum has no pre-waiting-room state). EmergencyEscalation is a valid
// ConsultationState value only -- no transition into it exists this sprint.
export class ConsultationSession {
  private readonly domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly id: string,
    private readonly appointmentId: string,
    private state: ConsultationState,
    private completionReason: ConsultationCompletionReason | undefined,
    private startedAt: Date | undefined,
    private closedAt: Date | undefined,
    private readonly connectionLogs: SessionConnectionLog[],
    private readonly version: number,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static open(appointmentId: string): ConsultationSession {
    const now = new Date();
    return new ConsultationSession(
      randomUUID(),
      appointmentId,
      ConsultationState.WaitingRoom,
      undefined,
      undefined,
      undefined,
      [],
      1,
      now,
      now,
    );
  }

  static reconstitute(props: ReconstituteConsultationSessionProps): ConsultationSession {
    return new ConsultationSession(
      props.id,
      props.appointmentId,
      props.state,
      props.completionReason,
      props.startedAt,
      props.closedAt,
      props.connectionLogs,
      props.version,
      props.createdAt,
      props.updatedAt,
    );
  }

  // docs/12-openapi.md's startConsultation: "Session transitioned to in_progress."
  start(): void {
    if (this.state !== ConsultationState.WaitingRoom) {
      throw new ConsultationDomainError(`ConsultationSession "${this.id}" is not in WaitingRoom and cannot start.`);
    }
    this.state = ConsultationState.InProgress;
    this.startedAt = new Date();
    this.updatedAt = new Date();
    this.record(new ConsultationStartedEvent(this.id));
  }

  // docs/12-openapi.md's closeConsultation: "Session closed; triggers
  // ConsultationCompleted or ConsultationInterrupted event downstream."
  close(completionReason: ConsultationCompletionReason): void {
    if (this.state !== ConsultationState.InProgress) {
      throw new ConsultationDomainError(`ConsultationSession "${this.id}" is not InProgress and cannot be closed.`);
    }
    this.state = ConsultationState.Closed;
    this.completionReason = completionReason;
    this.closedAt = new Date();
    this.updatedAt = new Date();

    if (completionReason === ConsultationCompletionReason.Completed) {
      this.record(new ConsultationCompletedEvent(this.id));
    } else {
      this.record(new ConsultationInterruptedEvent(this.id));
    }
  }

  // "Technical quality records" (docs/09-physical-database.md) -- allowed
  // any time before the session closes.
  addConnectionLog(note: string): void {
    if (this.state === ConsultationState.Closed) {
      throw new ConsultationDomainError(`ConsultationSession "${this.id}" is closed; cannot record connection logs.`);
    }
    this.connectionLogs.push(SessionConnectionLog.create({ note }));
    this.updatedAt = new Date();
  }

  getId(): string {
    return this.id;
  }

  getAppointmentId(): string {
    return this.appointmentId;
  }

  getState(): ConsultationState {
    return this.state;
  }

  getCompletionReason(): ConsultationCompletionReason | undefined {
    return this.completionReason;
  }

  getStartedAt(): Date | undefined {
    return this.startedAt;
  }

  getClosedAt(): Date | undefined {
    return this.closedAt;
  }

  getConnectionLogs(): SessionConnectionLog[] {
    return [...this.connectionLogs];
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
