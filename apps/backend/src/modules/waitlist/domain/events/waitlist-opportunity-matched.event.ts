import { DomainEvent } from '../../../../shared/domain/domain-event.js';

// N8-Waitlist (ORIVEX Remaining Work Audit): raised once a Waiting entry
// has been matched to a newly-opened slot and transitioned to Notified.
// NotificationModule subscribes to this by name only (module-to-module
// event boundary, matching every other cross-module notification trigger
// in this codebase) to actually deliver the notification -- WaitlistModule
// itself never sends one directly.
export class WaitlistOpportunityMatchedEvent extends DomainEvent {
  readonly eventName = 'waitlist.opportunity.matched';

  constructor(
    public readonly waitlistEntryId: string,
    public readonly patientId: string,
    public readonly doctorId: string,
    public readonly availabilityWindowId: string,
    public readonly scheduledAt: Date,
  ) {
    super();
  }
}
