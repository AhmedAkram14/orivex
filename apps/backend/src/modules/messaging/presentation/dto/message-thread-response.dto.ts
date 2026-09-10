import type { MessageThread } from '../../domain/entities/message-thread.entity.js';

export class MessageThreadResponseDto {
  id!: string;
  appointmentId!: string;
  patientId!: string;
  doctorId!: string;
  createdAt!: string;
  /** Composed by the controller (this module's own read, not the entity's) -- the count of messages the caller hasn't read yet, so the inbox can show an unread badge. */
  unreadCount?: number;

  static fromDomain(thread: MessageThread, unreadCount?: number): MessageThreadResponseDto {
    const dto = new MessageThreadResponseDto();
    dto.id = thread.getId();
    dto.appointmentId = thread.getAppointmentId();
    dto.patientId = thread.getPatientId();
    dto.doctorId = thread.getDoctorId();
    dto.createdAt = thread.getCreatedAt().toISOString();
    dto.unreadCount = unreadCount;
    return dto;
  }
}
