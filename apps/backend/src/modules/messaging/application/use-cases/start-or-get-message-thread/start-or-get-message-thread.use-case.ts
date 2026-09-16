import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { FindAppointmentByPatientAndDoctorUseCase } from '../../../../consultation/application/use-cases/find-appointment-by-patient-and-doctor/find-appointment-by-patient-and-doctor.use-case.js';
import { GetDoctorProfileByAccountIdUseCase } from '../../../../doctor/application/use-cases/get-doctor-profile-by-account-id/get-doctor-profile-by-account-id.use-case.js';
import { GetPatientProfileByAccountIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-account-id/get-patient-profile-by-account-id.use-case.js';
import { MessageThread } from '../../../domain/entities/message-thread.entity.js';
import { MessageThreadConflictError } from '../../../domain/exceptions/message-thread-conflict.error.js';
import type { MessageThreadRepository } from '../../../domain/repositories/message-thread.repository.js';

import type { StartOrGetMessageThreadCommand } from './start-or-get-message-thread.command.js';

// I7 -- Messaging. Re-threaded (Messages Page Overhaul, Phase 1): one
// thread per (patientId, doctorId) pair, lazily created the first time
// either party opens it with a given counterparty -- mirrors
// ConfirmAppointmentUseCase's own "reuse if it already exists" idiom for
// ConsultationSession. Eligibility (decision 2 of the plan): the pair must
// have had at least one real appointment together, ANY status/date --
// smallest deviation from the prior per-appointment behavior, and
// deliberately doesn't touch DoctorFollow's own "not an implicit messaging
// channel" boundary.
export class StartOrGetMessageThreadUseCase {
  constructor(
    private readonly messageThreadRepository: MessageThreadRepository,
    private readonly findAppointmentByPatientAndDoctorUseCase: FindAppointmentByPatientAndDoctorUseCase,
    private readonly getPatientProfileByAccountIdUseCase: GetPatientProfileByAccountIdUseCase,
    private readonly getDoctorProfileByAccountIdUseCase: GetDoctorProfileByAccountIdUseCase,
  ) {}

  async execute(command: StartOrGetMessageThreadCommand): Promise<MessageThread> {
    const [patientProfile, doctorProfile] = await Promise.all([
      this.getPatientProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId }),
      this.getDoctorProfileByAccountIdUseCase.execute({ accountId: command.callerAccountId }),
    ]);

    let patientId: string;
    let doctorId: string;
    if (patientProfile) {
      patientId = patientProfile.getId();
      doctorId = command.counterpartyProfileId;
    } else if (doctorProfile) {
      patientId = command.counterpartyProfileId;
      doctorId = doctorProfile.getId();
    } else {
      // The caller has neither profile at all -- never confirms to a caller
      // whether the counterparty id exists, matching this codebase's "never
      // leak existence" convention.
      throw new NotFoundError('No relationship with this counterparty exists.');
    }

    const appointment = await this.findAppointmentByPatientAndDoctorUseCase.execute({ patientId, doctorId });
    if (!appointment) {
      throw new NotFoundError('No relationship with this counterparty exists.');
    }

    const existing = await this.messageThreadRepository.findByPatientAndDoctor(patientId, doctorId);
    if (existing) {
      return existing;
    }

    const thread = MessageThread.start({ patientId, doctorId });
    try {
      await this.messageThreadRepository.save(thread);
      return thread;
    } catch (error) {
      // Two concurrent StartOrGetMessageThread calls for the same pair can
      // both miss the findByPatientAndDoctor read above and both attempt to
      // create the thread. The compound-keyed upsert (see
      // PrismaMessageThreadRepository.save) resolves this cleanly in the
      // common case; this catch is the documented fallback for the rarer
      // conflict that still surfaces one, rather than assuming the upsert
      // alone makes the race impossible.
      if (error instanceof MessageThreadConflictError) {
        const winner = await this.messageThreadRepository.findByPatientAndDoctor(patientId, doctorId);
        if (winner) {
          return winner;
        }
      }
      throw error;
    }
  }
}
