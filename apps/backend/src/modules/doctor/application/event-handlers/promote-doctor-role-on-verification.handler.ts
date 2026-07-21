import type { PinoLoggerService } from '../../../../platform/logging/pino-logger.service.js';
import { UpdateAccountRoleCommand } from '../../../identity/application/use-cases/update-account-role/update-account-role.command.js';
import type { UpdateAccountRoleUseCase } from '../../../identity/application/use-cases/update-account-role/update-account-role.use-case.js';
import { AccountRole } from '../../../identity/domain/enums/account-role.enum.js';
import type { GetDoctorProfileByIdUseCase } from '../use-cases/get-doctor-profile-by-id/get-doctor-profile-by-id.use-case.js';

export interface DoctorVerifiedEventPayload {
  doctorId: string;
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
export class PromoteDoctorRoleOnVerificationHandler {
  constructor(
    private readonly getDoctorProfileByIdUseCase: GetDoctorProfileByIdUseCase,
    private readonly updateAccountRoleUseCase: UpdateAccountRoleUseCase,
    private readonly logger: PinoLoggerService,
  ) {}

  async handle(event: DoctorVerifiedEventPayload): Promise<void> {
    try {
      const profile = await this.getDoctorProfileByIdUseCase.execute({ doctorProfileId: event.doctorId });
      if (!profile) {
        this.logger.error('DoctorVerifiedEvent referenced an unknown doctor profile', undefined, {
          doctorId: event.doctorId,
          verificationCaseId: event.verificationCaseId,
        });
        return;
      }

      await this.updateAccountRoleUseCase.execute(
        new UpdateAccountRoleCommand({ accountId: profile.getAccountId(), newRole: AccountRole.Doctor }),
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
        { doctorId: event.doctorId, verificationCaseId: event.verificationCaseId },
      );
    }
  }
}
