import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// Consultation lifecycle completion follow-up (2026-07-26). Notification
// module can subscribe to this to tell the doctor feedback was received,
// without ConsultationModule needing to know anything about notifications.
export class ConsultationFeedbackSubmittedEvent extends DomainEvent {
  readonly eventName = 'consultation.feedback.submitted';

  constructor(
    public readonly consultationFeedbackId: string,
    public readonly doctorId: string,
    public readonly consultationSessionId: string,
  ) {
    super();
  }
}
