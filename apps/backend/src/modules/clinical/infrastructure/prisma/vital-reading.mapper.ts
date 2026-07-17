import type { VitalReading as PrismaVitalReadingRow } from '@prisma/client';

import { VitalReading } from '../../domain/entities/vital-reading.entity.js';

import { toDomainVitalType, toPrismaVitalType } from './vital-type.mapper.js';

export function toDomainVitalReading(row: PrismaVitalReadingRow): VitalReading {
  return VitalReading.reconstitute({
    id: row.id,
    patientId: row.patientId,
    type: toDomainVitalType(row.type),
    value: row.value,
    diastolicValue: row.diastolicValue ?? undefined,
    recordedAt: row.recordedAt,
    createdAt: row.createdAt,
  });
}

export function toPersistedVitalReading(vitalReading: VitalReading) {
  return {
    id: vitalReading.getId(),
    patientId: vitalReading.getPatientId(),
    type: toPrismaVitalType(vitalReading.getType()),
    value: vitalReading.getValue(),
    diastolicValue: vitalReading.getDiastolicValue() ?? null,
    recordedAt: vitalReading.getRecordedAt(),
    createdAt: vitalReading.getCreatedAt(),
  };
}
