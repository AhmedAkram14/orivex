import type { VitalType } from '../../../domain/enums/vital-type.enum.js';

// K10 -- Wearables integration boundary. No real wearable/provider account
// exists yet (see this use case's own header comment) -- this command shape
// is what a real device-sync adapter would call once one does.
export interface IngestWearableVitalReadingCommand {
  patientId: string;
  type: VitalType;
  value: number;
  diastolicValue?: number;
  recordedAt: Date;
  sourceProvider: string;
  externalObservationId: string;
}
