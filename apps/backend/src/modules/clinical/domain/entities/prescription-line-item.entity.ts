import { randomUUID } from 'node:crypto';

import { ClinicalDomainError } from '../exceptions/clinical-domain.error.js';

export interface CreatePrescriptionLineItemProps {
  drugCatalogId: string;
  drugName?: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
}

export interface ReconstitutePrescriptionLineItemProps {
  id: string;
  drugCatalogId: string;
  drugName?: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
}

// Child entity of the Prescription aggregate (docs/09-physical-database.md's
// prescription_line_items table: "Immutable once parent signed"). drugCatalogId
// is stored as real, required, doctor-supplied data with no FK -- it would
// reference reference.drug_catalog (ReferenceDataModule), which doesn't
// exist yet.
export class PrescriptionLineItem {
  private constructor(
    private readonly id: string,
    private readonly drugCatalogId: string,
    private readonly drugName: string | undefined,
    private readonly dosage: string,
    private readonly frequency: string,
    private readonly durationDays: number,
    private readonly instructions: string | undefined,
  ) {}

  static create(props: CreatePrescriptionLineItemProps): PrescriptionLineItem {
    if (!props.drugCatalogId || props.drugCatalogId.trim().length === 0) {
      throw new ClinicalDomainError('drugCatalogId must not be empty.');
    }
    if (!props.dosage || props.dosage.trim().length === 0) {
      throw new ClinicalDomainError('dosage must not be empty.');
    }
    if (!props.frequency || props.frequency.trim().length === 0) {
      throw new ClinicalDomainError('frequency must not be empty.');
    }
    if (!Number.isInteger(props.durationDays) || props.durationDays <= 0) {
      throw new ClinicalDomainError('durationDays must be a positive integer.');
    }

    return new PrescriptionLineItem(
      randomUUID(),
      props.drugCatalogId,
      props.drugName?.trim(),
      props.dosage.trim(),
      props.frequency.trim(),
      props.durationDays,
      props.instructions?.trim(),
    );
  }

  static reconstitute(props: ReconstitutePrescriptionLineItemProps): PrescriptionLineItem {
    return new PrescriptionLineItem(
      props.id,
      props.drugCatalogId,
      props.drugName,
      props.dosage,
      props.frequency,
      props.durationDays,
      props.instructions,
    );
  }

  getId(): string {
    return this.id;
  }

  getDrugCatalogId(): string {
    return this.drugCatalogId;
  }

  getDrugName(): string | undefined {
    return this.drugName;
  }

  getDosage(): string {
    return this.dosage;
  }

  getFrequency(): string {
    return this.frequency;
  }

  getDurationDays(): number {
    return this.durationDays;
  }

  getInstructions(): string | undefined {
    return this.instructions;
  }
}
