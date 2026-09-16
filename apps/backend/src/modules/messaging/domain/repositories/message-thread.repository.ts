import type { MessageThread } from '../entities/message-thread.entity.js';

export interface MessageThreadRepository {
  findById(id: string): Promise<MessageThread | null>;
  // Re-threading (Phase 1): a patient/doctor pair has at most one thread
  // (the new `@@unique([patientId, doctorId])` constraint), replacing the
  // old per-appointment lookup entirely.
  findByPatientAndDoctor(patientId: string, doctorId: string): Promise<MessageThread | null>;
  // Most recently active conversation first -- backs each role's own inbox list.
  findByPatientId(patientId: string): Promise<MessageThread[]>;
  findByDoctorId(doctorId: string): Promise<MessageThread[]>;
  save(thread: MessageThread): Promise<void>;
}
