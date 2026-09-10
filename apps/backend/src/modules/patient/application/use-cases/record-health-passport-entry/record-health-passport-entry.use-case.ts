import { HealthPassportEntry } from '../../../domain/entities/health-passport-entry.entity.js';
import type { HealthPassportEntryRepository } from '../../../domain/repositories/health-passport-entry.repository.js';

import type { RecordHealthPassportEntryCommand } from './record-health-passport-entry.command.js';

// Plain TypeScript class — no NestJS dependency; DI wiring lives in
// patient.module.ts only. No cross-aggregate checks needed -- the
// controller derives patientId from the authenticated caller's own JWT
// (CurrentUser), so a patient can only ever record an entry for themselves.
export class RecordHealthPassportEntryUseCase {
  constructor(private readonly healthPassportEntryRepository: HealthPassportEntryRepository) {}

  async execute(command: RecordHealthPassportEntryCommand): Promise<HealthPassportEntry> {
    const entry = HealthPassportEntry.record({
      patientId: command.patientId,
      category: command.category,
      title: command.title,
      detail: command.detail,
      occurredAt: command.occurredAt,
    });

    await this.healthPassportEntryRepository.save(entry);
    return entry;
  }
}
