import type { HealthPassportEntryCategory } from '../../../domain/enums/health-passport-entry-category.enum.js';

export interface RecordHealthPassportEntryCommandProps {
  patientId: string;
  category: HealthPassportEntryCategory;
  title: string;
  detail?: string;
  occurredAt?: Date;
}

export class RecordHealthPassportEntryCommand {
  readonly patientId: string;
  readonly category: HealthPassportEntryCategory;
  readonly title: string;
  readonly detail?: string;
  readonly occurredAt?: Date;

  constructor(props: RecordHealthPassportEntryCommandProps) {
    this.patientId = props.patientId;
    this.category = props.category;
    this.title = props.title;
    this.detail = props.detail;
    this.occurredAt = props.occurredAt;
  }
}
