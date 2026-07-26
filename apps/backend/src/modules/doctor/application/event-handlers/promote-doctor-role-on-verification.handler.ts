import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { UpdateAccountRoleCommand } from '../../../identity/application/use-cases/update-account-role/update-account-role.command.js';
import type { UpdateAccountRoleUseCase } from '../../../identity/application/use-cases/update-account-role/update-account-role.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';

export interface DoctorVerifiedEventPayload {
  subjectAccountId: string;
  verificationCaseId: string;
}

// Doctor Onboarding (Phase 4 continuation): DoctorModule reacting to
// TrustModule's already-published DoctorVerifiedEvent by name only
// (mirrors NotificationModule's ScheduleAppointmentReminderHandler for the
// same "never import the emitting module's event type" reason -- TrustModule
// remains completely unaware this handler exists). This is the one and only
// place an Account is promoted from Patient to Doctor: every account starts
// and stays Patient through the entire Draft/Pending/Rejected onboarding
// lifecycle (DoctorProfileController's/DoctorVerificationController's own
// comments explain why those routes accept Patient callers) -- only an
// *approved* verification ever grants real Doctor Portal access, and it
// does so automatically, with no manual database edit.
//
// Onboarding Redesign (2026-07-21 proposal, Stage O.2): simplified -- the
// event now carries subjectAccountId directly (VerificationCase's own
// generalized identifier), so this handler no longer needs to look up a
// DoctorProfile at all just to translate an id into an account.
export class PromoteDoctorRoleOnVerificationHandler {
  constructor(
    private readonly updateAccountRoleUseCase: UpdateAccountRoleUseCase,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: DoctorVerifiedEventPayload): Promise<void> {
    try {
      await this.updateAccountRoleUseCase.execute(
        new UpdateAccountRoleCommand({ accountId: event.subjectAccountId, newRole: AccountRole.Doctor }),
      );
    } catch (error) {
      // An approval decision has already been saved by the time domain
      // events dispatch (DecideVerificationUseCase's own save() runs first,
      // same ordering ScheduleAppointmentReminderHandler relies on) --
      // a failure here must never surface as a failed admin approval
      // request. Surfaced loudly in logs instead, since a doctor stuck at
      // "approved but still Patient" needs someone to notice.
      this.logger.error(
        'Failed to promote account role after doctor verification approval',
        error instanceof Error ? error.stack : String(error),
        { subjectAccountId: event.subjectAccountId, verificationCaseId: event.verificationCaseId },
      );
    }
  }
}
