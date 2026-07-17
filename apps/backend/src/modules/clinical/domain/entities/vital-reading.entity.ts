import { randomUUID } from 'node:crypto';

import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';
import { VitalType } from '../enums/vital-type.enum.js';

export interface CreateVitalReadingProps {
  patientId: string;
  type: VitalType;
  value: number;
  diastolicValue?: number;
  recordedAt?: Date;
}

export interface ReconstituteVitalReadingProps {
  id: string;
  patientId: string;
  type: VitalType;
  value: number;
  diastolicValue?: number;
  recordedAt: Date;
  createdAt: Date;
}

// A single recorded vital-sign reading (docs/05-information-architecture.md's
// Health Dashboard concept). There is no create/record-vital producer wired
// up anywhere yet (no vitals concept exists elsewhere in the platform) --
// create() exists for this aggregate's own correctness/tests, ready for a
// future producer, same posture NotificationModule's create() had before its
// own producer wiring landed.
export class VitalReading {
  private constructor(
    private readonly id: string,
    private readonly patientId: string,
    private readonly type: VitalType,
    private readonly value: number,
    private readonly diastolicValue: number | undefined,
    private readonly recordedAt: Date,
    private readonly createdAt: Date,
  ) {}

  static create(props: CreateVitalReadingProps): VitalReading {
    if (props.value <= 0) {
      throw new ClinicalDomainError('A vital reading value must be positive.');
    }
    const requiresDiastolic = props.type === VitalType.BloodPressure;
    if (requiresDiastolic && (props.diastolicValue === undefined || props.diastolicValue === null)) {
      throw new ClinicalDomainError('A blood-pressure reading requires a diastolic value.');
    }
    if (!requiresDiastolic && props.diastolicValue !== undefined) {
      throw new ClinicalDomainError('Only a blood-pressure reading may carry a diastolic value.');
    }
    if (requiresDiastolic && props.diastolicValue !== undefined && props.diastolicValue <= 0) {
      throw new ClinicalDomainError('A vital reading diastolic value must be positive.');
    }

    return new VitalReading(
      randomUUID(),
      props.patientId,
      props.type,
      props.value,
      props.diastolicValue,
      props.recordedAt ?? new Date(),
      new Date(),
    );
  }

  static reconstitute(props: ReconstituteVitalReadingProps): VitalReading {
    return new VitalReading(
      props.id,
      props.patientId,
      props.type,
      props.value,
      props.diastolicValue,
      props.recordedAt,
      props.createdAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getPatientId(): string {
    return this.patientId;
  }

  getType(): VitalType {
    return this.type;
  }

  getValue(): number {
    return this.value;
  }

  getDiastolicValue(): number | undefined {
    return this.diastolicValue;
  }

  getRecordedAt(): Date {
    return this.recordedAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
