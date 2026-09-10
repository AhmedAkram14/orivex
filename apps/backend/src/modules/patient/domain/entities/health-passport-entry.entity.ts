import { randomUUID } from 'node:crypto';

import { PatientDomainError } from '../exceptions/patient-domain.error.js';
import { HealthPassportEntryCategory } from '../enums/health-passport-entry-category.enum.js';

export interface RecordHealthPassportEntryProps {
  patientId: string;
  category: HealthPassportEntryCategory;
  title: string;
  detail?: string;
  occurredAt?: Date;
}

export interface ReconstituteHealthPassportEntryProps {
  id: string;
  patientId: string;
  category: HealthPassportEntryCategory;
  title: string;
  detail?: string;
  occurredAt?: Date;
  createdAt: Date;
}

// I6 -- Health Passport (docs/01-prd.md L59 §2.4, docs/01.1-prd-update.md
// §17-30). One generic, patient-authored, categorized entry -- backs
// vaccinations/family history/past surgeries/current medications. Fully
// immutable once recorded except for deletion (a patient correcting a typo
// deletes and re-adds; there's no clinical "addendum" concept here the way
// ClinicalNote has, since this is patient-self-reported data, not a
// doctor's clinical record).
export class HealthPassportEntry {
  private constructor(
    private readonly id: string,
    private readonly patientId: string,
    private readonly category: HealthPassportEntryCategory,
    private readonly title: string,
    private readonly detail: string | undefined,
    private readonly occurredAt: Date | undefined,
    private readonly createdAt: Date,
  ) {}

  static record(props: RecordHealthPassportEntryProps): HealthPassportEntry {
    if (!props.title || props.title.trim().length === 0) {
      throw new PatientDomainError('Health passport entry title must not be empty.');
    }
    return new HealthPassportEntry(
      randomUUID(),
      props.patientId,
      props.category,
      props.title.trim(),
      props.detail?.trim() || undefined,
      props.occurredAt,
      new Date(),
    );
  }

  static reconstitute(props: ReconstituteHealthPassportEntryProps): HealthPassportEntry {
    return new HealthPassportEntry(
      props.id,
      props.patientId,
      props.category,
      props.title,
      props.detail,
      props.occurredAt,
      props.createdAt,
    );
  }

  getId(): string {
    return this.id;
  }

  getPatientId(): string {
    return this.patientId;
  }

  getCategory(): HealthPassportEntryCategory {
    return this.category;
  }

  getTitle(): string {
    return this.title;
  }

  getDetail(): string | undefined {
    return this.detail;
  }

  getOccurredAt(): Date | undefined {
    return this.occurredAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
