import type { PinoLoggerService } from '../../../../../platform/logging/pino-logger.service.js';
import type { DomainEvent } from '../../../../../shared/domain/domain-event.js';
import type { DomainEventDispatcher } from '../../../../../shared/domain/domain-event-dispatcher.js';
import { GetAvailabilityWindowByIdUseCase } from '../../../../doctor/application/use-cases/get-availability-window-by-id/get-availability-window-by-id.use-case.js';
import { AvailabilityWindowStatus } from '../../../../doctor/domain/enums/availability-window-status.enum.js';
import { WaitlistOpportunityMatchedEvent } from '../../../domain/events/waitlist-opportunity-matched.event.js';
import type { WaitlistEntryRepository } from '../../../domain/repositories/waitlist-entry.repository.js';

export interface MatchAvailabilityWithWaitlistCommand {
  availabilityWindowId: string;
}

// N8-Waitlist. Reacts to DoctorModule's 'doctor.availability.changed'
// event (raised on every AvailabilityWindow transition -- define, hold,
// release, confirm, pricing update; had zero subscribers before this).
// Only an Open window is a real opportunity -- Held/Booked transitions are
// ignored. Deliberately notification-only, never auto-booking: reserving
// the slot on the patient's behalf would mean charging them (for a Paid
// slot) or committing them to a time they haven't confirmed they still
// want, without their in-the-moment action -- the PRD names no requirement
// for automatic booking, so this stays the conservative default per this
// audit's own instruction ("prefer notification + patient action ...
// unless the current PRD clearly says otherwise").
//
// Concurrency: claimEarliestEligibleEntry's conditional UPDATE (WHERE
// status = 'waiting') is the sole concurrency guard -- if this handler
// somehow ran twice for the same window (event redelivery, etc.), the
// second call's UPDATE would affect zero rows and return null, never
// double-notifying the same entry.
//
// Error handling: this runs as an in-process event subscriber
// (waitlist.module.ts's dispatcher.subscribe call), and
// InProcessDomainEventDispatcher.dispatch() awaits each subscriber with no
// try/catch of its own -- every existing subscriber in this codebase
// (every NotificationModule handler) independently swallows its own
// errors for exactly this reason, since an uncaught error here would
// otherwise propagate out of dispatch() and fail the *caller* that raised
// AvailabilityChangedEvent (ReleaseAvailabilityWindowUseCase,
// DefineAvailabilityWindowUseCase, etc.) -- a doctor releasing or defining
// a slot must never fail because waitlist matching had a transient hiccup.
export class MatchAvailabilityWithWaitlistUseCase {
  constructor(
    private readonly waitlistEntryRepository: WaitlistEntryRepository,
    private readonly getAvailabilityWindowByIdUseCase: GetAvailabilityWindowByIdUseCase,
    private readonly eventDispatcher: DomainEventDispatcher,
    private readonly logger: PinoLoggerService,
  ) {}

  async execute(command: MatchAvailabilityWithWaitlistCommand): Promise<void> {
    try {
      const window = await this.getAvailabilityWindowByIdUseCase.execute({
        availabilityWindowId: command.availabilityWindowId,
      });
      if (!window || window.getStatus() !== AvailabilityWindowStatus.Open) {
        return;
      }

      const windowType = window.getPricing().isFree() ? 'FREE' : 'PAID';
      const claimed = await this.waitlistEntryRepository.claimEarliestEligibleEntry(
        window.getDoctorId(),
        window.getStartTime(),
        windowType,
      );
      if (!claimed) {
        return;
      }

      const events: DomainEvent[] = [
        new WaitlistOpportunityMatchedEvent(
          claimed.getId(),
          claimed.getPatientId(),
          claimed.getDoctorId(),
          window.getId(),
          window.getStartTime(),
        ),
      ];
      await this.eventDispatcher.dispatch(events);
    } catch (error) {
      this.logger.error(
        'Failed to match availability against the waitlist',
        error instanceof Error ? error.stack : String(error),
        { availabilityWindowId: command.availabilityWindowId },
      );
    }
  }
}
