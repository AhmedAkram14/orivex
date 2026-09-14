import { NotFoundError } from '../../../../../shared/errors/app-error.js';
import { GetPatientProfileByIdUseCase } from '../../../../patient/application/use-cases/get-patient-profile-by-id/get-patient-profile-by-id.use-case.js';
import { VitalReading } from '../../../domain/entities/vital-reading.entity.js';
import { DuplicateWearableVitalReadingError } from '../../../domain/exceptions/duplicate-wearable-vital-reading.error.js';
import { ClinicalDomainError } from '../../../domain/exceptions/clinical-domain.error.js';
import type { VitalReadingRepository } from '../../../domain/repositories/vital-reading.repository.js';

import type { IngestWearableVitalReadingCommand } from './ingest-wearable-vital-reading.command.js';

// K10 -- Wearables integration boundary (ORIVEX Remaining Work Audit).
// No real wearable/device-vendor account or OAuth grant exists anywhere in
// this codebase -- nothing here fabricates one. What this use case IS: the
// provider-agnostic ingestion boundary a real adapter (Apple Health,
// Fitbit, etc.) would call once a real vendor integration is authorized --
// idempotent on (sourceProvider, externalObservationId) so a device's
// at-least-once delivery never creates duplicate readings.
//
// The initial findBySourceAndExternalId check is a fast path for the
// common (non-racing) case, not the guarantee -- two concurrent calls for
// the same key can both pass it before either saves. The real guarantee is
// the DB's own unique constraint: when the losing save() loses that race,
// the repository translates the resulting P2002 into
// DuplicateWearableVitalReadingError, which is caught here and resolved by
// re-querying for the row the winning call just persisted. Every caller
// therefore ends up returning the same logical VitalReading, never an
// unhandled database error. Any other, unrelated error is rethrown as-is.
export class IngestWearableVitalReadingUseCase {
  constructor(
    private readonly vitalReadingRepository: VitalReadingRepository,
    private readonly getPatientProfileByIdUseCase: GetPatientProfileByIdUseCase,
  ) {}

  async execute(command: IngestWearableVitalReadingCommand): Promise<VitalReading> {
    const patient = await this.getPatientProfileByIdUseCase.execute({ patientProfileId: command.patientId });
    if (!patient) {
      throw new NotFoundError(`PatientProfile "${command.patientId}" not found.`);
    }

    const existing = await this.vitalReadingRepository.findBySourceAndExternalId(
      command.sourceProvider,
      command.externalObservationId,
    );
    if (existing) {
      return existing;
    }

    const vitalReading = VitalReading.ingestFromDevice({
      patientId: command.patientId,
      type: command.type,
      value: command.value,
      diastolicValue: command.diastolicValue,
      recordedAt: command.recordedAt,
      sourceProvider: command.sourceProvider,
      externalObservationId: command.externalObservationId,
    });

    try {
      await this.vitalReadingRepository.save(vitalReading);
      return vitalReading;
    } catch (error) {
      if (error instanceof DuplicateWearableVitalReadingError) {
        const winner = await this.vitalReadingRepository.findBySourceAndExternalId(
          command.sourceProvider,
          command.externalObservationId,
        );
        if (winner) {
          return winner;
        }
        // Should be unreachable -- the constraint violation means a row
        // with this exact key exists. Surface a clear domain error rather
        // than silently returning the caller's own (unpersisted) instance.
        throw new ClinicalDomainError(
          `Concurrent device-reading ingestion for source "${command.sourceProvider}"/observation ` +
            `"${command.externalObservationId}" conflicted, but no persisted row could be found afterward.`,
        );
      }
      throw error;
    }
  }
}
