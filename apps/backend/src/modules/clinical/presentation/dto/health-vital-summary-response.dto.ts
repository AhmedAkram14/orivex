import type { VitalReading } from '../../domain/entities/vital-reading.entity.js';
import { VitalType } from '../../domain/enums/vital-type.enum.js';

// The Patient Portal Health Dashboard's per-vital summary (GET
// /patients/me/health-dashboard). Matches the frontend's real
// `HealthVitalSummary`/`VitalReading` contract exactly
// (apps/frontend/src/features/patient/api/types.ts) -- `readings` ordered
// oldest to newest (the shape `TrendChart` expects), `latest` undefined when
// nothing has been recorded yet for that vital type (an honest empty state,
// never a fabricated reading).
export class VitalReadingResponseDto {
  id!: string;
  type!: VitalType;
  recordedAt!: string;
  valueLabel!: string;
  value!: number;
  diastolicValue?: number;

  static fromDomain(vitalReading: VitalReading): VitalReadingResponseDto {
    const dto = new VitalReadingResponseDto();
    dto.id = vitalReading.getId();
    dto.type = vitalReading.getType();
    dto.recordedAt = vitalReading.getRecordedAt().toISOString();
    dto.valueLabel = formatValueLabel(vitalReading);
    dto.value = vitalReading.getValue();
    dto.diastolicValue = vitalReading.getDiastolicValue();
    return dto;
  }
}

export class HealthVitalSummaryResponseDto {
  type!: VitalType;
  latest?: VitalReadingResponseDto;
  readings!: VitalReadingResponseDto[];

  static create(props: {
    type: VitalType;
    readings: VitalReading[];
  }): HealthVitalSummaryResponseDto {
    const dto = new HealthVitalSummaryResponseDto();
    dto.type = props.type;
    dto.readings = props.readings.map((reading) => VitalReadingResponseDto.fromDomain(reading));

    const latest = props.readings.reduce<VitalReading | undefined>((current, reading) => {
      if (!current || reading.getRecordedAt().getTime() > current.getRecordedAt().getTime()) {
        return reading;
      }
      return current;
    }, undefined);
    dto.latest = latest ? VitalReadingResponseDto.fromDomain(latest) : undefined;

    return dto;
  }
}

// Plain English unit strings, not localized -- matches this codebase's
// existing precedent of hardcoded English strings for things like "Free
// consultation"/"Paid consultation" elsewhere; a real i18n pass for
// measurement units is legitimate future work, not required now since
// there's no data to display yet anyway.
function formatValueLabel(vitalReading: VitalReading): string {
  switch (vitalReading.getType()) {
    case VitalType.Weight:
      return `${vitalReading.getValue()} kg`;
    case VitalType.BloodPressure:
      return `${vitalReading.getValue()}/${vitalReading.getDiastolicValue()} mmHg`;
    case VitalType.BloodSugar:
      return `${vitalReading.getValue()} mg/dL`;
  }
}
