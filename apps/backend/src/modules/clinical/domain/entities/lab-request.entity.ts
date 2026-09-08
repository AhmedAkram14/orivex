import { randomUUID } from 'node:crypto';

import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';
import { LabRequestStatus } from '../enums/lab-request-status.enum.js';

export interface OrderLabRequestProps {
  consultationSessionId: string;
  authoringDoctorId: string;
  testName: string;
  clinicalReason?: string;
  instructions?: string;
}

export interface ReconstituteLabRequestProps {
  id: string;
  consultationSessionId: string;
  authoringDoctorId: string;
  testName: string;
  clinicalReason?: string;
  instructions?: string;
  status: LabRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

// I1 -- Lab Requests (docs/01-prd.md L86-90 §2.9: "Lightweight in V1"): a
// structured, doctor-authored advisory test-request document -- deliberately
// NOT an integration with any real laboratory system. No result field, no
// external order id -- this entity only ever carries what the doctor asked
// for, never a fabricated outcome. Mirrors ClinicalNote/Prescription's
// aggregate-root shape exactly, not a new pattern. `cancel()` exists because
// the schema models it (LabRequestStatus.Cancelled), but no use case calls
// it yet -- a real, disclosed limitation, not an oversight.
export class LabRequest {
  private constructor(
    private readonly id: string,
    private readonly consultationSessionId: string,
    private readonly authoringDoctorId: string,
    private readonly testName: string,
    private readonly clinicalReason: string | undefined,
    private readonly instructions: string | undefined,
    private status: LabRequestStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static order(props: OrderLabRequestProps): LabRequest {
    if (!props.testName || props.testName.trim().length === 0) {
      throw new ClinicalDomainError('testName must not be empty.');
    }
    const now = new Date();
    return new LabRequest(
      randomUUID(),
      props.consultationSessionId,
      props.authoringDoctorId,
      props.testName.trim(),
      props.clinicalReason?.trim() || undefined,
      props.instructions?.trim() || undefined,
      LabRequestStatus.Ordered,
      now,
      now,
    );
  }

  static reconstitute(props: ReconstituteLabRequestProps): LabRequest {
    return new LabRequest(
      props.id,
      props.consultationSessionId,
      props.authoringDoctorId,
      props.testName,
      props.clinicalReason,
      props.instructions,
      props.status,
      props.createdAt,
      props.updatedAt,
    );
  }

  cancel(): void {
    if (this.status !== LabRequestStatus.Ordered) {
      throw new ClinicalDomainError(`LabRequest "${this.id}" is not Ordered and cannot be cancelled.`);
    }
    this.status = LabRequestStatus.Cancelled;
    this.updatedAt = new Date();
  }

  getId(): string {
    return this.id;
  }

  getConsultationSessionId(): string {
    return this.consultationSessionId;
  }

  getAuthoringDoctorId(): string {
    return this.authoringDoctorId;
  }

  getTestName(): string {
    return this.testName;
  }

  getClinicalReason(): string | undefined {
    return this.clinicalReason;
  }

  getInstructions(): string | undefined {
    return this.instructions;
  }

  getStatus(): LabRequestStatus {
    return this.status;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
