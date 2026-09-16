import { randomUUID } from 'node:crypto';

export interface StartMessageThreadProps {
  patientId: string;
  doctorId: string;
}

export interface ReconstituteMessageThreadProps {
  id: string;
  patientId: string;
  doctorId: string;
  createdAt: Date;
  lastMessageAt: Date;
  patientLastReadAt?: Date;
  doctorLastReadAt?: Date;
}

// I7 -- Messaging (docs/01-prd.md §2.13). Aggregate root identifying a
// conversation between exactly one patient and one doctor, keyed by the
// (patientId, doctorId) pair -- NOT by Appointment. Re-threaded (Messages
// Page Overhaul, Phase 1) from the original one-thread-per-Appointment
// shape: a patient/doctor pair now has exactly one thread across their
// entire relationship, with every appointment they've ever had together
// living inside it as in-thread context rather than fragmenting history
// into one thread per booking. `lastMessageAt` backs inbox ordering (most
// recently active conversation first); `patientLastReadAt`/
// `doctorLastReadAt` back the unread-badge/realtime "has new activity"
// signal ONLY -- `Message.readAt` remains the separate, authoritative
// per-message read-receipt mechanism (two mechanisms, deliberately not
// unified, per the plan's decision 6).
export class MessageThread {
  private constructor(
    private readonly id: string,
    private readonly patientId: string,
    private readonly doctorId: string,
    private readonly createdAt: Date,
    private lastMessageAt: Date,
    private patientLastReadAt: Date | undefined,
    private doctorLastReadAt: Date | undefined,
  ) {}

  static start(props: StartMessageThreadProps): MessageThread {
    const now = new Date();
    return new MessageThread(randomUUID(), props.patientId, props.doctorId, now, now, undefined, undefined);
  }

  static reconstitute(props: ReconstituteMessageThreadProps): MessageThread {
    return new MessageThread(
      props.id,
      props.patientId,
      props.doctorId,
      props.createdAt,
      props.lastMessageAt,
      props.patientLastReadAt,
      props.doctorLastReadAt,
    );
  }

  /** Called after a new Message is persisted -- advances the inbox-ordering timestamp. Never moves backward. */
  recordNewMessage(sentAt: Date): void {
    if (sentAt > this.lastMessageAt) {
      this.lastMessageAt = sentAt;
    }
  }

  /**
   * These two mark* methods and `Message.markRead()` must always be called
   * together, in the same transaction, by the caller (see
   * MarkThreadMessagesReadUseCase) -- `*LastReadAt` must always be >=
   * MAX(Message.readAt) for that side. This entity itself doesn't enforce
   * that invariant (a domain entity has no transaction boundary of its
   * own); the use case is where it's actually upheld.
   */
  markReadByPatient(readAt: Date = new Date()): void {
    if (!this.patientLastReadAt || readAt > this.patientLastReadAt) {
      this.patientLastReadAt = readAt;
    }
  }

  markReadByDoctor(readAt: Date = new Date()): void {
    if (!this.doctorLastReadAt || readAt > this.doctorLastReadAt) {
      this.doctorLastReadAt = readAt;
    }
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

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getLastMessageAt(): Date {
    return this.lastMessageAt;
  }

  getPatientLastReadAt(): Date | undefined {
    return this.patientLastReadAt;
  }

  getDoctorLastReadAt(): Date | undefined {
    return this.doctorLastReadAt;
  }
}
