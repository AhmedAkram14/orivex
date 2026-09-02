import { randomUUID } from 'node:crypto';

import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';
import { VitalType } from '../enums/vital-type.enum.js';

export interface CreateVitalReadingProps {
  patientId: string;
  type: VitalType;
  value: number;
  diastolicValue?: number;
  recordedAt?: Date;
  // Real Clinical Vitals Demo pass: both optional so a future non-
  // consultation-linked producer (e.g. a patient self-reporting weight)
  // stays representable, but every real producer today (the doctor-
  // authored write path) always sets both.
  recordedByDoctorId?: string;
  consultationSessionId?: string;
}

export interface ReconstituteVitalReadingProps {
  id: string;
  patientId: string;
  type: VitalType;
  value: number;
  diastolicValue?: number;
  recordedAt: Date;
  createdAt: Date;
  recordedByDoctorId?: string;
  consultationSessionId?: string;
}

// A single recorded vital-sign reading (docs/05-information-architecture.md's
// Health Dashboard concept). Real Clinical Vitals Demo pass: written by
// RecordVitalReadingUseCase, mirroring RecordConsultationDiagnosisUseCase's
// doctor-authorship pattern -- the treating doctor for a specific
// consultation session records it, never a generic system user.
export class VitalReading {
  private constructor(
    private readonly id: string,
    private readonly patientId: string,
    private readonly type: VitalType,
    private readonly value: number,
    private readonly diastolicValue: number | undefined,
    private readonly recordedAt: Date,
    private readonly createdAt: Date,
    private readonly recordedByDoctorId: string | undefined,
    private readonly consultationSessionId: string | undefined,
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
      props.recordedByDoctorId,
      props.consultationSessionId,
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
      props.recordedByDoctorId,
      props.consultationSessionId,
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

  getRecordedByDoctorId(): string | undefined {
    return this.recordedByDoctorId;
  }

  getConsultationSessionId(): string | undefined {
    return this.consultationSessionId;
  }
}
