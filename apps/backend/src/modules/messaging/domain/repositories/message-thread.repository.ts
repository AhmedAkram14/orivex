import type { MessageThread } from '../entities/message-thread.entity.js';

export interface MessageThreadRepository {
  findById(id: string): Promise<MessageThread | null>;
  findByAppointmentId(appointmentId: string): Promise<MessageThread | null>;
  // Newest first -- backs each role's own inbox list.
  findByPatientId(patientId: string): Promise<MessageThread[]>;
  findByDoctorId(doctorId: string): Promise<MessageThread[]>;
  save(thread: MessageThread): Promise<void>;
}
